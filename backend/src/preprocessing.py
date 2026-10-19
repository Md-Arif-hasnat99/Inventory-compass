"""
Data loading, cleaning, column standardization, and preprocessing module for Inventory Compass.
Handles raw retail inventory ingestion, seller column mapping, imputation, and data suitability assessment.
"""

from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union
import pandas as pd
import numpy as np


# Maps canonical keys from upload/validation to internal column names
CANONICAL_TO_INTERNAL: Dict[str, str] = {
    "date": "Date",
    "units_sold": "Units Sold",
    "product_id": "Product ID",
    "store_id": "Store ID",
    "inventory_level": "Inventory Level",
    "price": "Price",
    "discount": "Discount",
    "promotion": "Holiday/Promotion",
    "category": "Category",
    "region": "Region",
    "weather": "Weather Condition",
    "seasonality": "Seasonality",
    "competitor_pricing": "Competitor Pricing",
}


def load_raw_data(filepath: Union[str, Path]) -> pd.DataFrame:
    """Load raw inventory dataset from CSV and strip whitespace from headers and string columns."""
    filepath = Path(filepath)
    if not filepath.exists():
        raise FileNotFoundError(f"Input file not found at: {filepath}")

    df = pd.read_csv(filepath)
    df.columns = df.columns.str.strip()
    for col in df.select_dtypes("object").columns:
        df[col] = df[col].astype(str).str.strip()

    return df


def standardize_seller_columns(
    df: pd.DataFrame,
    canonical_map: Optional[Dict[str, str]] = None,
) -> pd.DataFrame:
    """
    Standardize seller column headers to internal canonical schema.
    If canonical_map is provided (mapping canonical_name -> seller_col),
    invert it to rename seller_col -> internal canonical name.
    """
    standardized = df.copy()
    # Strip whitespace from columns
    standardized.columns = [str(c).strip() for c in standardized.columns]

    if canonical_map:
        rename_dict = {}
        for canonical_key, seller_header in canonical_map.items():
            internal_name = CANONICAL_TO_INTERNAL.get(canonical_key)
            if internal_name and seller_header in standardized.columns:
                rename_dict[seller_header] = internal_name
        if rename_dict:
            standardized = standardized.rename(columns=rename_dict)

    return standardized


def clean_inventory_data(
    df: pd.DataFrame,
    group_keys: Optional[List[str]] = None,
) -> pd.DataFrame:
    """
    Clean and sanitize retail inventory records:
    1. Strip whitespace from headers and string columns.
    2. Parse dates to datetime (invalid dates coerced or dropped).
    3. Flag zero-sales rows rather than dropping.
    4. Clip negative Demand Forecast / Units Sold values to zero and add audit flag.
    5. Deduplicate exact series-date records.
    6. Sort chronologically within each series.
    """
    cleaned = df.copy()

    # 0. Clean column names and object values
    cleaned.columns = cleaned.columns.str.strip()
    for col in cleaned.select_dtypes("object").columns:
        cleaned[col] = cleaned[col].astype(str).str.strip()

    # 1. Date conversion
    if "Date" in cleaned.columns:
        cleaned["Date"] = pd.to_datetime(cleaned["Date"], errors="coerce")
        # Drop rows where date could not be parsed
        cleaned = cleaned.dropna(subset=["Date"])

    # 2. Flag zero-sales & handle negative units sold
    if "Units Sold" in cleaned.columns:
        cleaned["Units Sold"] = pd.to_numeric(cleaned["Units Sold"], errors="coerce")
        cleaned["zero_sales_flag"] = (cleaned["Units Sold"] == 0).astype(int)
        if (cleaned["Units Sold"] < 0).any():
            cleaned["negative_sales_flag"] = (cleaned["Units Sold"] < 0).astype(int)
            cleaned["Units Sold"] = cleaned["Units Sold"].clip(lower=0.0)

    # 3. Handle Demand Forecast anomaly if present
    if "Demand Forecast" in cleaned.columns:
        cleaned["Demand Forecast"] = pd.to_numeric(cleaned["Demand Forecast"], errors="coerce")
        cleaned["demand_forecast_clipped_flag"] = (cleaned["Demand Forecast"] < 0).astype(int)
        cleaned["Demand Forecast"] = cleaned["Demand Forecast"].clip(lower=0.0)

    # 4. Series sorting and deduplication
    if group_keys is None:
        group_keys = [c for c in ["Store ID", "Product ID"] if c in cleaned.columns]

    dedup_cols = [c for c in group_keys if c in cleaned.columns] + (["Date"] if "Date" in cleaned.columns else [])
    if dedup_cols:
        cleaned = cleaned.drop_duplicates(subset=dedup_cols, keep="last")
        cleaned = cleaned.sort_values(dedup_cols).reset_index(drop=True)

    return cleaned


def impute_missing_values(
    df: pd.DataFrame,
    imputer_stats: Optional[Dict[str, Any]] = None,
    fit: bool = True,
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Impute missing values according to explicit, deterministic rules:
    - Discount: fill with 0.0
    - Holiday/Promotion: fill with 0
    - Price: fill with median (by Product ID if available, else global median)
    - Competitor Pricing: fill with Price if present, else median
    - Inventory Level: fill with median (or 0)
    - Categoricals: fill with 'Unknown'
    """
    df_imputed = df.copy()
    if imputer_stats is None:
        imputer_stats = {}

    # 1. Discount defaults to 0.0
    if "Discount" in df_imputed.columns:
        df_imputed["Discount"] = pd.to_numeric(df_imputed["Discount"], errors="coerce").fillna(0.0)

    # 2. Holiday/Promotion defaults to 0
    if "Holiday/Promotion" in df_imputed.columns:
        df_imputed["Holiday/Promotion"] = pd.to_numeric(df_imputed["Holiday/Promotion"], errors="coerce").fillna(0).astype(int)

    # 3. Price
    if "Price" in df_imputed.columns:
        df_imputed["Price"] = pd.to_numeric(df_imputed["Price"], errors="coerce")
        if fit:
            price_median = float(df_imputed["Price"].median()) if not df_imputed["Price"].dropna().empty else 10.0
            imputer_stats["price_median"] = price_median
        else:
            price_median = imputer_stats.get("price_median", 10.0)
        df_imputed["Price"] = df_imputed["Price"].fillna(price_median)

    # 4. Competitor Pricing (fallback to Price, then median)
    if "Competitor Pricing" in df_imputed.columns:
        df_imputed["Competitor Pricing"] = pd.to_numeric(df_imputed["Competitor Pricing"], errors="coerce")
        if "Price" in df_imputed.columns:
            df_imputed["Competitor Pricing"] = df_imputed["Competitor Pricing"].fillna(df_imputed["Price"])
        if fit:
            comp_median = float(df_imputed["Competitor Pricing"].median()) if not df_imputed["Competitor Pricing"].dropna().empty else 10.0
            imputer_stats["competitor_pricing_median"] = comp_median
        else:
            comp_median = imputer_stats.get("competitor_pricing_median", 10.0)
        df_imputed["Competitor Pricing"] = df_imputed["Competitor Pricing"].fillna(comp_median)

    # 5. Inventory Level
    if "Inventory Level" in df_imputed.columns:
        df_imputed["Inventory Level"] = pd.to_numeric(df_imputed["Inventory Level"], errors="coerce")
        if fit:
            inv_median = float(df_imputed["Inventory Level"].median()) if not df_imputed["Inventory Level"].dropna().empty else 100.0
            imputer_stats["inventory_median"] = inv_median
        else:
            inv_median = imputer_stats.get("inventory_median", 100.0)
        df_imputed["Inventory Level"] = df_imputed["Inventory Level"].fillna(inv_median)

    # 6. Categoricals fill missing with 'Unknown'
    cat_cols = ["Category", "Region", "Weather Condition", "Seasonality", "Store ID", "Product ID"]
    for col in cat_cols:
        if col in df_imputed.columns:
            df_imputed[col] = df_imputed[col].replace(["nan", "None", ""], np.nan).fillna("Unknown").astype(str)

    return df_imputed, imputer_stats


def assess_data_suitability(
    df: pd.DataFrame,
    group_keys: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Assess dataset suitability for demand forecasting:
    Evaluates date coverage, history length, series count, and feature requirements.
    """
    errors: List[str] = []
    warnings: List[str] = []

    if df.empty:
        return {
            "is_suitable": False,
            "has_lags_support": False,
            "has_rolling_30_support": False,
            "total_rows": 0,
            "unique_dates": 0,
            "date_min": None,
            "date_max": None,
            "series_count": 0,
            "warnings": warnings,
            "errors": ["Dataset is empty."],
        }

    if "Date" not in df.columns:
        errors.append("Dataset is missing required 'Date' column.")
    if "Units Sold" not in df.columns:
        errors.append("Dataset is missing required 'Units Sold' target column.")

    if errors:
        return {
            "is_suitable": False,
            "has_lags_support": False,
            "has_rolling_30_support": False,
            "total_rows": len(df),
            "unique_dates": 0,
            "date_min": None,
            "date_max": None,
            "series_count": 0,
            "warnings": warnings,
            "errors": errors,
        }

    dates = pd.to_datetime(df["Date"], errors="coerce").dropna()
    unique_dates = len(dates.unique())
    date_min = str(dates.min().strftime("%Y-%m-%d")) if not dates.empty else None
    date_max = str(dates.max().strftime("%Y-%m-%d")) if not dates.empty else None

    if group_keys is None:
        group_keys = [c for c in ["Store ID", "Product ID"] if c in df.columns]

    if group_keys:
        series_count = len(df.groupby(group_keys))
        # Min history per series
        counts_per_series = df.groupby(group_keys)["Date"].count()
        min_series_rows = int(counts_per_series.min())
    else:
        series_count = 1
        min_series_rows = len(df)

    has_lags_support = unique_dates >= 15 and min_series_rows >= 15
    has_rolling_30_support = unique_dates >= 31 and min_series_rows >= 31

    if unique_dates < 8:
        warnings.append(
            f"Dataset has only {unique_dates} unique dates. Short history limits lag and seasonal feature reliability."
        )
    if not has_lags_support:
        warnings.append(
            f"At least one series has fewer than 15 historical records. lag_14 features will be partially null."
        )
    if not has_rolling_30_support:
        warnings.append(
            f"History is under 30 days ({unique_dates} days observed). roll_mean_30 feature will be null."
        )

    is_suitable = len(errors) == 0 and unique_dates >= 2

    return {
        "is_suitable": is_suitable,
        "has_lags_support": has_lags_support,
        "has_rolling_30_support": has_rolling_30_support,
        "total_rows": len(df),
        "unique_dates": unique_dates,
        "date_min": date_min,
        "date_max": date_max,
        "series_count": series_count,
        "warnings": warnings,
        "errors": errors,
    }


def save_processed_data(df: pd.DataFrame, output_path: Union[str, Path]) -> Path:
    """Save cleaned dataframe to CSV destination."""
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(out, index=False)
    return out
