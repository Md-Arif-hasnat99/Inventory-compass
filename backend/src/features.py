"""
Feature engineering module for Inventory Compass demand forecasting.
Computes calendar features, lag values, rolling statistics, and categorical encodings
with strict no-leakage guarantees (shift=1).
"""

from typing import Dict, List, Optional, Tuple
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

CATEGORICAL_MAP = {
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
    if not pd.api.types.is_datetime64_any_dtype(df["Date"]):
        df["Date"] = pd.to_datetime(df["Date"])

    df["day_of_week"] = df["Date"].dt.dayofweek
    df["day_of_month"] = df["Date"].dt.day
    df["month"] = df["Date"].dt.month
    df["week_of_year"] = df["Date"].dt.isocalendar().week.astype(int)
    df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)
    df["quarter"] = df["Date"].dt.quarter
    return df


def add_lag_and_rolling_features(df: pd.DataFrame, target_col: str = TARGET_COL) -> pd.DataFrame:
    """
    Compute lag and rolling window features per Store-Product series.
    Guaranteed no-leakage: all features shift target by at least 1 step before computing.
    """
    df = df.copy()
    df = df.sort_values(["Store ID", "Product ID", "Date"]).reset_index(drop=True)

    grp = df.groupby(["Store ID", "Product ID"])[target_col]

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

    return df


def encode_categoricals(
    df: pd.DataFrame,
    encoders: Optional[Dict[str, LabelEncoder]] = None,
    fit: bool = True,
) -> Tuple[pd.DataFrame, Dict[str, LabelEncoder]]:
    """Encode categorical columns into integers, saving encoders for inference reuse."""
    df = df.copy()
    if encoders is None:
        encoders = {}

    for raw_col, enc_col in CATEGORICAL_MAP.items():
        if raw_col not in df.columns:
            continue
        if fit or raw_col not in encoders:
            le = LabelEncoder()
            df[enc_col] = le.fit_transform(df[raw_col].astype(str))
            encoders[raw_col] = le
        else:
            le = encoders[raw_col]
            classes = set(le.classes_)
            # Map unknown categories to first known class to prevent runtime crash
            safe_series = df[raw_col].astype(str).map(lambda x: x if x in classes else le.classes_[0])
            df[enc_col] = le.transform(safe_series)

    return df, encoders


def build_feature_pipeline(
    df: pd.DataFrame,
    encoders: Optional[Dict[str, LabelEncoder]] = None,
    fit_encoders: bool = True,
) -> Tuple[pd.DataFrame, Dict[str, LabelEncoder]]:
    """Full feature engineering pipeline: Calendar + Lags + Rollings + Categorical Encoding."""
    df_feat = add_calendar_features(df)
    if TARGET_COL in df_feat.columns:
        df_feat = add_lag_and_rolling_features(df_feat, target_col=TARGET_COL)
    df_feat, encoders = encode_categoricals(df_feat, encoders=encoders, fit=fit_encoders)
    return df_feat, encoders
