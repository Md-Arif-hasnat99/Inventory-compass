"""
Unit and integration tests for Inventory Compass backend pipeline.
"""

from pathlib import Path
import numpy as np
import pandas as pd
import pytest

from backend.src.evaluate import calculate_metrics
from backend.src.features import FEATURE_COLS, TARGET_COL, build_feature_pipeline
from backend.src.predict import InventoryPredictor
from backend.src.preprocessing import clean_inventory_data


@pytest.fixture
def sample_raw_data() -> pd.DataFrame:
    """Create sample dirty raw inventory records."""
    return pd.DataFrame({
        "Store ID": [" S001 ", "S001", "S001", "S002"],
        "Product ID": [" P001 ", "P001", "P001", "P002"],
        "Date": ["2023-01-03", "2023-01-01", "2023-01-02", "2023-01-01"],
        "Units Sold": [0, 120, 150, 80],
        "Demand Forecast": [-10.5, 115.0, 140.0, 75.0],
        "Inventory Level": [300, 200, 150, 400],
        "Price": [25.0, 25.0, 25.0, 50.0],
        "Discount": [0, 10, 5, 0],
        "Holiday/Promotion": [0, 1, 0, 0],
        "Competitor Pricing": [24.0, 26.0, 25.5, 49.0],
        "Category": ["Clothing", "Clothing", "Clothing", "Electronics"],
        "Region": ["North", "North", "North", "West"],
        "Weather Condition": ["Sunny", "Rainy", "Cloudy", "Snowy"],
        "Seasonality": ["Winter", "Winter", "Winter", "Winter"],
    })


def test_clean_inventory_data(sample_raw_data: pd.DataFrame):
    df_clean = clean_inventory_data(sample_raw_data)

    # 1. Zero sales flag
    assert "zero_sales_flag" in df_clean.columns
    assert df_clean["zero_sales_flag"].sum() == 1

    # 2. Demand Forecast clipped
    assert "demand_forecast_clipped_flag" in df_clean.columns
    assert (df_clean["Demand Forecast"] < 0).sum() == 0
    assert df_clean["demand_forecast_clipped_flag"].sum() == 1

    # 3. Sorted chronologically
    s001_dates = df_clean[df_clean["Store ID"].str.contains("S001")]["Date"].tolist()
    assert s001_dates == sorted(s001_dates)


def test_feature_pipeline(sample_raw_data: pd.DataFrame):
    df_clean = clean_inventory_data(sample_raw_data)
    df_feat, encoders = build_feature_pipeline(df_clean)

    # All expected feature columns present
    for col in FEATURE_COLS:
        assert col in df_feat.columns, f"Missing feature: {col}"

    assert TARGET_COL in df_feat.columns
    assert "day_of_week" in df_feat.columns
    assert "store_enc" in df_feat.columns
    assert len(encoders) > 0


def test_calculate_metrics():
    y_true = np.array([100.0, 200.0, 300.0])
    y_pred = np.array([100.0, 200.0, 300.0])

    perfect = calculate_metrics(y_true, y_pred)
    assert perfect["MAE"] == 0.0
    assert perfect["RMSE"] == 0.0
    assert perfect["WAPE(%)"] == 0.0
    assert perfect["R2"] == 1.0

    y_err = np.array([110.0, 190.0, 310.0])
    m = calculate_metrics(y_true, y_err)
    assert m["MAE"] == 10.0
    assert m["WAPE(%)"] == pytest.approx(5.0, rel=1e-2)


def test_predictor_with_trained_model():
    models_dir = Path(__file__).resolve().parent.parent / "models"
    metadata_path = models_dir / "model_metadata.json"

    if not metadata_path.exists():
        pytest.skip("Model metadata not found (run training first)")

    predictor = InventoryPredictor(models_dir=models_dir)

    # Test single point prediction
    sample_input = {
        "day_of_week": 2,
        "month": 6,
        "is_weekend": 0,
        "lag_1": 120.0,
        "lag_7": 115.0,
        "roll_mean_7": 118.0,
        "Price": 45.0,
        "Discount": 10.0,
        "Inventory Level": 20.0,  # Very low inventory
    }
    preds = predictor.predict(sample_input)
    assert len(preds) == 1
    assert preds[0] >= 0.0

    # Test replenishment recommendation
    decision = predictor.forecast_inventory_decision(sample_input)
    assert "predicted_demand" in decision
    assert "stockout_risk" in decision
    assert decision["stockout_risk"] in ["HIGH", "MEDIUM", "LOW"]
    assert decision["reorder_needed"] is True  # with 20 units and ~100 predicted demand, reorder needed
    assert decision["recommended_reorder_qty"] > 0
