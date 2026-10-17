"""
Model training and selection pipeline for Inventory Compass.
Trains baselines, Linear Regression, Random Forest, HistGradientBoosting, and XGBoost.
Evaluates using temporal splits and serializes the champion model + metadata.
"""

import json
import os
from datetime import datetime
from pathlib import Path
import time
from typing import Any, Dict, List, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import LinearRegression
from xgboost import XGBRegressor

from .evaluate import calculate_metrics
from .features import FEATURE_COLS, TARGET_COL, build_feature_pipeline
from .preprocessing import clean_inventory_data, load_raw_data


def temporal_train_val_test_split(
    df: pd.DataFrame,
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Split dataset chronologically by date to prevent future data leakage."""
    unique_dates = sorted(df["Date"].unique())
    n = len(unique_dates)

    train_cutoff = unique_dates[int(n * train_ratio)]
    val_cutoff = unique_dates[int(n * (train_ratio + val_ratio))]

    df_train = df[df["Date"] < train_cutoff].copy()
    df_val = df[(df["Date"] >= train_cutoff) & (df["Date"] < val_cutoff)].copy()
    df_test = df[df["Date"] >= val_cutoff].copy()

    return df_train, df_val, df_test


def train_and_select_best_model(
    df_clean: pd.DataFrame,
    models_dir: Path,
    reports_dir: Path,
    random_state: int = 42,
) -> Dict[str, Any]:
    """Train candidates, compare metrics on validation split, and save the best model."""
    models_dir.mkdir(parents=True, exist_ok=True)
    reports_dir.mkdir(parents=True, exist_ok=True)

    # 1. Feature Engineering
    df_feat, encoders = build_feature_pipeline(df_clean, fit_encoders=True)

    # 2. Split
    df_train, df_val, df_test = temporal_train_val_test_split(df_feat)

    # 3. Drop rows missing initial lag features
    min_lags = ["lag_1", "lag_7", "roll_mean_7"]
    df_train_ml = df_train.dropna(subset=min_lags)
    df_val_ml = df_val.dropna(subset=min_lags)
    df_test_ml = df_test.dropna(subset=min_lags)

    # Compute column medians for inference imputation
    col_medians = df_train_ml[FEATURE_COLS].median().to_dict()

    X_train = df_train_ml[FEATURE_COLS].fillna(col_medians)
    y_train = df_train_ml[TARGET_COL]

    X_val = df_val_ml[FEATURE_COLS].fillna(col_medians)
    y_val = df_val_ml[TARGET_COL]

    X_test = df_test_ml[FEATURE_COLS].fillna(col_medians)
    y_test = df_test_ml[TARGET_COL]

    candidates = {
        "Linear Regression": LinearRegression(),
        "HistGradientBoosting": HistGradientBoostingRegressor(
            max_iter=150, max_depth=8, learning_rate=0.08, random_state=random_state
        ),
        "Random Forest": RandomForestRegressor(
            n_estimators=100, max_depth=12, min_samples_leaf=10, random_state=random_state, n_jobs=-1
        ),
        "XGBoost": XGBRegressor(
            n_estimators=150, max_depth=6, learning_rate=0.08, random_state=random_state, n_jobs=-1
        ),
    }

    results = []
    trained_models = {}

    for name, model in candidates.items():
        t0 = time.time()
        model.fit(X_train, y_train)
        train_sec = round(time.time() - t0, 3)

        val_pred = model.predict(X_val)
        test_pred = model.predict(X_test)

        val_m = calculate_metrics(y_val, val_pred)
        test_m = calculate_metrics(y_test, test_pred)

        results.append({
            "Model": name,
            "MAE": val_m["MAE"],
            "RMSE": val_m["RMSE"],
            "WAPE(%)": val_m["WAPE(%)"],
            "Split": "Val",
            "Train_s": train_sec,
        })
        results.append({
            "Model": name,
            "MAE": test_m["MAE"],
            "RMSE": test_m["RMSE"],
            "WAPE(%)": test_m["WAPE(%)"],
            "Split": "Test",
            "Train_s": train_sec,
        })
        trained_models[name] = {
            "model": model,
            "val_m": val_m,
            "test_m": test_m,
        }

    # Comparison DataFrame
    comp_df = pd.DataFrame(results)
    comp_df.to_csv(reports_dir / "model_comparison.csv", index=False)

    # Champion selection: lowest validation MAE
    val_subset = comp_df[comp_df["Split"] == "Val"].sort_values("MAE")
    best_name = str(val_subset.iloc[0]["Model"])
    best_info = trained_models[best_name]
    best_model = best_info["model"]

    # Save champion model
    safe_name = best_name.lower().replace(" ", "_")
    model_path = models_dir / f"best_model_{safe_name}.joblib"
    joblib.dump(best_model, model_path)

    # Save metadata
    meta = {
        "model_type": best_name,
        "target_variable": TARGET_COL,
        "forecast_horizon": "1 day ahead (t+1)",
        "feature_names": FEATURE_COLS,
        "n_features": len(FEATURE_COLS),
        "training_cutoff_date": str(df_train["Date"].max().date()),
        "val_cutoff_date": str(df_val["Date"].max().date()),
        "train_rows": len(df_train_ml),
        "val_rows": len(df_val_ml),
        "test_rows": len(df_test_ml),
        "val_mae": best_info["val_m"]["MAE"],
        "val_rmse": best_info["val_m"]["RMSE"],
        "val_wape": best_info["val_m"]["WAPE(%)"],
        "test_mae": best_info["test_m"]["MAE"],
        "test_rmse": best_info["test_m"]["RMSE"],
        "test_wape": best_info["test_m"]["WAPE(%)"],
        "col_medians": col_medians,
        "random_state": random_state,
        "trained_at": datetime.now().isoformat(),
        "model_file": model_path.name,
    }

    meta_path = models_dir / "model_metadata.json"
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    return {
        "best_model_name": best_name,
        "model_path": str(model_path),
        "metadata_path": str(meta_path),
        "metrics": best_info,
    }


if __name__ == "__main__":
    base_dir = Path(__file__).resolve().parent.parent
    raw_path = base_dir / "data" / "raw" / "retail_store_inventory.csv"
    if raw_path.exists():
        raw_df = load_raw_data(raw_path)
        clean_df = clean_inventory_data(raw_df)
        info = train_and_select_best_model(
            clean_df,
            models_dir=base_dir / "models",
            reports_dir=base_dir / "reports",
        )
        print(f"Training complete. Champion: {info['best_model_name']}")
        print(f"Model saved to: {info['model_path']}")
