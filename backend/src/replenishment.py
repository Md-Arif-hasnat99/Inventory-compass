"""
Inventory Replenishment Decision Engine for Inventory Compass.
Calculates expected lead-time demand, safety stock, reorder point (ROP),
stockout risk tiers, and integer reorder recommendations from demand forecasts.
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd

from backend.src import upload as upload_store
from backend.src.forecasting import generate_seller_forecast
from backend.src.preprocessing import clean_inventory_data, standardize_seller_columns


def calculate_item_replenishment(
    daily_demand: float,
    current_inventory: float,
    lead_time_days: float = 3.0,
    safety_stock_days: float = 2.0,
    units_on_order: int = 0,
    item_metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Calculate inventory replenishment metrics for a single item/series.

    Calculations:
    1. Expected Lead-Time Demand (LTD) = daily_demand * lead_time_days
    2. Safety Stock (SS) = daily_demand * safety_stock_days
    3. Reorder Point (ROP) = LTD + SS
    4. Net Inventory = current_inventory + units_on_order
    5. Risk Tier:
       - HIGH: current_inventory <= 0 or net_inventory < LTD (stockout before lead time delivery)
       - MEDIUM: net_inventory < ROP (stock dipped below target safety buffer)
       - LOW: net_inventory >= ROP (sufficient inventory)
    6. Recommended Reorder Qty:
       ceil(ROP - net_inventory) if net_inventory < ROP else 0
       (Always an integer >= 0, rounded up for non-integer demand)
    """
    if lead_time_days < 1.0:
        raise ValueError(f"lead_time_days must be >= 1.0, got {lead_time_days}")
    if safety_stock_days < 0.0:
        raise ValueError(f"safety_stock_days must be >= 0.0, got {safety_stock_days}")
    if units_on_order < 0:
        raise ValueError(f"units_on_order must be >= 0, got {units_on_order}")

    daily_demand = max(0.0, float(daily_demand))
    current_inventory = float(current_inventory)
    units_on_order = int(units_on_order)
    net_inventory = current_inventory + units_on_order

    expected_lead_demand = daily_demand * lead_time_days
    safety_stock = daily_demand * safety_stock_days
    reorder_point = expected_lead_demand + safety_stock

    if daily_demand == 0.0:
        # Zero demand scenario
        risk = "HIGH" if current_inventory <= 0 else "LOW"
        reorder_needed = False
        reorder_qty = 0
        days_of_supply = float("inf") if current_inventory > 0 else 0.0
    else:
        days_of_supply = round(current_inventory / daily_demand, 1)
        if current_inventory <= 0 or net_inventory < expected_lead_demand:
            risk = "HIGH"
            reorder_needed = True
            reorder_qty = math.ceil(max(0.0, reorder_point - net_inventory))
        elif net_inventory < reorder_point:
            risk = "MEDIUM"
            reorder_needed = True
            reorder_qty = math.ceil(max(0.0, reorder_point - net_inventory))
        else:
            risk = "LOW"
            reorder_needed = False
            reorder_qty = 0

    res = {
        "daily_demand": round(daily_demand, 2),
        "current_inventory": round(current_inventory, 2),
        "units_on_order": units_on_order,
        "net_inventory": round(net_inventory, 2),
        "lead_time_days": float(lead_time_days),
        "safety_stock_days": float(safety_stock_days),
        "expected_lead_demand": round(expected_lead_demand, 2),
        "safety_stock": round(safety_stock, 2),
        "reorder_point": round(reorder_point, 2),
        "stockout_risk": risk,
        "reorder_needed": reorder_needed,
        "recommended_reorder_qty": int(reorder_qty),
        "days_of_supply": days_of_supply if not math.isinf(days_of_supply) else None,
    }

    if item_metadata:
        res.update(item_metadata)

    return res


def generate_batch_replenishment(
    upload_id: str,
    lead_time_days: float = 3.0,
    safety_stock_days: float = 2.0,
    horizon_days: int = 7,
    inventory_overrides: Optional[Dict[str, float]] = None,
) -> Dict[str, Any]:
    """
    Generate inventory replenishment recommendations for all series in an uploaded dataset.

    Args:
        upload_id: Upload session ID
        lead_time_days: Expected supplier lead time in days (>= 1.0)
        safety_stock_days: Buffer days for safety stock (>= 0.0)
        horizon_days: Horizon over which to average forecast demand (7, 14, 30)
        inventory_overrides: Optional dict of {product_id: current_inventory_level}

    Returns:
        Structured replenishment response with recommendations per SKU and summary KPIs.
    """
    if lead_time_days < 1.0:
        raise ValueError(f"lead_time_days must be >= 1.0, got {lead_time_days}")
    if safety_stock_days < 0.0:
        raise ValueError(f"safety_stock_days must be >= 0.0, got {safety_stock_days}")

    session = upload_store.get_session(upload_id)
    if session is None:
        raise LookupError(f"Upload session '{upload_id}' not found or has expired.")

    temp_path = upload_store.get_temp_path(upload_id)
    if temp_path is None or not temp_path.exists():
        raise LookupError(f"Dataset file for session '{upload_id}' is no longer available.")

    # 1. Fetch or generate forecast
    forecast_data = upload_store.get_session_forecast(upload_id)
    if forecast_data is None or forecast_data.get("horizon_days") != horizon_days:
        forecast_data = generate_seller_forecast(upload_id, horizon_days=horizon_days)

    if forecast_data.get("status") != "success":
        return {
            "upload_id": upload_id,
            "status": "error",
            "message": "Cannot calculate replenishment: forecast failed or data is insufficient.",
            "recommendations": [],
            "summary": {},
            "warnings": forecast_data.get("warnings", []),
        }

    # 2. Extract latest inventory levels from uploaded dataset
    raw_df = pd.read_csv(temp_path)
    canonical_map = session.get("canonical_mapping") or {}
    df = standardize_seller_columns(raw_df, canonical_map=canonical_map)
    df = clean_inventory_data(df)

    warnings: List[str] = list(forecast_data.get("warnings", []))
    inventory_overrides = inventory_overrides or {}

    has_inv_col = "Inventory Level" in df.columns
    if not has_inv_col and not inventory_overrides:
        warnings.append(
            "Uploaded dataset contains no 'Inventory Level' column. "
            "Inventory levels defaulted to 0; override inventory levels for exact recommendations."
        )

    # 3. Group predictions by series (Store ID, Product ID)
    preds = forecast_data.get("predictions", [])
    series_preds: Dict[Tuple[Optional[str], Optional[str]], List[float]] = {}
    for p in preds:
        key = (p.get("store_id"), p.get("product_id"))
        series_preds.setdefault(key, []).append(float(p.get("predicted_demand", 0.0)))

    recommendations: List[Dict[str, Any]] = []

    for (store_id, product_id), pred_list in series_preds.items():
        daily_demand = float(np.mean(pred_list)) if pred_list else 0.0

        # Determine current inventory
        if product_id and product_id in inventory_overrides:
            current_inv = float(inventory_overrides[product_id])
        elif has_inv_col:
            # Query last observed inventory for this series
            sub = df
            if store_id and "Store ID" in sub.columns:
                sub = sub[sub["Store ID"].astype(str) == str(store_id)]
            if product_id and "Product ID" in sub.columns:
                sub = sub[sub["Product ID"].astype(str) == str(product_id)]

            if not sub.empty:
                val = sub["Inventory Level"].dropna()
                current_inv = float(val.iloc[-1]) if not val.empty else 0.0
            else:
                current_inv = 0.0
        else:
            current_inv = 0.0

        item_meta = {
            "store_id": store_id,
            "product_id": product_id,
        }

        rec = calculate_item_replenishment(
            daily_demand=daily_demand,
            current_inventory=current_inv,
            lead_time_days=lead_time_days,
            safety_stock_days=safety_stock_days,
            units_on_order=0,
            item_metadata=item_meta,
        )
        recommendations.append(rec)

    # 4. Summary metrics
    high_count = sum(1 for r in recommendations if r["stockout_risk"] == "HIGH")
    med_count = sum(1 for r in recommendations if r["stockout_risk"] == "MEDIUM")
    low_count = sum(1 for r in recommendations if r["stockout_risk"] == "LOW")
    total_reorder = sum(r["recommended_reorder_qty"] for r in recommendations)

    result = {
        "upload_id": upload_id,
        "status": "success",
        "lead_time_days": lead_time_days,
        "safety_stock_days": safety_stock_days,
        "horizon_days": horizon_days,
        "recommendations": recommendations,
        "summary": {
            "total_skus": len(recommendations),
            "high_risk_count": high_count,
            "medium_risk_count": med_count,
            "low_risk_count": low_count,
            "total_reorder_units": total_reorder,
        },
        "warnings": warnings,
    }

    # Cache on upload session
    upload_store.store_session_replenishment(upload_id, result)
    return result
