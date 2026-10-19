"""
Dataset validation module for Inventory Compass seller uploads.
Checks file content, resolves column aliases to canonical schema,
validates dates, demand values, duplicates, and data sufficiency.
"""

from __future__ import annotations

import io
from typing import Any, Dict, List, Optional, Tuple
import pandas as pd

# ---------------------------------------------------------------------------
# Canonical column aliases
# ---------------------------------------------------------------------------

# Maps canonical internal name -> list of accepted seller header variants
COLUMN_ALIASES: Dict[str, List[str]] = {
    "date": ["Date", "date", "transaction_date", "sale_date", "order_date", "sales_date", "SaleDate"],
    "units_sold": [
        "Units Sold", "units_sold", "sales", "quantity_sold", "demand",
        "qty_sold", "units", "quantity", "qty", "UnitsSold", "QuantitySold",
    ],
    "product_id": ["Product ID", "product_id", "ProductID", "SKU", "item_id", "sku", "ProductSKU"],
    "store_id": ["Store ID", "store_id", "StoreID", "shop_id", "store", "location_id", "ShopID"],
    "inventory_level": [
        "Inventory Level", "inventory_level", "stock", "current_inventory",
        "stock_level", "inventory", "on_hand", "onhand", "InventoryOnHand",
    ],
    "price": ["Price", "price", "unit_price", "selling_price", "SellingPrice"],
    "discount": ["Discount", "discount", "discount_pct", "discount_percent", "disc"],
    "promotion": ["Holiday/Promotion", "promotion", "promo", "is_promo", "holiday", "is_holiday"],
    "category": ["Category", "category", "product_category", "dept", "department"],
    "region": ["Region", "region", "area"],
    "weather": ["Weather Condition", "weather", "weather_condition"],
    "seasonality": ["Seasonality", "seasonality", "season"],
    "competitor_pricing": ["Competitor Pricing", "competitor_pricing", "comp_price", "competitor_price"],
}

# Required for any forecast
REQUIRED_CANONICAL = {"date", "units_sold"}

# Minimum number of rows required for meaningful forecasting
MIN_ROWS_FOR_FORECAST = 8

# Minimum unique dates needed for lag-1 feature to exist
MIN_DATES_FOR_LAGS = 2

# Maximum file size in bytes (50 MB)
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------

def resolve_column_mapping(
    headers: List[str],
) -> Tuple[Dict[str, str], List[str]]:
    """
    Map seller column headers to canonical names.

    Returns:
        canonical_map: dict of {canonical_name: original_header}
        unmapped_columns: list of original headers that had no alias match
    """
    header_lookup = {h.strip(): h for h in headers}
    canonical_map: Dict[str, str] = {}
    matched_originals: set = set()

    for canonical, aliases in COLUMN_ALIASES.items():
        for alias in aliases:
            if alias in header_lookup:
                canonical_map[canonical] = header_lookup[alias]
                matched_originals.add(header_lookup[alias])
                break

    unmapped = [h for h in headers if h not in matched_originals]
    return canonical_map, unmapped


def validate_upload(
    file_bytes: bytes,
    filename: str,
    canonical_map: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    """
    Validate a seller-uploaded CSV.

    Steps:
    1. Size and encoding check.
    2. Column detection and alias resolution.
    3. Required column presence.
    4. Date parsing and chronological integrity.
    5. Demand value validity.
    6. Duplicate record detection.
    7. Data sufficiency for forecasting.

    Returns a dict with:
        status: "valid" | "invalid"
        errors: list of blocking error messages
        warnings: list of non-blocking warning messages
        row_count: total rows parsed
        detected_columns: list of original column headers found
        canonical_mapping: resolved {canonical -> original_header}
        unmapped_columns: original headers with no alias match
        date_range: {"min": str, "max": str, "unique_dates": int} if parseable
        preview_rows: first 5 rows as list of dicts (original column names)
    """
    errors: List[str] = []
    warnings: List[str] = []
    result: Dict[str, Any] = {
        "status": "invalid",
        "errors": errors,
        "warnings": warnings,
        "row_count": 0,
        "detected_columns": [],
        "canonical_mapping": {},
        "unmapped_columns": [],
        "date_range": None,
        "preview_rows": [],
    }

    # --- 1. Size check ---
    if len(file_bytes) == 0:
        errors.append("File is empty.")
        return result

    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        errors.append(
            f"File exceeds the maximum allowed size of {MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB "
            f"(uploaded: {len(file_bytes) / (1024 * 1024):.1f} MB)."
        )
        return result

    # --- 2. Encoding and parse ---
    df = _try_parse_csv(file_bytes, errors)
    if df is None:
        return result

    if df.empty or len(df.columns) == 0:
        errors.append("File parsed successfully but contains no data rows.")
        return result

    # Strip whitespace from headers and string values
    df.columns = [str(c).strip() for c in df.columns]
    for col in df.select_dtypes("object").columns:
        df[col] = df[col].astype(str).str.strip()

    result["detected_columns"] = list(df.columns)
    result["row_count"] = len(df)
    result["preview_rows"] = df.head(5).replace({float("nan"): None}).to_dict(orient="records")

    # --- 3. Column alias resolution ---
    resolved_map, unmapped = resolve_column_mapping(list(df.columns))

    # If caller supplied an explicit mapping, merge it (overrides auto-detection)
    if canonical_map:
        resolved_map.update(canonical_map)

    result["canonical_mapping"] = resolved_map
    result["unmapped_columns"] = unmapped

    missing_required = REQUIRED_CANONICAL - set(resolved_map.keys())
    if missing_required:
        errors.append(
            f"Required columns not found or not mapped: {sorted(missing_required)}. "
            f"Expected headers like {[COLUMN_ALIASES[c][0] for c in missing_required]}."
        )
        return result

    # --- 4. Date parsing ---
    date_col = resolved_map["date"]
    parsed_dates, date_errors = _validate_dates(df[date_col])
    errors.extend(date_errors)

    if parsed_dates is not None and len(parsed_dates.dropna()) > 0:
        valid_dates = parsed_dates.dropna()
        result["date_range"] = {
            "min": str(valid_dates.min().date()),
            "max": str(valid_dates.max().date()),
            "unique_dates": int(valid_dates.nunique()),
        }
        if valid_dates.nunique() < MIN_DATES_FOR_LAGS:
            errors.append(
                f"Dataset contains only {valid_dates.nunique()} unique date(s). "
                f"At least {MIN_DATES_FOR_LAGS} distinct dates are required."
            )

    # --- 5. Demand validation ---
    demand_col = resolved_map["units_sold"]
    demand_errors, demand_warnings = _validate_demand(df[demand_col])
    errors.extend(demand_errors)
    warnings.extend(demand_warnings)

    # --- 6. Missing values in required columns ---
    for canonical in REQUIRED_CANONICAL:
        if canonical not in resolved_map:
            continue
        col = resolved_map[canonical]
        null_count = df[col].isna().sum()
        if null_count > 0:
            pct = null_count / len(df) * 100
            warnings.append(
                f"Column '{col}' has {null_count} missing value(s) ({pct:.1f}%). "
                f"Rows with missing required values will be dropped during preprocessing."
            )

    # --- 7. Duplicate detection ---
    duplicate_warnings = _check_duplicates(df, resolved_map)
    warnings.extend(duplicate_warnings)

    # --- 8. Sufficiency check ---
    if len(df) < MIN_ROWS_FOR_FORECAST:
        errors.append(
            f"Dataset has only {len(df)} rows. At least {MIN_ROWS_FOR_FORECAST} rows are required "
            f"for meaningful demand forecasting."
        )

    date_range = result.get("date_range")
    if date_range and date_range["unique_dates"] < 14:
        warnings.append(
            f"Dataset spans {date_range['unique_dates']} unique date(s). "
            f"Lag-14 and rolling-14 features require at least 14 days of history per product. "
            f"Forecasting will proceed but some features will be imputed from medians."
        )
    if date_range and date_range["unique_dates"] < 30:
        warnings.append(
            f"Rolling-30 features require 30+ days of history. "
            f"Only {date_range['unique_dates']} unique date(s) detected; "
            f"roll_mean_30 will be imputed from medians."
        )

    result["status"] = "valid" if not errors else "invalid"
    return result


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _try_parse_csv(file_bytes: bytes, errors: List[str]) -> Optional[pd.DataFrame]:
    """Attempt to parse CSV with UTF-8 then latin-1 encoding fallback."""
    for encoding in ("utf-8", "utf-8-sig", "latin-1"):
        try:
            return pd.read_csv(io.BytesIO(file_bytes), encoding=encoding)
        except UnicodeDecodeError:
            continue
        except pd.errors.EmptyDataError:
            errors.append("File is empty or contains no parseable data.")
            return None
        except Exception as exc:
            errors.append(f"Failed to parse CSV: {exc}")
            return None

    errors.append(
        "File could not be decoded as UTF-8 or Latin-1. "
        "Please save the CSV with UTF-8 encoding and re-upload."
    )
    return None


def _validate_dates(series: pd.Series) -> Tuple[Optional[pd.Series], List[str]]:
    """Parse date column; return parsed Series and any blocking errors."""
    errors: List[str] = []
    try:
        parsed = pd.to_datetime(series, errors="coerce")
    except Exception as exc:
        errors.append(f"Date column could not be parsed: {exc}")
        return None, errors

    n_unparseable = parsed.isna().sum()
    if n_unparseable == len(series):
        errors.append(
            f"No dates in column '{series.name}' could be parsed. "
            f"Sample values: {series.dropna().head(3).tolist()}. "
            f"Expected format: YYYY-MM-DD or similar."
        )
        return None, errors

    if n_unparseable > 0:
        errors.append(
            f"{n_unparseable} date value(s) in column '{series.name}' could not be parsed "
            f"and will be treated as missing."
        )

    return parsed, errors


def _validate_demand(series: pd.Series) -> Tuple[List[str], List[str]]:
    """Validate demand/units-sold column; return (errors, warnings)."""
    errors: List[str] = []
    warnings: List[str] = []

    numeric = pd.to_numeric(series, errors="coerce")
    n_non_numeric = numeric.isna().sum()

    if n_non_numeric == len(series):
        errors.append(
            f"Demand column '{series.name}' contains no numeric values. "
            f"Sample: {series.head(3).tolist()}."
        )
        return errors, warnings

    if n_non_numeric > 0:
        errors.append(
            f"Demand column '{series.name}' has {n_non_numeric} non-numeric value(s) "
            f"that cannot be used for forecasting."
        )

    n_negative = (numeric < 0).sum()
    if n_negative > 0:
        errors.append(
            f"Demand column '{series.name}' contains {n_negative} negative value(s). "
            f"Demand cannot be negative. Please review or remove these rows before uploading."
        )

    n_zero = (numeric == 0).sum()
    if n_zero > 0:
        pct = n_zero / len(series) * 100
        warnings.append(
            f"Demand column '{series.name}' has {n_zero} zero-value row(s) ({pct:.1f}%). "
            f"Zero-sales days are kept but will be flagged during preprocessing."
        )

    return errors, warnings


def _check_duplicates(
    df: pd.DataFrame, canonical_map: Dict[str, str]
) -> List[str]:
    """Check for duplicate Store×Product×Date or Date-only records."""
    warnings: List[str] = []

    date_col = canonical_map.get("date")
    store_col = canonical_map.get("store_id")
    product_col = canonical_map.get("product_id")

    if date_col is None:
        return warnings

    key_cols = [c for c in [store_col, product_col, date_col] if c is not None]
    existing_cols = [c for c in key_cols if c in df.columns]

    if not existing_cols:
        return warnings

    n_dupes = df.duplicated(subset=existing_cols).sum()
    if n_dupes > 0:
        label = " × ".join(existing_cols)
        warnings.append(
            f"{n_dupes} duplicate record(s) detected on [{label}]. "
            f"Duplicates will be dropped (keeping the first occurrence) during preprocessing."
        )

    return warnings
