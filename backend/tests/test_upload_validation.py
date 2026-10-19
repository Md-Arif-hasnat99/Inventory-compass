"""
Part 2 tests — Seller Dataset Upload and Validation.
Tests validation logic and upload session management.
Does NOT require the FastAPI server to be running.
"""

from __future__ import annotations

import io
import uuid
from pathlib import Path
from typing import Any, Dict

import pandas as pd
import pytest

from backend.src.validation import (
    COLUMN_ALIASES,
    MAX_FILE_SIZE_BYTES,
    MIN_ROWS_FOR_FORECAST,
    REQUIRED_CANONICAL,
    resolve_column_mapping,
    validate_upload,
)
from backend.src import upload as upload_store


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_csv(rows: list[dict], extra_headers: list[str] | None = None) -> bytes:
    """Build a minimal valid CSV as bytes."""
    df = pd.DataFrame(rows)
    if extra_headers:
        for h in extra_headers:
            df[h] = "extra"
    buf = io.BytesIO()
    df.to_csv(buf, index=False)
    return buf.getvalue()


def _minimal_valid_rows(n: int = 10) -> list[dict]:
    """Produce n rows with minimum required columns."""
    base_date = pd.Timestamp("2024-01-01")
    return [
        {"Date": str((base_date + pd.Timedelta(days=i)).date()), "Units Sold": 50 + i}
        for i in range(n)
    ]


# ---------------------------------------------------------------------------
# Column alias resolution
# ---------------------------------------------------------------------------

class TestResolveColumnMapping:
    def test_exact_standard_headers(self):
        headers = ["Date", "Units Sold", "Store ID", "Product ID", "Category"]
        mapping, unmapped = resolve_column_mapping(headers)
        assert mapping["date"] == "Date"
        assert mapping["units_sold"] == "Units Sold"
        assert mapping["store_id"] == "Store ID"
        assert mapping["product_id"] == "Product ID"
        assert mapping["category"] == "Category"
        assert unmapped == []

    def test_alias_sales_maps_to_units_sold(self):
        headers = ["date", "sales", "SKU"]
        mapping, _ = resolve_column_mapping(headers)
        assert mapping["units_sold"] == "sales"
        assert mapping["product_id"] == "SKU"

    def test_alias_quantity_sold(self):
        mapping, _ = resolve_column_mapping(["transaction_date", "quantity_sold"])
        assert mapping["date"] == "transaction_date"
        assert mapping["units_sold"] == "quantity_sold"

    def test_alias_stock_maps_to_inventory_level(self):
        mapping, _ = resolve_column_mapping(["Date", "Units Sold", "stock"])
        assert mapping["inventory_level"] == "stock"

    def test_unmapped_columns_returned(self):
        headers = ["Date", "Units Sold", "my_custom_col", "another_col"]
        mapping, unmapped = resolve_column_mapping(headers)
        assert "my_custom_col" in unmapped
        assert "another_col" in unmapped

    def test_no_headers_returns_empty(self):
        mapping, unmapped = resolve_column_mapping([])
        assert mapping == {}
        assert unmapped == []

    def test_case_sensitivity(self):
        # Aliases are case-sensitive by design; exact match required
        headers = ["DATE", "UNITS_SOLD"]
        mapping, unmapped = resolve_column_mapping(headers)
        # These are not in our alias list verbatim
        assert "DATE" in unmapped or mapping.get("date") is None


# ---------------------------------------------------------------------------
# validate_upload — valid scenarios
# ---------------------------------------------------------------------------

class TestValidateUploadValid:
    def test_valid_minimal_csv(self):
        csv_bytes = _make_csv(_minimal_valid_rows(10))
        result = validate_upload(csv_bytes, "test.csv")
        assert result["status"] == "valid"
        assert result["errors"] == []
        assert result["row_count"] == 10

    def test_valid_csv_with_all_optional_columns(self):
        rows = [
            {
                "Date": f"2024-01-{i+1:02d}",
                "Units Sold": 100,
                "Store ID": "S001",
                "Product ID": "P001",
                "Category": "Electronics",
                "Price": 49.99,
                "Discount": 5,
                "Inventory Level": 200,
            }
            for i in range(15)
        ]
        csv_bytes = _make_csv(rows)
        result = validate_upload(csv_bytes, "full.csv")
        assert result["status"] == "valid"
        assert "store_id" in result["canonical_mapping"]
        assert "price" in result["canonical_mapping"]

    def test_alias_column_names_accepted(self):
        rows = [
            {"transaction_date": f"2024-01-{i+1:02d}", "sales": 40 + i}
            for i in range(10)
        ]
        csv_bytes = _make_csv(rows)
        result = validate_upload(csv_bytes, "alias.csv")
        assert result["status"] == "valid"
        assert result["canonical_mapping"]["date"] == "transaction_date"
        assert result["canonical_mapping"]["units_sold"] == "sales"

    def test_preview_rows_returned(self):
        csv_bytes = _make_csv(_minimal_valid_rows(20))
        result = validate_upload(csv_bytes, "preview.csv")
        assert len(result["preview_rows"]) == 5  # Always 5 or fewer

    def test_date_range_populated(self):
        csv_bytes = _make_csv(_minimal_valid_rows(14))
        result = validate_upload(csv_bytes, "dates.csv")
        assert result["date_range"] is not None
        assert result["date_range"]["unique_dates"] == 14
        assert result["date_range"]["min"] < result["date_range"]["max"]

    def test_short_history_warning_not_error(self):
        csv_bytes = _make_csv(_minimal_valid_rows(10))
        result = validate_upload(csv_bytes, "short.csv")
        # 10 days < 14 -> warning, not error
        assert result["status"] == "valid"
        assert any("14" in w for w in result["warnings"])

    def test_zero_demand_produces_warning_not_error(self):
        rows = [{"Date": f"2024-01-{i+1:02d}", "Units Sold": 0} for i in range(10)]
        csv_bytes = _make_csv(rows)
        result = validate_upload(csv_bytes, "zeros.csv")
        assert result["status"] == "valid"
        assert any("zero" in w.lower() or "0" in w for w in result["warnings"])


# ---------------------------------------------------------------------------
# validate_upload — invalid scenarios
# ---------------------------------------------------------------------------

class TestValidateUploadInvalid:
    def test_empty_file_rejected(self):
        result = validate_upload(b"", "empty.csv")
        assert result["status"] == "invalid"
        assert any("empty" in e.lower() for e in result["errors"])

    def test_file_exceeding_size_limit_rejected(self):
        oversized = b"a" * (MAX_FILE_SIZE_BYTES + 1)
        result = validate_upload(oversized, "big.csv")
        assert result["status"] == "invalid"
        assert any("size" in e.lower() or "mb" in e.lower() for e in result["errors"])

    def test_missing_date_column_rejected(self):
        rows = [{"Units Sold": 50} for _ in range(10)]
        csv_bytes = _make_csv(rows)
        result = validate_upload(csv_bytes, "nodate.csv")
        assert result["status"] == "invalid"
        assert any("date" in e.lower() for e in result["errors"])

    def test_missing_units_sold_column_rejected(self):
        rows = [{"Date": f"2024-01-{i+1:02d}"} for i in range(10)]
        csv_bytes = _make_csv(rows)
        result = validate_upload(csv_bytes, "nodemand.csv")
        assert result["status"] == "invalid"
        assert any("units_sold" in e.lower() or "required" in e.lower() for e in result["errors"])

    def test_invalid_dates_rejected(self):
        rows = [{"Date": "not-a-date", "Units Sold": 50} for _ in range(10)]
        csv_bytes = _make_csv(rows)
        result = validate_upload(csv_bytes, "baddates.csv")
        assert result["status"] == "invalid"
        assert any("date" in e.lower() or "parsed" in e.lower() for e in result["errors"])

    def test_negative_demand_rejected(self):
        rows = [
            {"Date": f"2024-01-{i+1:02d}", "Units Sold": -10}
            for i in range(10)
        ]
        csv_bytes = _make_csv(rows)
        result = validate_upload(csv_bytes, "negative.csv")
        assert result["status"] == "invalid"
        assert any("negative" in e.lower() for e in result["errors"])

    def test_non_numeric_demand_rejected(self):
        rows = [{"Date": f"2024-01-{i+1:02d}", "Units Sold": "abc"} for i in range(10)]
        csv_bytes = _make_csv(rows)
        result = validate_upload(csv_bytes, "nonnumeric.csv")
        assert result["status"] == "invalid"
        assert any("numeric" in e.lower() or "non-numeric" in e.lower() for e in result["errors"])

    def test_insufficient_rows_rejected(self):
        rows = _minimal_valid_rows(n=MIN_ROWS_FOR_FORECAST - 1)
        csv_bytes = _make_csv(rows)
        result = validate_upload(csv_bytes, "tiny.csv")
        assert result["status"] == "invalid"
        assert any(str(MIN_ROWS_FOR_FORECAST) in e for e in result["errors"])


# ---------------------------------------------------------------------------
# Duplicate detection
# ---------------------------------------------------------------------------

class TestDuplicateDetection:
    def test_duplicate_date_produces_warning(self):
        rows = [
            {"Date": "2024-01-01", "Units Sold": 50, "Store ID": "S1", "Product ID": "P1"},
            {"Date": "2024-01-01", "Units Sold": 60, "Store ID": "S1", "Product ID": "P1"},
            {"Date": "2024-01-02", "Units Sold": 55, "Store ID": "S1", "Product ID": "P1"},
        ] + [
            {"Date": f"2024-01-{i+3:02d}", "Units Sold": 50, "Store ID": "S1", "Product ID": "P1"}
            for i in range(8)
        ]
        csv_bytes = _make_csv(rows)
        result = validate_upload(csv_bytes, "dupes.csv")
        assert any("duplicate" in w.lower() for w in result["warnings"])

    def test_no_false_duplicate_warning_for_different_products(self):
        rows = [
            {"Date": "2024-01-01", "Units Sold": 50, "Store ID": "S1", "Product ID": "P1"},
            {"Date": "2024-01-01", "Units Sold": 60, "Store ID": "S1", "Product ID": "P2"},
        ] + [
            {"Date": f"2024-01-{i+2:02d}", "Units Sold": 50, "Store ID": "S1", "Product ID": "P1"}
            for i in range(9)
        ]
        csv_bytes = _make_csv(rows)
        result = validate_upload(csv_bytes, "multiproduct.csv")
        # Different Product ID on same date is NOT a duplicate
        assert not any("duplicate" in w.lower() for w in result["warnings"])


# ---------------------------------------------------------------------------
# Upload session management
# ---------------------------------------------------------------------------

class TestUploadSessionManagement:
    def test_create_session_returns_unique_id(self):
        csv_bytes = _make_csv(_minimal_valid_rows())
        id1 = upload_store.create_session(csv_bytes, "file1.csv")
        id2 = upload_store.create_session(csv_bytes, "file2.csv")
        assert id1 != id2
        # Clean up
        upload_store.delete_session(id1)
        upload_store.delete_session(id2)

    def test_get_session_returns_public_view(self):
        csv_bytes = _make_csv(_minimal_valid_rows())
        uid = upload_store.create_session(csv_bytes, "myfile.csv")
        session = upload_store.get_session(uid)
        assert session is not None
        assert "_temp_path" not in session, "Internal temp path must not be exposed"
        assert session["upload_id"] == uid
        upload_store.delete_session(uid)

    def test_get_temp_path_returns_path(self):
        csv_bytes = _make_csv(_minimal_valid_rows())
        uid = upload_store.create_session(csv_bytes, "myfile.csv")
        path = upload_store.get_temp_path(uid)
        assert path is not None
        assert path.exists()
        upload_store.delete_session(uid)

    def test_delete_session_removes_temp_file(self):
        csv_bytes = _make_csv(_minimal_valid_rows())
        uid = upload_store.create_session(csv_bytes, "myfile.csv")
        path = upload_store.get_temp_path(uid)
        assert path is not None and path.exists()
        upload_store.delete_session(uid)
        assert not path.exists(), "Temp file should be deleted when session is removed"

    def test_two_uploads_are_isolated(self):
        rows_a = [{"Date": f"2024-01-{i+1:02d}", "Units Sold": 10 + i} for i in range(10)]
        rows_b = [{"Date": f"2024-02-{i+1:02d}", "Units Sold": 999 + i} for i in range(10)]
        id_a = upload_store.create_session(_make_csv(rows_a), "a.csv")
        id_b = upload_store.create_session(_make_csv(rows_b), "b.csv")

        path_a = upload_store.get_temp_path(id_a)
        path_b = upload_store.get_temp_path(id_b)
        assert path_a != path_b

        content_a = path_a.read_text()
        content_b = path_b.read_text()
        assert "2024-01" in content_a
        assert "2024-02" in content_b
        assert "999" not in content_a, "Upload A must not contain Upload B data"
        assert "10" not in content_b.split("\n")[0]  # Header row only

        upload_store.delete_session(id_a)
        upload_store.delete_session(id_b)

    def test_unknown_session_id_returns_none(self):
        result = upload_store.get_session(str(uuid.uuid4()))
        assert result is None

    def test_delete_unknown_session_returns_false(self):
        assert upload_store.delete_session(str(uuid.uuid4())) is False

    def test_update_session_validation_merges_result(self):
        csv_bytes = _make_csv(_minimal_valid_rows())
        uid = upload_store.create_session(csv_bytes, "merge.csv")
        fake_result = {
            "status": "valid",
            "row_count": 10,
            "detected_columns": ["Date", "Units Sold"],
            "canonical_mapping": {"date": "Date", "units_sold": "Units Sold"},
            "unmapped_columns": [],
            "date_range": {"min": "2024-01-01", "max": "2024-01-10", "unique_dates": 10},
            "preview_rows": [],
            "errors": [],
            "warnings": ["Some warning"],
        }
        ok = upload_store.update_session_validation(uid, fake_result)
        assert ok is True
        session = upload_store.get_session(uid)
        assert session["status"] == "valid"
        assert session["validation_warnings"] == ["Some warning"]
        upload_store.delete_session(uid)
