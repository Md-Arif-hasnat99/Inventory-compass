"""
Unit test suite for Part 5: Inventory replenishment decision engine,
lead-time demand, safety stock, reorder point, stockout risks, and batch API endpoints.
"""

import io
from datetime import datetime, timedelta
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from backend.src.main import app
from backend.src.replenishment import calculate_item_replenishment, generate_batch_replenishment
from backend.src import upload as upload_store


client = TestClient(app)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _create_multi_item_csv(n_days: int = 30) -> bytes:
    """Generate CSV with 2 products having different sales and inventory levels."""
    start = datetime(2024, 1, 1)
    rows = []
    for i in range(n_days):
        dt = start + timedelta(days=i)
        # SKU-High: daily sales 50, low stock 20
        rows.append({
            "Date": dt.strftime("%Y-%m-%d"),
            "Store ID": "Store_1",
            "Product ID": "SKU_HIGH",
            "Units Sold": 50.0,
            "Price": 10.0,
            "Discount": 0.0,
            "Inventory Level": 20.0,
            "Category": "General",
            "Region": "North",
        })
        # SKU-Low: daily sales 5, abundant stock 200
        rows.append({
            "Date": dt.strftime("%Y-%m-%d"),
            "Store ID": "Store_1",
            "Product ID": "SKU_LOW",
            "Units Sold": 5.0,
            "Price": 15.0,
            "Discount": 0.0,
            "Inventory Level": 200.0,
            "Category": "General",
            "Region": "North",
        })
    df = pd.DataFrame(rows)
    buf = io.StringIO()
    df.to_csv(buf, index=False)
    return buf.getvalue().encode("utf-8")


# ---------------------------------------------------------------------------
# 1. calculate_item_replenishment Edge Cases
# ---------------------------------------------------------------------------

class TestItemReplenishmentCalculations:
    def test_zero_demand(self):
        """Zero demand means 0 reorder quantity and LOW risk (if stock > 0)."""
        res = calculate_item_replenishment(
            daily_demand=0.0,
            current_inventory=50.0,
            lead_time_days=3.0,
            safety_stock_days=2.0,
        )
        assert res["daily_demand"] == 0.0
        assert res["reorder_needed"] is False
        assert res["recommended_reorder_qty"] == 0
        assert res["stockout_risk"] == "LOW"

    def test_zero_inventory_triggers_high_risk(self):
        """Zero inventory with positive demand triggers immediate HIGH risk."""
        res = calculate_item_replenishment(
            daily_demand=10.0,
            current_inventory=0.0,
            lead_time_days=3.0,
            safety_stock_days=2.0,
        )
        assert res["stockout_risk"] == "HIGH"
        assert res["reorder_needed"] is True
        # ROP = (10 * 3) + (10 * 2) = 50
        assert res["reorder_point"] == 50.0
        assert res["recommended_reorder_qty"] == 50

    def test_inventory_above_reorder_point(self):
        """Stock exceeding ROP requires 0 reorder and LOW risk."""
        # ROP = 10 * 3 + 10 * 2 = 50. Inventory = 80.
        res = calculate_item_replenishment(
            daily_demand=10.0,
            current_inventory=80.0,
            lead_time_days=3.0,
            safety_stock_days=2.0,
        )
        assert res["stockout_risk"] == "LOW"
        assert res["reorder_needed"] is False
        assert res["recommended_reorder_qty"] == 0

    def test_inventory_between_ltd_and_rop_medium_risk(self):
        """Stock above LTD but below ROP triggers MEDIUM risk reorder."""
        # LTD = 30, ROP = 50. Inventory = 40.
        res = calculate_item_replenishment(
            daily_demand=10.0,
            current_inventory=40.0,
            lead_time_days=3.0,
            safety_stock_days=2.0,
        )
        assert res["stockout_risk"] == "MEDIUM"
        assert res["reorder_needed"] is True
        assert res["recommended_reorder_qty"] == 10  # 50 - 40

    def test_fractional_demand_uses_ceiling(self):
        """Fractional demand results in integer ceiling reorder quantity."""
        # Daily demand = 3.33, LTD = 9.99, SS = 6.66, ROP = 16.65
        # Inventory = 5.0 -> deficit = 11.65 -> ceil is 12
        res = calculate_item_replenishment(
            daily_demand=3.33,
            current_inventory=5.0,
            lead_time_days=3.0,
            safety_stock_days=2.0,
        )
        assert isinstance(res["recommended_reorder_qty"], int)
        assert res["recommended_reorder_qty"] == 12

    def test_outstanding_orders_deducted_from_reorder(self):
        """Outstanding open orders increase net inventory, avoiding over-ordering."""
        # ROP = 50. Current = 20. On order = 30. Net = 50.
        res = calculate_item_replenishment(
            daily_demand=10.0,
            current_inventory=20.0,
            lead_time_days=3.0,
            safety_stock_days=2.0,
            units_on_order=30,
        )
        assert res["net_inventory"] == 50.0
        assert res["stockout_risk"] == "LOW"
        assert res["recommended_reorder_qty"] == 0

    def test_invalid_lead_time_raises_error(self):
        with pytest.raises(ValueError, match="lead_time_days must be >= 1.0"):
            calculate_item_replenishment(daily_demand=10.0, current_inventory=50.0, lead_time_days=0.5)

    def test_invalid_safety_stock_raises_error(self):
        with pytest.raises(ValueError, match="safety_stock_days must be >= 0.0"):
            calculate_item_replenishment(daily_demand=10.0, current_inventory=50.0, safety_stock_days=-1.0)


# ---------------------------------------------------------------------------
# 2. Batch Replenishment Workflow
# ---------------------------------------------------------------------------

class TestBatchReplenishment:
    def test_batch_replenishment_multiple_products(self):
        csv_bytes = _create_multi_item_csv(n_days=30)
        upload_id = upload_store.create_session(csv_bytes, "batch_test.csv")

        res = generate_batch_replenishment(upload_id, horizon_days=7)
        assert res["status"] == "success"
        assert res["upload_id"] == upload_id
        assert len(res["recommendations"]) == 2

        # SKU_HIGH (sales 50, inv 20) -> HIGH risk
        high_sku = next(r for r in res["recommendations"] if r["product_id"] == "SKU_HIGH")
        assert high_sku["stockout_risk"] == "HIGH"
        assert high_sku["reorder_needed"] is True
        assert high_sku["recommended_reorder_qty"] > 0

        # SKU_LOW (sales 5, inv 200) -> LOW risk
        low_sku = next(r for r in res["recommendations"] if r["product_id"] == "SKU_LOW")
        assert low_sku["stockout_risk"] == "LOW"
        assert low_sku["reorder_needed"] is False

        # Check summary KPIs
        summary = res["summary"]
        assert summary["total_skus"] == 2
        assert summary["high_risk_count"] == 1
        assert summary["low_risk_count"] == 1

    def test_inventory_overrides(self):
        csv_bytes = _create_multi_item_csv(n_days=30)
        upload_id = upload_store.create_session(csv_bytes, "overrides_test.csv")

        # Override SKU_HIGH inventory to 500 (above ROP)
        res = generate_batch_replenishment(
            upload_id,
            horizon_days=7,
            inventory_overrides={"SKU_HIGH": 500.0},
        )
        high_sku = next(r for r in res["recommendations"] if r["product_id"] == "SKU_HIGH")
        assert high_sku["current_inventory"] == 500.0
        assert high_sku["stockout_risk"] == "LOW"
        assert high_sku["reorder_needed"] is False


# ---------------------------------------------------------------------------
# 3. FastAPI Replenishment Endpoints
# ---------------------------------------------------------------------------

class TestReplenishmentEndpoints:
    def test_post_and_get_cached_replenishment(self):
        csv_bytes = _create_multi_item_csv(n_days=25)
        upload_id = upload_store.create_session(csv_bytes, "replenish_api.csv")

        # POST /api/replenishment/{upload_id}
        post_resp = client.post(
            f"/api/replenishment/{upload_id}",
            json={"lead_time_days": 3.0, "safety_stock_days": 2.0, "horizon_days": 7},
        )
        assert post_resp.status_code == 200
        data = post_resp.json()
        assert data["upload_id"] == upload_id
        assert "recommendations" in data
        assert "summary" in data

        # GET /api/replenishment/{upload_id}
        get_resp = client.get(f"/api/replenishment/{upload_id}")
        assert get_resp.status_code == 200
        assert get_resp.json()["upload_id"] == upload_id

    def test_nonexistent_session_returns_404(self):
        resp = client.post("/api/replenishment/00000000-0000-0000-0000-000000000000")
        assert resp.status_code == 404
