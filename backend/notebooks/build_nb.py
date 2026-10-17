"""
build_nb.py  –  Generates backend/notebooks/inventory_compass_pipeline.ipynb
Run with:  python backend/notebooks/build_nb.py
"""
import json
from pathlib import Path

OUT = Path(__file__).parent / "inventory_compass_pipeline.ipynb"


def md(src: str) -> dict:
    return {"cell_type": "markdown", "metadata": {}, "source": [src]}


def code(src: str) -> dict:
    return {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [src],
    }


# ── Cell sources ──────────────────────────────────────────────────────────────

CELL_00_MD = """\
# Inventory Compass — Full ML Pipeline

**Goal:** Retail demand forecasting using classical ML on a synthetic retail dataset.

**Pipeline:**
1. Load & Inspect Data
2. Data Cleaning & Preprocessing
3. Exploratory Data Analysis
4. Feature Engineering (no-leakage lag/rolling features)
5. Temporal Train / Validation / Test Split (70 / 15 / 15 %)
6. Baseline Models (Naive, Seasonal Naive)
7. ML Models: LinearRegression, RandomForest, HistGradientBoosting, XGBoost
8. Evaluate & Compare
9. Save Best Model + Metadata
10. Download Helper

> **Target variable:** `Units Sold` (daily sales per Store-Product)  \\
> **Forecast horizon:** Next-day demand (t+1), using only information available through day t
"""

CELL_01_IMPORTS = """\
import warnings; warnings.filterwarnings("ignore")
import time, json, math, os, zipfile
from pathlib import Path
from datetime import datetime

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import joblib

from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor, HistGradientBoostingRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error, mean_squared_error
from xgboost import XGBRegressor

# ── Reproducibility ──────────────────────────────────────────────────────────
RANDOM_STATE = 42
np.random.seed(RANDOM_STATE)

# ── Paths (notebook lives in backend/notebooks/) ─────────────────────────────
BACKEND_DIR   = Path(os.path.abspath(".."))
RAW_CSV       = BACKEND_DIR / "data" / "raw"  / "retail_store_inventory.csv"
PROCESSED_CSV = BACKEND_DIR / "data" / "processed" / "clean_inventory.csv"
MODELS_DIR    = BACKEND_DIR / "models"
REPORTS_DIR   = BACKEND_DIR / "reports"
for d in (MODELS_DIR, REPORTS_DIR, PROCESSED_CSV.parent):
    d.mkdir(parents=True, exist_ok=True)

# ── Plot style ───────────────────────────────────────────────────────────────
plt.style.use("seaborn-v0_8-whitegrid")
sns.set_palette("tab10")
plt.rcParams.update({"figure.dpi": 110, "figure.figsize": (12, 4)})

import sklearn, xgboost
print("Backend dir :", BACKEND_DIR)
print("Raw CSV     :", RAW_CSV.exists(), RAW_CSV)
print("Pandas      :", pd.__version__)
print("Scikit-learn:", sklearn.__version__)
print("XGBoost     :", xgboost.__version__)
"""

CELL_02_MD = "## 1. Load & Inspect Data"

CELL_02_LOAD = """\
df_raw = pd.read_csv(RAW_CSV)

# Strip whitespace from column names and all string values
df_raw.columns = df_raw.columns.str.strip()
for col in df_raw.select_dtypes("object").columns:
    df_raw[col] = df_raw[col].str.strip()

print(f"Shape: {df_raw.shape}")
print(f"Columns: {df_raw.columns.tolist()}")
df_raw.head(3)
"""

CELL_03_INSPECT = """\
print("=== Missing Values ===")
print(df_raw.isnull().sum())
print()
print("Stores   :", sorted(df_raw["Store ID"].unique()))
print("Products :", df_raw["Product ID"].nunique(), "unique")
print("Dates    :", df_raw["Date"].min(), "->", df_raw["Date"].max())
print()
print("Units Sold:")
print(df_raw["Units Sold"].describe())
print()
print(f"Zero sales rows              : {(df_raw['Units Sold']==0).sum()}")
print(f"Negative Demand Forecast rows: {(df_raw['Demand Forecast']<0).sum()}")
print()
dup = df_raw.duplicated(subset=["Store ID","Product ID","Date"]).sum()
sp_c = df_raw.groupby(["Store ID","Product ID"]).size()
print(f"Duplicate Store-Product-Date rows: {dup}")
print(f"Rows per Store-Product: min={sp_c.min()}, max={sp_c.max()}, balanced={sp_c.min()==sp_c.max()}")
"""

CELL_04_MD = "## 2. Data Cleaning & Preprocessing"

CELL_04_CLEAN = """\
df = df_raw.copy()

# Parse dates
df["Date"] = pd.to_datetime(df["Date"])

# Flag zero-sales (keep, don't silently drop)
df["zero_sales_flag"] = (df["Units Sold"] == 0).astype(int)
print(f"Zero-sales rows flagged: {df['zero_sales_flag'].sum()}")

# Clip negative Demand Forecast values; add flag
df["demand_forecast_clipped_flag"] = (df["Demand Forecast"] < 0).astype(int)
df["Demand Forecast"] = df["Demand Forecast"].clip(lower=0.0)
print(f"Demand Forecast rows clipped to 0: {df['demand_forecast_clipped_flag'].sum()}")

# Sort chronologically within each Store-Product series
df = df.sort_values(["Store ID", "Product ID", "Date"]).reset_index(drop=True)

# Save cleaned data
df.to_csv(PROCESSED_CSV, index=False)
print(f"\\nCleaned data saved -> {PROCESSED_CSV}")
print(f"Shape: {df.shape}")
df.head(3)
"""

CELL_05_MD = "## 3. Exploratory Data Analysis"

CELL_05_EDA = """\
# ── Daily average sales over time ────────────────────────────────────────────
daily_avg = df.groupby("Date")["Units Sold"].mean()

fig, ax = plt.subplots(figsize=(14, 4))
daily_avg.plot(ax=ax, linewidth=0.8, color="steelblue", label="Daily avg")
daily_avg.rolling(30).mean().plot(ax=ax, linewidth=2, color="tomato", label="30-day rolling mean")
ax.set_title("Average Daily Units Sold (All Store-Products)", fontsize=13)
ax.set_xlabel("Date"); ax.set_ylabel("Avg Units Sold"); ax.legend()
plt.tight_layout()
plt.savefig(REPORTS_DIR / "eda_daily_avg_sales.png", dpi=110)
plt.show()
"""

CELL_06_EDA2 = """\
# ── Sales distribution & category breakdown ───────────────────────────────────
fig, axes = plt.subplots(1, 2, figsize=(13, 4))

axes[0].hist(df["Units Sold"], bins=50, color="steelblue", edgecolor="white")
axes[0].set_title("Distribution of Units Sold")
axes[0].set_xlabel("Units Sold"); axes[0].set_ylabel("Frequency")

cat_avg = df.groupby("Category")["Units Sold"].mean().sort_values(ascending=False)
axes[1].bar(cat_avg.index, cat_avg.values, color=sns.color_palette("tab10", len(cat_avg)))
axes[1].set_title("Average Units Sold by Category")
axes[1].set_xlabel("Category"); axes[1].set_ylabel("Avg Units Sold")
axes[1].tick_params(axis="x", rotation=20)

plt.tight_layout()
plt.savefig(REPORTS_DIR / "eda_sales_distribution.png", dpi=110)
plt.show()
"""

CELL_07_EDA3 = """\
# ── Day-of-week pattern & store-level comparison ─────────────────────────────
df["day_of_week"] = df["Date"].dt.dayofweek
dow_avg = df.groupby("day_of_week")["Units Sold"].mean()
dow_labels = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]

fig, axes = plt.subplots(1, 2, figsize=(13, 4))
axes[0].bar(dow_labels, dow_avg.values, color="steelblue")
axes[0].set_title("Average Sales by Day of Week")
axes[0].set_xlabel("Day"); axes[0].set_ylabel("Avg Units Sold")

store_avg = df.groupby("Store ID")["Units Sold"].mean().sort_values(ascending=False)
axes[1].bar(store_avg.index, store_avg.values, color=sns.color_palette("tab10", len(store_avg)))
axes[1].set_title("Average Sales by Store")
axes[1].set_xlabel("Store ID"); axes[1].set_ylabel("Avg Units Sold")

plt.tight_layout()
plt.savefig(REPORTS_DIR / "eda_dow_store.png", dpi=110)
plt.show()

# Correlation with Units Sold
for col in ["Price", "Discount", "Inventory Level", "Competitor Pricing"]:
    print(f"Corr({col}, Units Sold): {df[col].corr(df['Units Sold']):.4f}")
"""

CELL_08_EDA4 = """\
# ── Seasonality & promotions ──────────────────────────────────────────────────
fig, axes = plt.subplots(1, 2, figsize=(13, 4))

seas_order = df.groupby("Seasonality")["Units Sold"].mean().sort_values(ascending=False).index
sns.boxplot(x="Seasonality", y="Units Sold", data=df, palette="Set2", order=seas_order, ax=axes[0])
axes[0].set_title("Units Sold by Season")

promo_avg = df.groupby("Holiday/Promotion")["Units Sold"].mean()
axes[1].bar(["No Promo/Holiday", "Promo/Holiday"], promo_avg.values, color=["steelblue", "tomato"])
axes[1].set_title("Avg Sales: Normal vs Promo/Holiday")
axes[1].set_ylabel("Avg Units Sold")

plt.tight_layout()
plt.savefig(REPORTS_DIR / "eda_seasonality_promo.png", dpi=110)
plt.show()
"""

CELL_09_MD = "## 4. Feature Engineering\n\n> **No-leakage guarantee:** All lag and rolling features use `shift(1)` so day T only sees sales from day T-1 and earlier. Rolling windows are also shifted. Features are computed *within* each Store-Product group."

CELL_09_FEAT = """\
def build_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df = df.sort_values(["Store ID", "Product ID", "Date"]).reset_index(drop=True)

    # Calendar features (always available at prediction time)
    df["day_of_week"]  = df["Date"].dt.dayofweek
    df["day_of_month"] = df["Date"].dt.day
    df["month"]        = df["Date"].dt.month
    df["week_of_year"] = df["Date"].dt.isocalendar().week.astype(int)
    df["is_weekend"]   = (df["day_of_week"] >= 5).astype(int)
    df["quarter"]      = df["Date"].dt.quarter

    # Lag features per Store-Product (shift=1: use yesterday's sales for today)
    grp = df.groupby(["Store ID", "Product ID"])["Units Sold"]
    df["lag_1"]  = grp.shift(1)
    df["lag_7"]  = grp.shift(7)
    df["lag_14"] = grp.shift(14)

    # Rolling means (shift first, then roll — excludes current day)
    shifted = grp.shift(1)
    df["roll_mean_7"]  = shifted.transform(lambda x: x.rolling(7,  min_periods=3).mean())
    df["roll_mean_14"] = shifted.transform(lambda x: x.rolling(14, min_periods=7).mean())
    df["roll_mean_30"] = shifted.transform(lambda x: x.rolling(30, min_periods=14).mean())
    df["roll_std_7"]   = shifted.transform(lambda x: x.rolling(7,  min_periods=3).std())

    # Encode categorical identifiers (tree models handle these fine as integers)
    df["store_enc"]    = LabelEncoder().fit_transform(df["Store ID"])
    df["product_enc"]  = LabelEncoder().fit_transform(df["Product ID"])
    df["category_enc"] = LabelEncoder().fit_transform(df["Category"])
    df["region_enc"]   = LabelEncoder().fit_transform(df["Region"])
    df["weather_enc"]  = LabelEncoder().fit_transform(df["Weather Condition"])
    df["season_enc"]   = LabelEncoder().fit_transform(df["Seasonality"])

    return df


df = build_features(df)

FEATURE_COLS = [
    # Calendar
    "day_of_week", "day_of_month", "month", "week_of_year", "is_weekend", "quarter",
    # Lag / rolling
    "lag_1", "lag_7", "lag_14", "roll_mean_7", "roll_mean_14", "roll_mean_30", "roll_std_7",
    # Encoded categoricals
    "store_enc", "product_enc", "category_enc", "region_enc", "weather_enc", "season_enc",
    # Contextual numerics (known before the sale day)
    "Price", "Discount", "Inventory Level", "Holiday/Promotion", "Competitor Pricing",
]
TARGET = "Units Sold"

print(f"Total features: {len(FEATURE_COLS)}")
print(FEATURE_COLS)
df[FEATURE_COLS + [TARGET]].head(3)
"""

CELL_10_MD = "## 5. Temporal Train / Validation / Test Split\n\nSplit is by **date** (not random rows). 70% train / 15% val / 15% test."

CELL_10_SPLIT = """\
unique_dates = sorted(df["Date"].unique())
n = len(unique_dates)

train_cutoff = unique_dates[int(n * 0.70)]
val_cutoff   = unique_dates[int(n * 0.85)]

df_train = df[df["Date"] <  train_cutoff].copy()
df_val   = df[(df["Date"] >= train_cutoff) & (df["Date"] < val_cutoff)].copy()
df_test  = df[df["Date"] >= val_cutoff].copy()

print(f"Total unique dates : {n}")
print(f"Train : {df_train['Date'].min().date()} -> {df_train['Date'].max().date()}  {len(df_train):,} rows")
print(f"Val   : {df_val['Date'].min().date()}   -> {df_val['Date'].max().date()}  {len(df_val):,} rows")
print(f"Test  : {df_test['Date'].min().date()}  -> {df_test['Date'].max().date()}  {len(df_test):,} rows")
"""

CELL_11_PREP = """\
# Drop rows where minimum lag features are NaN
# (first ~7 days of each series can't compute all rolling windows)
MIN_LAGS = ["lag_1", "lag_7", "roll_mean_7"]

df_train_ml = df_train.dropna(subset=MIN_LAGS)
df_val_ml   = df_val.dropna(subset=MIN_LAGS)
df_test_ml  = df_test.dropna(subset=MIN_LAGS)

print(f"After NaN-drop: train={len(df_train_ml):,}, val={len(df_val_ml):,}, test={len(df_test_ml):,}")

X_train = df_train_ml[FEATURE_COLS]; y_train = df_train_ml[TARGET]
X_val   = df_val_ml[FEATURE_COLS];   y_val   = df_val_ml[TARGET]
X_test  = df_test_ml[FEATURE_COLS];  y_test  = df_test_ml[TARGET]

# Median fill for models that don't handle NaN (LinearRegression, RandomForest, XGBoost)
col_medians     = X_train.median()
X_train_filled  = X_train.fillna(col_medians)
X_val_filled    = X_val.fillna(col_medians)
X_test_filled   = X_test.fillna(col_medians)

print(f"X_train: {X_train_filled.shape}  X_val: {X_val_filled.shape}  X_test: {X_test_filled.shape}")
"""

CELL_12_MD = "## 6. Baseline Models"

CELL_12_BASE = """\
def compute_metrics(y_true, y_pred, name="Model"):
    mae  = mean_absolute_error(y_true, y_pred)
    rmse = math.sqrt(mean_squared_error(y_true, y_pred))
    denom = np.abs(np.asarray(y_true)).sum()
    wape = 100 * np.abs(np.asarray(y_true) - np.asarray(y_pred)).sum() / denom if denom > 0 else float("nan")
    return {"Model": name, "MAE": round(mae, 3), "RMSE": round(rmse, 3), "WAPE(%)": round(wape, 3)}


results = []   # collect all model scores

# Naive: predict yesterday's sales
val_naive  = compute_metrics(df_val_ml[TARGET],  df_val_ml["lag_1"].fillna(0),  "Naive (lag-1)")
test_naive = compute_metrics(df_test_ml[TARGET], df_test_ml["lag_1"].fillna(0), "Naive (lag-1)")
results.append({**val_naive,  "Split": "Val",  "Train_s": 0})
results.append({**test_naive, "Split": "Test", "Train_s": 0})
print("Naive — Val :", val_naive)
print("Naive — Test:", test_naive)

# Seasonal naive: predict same weekday last week
val_snv   = compute_metrics(df_val_ml[TARGET],  df_val_ml["lag_7"].fillna(0),  "Seasonal Naive (lag-7)")
test_snv  = compute_metrics(df_test_ml[TARGET], df_test_ml["lag_7"].fillna(0), "Seasonal Naive (lag-7)")
results.append({**val_snv,  "Split": "Val",  "Train_s": 0})
results.append({**test_snv, "Split": "Test", "Train_s": 0})
print("Seasonal Naive — Val :", val_snv)
print("Seasonal Naive — Test:", test_snv)
"""

CELL_13_MD = "## 7. Train ML Models"

CELL_13_LR = """\
# ── 7.1 Linear Regression ─────────────────────────────────────────────────────
print("Training Linear Regression...")
t0 = time.time()
lr = LinearRegression()
lr.fit(X_train_filled, y_train)
lr_time = round(time.time() - t0, 2)

lr_val  = compute_metrics(y_val,  lr.predict(X_val_filled),  "Linear Regression")
lr_test = compute_metrics(y_test, lr.predict(X_test_filled), "Linear Regression")
results += [{**lr_val, "Split":"Val","Train_s":lr_time}, {**lr_test, "Split":"Test","Train_s":lr_time}]
print(f"  {lr_time}s | Val: {lr_val} | Test: {lr_test}")
"""

CELL_14_RF = """\
# ── 7.2 Random Forest ─────────────────────────────────────────────────────────
print("Training Random Forest (200 trees, max_depth=12)...")
t0 = time.time()
rf = RandomForestRegressor(
    n_estimators=200, max_depth=12, min_samples_leaf=5,
    n_jobs=-1, random_state=RANDOM_STATE)
rf.fit(X_train_filled, y_train)
rf_time = round(time.time() - t0, 2)

rf_val  = compute_metrics(y_val,  rf.predict(X_val_filled),  "Random Forest")
rf_test = compute_metrics(y_test, rf.predict(X_test_filled), "Random Forest")
results += [{**rf_val, "Split":"Val","Train_s":rf_time}, {**rf_test, "Split":"Test","Train_s":rf_time}]
print(f"  {rf_time}s | Val: {rf_val} | Test: {rf_test}")
"""

CELL_15_HGB = """\
# ── 7.3 HistGradientBoosting (handles NaN natively) ──────────────────────────
print("Training HistGradientBoostingRegressor (300 iters)...")
t0 = time.time()
hgb = HistGradientBoostingRegressor(
    max_iter=300, learning_rate=0.05, max_depth=6,
    min_samples_leaf=20, random_state=RANDOM_STATE)
hgb.fit(X_train, y_train)   # use un-filled X — HGB handles NaN internally
hgb_time = round(time.time() - t0, 2)

hgb_val  = compute_metrics(y_val,  hgb.predict(X_val),  "HistGradientBoosting")
hgb_test = compute_metrics(y_test, hgb.predict(X_test), "HistGradientBoosting")
results += [{**hgb_val, "Split":"Val","Train_s":hgb_time}, {**hgb_test, "Split":"Test","Train_s":hgb_time}]
print(f"  {hgb_time}s | Val: {hgb_val} | Test: {hgb_test}")
"""

CELL_16_XGB = """\
# ── 7.4 XGBoost (CPU hist method) ────────────────────────────────────────────
print("Training XGBoost (400 trees, hist, CPU)...")
t0 = time.time()
xgb_model = XGBRegressor(
    n_estimators=400, learning_rate=0.05, max_depth=6,
    subsample=0.8, colsample_bytree=0.8,
    tree_method="hist", device="cpu",
    random_state=RANDOM_STATE, n_jobs=-1, verbosity=0)
xgb_model.fit(X_train_filled, y_train,
              eval_set=[(X_val_filled, y_val)], verbose=False)
xgb_time = round(time.time() - t0, 2)

xgb_val  = compute_metrics(y_val,  xgb_model.predict(X_val_filled),  "XGBoost")
xgb_test = compute_metrics(y_test, xgb_model.predict(X_test_filled), "XGBoost")
results += [{**xgb_val, "Split":"Val","Train_s":xgb_time}, {**xgb_test, "Split":"Test","Train_s":xgb_time}]
print(f"  {xgb_time}s | Val: {xgb_val} | Test: {xgb_test}")
"""

CELL_17_MD = "## 8. Evaluate & Compare All Models"

CELL_17_EVAL = """\
results_df = pd.DataFrame(results)

val_tbl  = results_df[results_df["Split"]=="Val"].sort_values("MAE").reset_index(drop=True)
test_tbl = results_df[results_df["Split"]=="Test"].reset_index(drop=True)

print("=== VALIDATION RESULTS (sorted by MAE) ===")
display(val_tbl[["Model","MAE","RMSE","WAPE(%)","Train_s"]])
print()
print("=== TEST RESULTS ===")
display(test_tbl[["Model","MAE","RMSE","WAPE(%)"]])
"""

CELL_18_SAVE_CSV = """\
results_df.to_csv(REPORTS_DIR / "model_comparison.csv", index=False)
print(f"Saved model_comparison.csv -> {REPORTS_DIR}")

# Validation MAE bar chart
fig, ax = plt.subplots(figsize=(10, 4))
plot_df = val_tbl[["Model","MAE"]].copy()
bars = ax.barh(plot_df["Model"], plot_df["MAE"],
               color=["#4C72B0","#DD8452","#55A868","#C44E52","#8172B2","#937860"][:len(plot_df)])
ax.bar_label(bars, fmt="%.2f", padding=4)
ax.set_xlabel("MAE (units)")
ax.set_title("Validation MAE — All Models (lower is better)")
ax.invert_yaxis()
plt.tight_layout()
plt.savefig(REPORTS_DIR / "model_comparison_mae.png", dpi=110)
plt.show()
"""

CELL_19_FIMP = """\
# Feature importances for tree models
# Note: HistGradientBoostingRegressor does not expose feature_importances_
# directly, so we use permutation importance on a small validation sample.
from sklearn.inspection import permutation_importance

fig, axes = plt.subplots(1, 3, figsize=(18, 5))

# --- Random Forest & XGBoost: native feature_importances_ ---
for ax, model, name in zip(axes[:2], [rf, xgb_model], ["Random Forest", "XGBoost"]):
    imp = pd.Series(model.feature_importances_, index=FEATURE_COLS).sort_values(ascending=False).head(15)
    imp.plot.barh(ax=ax)
    ax.invert_yaxis()
    ax.set_title(f"{name} — Top 15 Features")
    ax.set_xlabel("Importance")

# --- HistGBT: permutation importance on val sample (fast subset) ---
sample_idx = np.random.choice(len(X_val), min(2000, len(X_val)), replace=False)
perm = permutation_importance(
    hgb, X_val.iloc[sample_idx], y_val.iloc[sample_idx],
    n_repeats=5, random_state=RANDOM_STATE, n_jobs=-1)
perm_imp = pd.Series(perm.importances_mean, index=FEATURE_COLS).sort_values(ascending=False).head(15)
perm_imp.plot.barh(ax=axes[2])
axes[2].invert_yaxis()
axes[2].set_title("HistGBT — Top 15 Features (permutation)")
axes[2].set_xlabel("Mean decrease in MAE")

plt.tight_layout()
plt.savefig(REPORTS_DIR / "feature_importances.png", dpi=110)
plt.show()
"""

CELL_20_ACT_PRED = """\
# Pick best model by validation MAE
ml_models_val = val_tbl[val_tbl["Model"].isin(["Linear Regression","Random Forest","HistGradientBoosting","XGBoost"])]
best_model_name = ml_models_val.iloc[0]["Model"]
print(f"Best model (Val MAE): {best_model_name}")

model_map = {
    "Linear Regression":   (lr,        X_test_filled),
    "Random Forest":        (rf,        X_test_filled),
    "HistGradientBoosting": (hgb,       X_test),
    "XGBoost":              (xgb_model, X_test_filled),
}
best_obj, best_Xt = model_map[best_model_name]
y_pred_best = best_obj.predict(best_Xt)

idx = np.random.choice(len(y_test), min(600, len(y_test)), replace=False)
fig, ax = plt.subplots(figsize=(7, 7))
ax.scatter(np.array(y_test)[idx], y_pred_best[idx], alpha=0.25, s=14, color="steelblue")
lim = max(np.array(y_test).max(), y_pred_best.max()) * 1.05
ax.plot([0, lim], [0, lim], "r--", lw=1.5, label="Perfect prediction")
ax.set_xlabel("Actual Units Sold"); ax.set_ylabel("Predicted Units Sold")
ax.set_title(f"Actual vs Predicted — {best_model_name} (Test Set)")
ax.legend()
plt.tight_layout()
plt.savefig(REPORTS_DIR / "actual_vs_predicted.png", dpi=110)
plt.show()
"""

CELL_21_MD = "## 9. Save Best Model + Metadata"

CELL_21_SAVE = """\
# Gather best model's test metrics
best_test_row = test_tbl[test_tbl["Model"] == best_model_name].iloc[0]
best_val_row  = ml_models_val.iloc[0]

metadata = {
    "model_type":          best_model_name,
    "target_variable":     TARGET,
    "forecast_horizon":    "1 day ahead (t+1)",
    "feature_names":       FEATURE_COLS,
    "n_features":          len(FEATURE_COLS),
    "training_cutoff_date": str(pd.Timestamp(train_cutoff).date()),
    "val_cutoff_date":      str(pd.Timestamp(val_cutoff).date()),
    "train_rows":  int(len(df_train_ml)),
    "val_rows":    int(len(df_val_ml)),
    "test_rows":   int(len(df_test_ml)),
    "val_mae":   float(best_val_row["MAE"]),
    "val_rmse":  float(best_val_row["RMSE"]),
    "val_wape":  float(best_val_row["WAPE(%)"]),
    "test_mae":  float(best_test_row["MAE"]),
    "test_rmse": float(best_test_row["RMSE"]),
    "test_wape": float(best_test_row["WAPE(%)"]),
    "col_medians":    col_medians.to_dict(),
    "random_state":   RANDOM_STATE,
    "dataset":        "retail_store_inventory.csv",
    "dataset_note":   "Synthetic retail dataset. Results may not generalise to real-world data.",
    "trained_at":     datetime.now().isoformat(),
    "excluded_features": ["Demand Forecast — unknown provenance, negative values present"],
}

model_fname = f"best_model_{best_model_name.lower().replace(' ','_')}.joblib"
model_path  = MODELS_DIR / model_fname
meta_path   = MODELS_DIR / "model_metadata.json"

joblib.dump(best_obj, model_path, compress=3)
meta_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

print(f"Model saved   : {model_path}")
print(f"Metadata saved: {meta_path}")
print(f"\\n=== FINAL TEST METRICS ({best_model_name}) ===")
print(f"  MAE     : {metadata['test_mae']}")
print(f"  RMSE    : {metadata['test_rmse']}")
print(f"  WAPE(%) : {metadata['test_wape']}")
"""

CELL_22_VERIFY = """\
# Reload and verify predictions are reproducible
loaded_model = joblib.load(model_path)

if best_model_name == "HistGradientBoosting":
    y_check = loaded_model.predict(X_test.iloc[:5])
else:
    y_check = loaded_model.predict(X_test_filled.iloc[:5])

print("Model reload — first 5 predictions:", y_check.round(2))
print("Actual values                       :", y_test.iloc[:5].values)
"""

CELL_23_MD = """\
## 10. Download Model

The cells below let you download the saved model file from inside the notebook.  
The model is also saved at `backend/models/` and can be copied from there directly.
"""

CELL_23_DL = """\
# Download the model .joblib file
try:
    from IPython.display import FileLink, display as ipy_display
    print("Click the link to download the model:")
    ipy_display(FileLink(str(model_path), result_html_prefix="Download model: "))
except Exception:
    print(f"Model file location: {model_path}")
"""

CELL_24_ZIP = """\
# Create a zip bundle: model + metadata  (convenient single-file download)
zip_path = MODELS_DIR / "inventory_compass_model_bundle.zip"
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
    zf.write(model_path, model_path.name)
    zf.write(meta_path,  meta_path.name)

size_kb = zip_path.stat().st_size / 1024
print(f"Bundle saved: {zip_path}  ({size_kb:.1f} KB)")

try:
    from IPython.display import FileLink, display as ipy_display
    ipy_display(FileLink(str(zip_path), result_html_prefix="Download bundle: "))
except Exception:
    print(f"Zip location: {zip_path}")
"""

CELL_25_SUMMARY_MD = """\
---
## Summary

| Step | Output |
|------|--------|
| Raw data loaded & cleaned | `backend/data/processed/clean_inventory.csv` |
| EDA charts | `backend/reports/eda_*.png` |
| Model comparison table | `backend/reports/model_comparison.csv` |
| MAE bar chart | `backend/reports/model_comparison_mae.png` |
| Feature importance chart | `backend/reports/feature_importances.png` |
| Actual vs Predicted chart | `backend/reports/actual_vs_predicted.png` |
| Best model saved | `backend/models/best_model_*.joblib` |
| Model metadata | `backend/models/model_metadata.json` |
| Download bundle | `backend/models/inventory_compass_model_bundle.zip` |

**To reproduce:** activate `.venv`, open `backend/notebooks/inventory_compass_pipeline.ipynb`, run all cells top to bottom.
"""


# ── Assemble notebook ─────────────────────────────────────────────────────────

nb = {
    "cells": [
        md(CELL_00_MD),
        md("## 0. Imports & Setup"),
        code(CELL_01_IMPORTS),
        md(CELL_02_MD),
        code(CELL_02_LOAD),
        code(CELL_03_INSPECT),
        md(CELL_04_MD),
        code(CELL_04_CLEAN),
        md(CELL_05_MD),
        code(CELL_05_EDA),
        code(CELL_06_EDA2),
        code(CELL_07_EDA3),
        code(CELL_08_EDA4),
        md(CELL_09_MD),
        code(CELL_09_FEAT),
        md(CELL_10_MD),
        code(CELL_10_SPLIT),
        code(CELL_11_PREP),
        md(CELL_12_MD),
        code(CELL_12_BASE),
        md(CELL_13_MD),
        code(CELL_13_LR),
        code(CELL_14_RF),
        code(CELL_15_HGB),
        code(CELL_16_XGB),
        md(CELL_17_MD),
        code(CELL_17_EVAL),
        code(CELL_18_SAVE_CSV),
        code(CELL_19_FIMP),
        code(CELL_20_ACT_PRED),
        md(CELL_21_MD),
        code(CELL_21_SAVE),
        code(CELL_22_VERIFY),
        md(CELL_23_MD),
        code(CELL_23_DL),
        code(CELL_24_ZIP),
        md(CELL_25_SUMMARY_MD),
    ],
    "metadata": {
        "kernelspec": {
            "display_name": "Python 3",
            "language": "python",
            "name": "python3",
        },
        "language_info": {"name": "python", "version": "3.10.10"},
    },
    "nbformat": 4,
    "nbformat_minor": 5,
}

OUT.write_text(json.dumps(nb, indent=1, ensure_ascii=False), encoding="utf-8")
print(f"Notebook written: {OUT}  ({OUT.stat().st_size // 1024} KB)")
