"""
Generate comprehensive F1-score evaluation graphs for Inventory Compass.
Assesses demand classification & replenishment triggers on temporal test holdout.
Generates: backend/reports/f1_score_graph.png
"""

from pathlib import Path
import json
import joblib
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import f1_score, precision_score, recall_score, confusion_matrix
from sklearn.ensemble import HistGradientBoostingRegressor, RandomForestRegressor
from xgboost import XGBRegressor

from backend.src.preprocessing import clean_inventory_data, load_raw_data
from backend.src.features import build_feature_pipeline, FEATURE_COLS
from backend.src.train import temporal_train_val_test_split


def generate_f1_analysis():
    print("Loading data...")
    raw_path = Path(__file__).resolve().parent.parent / "data" / "raw" / "retail_store_inventory.csv"
    reports_dir = Path(__file__).resolve().parent.parent / "reports"
    models_dir = Path(__file__).resolve().parent.parent / "models"
    reports_dir.mkdir(parents=True, exist_ok=True)

    df_raw = load_raw_data(raw_path)
    df_clean = clean_inventory_data(df_raw)
    df_feat, encoders = build_feature_pipeline(df_clean, fit_encoders=True)
    train_df, val_df, test_df = temporal_train_val_test_split(df_feat)

    print("Loading champion model...")
    champion_path = models_dir / "best_model_linear_regression.joblib"
    lr_model = joblib.load(champion_path)
    y_test_true = test_df["Units Sold"].values
    y_test_pred_lr = np.maximum(0, lr_model.predict(test_df[FEATURE_COLS]))

    # 1. Sweep thresholds to compute Precision, Recall, and F1 curve
    percentiles = np.linspace(20, 85, 30)
    thresh_values = [float(np.percentile(train_df["Units Sold"], p)) for p in percentiles]
    f1_list, prec_list, rec_list = [], [], []

    for thresh in thresh_values:
        y_bin_true = (y_test_true >= thresh).astype(int)
        y_bin_pred = (y_test_pred_lr >= thresh).astype(int)
        f1_list.append(f1_score(y_bin_true, y_bin_pred, zero_division=0))
        prec_list.append(precision_score(y_bin_true, y_bin_pred, zero_division=0))
        rec_list.append(recall_score(y_bin_true, y_bin_pred, zero_division=0))

    best_idx = int(np.argmax(f1_list))
    best_thresh = thresh_values[best_idx]
    best_f1 = f1_list[best_idx]
    best_prec = prec_list[best_idx]
    best_rec = rec_list[best_idx]

    print(f"Optimal F1: {best_f1:.4f} at Demand Threshold = {best_thresh:.1f} (Prec: {best_prec:.4f}, Rec: {best_rec:.4f})")

    # 2. Compare F1 Score across architectures at median replenishment trigger
    median_thresh = float(np.median(train_df["Units Sold"]))
    y_bin_test = (y_test_true >= median_thresh).astype(int)

    # Train / evaluate comparison models for benchmark
    rf_model = RandomForestRegressor(n_estimators=30, max_depth=10, random_state=42, n_jobs=-1)
    rf_model.fit(train_df[FEATURE_COLS], train_df["Units Sold"])
    y_test_pred_rf = np.maximum(0, rf_model.predict(test_df[FEATURE_COLS]))

    hgb_model = HistGradientBoostingRegressor(max_iter=50, max_depth=6, random_state=42)
    hgb_model.fit(train_df[FEATURE_COLS], train_df["Units Sold"])
    y_test_pred_hgb = np.maximum(0, hgb_model.predict(test_df[FEATURE_COLS]))

    xgb_model = XGBRegressor(n_estimators=50, max_depth=4, learning_rate=0.1, random_state=42, n_jobs=-1)
    xgb_model.fit(train_df[FEATURE_COLS], train_df["Units Sold"])
    y_test_pred_xgb = np.maximum(0, xgb_model.predict(test_df[FEATURE_COLS]))

    models_comparison = {
        "Linear Regression (Champion)": y_test_pred_lr,
        "Random Forest": y_test_pred_rf,
        "HistGradientBoosting": y_test_pred_hgb,
        "XGBoost": y_test_pred_xgb,
        "Seasonal Naive (lag-7)": test_df["lag_7"].values,
        "Naive (lag-1)": test_df["lag_1"].values,
    }

    comp_results = []
    for name, pred in models_comparison.items():
        y_bin_p = (pred >= median_thresh).astype(int)
        score_f1 = f1_score(y_bin_test, y_bin_p, zero_division=0)
        score_p = precision_score(y_bin_test, y_bin_p, zero_division=0)
        score_r = recall_score(y_bin_test, y_bin_p, zero_division=0)
        comp_results.append({
            "Model": name,
            "F1": round(float(score_f1), 4),
            "Precision": round(float(score_p), 4),
            "Recall": round(float(score_r), 4),
        })

    df_comp = pd.DataFrame(comp_results)
    print("\nModel F1 Comparison Table:")
    print(df_comp.to_string(index=False))

    # 3. Create Multi-Panel High-Quality Visualization
    plt.style.use("seaborn-v0_8-whitegrid")
    fig, axes = plt.subplots(1, 3, figsize=(18, 5.5), dpi=120)

    # Panel A: Precision, Recall & F1 Curve vs Threshold
    ax0 = axes[0]
    ax0.plot(thresh_values, f1_list, label=f"F1-Score (Peak: {best_f1:.3f})", color="#059669", lw=2.5)
    ax0.plot(thresh_values, prec_list, label="Precision", color="#0284c7", lw=1.8, linestyle="--")
    ax0.plot(thresh_values, rec_list, label="Recall", color="#ea580c", lw=1.8, linestyle=":")
    ax0.axvline(best_thresh, color="#dc2626", linestyle="-.", alpha=0.8, label=f"Optimal F1 Cutoff ({best_thresh:.0f} u)")
    ax0.set_title("A. F1-Score & Precision-Recall Curve vs Threshold", fontsize=11, fontweight="bold", pad=10)
    ax0.set_xlabel("Replenishment Decision Threshold (Units Sold)")
    ax0.set_ylabel("Metric Score (0.0 – 1.0)")
    ax0.set_ylim(-0.02, 1.05)
    ax0.legend(loc="upper right", frameon=True, fontsize=9)

    # Panel B: F1-Score Comparison Across Models
    ax1 = axes[1]
    palette = ["#059669", "#10b981", "#34d399", "#6ee7b7", "#94a3b8", "#cbd5e1"]
    bars = ax1.barh(df_comp["Model"], df_comp["F1"], color=palette)
    ax1.set_xlim(0, 0.95)
    ax1.set_title(f"B. F1-Score by Architecture (Median Demand Trigger: {median_thresh:.0f} u)", fontsize=11, fontweight="bold", pad=10)
    ax1.set_xlabel("F1-Score")
    ax1.invert_yaxis()
    for bar in bars:
        w = bar.get_width()
        ax1.text(w + 0.015, bar.get_y() + bar.get_height() / 2, f"{w:.3f}", va="center", ha="left", fontsize=9, fontweight="bold")

    # Panel C: Confusion Matrix at Peak F1
    ax2 = axes[2]
    y_opt_pred = (y_test_pred_lr >= best_thresh).astype(int)
    y_opt_true = (y_test_true >= best_thresh).astype(int)
    cm = confusion_matrix(y_opt_true, y_opt_pred)
    sns.heatmap(
        cm,
        annot=True,
        fmt="d",
        cmap="Blues",
        cbar=False,
        ax=ax2,
        xticklabels=["Normal", "Stockout Risk"],
        yticklabels=["Normal", "Stockout Risk"],
    )
    ax2.set_title(f"C. Holdout Confusion Matrix at Peak F1\n(Threshold = {best_thresh:.0f} Units)", fontsize=11, fontweight="bold", pad=10)
    ax2.set_xlabel("Predicted Event")
    ax2.set_ylabel("Actual Event")

    plt.suptitle("Inventory Compass — Machine Learning F1-Score & Stockout Classification Report", fontsize=14, fontweight="bold", y=1.03)
    plt.tight_layout()

    out_plot = reports_dir / "f1_score_graph.png"
    plt.savefig(out_plot, bbox_inches="tight")
    plt.close()
    print(f"Saved F1 graph to {out_plot}")

    # Export JSON metrics for frontend API consumption
    curve_data = [
        {
            "threshold": round(thresh_values[i], 1),
            "f1": round(f1_list[i], 3),
            "precision": round(prec_list[i], 3),
            "recall": round(rec_list[i], 3),
        }
        for i in range(len(thresh_values))
    ]

    metrics_export = {
        "best_f1": round(best_f1, 4),
        "best_threshold": round(best_thresh, 1),
        "best_precision": round(best_prec, 4),
        "best_recall": round(best_rec, 4),
        "model_comparison": comp_results,
        "curve": curve_data,
        "confusion_matrix": {
            "tn": int(cm[0, 0]),
            "fp": int(cm[0, 1]),
            "fn": int(cm[1, 0]),
            "tp": int(cm[1, 1]),
        },
    }

    metrics_path = reports_dir / "f1_metrics.json"
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics_export, f, indent=2)
    print(f"Saved F1 metrics JSON to {metrics_path}")


if __name__ == "__main__":
    generate_f1_analysis()
