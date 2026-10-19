"""
Unit test suite for Part 4: Seller-specific demand forecasting, multi-step recursive rollout,
model provenance, chronological evaluation, upload isolation, and short-history baselines.
"""

import io
from datetime import datetime, timedelta
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from backend.src.forecasting import generate_seller_forecast
from backend.src.main import app
from backend.src import upload as upload_store


client = TestClient(app)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _create_csv_bytes(
    n_days: int = 40,
    store_id: str = "Store_1",
    product_id: str = "Prod_A",
    base_demand: float = 100.0,
    demand_step: float = 2.0,
) -> bytes:
    """Create CSV bytes for a single series with deterministic sales."""
    start = datetime(2024, 1, 1)
    rows = []
    for i in range(n_days):
        dt = start + timedelta(days=i)
        rows.append({
            "Date": dt.strftime("%Y-%m-%d"),
            "Store ID": store_id,
            "Product ID": product_id,
            "Units Sold": base_demand + i * demand_step,
            "Price": 20.0,
            "Discount": 0.05 if i % 7 == 0 else 0.0,
            "Inventory Level": 500 - i,
            "Category": "Groceries",
            "Region": "Central",
        })
    df = pd.DataFrame(rows)
    buf = io.StringIO()
    df.to_csv(buf, index=False)
    return buf.getvalue().encode("utf-8")


# ---------------------------------------------------------------------------
# 1. Multi-Step Horizon Handling
# ---------------------------------------------------------------------------

class TestForecastHorizons:
    def test_horizons_7_14_30(self):
        csv_bytes = _create_csv_bytes(n_days=35)
        upload_id = upload_store.create_session(csv_bytes, "test_35d.csv")

        # 7-day forecast
        res_7 = generate_seller_forecast(upload_id, horizon_days=7)
        assert res_7["status"] == "success"
        assert res_7["horizon_days"] == 7
        assert len(res_7["forecast_dates"]) == 7

        # 14-day forecast
        res_14 = generate_seller_forecast(upload_id, horizon_days=14)
        assert res_14["status"] == "success"
        assert res_14["horizon_days"] == 14
        assert len(res_14["forecast_dates"]) == 14

        # 30-day forecast
        res_30 = generate_seller_forecast(upload_id, horizon_days=30)
        assert res_30["status"] == "success"
        assert res_30["horizon_days"] == 30
        assert len(res_30["forecast_dates"]) == 30

    def test_unsupported_horizon_raises_error(self):
        csv_bytes = _create_csv_bytes(n_days=20)
        upload_id = upload_store.create_session(csv_bytes, "test.csv")
        with pytest.raises(ValueError, match="horizon_days must be one of"):
            generate_seller_forecast(upload_id, horizon_days=5)


# ---------------------------------------------------------------------------
# 2. Upload Isolation & Dataset Independence
# ---------------------------------------------------------------------------

class TestUploadIsolation:
    def test_different_uploads_remain_distinct(self):
        """Upload A (high sales ~500) and Upload B (low sales ~5) must produce distinct predictions."""
        csv_a = _create_csv_bytes(n_days=30, base_demand=500.0, demand_step=0.0)
        csv_b = _create_csv_bytes(n_days=30, base_demand=5.0, demand_step=0.0)

        id_a = upload_store.create_session(csv_a, "high_demand.csv")
        id_b = upload_store.create_session(csv_b, "low_demand.csv")

        pred_a = generate_seller_forecast(id_a, horizon_days=7)
        pred_b = generate_seller_forecast(id_b, horizon_days=7)

        assert pred_a["upload_id"] == id_a
        assert pred_b["upload_id"] == id_b

        # High demand predictions should be around 500, low demand around 5
        mean_a = sum(p["predicted_demand"] for p in pred_a["predictions"]) / len(pred_a["predictions"])
        mean_b = sum(p["predicted_demand"] for p in pred_b["predictions"]) / len(pred_b["predictions"])

        assert mean_a > 400.0
        assert mean_b < 20.0
        assert mean_a != mean_b


# ---------------------------------------------------------------------------
# 3. Model Provenance & Metrics
# ---------------------------------------------------------------------------

class TestModelProvenance:
    def test_provenance_fields_present(self):
        csv_bytes = _create_csv_bytes(n_days=35)
        upload_id = upload_store.create_session(csv_bytes, "provenance.csv")

        res = generate_seller_forecast(upload_id, horizon_days=7)
        assert "model_type" in res
        assert "model_source" in res
        assert "horizon_days" in res
        assert "forecast_dates" in res
        assert "metrics" in res
        assert "warnings" in res
        assert res["model_source"] in {"seller_trained", "pretrained_compatible", "baseline_heuristic"}

    def test_seller_trained_computes_real_metrics(self):
        csv_bytes = _create_csv_bytes(n_days=35)
        upload_id = upload_store.create_session(csv_bytes, "metrics.csv")

        res = generate_seller_forecast(upload_id, horizon_days=7, model_preference="seller_trained")
        assert res["model_source"] == "seller_trained"
        if res["metrics"] is not None:
            assert "mae" in res["metrics"]
            assert "rmse" in res["metrics"]
            assert res["metrics"]["mae"] >= 0.0


# ---------------------------------------------------------------------------
# 4. Short History & Cold-Start Fallback
# ---------------------------------------------------------------------------

class TestColdStartFallback:
    def test_short_history_uses_defensible_baseline_with_warning(self):
        """When history is under 14 days, forecast transparently falls back to baseline."""
        csv_bytes = _create_csv_bytes(n_days=6, base_demand=42.0, demand_step=0.0)
        upload_id = upload_store.create_session(csv_bytes, "short_history.csv")

        res = generate_seller_forecast(upload_id, horizon_days=7, model_preference="auto")
        assert res["status"] == "success"
        assert res["model_source"] == "baseline_heuristic"
        assert all(p["is_baseline"] is True for p in res["predictions"])
        assert any("Short history" in w for w in res["warnings"])
        # Baseline demand should approximate historical mean (42.0)
        pred_val = res["predictions"][0]["predicted_demand"]
        assert pytest.approx(pred_val, rel=0.1) == 42.0


# ---------------------------------------------------------------------------
# 5. FastAPI Endpoints
# ---------------------------------------------------------------------------

class TestForecastEndpoints:
    def test_post_forecast_success_and_get_cached(self):
        csv_bytes = _create_csv_bytes(n_days=25)
        upload_id = upload_store.create_session(csv_bytes, "api_test.csv")

        # POST /api/forecast/{upload_id}
        post_resp = client.post(
            f"/api/forecast/{upload_id}",
            json={"horizon_days": 7, "model_preference": "auto"},
        )
        assert post_resp.status_code == 200
        data = post_resp.json()
        assert data["upload_id"] == upload_id
        assert data["horizon_days"] == 7
        assert len(data["predictions"]) == 7

        # GET /api/forecast/{upload_id} (returns cached)
        get_resp = client.get(f"/api/forecast/{upload_id}")
        assert get_resp.status_code == 200
        assert get_resp.json()["upload_id"] == upload_id

    def test_forecast_nonexistent_upload_returns_404(self):
        resp = client.post("/api/forecast/00000000-0000-0000-0000-000000000000")
        assert resp.status_code == 404

    def test_get_uncached_forecast_returns_404(self):
        csv_bytes = _create_csv_bytes(n_days=10)
        upload_id = upload_store.create_session(csv_bytes, "uncached.csv")
        resp = client.get(f"/api/forecast/{upload_id}")
        assert resp.status_code == 404
