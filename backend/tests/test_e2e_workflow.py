"""End-to-end integration and workflow verification tests for Inventory Compass.

Tests the full seller lifecycle:
1. CSV Upload (with session creation & validation preview)
2. Column mapping & schema validation
3. Preprocessing & feature generation
4. Multi-step demand forecasting with holdout evaluation
5. Inventory replenishment calculation (ROP, safety stock, risk tiers)
6. Session isolation & cleanup
7. Error and edge case workflows (missing upload, invalid formats, non-existent sessions)
"""

import io
import os
import pytest
import pandas as pd
from fastapi.testclient import TestClient

from backend.src.main import app
from backend.src.upload import get_session


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def sample_seller_csv_bytes():
    """Generates a realistic multi-product, multi-day sales CSV."""
    dates = pd.date_range("2024-01-01", periods=60, freq="D")
    records = []
    for d in dates:
        for store in ["Store_A", "Store_B"]:
            for prod in ["SKU_101", "SKU_102"]:
                records.append({
                    "SaleDate": d.strftime("%Y-%m-%d"),
                    "ShopID": store,
                    "ProductSKU": prod,
                    "QuantitySold": 15 + (d.day % 7) * 3,
                    "InventoryOnHand": 80,
                    "SellingPrice": 25.0,
                    "Category": "Apparel",
                })
    df = pd.DataFrame(records)
    csv_buf = io.BytesIO()
    df.to_csv(csv_buf, index=False)
    csv_buf.seek(0)
    return csv_buf.getvalue()


@pytest.fixture
def minimal_short_csv_bytes():
    """Generates a 5-day dataset to test short-history handling."""
    dates = pd.date_range("2024-01-01", periods=5, freq="D")
    records = []
    for d in dates:
        records.append({
            "date": d.strftime("%Y-%m-%d"),
            "product_id": "SKU_SHORT",
            "units_sold": 10,
        })
    df = pd.DataFrame(records)
    csv_buf = io.BytesIO()
    df.to_csv(csv_buf, index=False)
    csv_buf.seek(0)
    return csv_buf.getvalue()


class TestEndToEndWorkflow:
    def test_complete_upload_to_replenishment_pipeline(self, client, sample_seller_csv_bytes):
        """Tests the full end-to-end chain from upload to replenishment."""
        # 1. Upload CSV
        upload_resp = client.post(
            "/api/upload",
            files={"file": ("shop_data.csv", sample_seller_csv_bytes, "text/csv")},
        )
        assert upload_resp.status_code == 201
        upload_data = upload_resp.json()
        assert "upload_id" in upload_data
        upload_id = upload_data["upload_id"]
        assert upload_data["row_count"] == 240
        assert "SaleDate" in upload_data["detected_columns"]
        assert upload_data["canonical_mapping"]["date"] == "SaleDate"
        assert upload_data["canonical_mapping"]["units_sold"] == "QuantitySold"
        assert upload_data["canonical_mapping"]["product_id"] == "ProductSKU"

        # 2. Validate Dataset
        mapping_payload = {
            "mapping": {
                "date": "SaleDate",
                "units_sold": "QuantitySold",
                "product_id": "ProductSKU",
                "store_id": "ShopID",
                "inventory_level": "InventoryOnHand",
                "price": "SellingPrice",
                "category": "Category",
            }
        }
        val_resp = client.post(f"/api/upload/{upload_id}/validate", json=mapping_payload)
        assert val_resp.status_code == 200
        val_data = val_resp.json()
        assert val_data["status"] in ("valid", "valid_with_warnings")
        assert len(val_data["validation_errors"]) == 0
        assert val_data["row_count"] == 240

        # 3. Generate Forecast (14-day horizon)
        fcast_resp = client.post(f"/api/forecast/{upload_id}?horizon_days=14")
        assert fcast_resp.status_code == 200
        fcast_data = fcast_resp.json()
        assert fcast_data["upload_id"] == upload_id
        assert fcast_data["horizon_days"] == 14
        assert len(fcast_data["predictions"]) > 0
        assert fcast_data["series_count"] == 4  # 2 stores * 2 products
        assert fcast_data["model_source"] in ("seller_trained", "pretrained_pipeline", "baseline_heuristic")
        assert fcast_data["metrics"] is not None
        assert "mae" in fcast_data["metrics"]
        assert "rmse" in fcast_data["metrics"]

        # Verify predictions have expected fields and non-negative values
        for pred in fcast_data["predictions"][:10]:
            assert "date" in pred
            assert "predicted_demand" in pred
            assert pred["predicted_demand"] >= 0
            assert "product_id" in pred
            assert "store_id" in pred

        # 4. Retrieve Cached Forecast
        get_fcast_resp = client.get(f"/api/forecast/{upload_id}")
        assert get_fcast_resp.status_code == 200
        assert get_fcast_resp.json()["upload_id"] == upload_id
        assert len(get_fcast_resp.json()["predictions"]) == len(fcast_data["predictions"])

        # 5. Generate Replenishment Recommendations
        replen_payload = {"lead_time_days": 4.0, "safety_stock_days": 2.0, "horizon_days": 14}
        replen_resp = client.post(f"/api/replenishment/{upload_id}", json=replen_payload)
        assert replen_resp.status_code == 200
        replen_data = replen_resp.json()
        assert replen_data["upload_id"] == upload_id
        assert "recommendations" in replen_data
        assert len(replen_data["recommendations"]) == 4

        for rec in replen_data["recommendations"]:
            assert rec["lead_time_days"] == 4
            assert rec["safety_stock_days"] == 2
            assert rec["daily_demand"] > 0
            assert rec["reorder_point"] > 0
            assert rec["stockout_risk"] in ("HIGH", "MEDIUM", "LOW")
            assert isinstance(rec["recommended_reorder_qty"], int)
            assert rec["recommended_reorder_qty"] >= 0

        # 6. Retrieve Cached Replenishment
        get_replen_resp = client.get(f"/api/replenishment/{upload_id}")
        assert get_replen_resp.status_code == 200
        assert len(get_replen_resp.json()["recommendations"]) == 4

        # 7. Session Cleanup
        del_resp = client.delete(f"/api/upload/{upload_id}")
        assert del_resp.status_code in (200, 204)

        # Subsequent requests must return 404
        get_deleted_fcast = client.get(f"/api/forecast/{upload_id}")
        assert get_deleted_fcast.status_code == 404


class TestSessionIsolationAndSecurity:
    def test_separate_uploads_have_isolated_sessions(self, client, sample_seller_csv_bytes):
        """Verifies that two concurrent uploads get unique IDs and do not collide."""
        resp1 = client.post(
            "/api/upload",
            files={"file": ("dataset_1.csv", sample_seller_csv_bytes, "text/csv")},
        )
        resp2 = client.post(
            "/api/upload",
            files={"file": ("dataset_2.csv", sample_seller_csv_bytes, "text/csv")},
        )
        assert resp1.status_code == 201
        assert resp2.status_code == 201

        id1 = resp1.json()["upload_id"]
        id2 = resp2.json()["upload_id"]
        assert id1 != id2

        # Validate dataset 1
        client.post(f"/api/upload/{id1}/validate", json={"column_mapping": {"date": "SaleDate", "units_sold": "QuantitySold", "product_id": "ProductSKU"}})

        # Check session 1 exists and session 2 is distinct
        s1 = get_session(id1)
        s2 = get_session(id2)
        assert s1 is not None and s2 is not None
        assert s1["upload_id"] == id1
        assert s2["upload_id"] == id2

        # Cleanup
        client.delete(f"/api/upload/{id1}")
        client.delete(f"/api/upload/{id2}")


class TestErrorAndEdgeCases:
    def test_upload_non_csv_rejected(self, client):
        resp = client.post(
            "/api/upload",
            files={"file": ("bad_file.txt", b"not a csv", "text/plain")},
        )
        assert resp.status_code in (400, 415)
        assert "csv" in resp.json()["detail"].lower()

    def test_upload_empty_csv_rejected(self, client):
        resp = client.post(
            "/api/upload",
            files={"file": ("empty.csv", b"", "text/csv")},
        )
        assert resp.status_code == 400
        assert "empty" in resp.json()["detail"].lower()

    def test_forecast_nonexistent_upload_returns_404(self, client):
        resp = client.post("/api/forecast/non-existent-uuid-1234")
        assert resp.status_code == 404

    def test_replenishment_nonexistent_upload_returns_404(self, client):
        resp = client.post("/api/replenishment/non-existent-uuid-1234")
        assert resp.status_code == 404

    def test_short_history_dataset_handles_gracefully(self, client, minimal_short_csv_bytes):
        """Short history (<14 days) should complete with baseline forecast or warnings, not a 500 crash."""
        upload_resp = client.post(
            "/api/upload",
            files={"file": ("short.csv", minimal_short_csv_bytes, "text/csv")},
        )
        assert upload_resp.status_code == 201
        uid = upload_resp.json()["upload_id"]

        val_resp = client.post(f"/api/upload/{uid}/validate", json={
            "mapping": {"date": "date", "units_sold": "units_sold", "product_id": "product_id"}
        })
        assert val_resp.status_code == 200

        # Forecast should return baseline heuristic and not crash
        fcast_resp = client.post(f"/api/forecast/{uid}?horizon_days=7")
        assert fcast_resp.status_code == 200
        fcast_data = fcast_resp.json()
        assert len(fcast_data["predictions"]) == 7
        assert fcast_data["model_source"] in ("baseline_heuristic", "seller_trained")

        client.delete(f"/api/upload/{uid}")


class TestModelEndpointsAndProvenance:
    def test_benchmarks_endpoint_returns_real_metrics(self, client):
        resp = client.get("/api/model/benchmarks")
        assert resp.status_code == 200
        benchmarks = resp.json()
        assert isinstance(benchmarks, list)
        assert len(benchmarks) >= 1
        champ = next((b for b in benchmarks if b.get("isChampion")), None)
        assert champ is not None
        assert "Linear Regression" in champ["modelName"]
        assert "mae" in champ
        assert "rmse" in champ
        assert "wape" in champ

    def test_metadata_endpoint_returns_specification(self, client):
        resp = client.get("/api/model/metadata")
        assert resp.status_code == 200
        meta = resp.json()
        assert "model_type" in meta
        assert "feature_names" in meta
        assert "n_features" in meta
        assert meta["n_features"] == 24
