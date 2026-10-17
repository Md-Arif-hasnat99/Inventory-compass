"""
Data loading and preprocessing module for Inventory Compass.
Handles raw retail inventory ingestion, cleaning, validation, and sanitization.
"""

from pathlib import Path
from typing import Union
import pandas as pd
import numpy as np


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


def clean_inventory_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean and sanitize raw retail inventory records:
    1. Parse dates to datetime.
    2. Flag zero-sales rows rather than dropping.
    3. Clip negative Demand Forecast values to zero and add audit flag.
    4. Sort chronologically by Store ID, Product ID, and Date.
    """
    cleaned = df.copy()

    # 0. Clean column names and object values
    cleaned.columns = cleaned.columns.str.strip()
    for col in cleaned.select_dtypes("object").columns:
        cleaned[col] = cleaned[col].astype(str).str.strip()

    # 1. Date conversion
    if "Date" in cleaned.columns:
        cleaned["Date"] = pd.to_datetime(cleaned["Date"])

    # 2. Flag zero-sales
    if "Units Sold" in cleaned.columns:
        cleaned["zero_sales_flag"] = (cleaned["Units Sold"] == 0).astype(int)

    # 3. Handle Demand Forecast anomaly if present
    if "Demand Forecast" in cleaned.columns:
        cleaned["demand_forecast_clipped_flag"] = (cleaned["Demand Forecast"] < 0).astype(int)
        cleaned["Demand Forecast"] = cleaned["Demand Forecast"].clip(lower=0.0)

    # 4. Sort chronologically within each series
    sort_cols = [c for c in ["Store ID", "Product ID", "Date"] if c in cleaned.columns]
    if sort_cols:
        cleaned = cleaned.sort_values(sort_cols).reset_index(drop=True)

    return cleaned


def save_processed_data(df: pd.DataFrame, output_path: Union[str, Path]) -> Path:
    """Save cleaned dataframe to CSV destination."""
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(out, index=False)
    return out
