"""
Feature engineering module for Inventory Compass demand forecasting.
Computes calendar features, lag values, rolling statistics, and categorical encodings
with strict no-leakage guarantees (shift=1) and configurable series grouping.
"""

from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np
import pandas as pd
from sklearn.preprocessing import LabelEncoder


FEATURE_COLS: List[str] = [
    # Calendar features
    "day_of_week",
    "day_of_month",
    "month",
    "week_of_year",
    "is_weekend",
    "quarter",
    # Lag and rolling window metrics
    "lag_1",
    "lag_7",
    "lag_14",
    "roll_mean_7",
    "roll_mean_14",
    "roll_mean_30",
    "roll_std_7",
    # Encoded categoricals
    "store_enc",
    "product_enc",
    "category_enc",
    "region_enc",
    "weather_enc",
    "season_enc",
    # Contextual numerics
    "Price",
    "Discount",
    "Inventory Level",
    "Holiday/Promotion",
    "Competitor Pricing",
]

TARGET_COL: str = "Units Sold"

CATEGORICAL_MAP: Dict[str, str] = {
    "Store ID": "store_enc",
    "Product ID": "product_enc",
    "Category": "category_enc",
    "Region": "region_enc",
    "Weather Condition": "weather_enc",
    "Seasonality": "season_enc",
}


def add_calendar_features(df: pd.DataFrame) -> pd.DataFrame:
    """Extract deterministic calendar features from Date column."""
    df = df.copy()
    if "Date" not in df.columns:
        return df

    if not pd.api.types.is_datetime64_any_dtype(df["Date"]):
        df["Date"] = pd.to_datetime(df["Date"], errors="coerce")

    df["day_of_week"] = df["Date"].dt.dayofweek
    df["day_of_month"] = df["Date"].dt.day
    df["month"] = df["Date"].dt.month
    df["week_of_year"] = df["Date"].dt.isocalendar().week.astype(int)
    df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)
    df["quarter"] = df["Date"].dt.quarter
    return df


def add_lag_and_rolling_features(
    df: pd.DataFrame,
    target_col: str = TARGET_COL,
    group_keys: Optional[List[str]] = None,
) -> pd.DataFrame:
    """
    Compute lag and rolling window features per time series.
    Guaranteed no-leakage: all features shift target by at least 1 step before computing.

    If group_keys is None, defaults to whichever of ["Store ID", "Product ID"] exist in df.
    If no group keys exist, treats df as a single global time series.
    """
    df = df.copy()
    if target_col not in df.columns:
        return df

    if group_keys is None:
        group_keys = [c for c in ["Store ID", "Product ID"] if c in df.columns]

    # Ensure chronological order
    sort_cols = [c for c in group_keys if c in df.columns] + (["Date"] if "Date" in df.columns else [])
    if sort_cols:
        df = df.sort_values(sort_cols).reset_index(drop=True)

    if group_keys:
        grp = df.groupby(group_keys)[target_col]
        # Lags
        df["lag_1"] = grp.shift(1)
        df["lag_7"] = grp.shift(7)
        df["lag_14"] = grp.shift(14)

        # Rolling statistics over shifted series (strictly previous days only)
        shifted = grp.shift(1)
        df["roll_mean_7"] = shifted.transform(lambda x: x.rolling(7, min_periods=3).mean())
        df["roll_mean_14"] = shifted.transform(lambda x: x.rolling(14, min_periods=7).mean())
        df["roll_mean_30"] = shifted.transform(lambda x: x.rolling(30, min_periods=14).mean())
        df["roll_std_7"] = shifted.transform(lambda x: x.rolling(7, min_periods=3).std())
    else:
        # Single time series
        s = df[target_col]
        df["lag_1"] = s.shift(1)
        df["lag_7"] = s.shift(7)
        df["lag_14"] = s.shift(14)

        shifted = s.shift(1)
        df["roll_mean_7"] = shifted.rolling(7, min_periods=3).mean()
        df["roll_mean_14"] = shifted.rolling(14, min_periods=7).mean()
        df["roll_mean_30"] = shifted.rolling(30, min_periods=14).mean()
        df["roll_std_7"] = shifted.rolling(7, min_periods=3).std()

    return df


def encode_categoricals(
    df: pd.DataFrame,
    encoders: Optional[Dict[str, LabelEncoder]] = None,
    fit: bool = True,
    unknown_value: int = -1,
) -> Tuple[pd.DataFrame, Dict[str, LabelEncoder]]:
    """
    Encode categorical columns into integers.
    When fit=False, maps unseen categories to unknown_value (-1) rather than silently
    coercing to class 0, preventing silent data corruption.
    """
    df = df.copy()
    if encoders is None:
        encoders = {}

    for raw_col, enc_col in CATEGORICAL_MAP.items():
        if raw_col not in df.columns:
            continue
        if fit or raw_col not in encoders:
            le = LabelEncoder()
            # Clean string values before fitting
            clean_vals = df[raw_col].fillna("Unknown").astype(str)
            df[enc_col] = le.fit_transform(clean_vals)
            encoders[raw_col] = le
        else:
            le = encoders[raw_col]
            classes_set = set(le.classes_)
            mapping = {cls: idx for idx, cls in enumerate(le.classes_)}
            clean_vals = df[raw_col].fillna("Unknown").astype(str)
            df[enc_col] = clean_vals.map(lambda x: mapping.get(x, unknown_value))

    return df, encoders


def build_feature_pipeline(
    df: pd.DataFrame,
    encoders: Optional[Dict[str, LabelEncoder]] = None,
    fit_encoders: bool = True,
    group_keys: Optional[List[str]] = None,
    unknown_value: int = -1,
) -> Tuple[pd.DataFrame, Dict[str, LabelEncoder]]:
    """Full feature engineering pipeline: Calendar + Lags + Rollings + Categorical Encoding."""
    df_feat = add_calendar_features(df)
    if TARGET_COL in df_feat.columns:
        df_feat = add_lag_and_rolling_features(df_feat, target_col=TARGET_COL, group_keys=group_keys)
    df_feat, encoders = encode_categoricals(
        df_feat, encoders=encoders, fit=fit_encoders, unknown_value=unknown_value
    )
    return df_feat, encoders
