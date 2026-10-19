"""
Unit test suite for Part 3: Seller data preprocessing, column standardization,
feature engineering, temporal integrity, no-leakage guarantees, and suitability assessment.
"""

from datetime import datetime, timedelta
import numpy as np
import pandas as pd
import pytest

from backend.src.features import (
    FEATURE_COLS,
    TARGET_COL,
    add_calendar_features,
    add_lag_and_rolling_features,
    build_feature_pipeline,
    encode_categoricals,
)
from backend.src.preprocessing import (
    assess_data_suitability,
    clean_inventory_data,
    impute_missing_values,
    standardize_seller_columns,
)


# ---------------------------------------------------------------------------
# Test Helpers
# ---------------------------------------------------------------------------

def _make_daily_series(
    start_date: str = "2024-01-01",
    n_days: int = 40,
    store_id: str = "S001",
    product_id: str = "P001",
    base_sales: float = 50.0,
    sales_step: float = 1.0,
) -> pd.DataFrame:
    """Generate a deterministic daily time series for a single store-product."""
    start = datetime.strptime(start_date, "%Y-%m-%d")
    dates = [start + timedelta(days=i) for i in range(n_days)]
    sales = [base_sales + i * sales_step for i in range(n_days)]

    return pd.DataFrame({
        "Date": dates,
        "Store ID": [store_id] * n_days,
        "Product ID": [product_id] * n_days,
        "Category": ["Clothing"] * n_days,
        "Region": ["North"] * n_days,
        "Weather Condition": ["Sunny"] * n_days,
        "Seasonality": ["Spring"] * n_days,
        "Price": [25.0] * n_days,
        "Discount": [0.0] * n_days,
        "Inventory Level": [500] * n_days,
        "Holiday/Promotion": [0] * n_days,
        "Competitor Pricing": [26.0] * n_days,
        "Units Sold": sales,
    })


# ---------------------------------------------------------------------------
# 1. Column Standardization
# ---------------------------------------------------------------------------

class TestStandardizeSellerColumns:
    def test_standardize_with_canonical_map(self):
        raw_df = pd.DataFrame({
            "sale_date": ["2024-01-01", "2024-01-02"],
            "qty_sold": [10, 20],
            "sku": ["SKU-1", "SKU-2"],
            "shop": ["Shop-A", "Shop-B"],
        })
        canonical_map = {
            "date": "sale_date",
            "units_sold": "qty_sold",
            "product_id": "sku",
            "store_id": "shop",
        }
        res = standardize_seller_columns(raw_df, canonical_map)
        assert "Date" in res.columns
        assert "Units Sold" in res.columns
        assert "Product ID" in res.columns
        assert "Store ID" in res.columns
        assert res["Units Sold"].tolist() == [10, 20]

    def test_standardize_preserves_unmapped_columns(self):
        raw_df = pd.DataFrame({
            "Date": ["2024-01-01"],
            "Units Sold": [5],
            "custom_metadata": ["meta_val"],
        })
        res = standardize_seller_columns(raw_df, None)
        assert "custom_metadata" in res.columns
        assert res["custom_metadata"].iloc[0] == "meta_val"


# ---------------------------------------------------------------------------
# 2. Cleaning and Chronological Sorting
# ---------------------------------------------------------------------------

class TestCleanInventoryData:
    def test_chronological_sorting(self):
        df = pd.DataFrame({
            "Date": ["2024-01-05", "2024-01-01", "2024-01-03"],
            "Store ID": ["S1", "S1", "S1"],
            "Product ID": ["P1", "P1", "P1"],
            "Units Sold": [50, 10, 30],
        })
        cleaned = clean_inventory_data(df)
        assert cleaned["Date"].iloc[0] == pd.Timestamp("2024-01-01")
        assert cleaned["Date"].iloc[1] == pd.Timestamp("2024-01-03")
        assert cleaned["Date"].iloc[2] == pd.Timestamp("2024-01-05")

    def test_zero_sales_and_negative_sales_flagged(self):
        df = pd.DataFrame({
            "Date": ["2024-01-01", "2024-01-02", "2024-01-03"],
            "Units Sold": [0, -5, 20],
        })
        cleaned = clean_inventory_data(df)
        assert cleaned["zero_sales_flag"].iloc[0] == 1
        assert cleaned["negative_sales_flag"].iloc[1] == 1
        # Negative units sold clipped to 0
        assert cleaned["Units Sold"].iloc[1] == 0.0

    def test_exact_duplicates_deduplicated(self):
        df = pd.DataFrame({
            "Date": ["2024-01-01", "2024-01-01"],
            "Store ID": ["S1", "S1"],
            "Product ID": ["P1", "P1"],
            "Units Sold": [10, 15],
        })
        cleaned = clean_inventory_data(df)
        assert len(cleaned) == 1
        assert cleaned["Units Sold"].iloc[0] == 15  # keep last


# ---------------------------------------------------------------------------
# 3. Missing Value Imputation
# ---------------------------------------------------------------------------

class TestImputeMissingValues:
    def test_imputation_rules(self):
        df = pd.DataFrame({
            "Date": ["2024-01-01", "2024-01-02", "2024-01-03"],
            "Price": [10.0, np.nan, 20.0],
            "Discount": [np.nan, 0.1, np.nan],
            "Holiday/Promotion": [np.nan, 1, np.nan],
            "Competitor Pricing": [np.nan, 12.0, np.nan],
            "Inventory Level": [np.nan, 50, 150],
            "Category": [None, "Electronics", ""],
        })
        imputed, stats = impute_missing_values(df, fit=True)
        # Price median of [10.0, 20.0] is 15.0
        assert imputed["Price"].iloc[1] == 15.0
        # Discount defaults to 0.0
        assert imputed["Discount"].iloc[0] == 0.0
        # Promotion defaults to 0
        assert imputed["Holiday/Promotion"].iloc[0] == 0
        # Inventory Level median of [50, 150] is 100.0
        assert imputed["Inventory Level"].iloc[0] == 100.0
        # Competitor pricing falls back to Price when available
        assert imputed["Competitor Pricing"].iloc[0] == 10.0
        # Category missing replaced with 'Unknown'
        assert imputed["Category"].iloc[0] == "Unknown"

    def test_train_only_imputation_reuse(self):
        train_df = pd.DataFrame({"Price": [10.0, 30.0]})  # median 20.0
        test_df = pd.DataFrame({"Price": [np.nan]})

        _, stats = impute_missing_values(train_df, fit=True)
        imputed_test, _ = impute_missing_values(test_df, imputer_stats=stats, fit=False)

        assert stats["price_median"] == 20.0
        assert imputed_test["Price"].iloc[0] == 20.0


# ---------------------------------------------------------------------------
# 4. Lag and Rolling Calculations & Temporal Leakage Prevention
# ---------------------------------------------------------------------------

class TestLagAndRollingFeatures:
    def test_lag_values_strictly_previous(self):
        # 10 days of sales: 10, 11, 12, ... 19
        df = _make_daily_series(n_days=10, base_sales=10.0, sales_step=1.0)
        df_feat = add_lag_and_rolling_features(df)

        # On day index 0: no prior days -> lag_1 is NaN
        assert pd.isna(df_feat["lag_1"].iloc[0])
        # On day index 1: lag_1 is sales at day 0 (10.0)
        assert df_feat["lag_1"].iloc[1] == 10.0
        # On day index 7: lag_7 is sales at day 0 (10.0)
        assert df_feat["lag_7"].iloc[7] == 10.0
        assert pd.isna(df_feat["lag_7"].iloc[6])

    def test_rolling_mean_strictly_prior_observations(self):
        df = _make_daily_series(n_days=15, base_sales=10.0, sales_step=10.0)
        # Sales: [10, 20, 30, 40, 50, 60, 70, ...]
        df_feat = add_lag_and_rolling_features(df)

        # For index 3, prior 3 days are [10, 20, 30] -> mean = 20.0 (min_periods=3)
        assert df_feat["roll_mean_7"].iloc[3] == pytest.approx(20.0)
        # Verify index 3 does NOT include index 3's own sale (40.0)
        assert df_feat["roll_mean_7"].iloc[3] < 40.0

    def test_no_future_leakage(self):
        """Verifies that altering day t+1 target does NOT alter day t features."""
        df1 = _make_daily_series(n_days=20, base_sales=10.0)
        df2 = df1.copy()
        # Change day 10 sales in df2
        df2.loc[10, "Units Sold"] = 9999.0

        feat1 = add_lag_and_rolling_features(df1)
        feat2 = add_lag_and_rolling_features(df2)

        # Features at days 0..10 MUST be completely identical
        for d in range(11):
            for col in ["lag_1", "lag_7", "roll_mean_7"]:
                val1 = feat1.loc[d, col]
                val2 = feat2.loc[d, col]
                if pd.isna(val1):
                    assert pd.isna(val2)
                else:
                    assert val1 == val2

    def test_group_separation_no_cross_product_leakage(self):
        """Product A history must never bleed into Product B lags or rollings."""
        df_a = _make_daily_series(n_days=10, product_id="P_AAA", base_sales=100.0)
        df_b = _make_daily_series(n_days=10, product_id="P_BBB", base_sales=5.0)
        combined = pd.concat([df_a, df_b], ignore_index=True)

        feat = add_lag_and_rolling_features(combined)

        p_b_rows = feat[feat["Product ID"] == "P_BBB"].reset_index(drop=True)
        # Day 0 for P_BBB must be NaN (no prior P_BBB sales)
        assert pd.isna(p_b_rows["lag_1"].iloc[0])
        # Day 1 for P_BBB must be 5.0 (P_BBB's own previous sale, NOT 100+ from P_AAA)
        assert p_b_rows["lag_1"].iloc[1] == 5.0
        assert p_b_rows["lag_1"].iloc[1] != 100.0

    def test_single_series_fallback_without_store_or_product_cols(self):
        """When neither Store ID nor Product ID is present, fallback to single series."""
        df = pd.DataFrame({
            "Date": pd.date_range("2024-01-01", periods=10, freq="D"),
            "Units Sold": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        })
        feat = add_lag_and_rolling_features(df)
        assert pd.isna(feat["lag_1"].iloc[0])
        assert feat["lag_1"].iloc[1] == 1.0
        assert feat["lag_1"].iloc[2] == 2.0


# ---------------------------------------------------------------------------
# 5. Categorical Encoding & Safe Unknown Category Handling
# ---------------------------------------------------------------------------

class TestCategoricalEncoding:
    def test_unseen_category_gets_unknown_value(self):
        """C1 bug fix: unseen categories during inference get -1, NOT class 0."""
        train_df = pd.DataFrame({
            "Category": ["Electronics", "Clothing"],
            "Region": ["North", "South"],
        })
        test_df = pd.DataFrame({
            "Category": ["Toys"],        # completely unseen category
            "Region": ["North"],         # seen category
        })

        _, encoders = encode_categoricals(train_df, fit=True)
        test_encoded, _ = encode_categoricals(test_df, encoders=encoders, fit=False)

        # Region North was seen -> non-negative integer
        assert test_encoded["region_enc"].iloc[0] >= 0
        # Category Toys was unseen -> mapped to -1, NOT 0 (Electronics)
        assert test_encoded["category_enc"].iloc[0] == -1


# ---------------------------------------------------------------------------
# 6. Data Suitability Assessment
# ---------------------------------------------------------------------------

class TestAssessDataSuitability:
    def test_sufficient_history(self):
        df = _make_daily_series(n_days=45)
        suit = assess_data_suitability(df)
        assert suit["is_suitable"] is True
        assert suit["has_lags_support"] is True
        assert suit["has_rolling_30_support"] is True
        assert len(suit["errors"]) == 0

    def test_short_history_generates_warnings(self):
        df = _make_daily_series(n_days=5)
        suit = assess_data_suitability(df)
        assert suit["is_suitable"] is True  # usable for minimal forecast
        assert suit["has_lags_support"] is False
        assert suit["has_rolling_30_support"] is False
        assert any("unique dates" in w for w in suit["warnings"])

    def test_missing_date_or_target_errors(self):
        bad_df = pd.DataFrame({"some_col": [1, 2, 3]})
        suit = assess_data_suitability(bad_df)
        assert suit["is_suitable"] is False
        assert len(suit["errors"]) >= 2
