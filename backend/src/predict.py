"""
Inference and inventory reorder decision module for Inventory Compass.
Loads serialized models and metadata, generates demand forecasts, and assesses
stock-out risks and reorder quantities.
"""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
import joblib
import numpy as np
import pandas as pd


class InventoryPredictor:
    """Predictor class that encapsulates model loading, feature preparation, and replenishment analytics."""

    def __init__(self, models_dir: Optional[Union[str, Path]] = None):
        if models_dir is None:
            models_dir = Path(__file__).resolve().parent.parent / "models"
        self.models_dir = Path(models_dir)

        self.metadata_path = self.models_dir / "model_metadata.json"
        if not self.metadata_path.exists():
            raise FileNotFoundError(f"Model metadata not found at {self.metadata_path}")

        with open(self.metadata_path, "r", encoding="utf-8") as f:
            self.metadata: Dict[str, Any] = json.load(f)

        self.feature_names: List[str] = self.metadata.get("feature_names", [])
        self.col_medians: Dict[str, float] = self.metadata.get("col_medians", {})

        # Locate model file
        model_filename = self.metadata.get("model_file")
        if model_filename and (self.models_dir / model_filename).exists():
            model_file = self.models_dir / model_filename
        else:
            joblib_files = list(self.models_dir.glob("best_model_*.joblib"))
            if not joblib_files:
                raise FileNotFoundError(f"No model .joblib file found in {self.models_dir}")
            model_file = joblib_files[0]

        self.model = joblib.load(model_file)

    def prepare_feature_row(self, input_data: Dict[str, Any]) -> pd.DataFrame:
        """Convert an input dictionary into a aligned feature DataFrame with fallback medians."""
        row_dict = {}
        for feature in self.feature_names:
            if feature in input_data and input_data[feature] is not None:
                row_dict[feature] = float(input_data[feature])
            elif feature in self.col_medians:
                row_dict[feature] = float(self.col_medians[feature])
            else:
                row_dict[feature] = 0.0

        return pd.DataFrame([row_dict], columns=self.feature_names)

    def predict(self, input_data: Union[Dict[str, Any], pd.DataFrame]) -> np.ndarray:
        """Generate point forecasts for input features."""
        if isinstance(input_data, dict):
            features_df = self.prepare_feature_row(input_data)
        elif isinstance(input_data, pd.DataFrame):
            # Align columns and impute medians for missing columns
            features_df = input_data.copy()
            for feat in self.feature_names:
                if feat not in features_df.columns:
                    features_df[feat] = self.col_medians.get(feat, 0.0)
            features_df = features_df[self.feature_names].fillna(self.col_medians)
        else:
            raise ValueError("input_data must be a dict or a pandas DataFrame")

        preds = self.model.predict(features_df)
        # Demand cannot be negative
        return np.maximum(0.0, preds)

    def forecast_inventory_decision(
        self,
        item_data: Dict[str, Any],
        safety_stock_days: float = 2.0,
    ) -> Dict[str, Any]:
        """
        Produce demand forecast and actionable inventory replenishment recommendation:
        - predicted_demand (units)
        - stockout_risk: "HIGH", "MEDIUM", or "LOW"
        - recommended_reorder_qty (units)
        """
        predicted_demand = float(self.predict(item_data)[0])
        current_inventory = float(item_data.get("Inventory Level", self.col_medians.get("Inventory Level", 0.0)))
        lead_time_days = float(item_data.get("lead_time_days", 1.0))

        # Expected consumption during lead time + safety buffer
        expected_lead_demand = predicted_demand * lead_time_days
        safety_stock = predicted_demand * safety_stock_days
        reorder_point = expected_lead_demand + safety_stock

        if current_inventory < expected_lead_demand:
            risk = "HIGH"
            reorder_needed = True
            reorder_qty = round(reorder_point - current_inventory)
        elif current_inventory < reorder_point:
            risk = "MEDIUM"
            reorder_needed = True
            reorder_qty = round(reorder_point - current_inventory)
        else:
            risk = "LOW"
            reorder_needed = False
            reorder_qty = 0

        return {
            "predicted_demand": round(predicted_demand, 2),
            "current_inventory": round(current_inventory, 2),
            "reorder_point": round(reorder_point, 2),
            "stockout_risk": risk,
            "reorder_needed": reorder_needed,
            "recommended_reorder_qty": max(0, reorder_qty),
            "model_type": self.metadata.get("model_type", "Linear Regression"),
        }
