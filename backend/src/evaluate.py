"""
Evaluation metrics module for Inventory Compass demand forecasting models.
Implements MAE, RMSE, WAPE (Weighted Absolute Percentage Error), and R2.
"""

from typing import Dict
import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


def calculate_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    """
    Calculate regression evaluation metrics for demand forecasting:
    - MAE: Mean Absolute Error (units)
    - RMSE: Root Mean Squared Error (units)
    - WAPE: Weighted Absolute Percentage Error (%) - standard supply chain metric
    - R2: Coefficient of determination
    """
    y_true_arr = np.asarray(y_true, dtype=float)
    y_pred_arr = np.asarray(y_pred, dtype=float)

    mae = float(mean_absolute_error(y_true_arr, y_pred_arr))
    rmse = float(np.sqrt(mean_squared_error(y_true_arr, y_pred_arr)))

    sum_actual = float(np.sum(np.abs(y_true_arr)))
    if sum_actual > 0:
        wape = float((np.sum(np.abs(y_true_arr - y_pred_arr)) / sum_actual) * 100.0)
    else:
        wape = 0.0

    r2 = float(r2_score(y_true_arr, y_pred_arr))

    return {
        "MAE": round(mae, 3),
        "RMSE": round(rmse, 3),
        "WAPE(%)": round(wape, 3),
        "R2": round(r2, 4),
    }
