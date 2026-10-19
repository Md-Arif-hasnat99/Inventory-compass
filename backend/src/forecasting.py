"""
Demand forecasting engine for Inventory Compass.
Generates multi-step recursive forecasts for seller-uploaded datasets.
Supports:
1. Seller-specific trained model with chronological validation and real metrics.
2. Compatible pretrained model inference.
3. Defensible baseline heuristics (moving average) for cold-start / short-history datasets.
4. Strict temporal safety: recursive multi-step rollout where t+k predictions never access future actuals.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge

from backend.src import upload as upload_store
from backend.src.evaluate import calculate_metrics
from backend.src.features import (
    FEATURE_COLS,
    TARGET_COL,
    add_calendar_features,
    build_feature_pipeline,
)
from backend.src.predict import InventoryPredictor
from backend.src.preprocessing import (
    assess_data_suitability,
    clean_inventory_data,
    impute_missing_values,
    standardize_seller_columns,
)


SUPPORTED_HORIZONS = {7, 14, 30}


def generate_seller_forecast(
    upload_id: str,
    horizon_days: int = 7,
    model_preference: str = "auto",
    store_id: Optional[str] = None,
    product_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Generate multi-step demand forecast for a seller upload session.

    Args:
        upload_id: UUID of the uploaded session
        horizon_days: 7, 14, or 30 days
        model_preference: 'auto' | 'seller_trained' | 'pretrained' | 'baseline'
        store_id: Optional Store ID filter
        product_id: Optional Product ID filter

    Returns:
        Structured forecast response containing model provenance, dates, metrics,
        warnings, and per-day demand predictions.
    """
    if horizon_days not in SUPPORTED_HORIZONS:
        raise ValueError(f"horizon_days must be one of {sorted(SUPPORTED_HORIZONS)}, got {horizon_days}")

    session = upload_store.get_session(upload_id)
    if session is None:
        raise LookupError(f"Upload session '{upload_id}' not found or has expired.")

    temp_path = upload_store.get_temp_path(upload_id)
    if temp_path is None or not temp_path.exists():
        raise LookupError(f"Dataset file for session '{upload_id}' is no longer available.")

    # 1. Ingest raw CSV and apply seller column mapping
    raw_df = pd.read_csv(temp_path)
    canonical_map = session.get("canonical_mapping") or {}
    df = standardize_seller_columns(raw_df, canonical_map=canonical_map)

    # 2. Clean and sort data
    df = clean_inventory_data(df)

    # 3. Assess suitability
    suitability = assess_data_suitability(df)
    warnings = list(suitability.get("warnings", []))
    if not suitability["is_suitable"]:
        return {
            "upload_id": upload_id,
            "status": "insufficient_data",
            "model_type": "None",
            "model_source": "none",
            "horizon_days": horizon_days,
            "forecast_dates": [],
            "series_count": 0,
            "total_predictions": 0,
            "metrics": None,
            "warnings": warnings,
            "errors": suitability["errors"],
            "predictions": [],
        }

    # 4. Optional series filtering
    if store_id and "Store ID" in df.columns:
        df = df[df["Store ID"].astype(str) == str(store_id)]
    if product_id and "Product ID" in df.columns:
        df = df[df["Product ID"].astype(str) == str(product_id)]

    if df.empty:
        raise ValueError(
            f"No data matching filters store_id='{store_id}' and product_id='{product_id}'."
        )

    # 5. Impute contextual missing values
    df, _ = impute_missing_values(df, fit=True)

    # 6. Series grouping identification
    group_keys = [c for c in ["Store ID", "Product ID"] if c in df.columns]

    # Check date coverage
    unique_dates_count = suitability["unique_dates"]

    # 7. Model Strategy Determination
    # If history is short (< 14 unique dates) or user asked for baseline
    use_baseline = model_preference == "baseline" or (
        model_preference == "auto" and unique_dates_count < 14
    )

    metrics: Optional[Dict[str, Any]] = None
    model_source: str
    model_type: str
    is_baseline: bool

    if use_baseline:
        model_source = "baseline_heuristic"
        model_type = "Baseline (7-day Moving Average)" if unique_dates_count >= 7 else "Baseline (Mean Demand)"
        is_baseline = True
        warnings.append(
            f"Short history ({unique_dates_count} unique dates). Forecast generated using {model_type}."
        )
        fitted_model = None
        encoders = {}
    elif model_preference == "pretrained":
        # Check if pretrained model artifact is available
        try:
            predictor = InventoryPredictor()
            fitted_model = predictor
            model_source = "pretrained_compatible"
            model_type = predictor.metadata.get("model_type", "Linear Regression (Pretrained)")
            is_baseline = False
            encoders = {}
        except Exception as exc:
            warnings.append(f"Pretrained model could not be loaded ({exc}). Falling back to seller-specific training.")
            fitted_model, encoders, metrics = _train_seller_model(df, group_keys)
            model_source = "seller_trained"
            model_type = "Ridge Regression (Seller-Trained)"
            is_baseline = False
    else:
        # Default 'auto' with sufficient history or explicit 'seller_trained'
        fitted_model, encoders, metrics = _train_seller_model(df, group_keys)
        model_source = "seller_trained"
        model_type = "Ridge Regression (Seller-Trained)"
        is_baseline = False

    # 8. Recursive Multi-Step Rollout per Series
    predictions = _perform_recursive_rollout(
        df=df,
        group_keys=group_keys,
        horizon_days=horizon_days,
        fitted_model=fitted_model,
        encoders=encoders,
        is_baseline=is_baseline,
    )

    # 9. Extract distinct forecast dates
    forecast_dates = sorted(list({p["date"] for p in predictions}))

    result = {
        "upload_id": upload_id,
        "status": "success",
        "model_type": model_type,
        "model_source": model_source,
        "horizon_days": horizon_days,
        "forecast_dates": forecast_dates,
        "series_count": suitability["series_count"],
        "total_predictions": len(predictions),
        "metrics": metrics,
        "warnings": warnings,
        "predictions": predictions,
    }

    # Cache on upload session
    upload_store.store_session_forecast(upload_id, result)
    return result


# ---------------------------------------------------------------------------
# Seller Model Training & Real Evaluation
# ---------------------------------------------------------------------------

def _train_seller_model(
    df: pd.DataFrame,
    group_keys: List[str],
) -> Tuple[Any, Dict[str, Any], Optional[Dict[str, Any]]]:
    """
    Train a fast, robust regression model on the seller's historical data.
    Uses chronological validation split to compute real MAE, RMSE, and WAPE.
    """
    # 1. Feature Engineering
    df_feat, encoders = build_feature_pipeline(
        df,
        fit_encoders=True,
        group_keys=group_keys,
        unknown_value=-1,
    )

    # Ensure all FEATURE_COLS exist in df_feat
    for feat in FEATURE_COLS:
        if feat not in df_feat.columns:
            df_feat[feat] = 0.0

    avail_features = FEATURE_COLS

    # Filter out rows with NaN in features (from early lags)
    valid_mask = df_feat[avail_features].notna().all(axis=1) & df_feat[TARGET_COL].notna()
    df_valid = df_feat[valid_mask].copy()

    if len(df_valid) < 10:
        # Too few samples with valid lags; train on all available rows using median fill
        X_all = df_feat[avail_features].fillna(0.0)
        y_all = df_feat[TARGET_COL].fillna(0.0)
        model = Ridge(alpha=1.0)
        model.fit(X_all, y_all)
        return model, encoders, None

    # Temporal split: 80% train, 20% test
    unique_dates = sorted(df_valid["Date"].unique())
    n_dates = len(unique_dates)

    if n_dates >= 10:
        cutoff_idx = max(1, int(n_dates * 0.80))
        split_date = unique_dates[cutoff_idx]

        train_mask = df_valid["Date"] < split_date
        test_mask = df_valid["Date"] >= split_date

        X_train = df_valid.loc[train_mask, avail_features]
        y_train = df_valid.loc[train_mask, TARGET_COL]
        X_test = df_valid.loc[test_mask, avail_features]
        y_test = df_valid.loc[test_mask, TARGET_COL]

        model = Ridge(alpha=1.0)
        model.fit(X_train, y_train)

        # Evaluate on independent test set
        if len(y_test) > 0:
            y_pred = np.maximum(0.0, model.predict(X_test))
            calc = calculate_metrics(y_test.values, y_pred)
            metrics = {
                "mae": calc.get("MAE"),
                "rmse": calc.get("RMSE"),
                "wape": calc.get("WAPE(%)"),
                "r2": calc.get("R2"),
                "test_samples": len(y_test),
            }
        else:
            metrics = None

        # Re-fit on full data for maximum forecast accuracy into future
        model.fit(df_valid[avail_features], df_valid[TARGET_COL])
        return model, encoders, metrics
    else:
        model = Ridge(alpha=1.0)
        model.fit(df_valid[avail_features], df_valid[TARGET_COL])
        return model, encoders, None


# ---------------------------------------------------------------------------
# Recursive Multi-Step Rollout Loop
# ---------------------------------------------------------------------------

def _perform_recursive_rollout(
    df: pd.DataFrame,
    group_keys: List[str],
    horizon_days: int,
    fitted_model: Any,
    encoders: Dict[str, Any],
    is_baseline: bool,
) -> List[Dict[str, Any]]:
    """
    Perform multi-step recursive forecasting for each series.
    Guarantees no future actuals leak: each step t+k uses either previous actuals (for t)
    or recursive predictions (for t+1 .. t+k-1).
    """
    predictions: List[Dict[str, Any]] = []

    if group_keys:
        series_groups = df.groupby(group_keys, as_index=False)
        groups_iter = [(name, grp) for name, grp in series_groups]
    else:
        groups_iter = [("all", df)]

    for group_name, series_df in groups_iter:
        series_df = series_df.sort_values("Date").reset_index(drop=True)
        if series_df.empty:
            continue

        store_val = str(series_df["Store ID"].iloc[0]) if "Store ID" in series_df.columns else None
        product_val = str(series_df["Product ID"].iloc[0]) if "Product ID" in series_df.columns else None

        last_date = series_df["Date"].max()
        history_sales = list(series_df["Units Sold"].fillna(0.0).values)

        # Last contextual values
        last_price = float(series_df["Price"].iloc[-1]) if "Price" in series_df.columns else 10.0
        last_discount = float(series_df["Discount"].iloc[-1]) if "Discount" in series_df.columns else 0.0
        last_inv = float(series_df["Inventory Level"].iloc[-1]) if "Inventory Level" in series_df.columns else 100.0
        last_comp = float(series_df["Competitor Pricing"].iloc[-1]) if "Competitor Pricing" in series_df.columns else last_price

        # Categorical encodings
        def _safe_transform(enc: Any, val: Any) -> int:
            if enc is None or not hasattr(enc, "classes_"):
                return 0
            mapping = {c: idx for idx, c in enumerate(enc.classes_)}
            return mapping.get(str(val), -1)

        cat_val = str(series_df["Category"].iloc[-1]) if "Category" in series_df.columns else "Unknown"
        region_val = str(series_df["Region"].iloc[-1]) if "Region" in series_df.columns else "Unknown"
        weather_val = str(series_df["Weather Condition"].iloc[-1]) if "Weather Condition" in series_df.columns else "Unknown"
        season_val = str(series_df["Seasonality"].iloc[-1]) if "Seasonality" in series_df.columns else "Unknown"

        store_enc = _safe_transform(encoders.get("Store ID"), store_val)
        product_enc = _safe_transform(encoders.get("Product ID"), product_val)
        category_enc = _safe_transform(encoders.get("Category"), cat_val)
        region_enc = _safe_transform(encoders.get("Region"), region_val)
        weather_enc = _safe_transform(encoders.get("Weather Condition"), weather_val)
        season_enc = _safe_transform(encoders.get("Seasonality"), season_val)

        # Step-by-step rollout
        for step in range(1, horizon_days + 1):
            target_date = last_date + timedelta(days=step)

            if is_baseline or fitted_model is None:
                # Baseline forecast: 7-day moving average or mean
                recent = history_sales[-7:] if len(history_sales) >= 7 else history_sales
                pred_demand = float(np.mean(recent)) if recent else 0.0
            elif isinstance(fitted_model, InventoryPredictor):
                # Using pretrained model predictor
                row_dict = {
                    "day_of_week": target_date.dayofweek,
                    "day_of_month": target_date.day,
                    "month": target_date.month,
                    "week_of_year": target_date.isocalendar().week,
                    "is_weekend": 1 if target_date.dayofweek >= 5 else 0,
                    "quarter": (target_date.month - 1) // 3 + 1,
                    "lag_1": history_sales[-1] if len(history_sales) >= 1 else 0.0,
                    "lag_7": history_sales[-7] if len(history_sales) >= 7 else history_sales[-1],
                    "lag_14": history_sales[-14] if len(history_sales) >= 14 else history_sales[-1],
                    "roll_mean_7": float(np.mean(history_sales[-7:])),
                    "roll_mean_14": float(np.mean(history_sales[-14:])),
                    "roll_mean_30": float(np.mean(history_sales[-30:])),
                    "roll_std_7": float(np.std(history_sales[-7:])),
                    "store_enc": store_enc,
                    "product_enc": product_enc,
                    "category_enc": category_enc,
                    "region_enc": region_enc,
                    "weather_enc": weather_enc,
                    "season_enc": season_enc,
                    "Price": last_price,
                    "Discount": last_discount,
                    "Inventory Level": last_inv,
                    "Holiday/Promotion": 0,
                    "Competitor Pricing": last_comp,
                }
                pred_demand = float(fitted_model.predict(row_dict)[0])
            else:
                # Seller-trained scikit-learn model
                row_dict = {
                    "day_of_week": target_date.dayofweek,
                    "day_of_month": target_date.day,
                    "month": target_date.month,
                    "week_of_year": target_date.isocalendar().week,
                    "is_weekend": 1 if target_date.dayofweek >= 5 else 0,
                    "quarter": (target_date.month - 1) // 3 + 1,
                    "lag_1": history_sales[-1] if len(history_sales) >= 1 else 0.0,
                    "lag_7": history_sales[-7] if len(history_sales) >= 7 else history_sales[-1],
                    "lag_14": history_sales[-14] if len(history_sales) >= 14 else history_sales[-1],
                    "roll_mean_7": float(np.mean(history_sales[-7:])),
                    "roll_mean_14": float(np.mean(history_sales[-14:])),
                    "roll_mean_30": float(np.mean(history_sales[-30:])),
                    "roll_std_7": float(np.std(history_sales[-7:])),
                    "store_enc": store_enc,
                    "product_enc": product_enc,
                    "category_enc": category_enc,
                    "region_enc": region_enc,
                    "weather_enc": weather_enc,
                    "season_enc": season_enc,
                    "Price": last_price,
                    "Discount": last_discount,
                    "Inventory Level": last_inv,
                    "Holiday/Promotion": 0,
                    "Competitor Pricing": last_comp,
                }
                feature_row = pd.DataFrame([row_dict])[FEATURE_COLS].fillna(0.0)
                pred_demand = float(fitted_model.predict(feature_row)[0])

            # Demand cannot be negative
            pred_demand = max(0.0, round(pred_demand, 2))

            # RECURSIVE INJECTION: append prediction into history for next steps
            history_sales.append(pred_demand)

            predictions.append({
                "date": target_date.strftime("%Y-%m-%d"),
                "store_id": store_val,
                "product_id": product_val,
                "predicted_demand": pred_demand,
                "is_baseline": is_baseline,
            })

    return predictions
