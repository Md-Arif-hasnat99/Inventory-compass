"""
FastAPI Microservice for Inventory Compass.
Serves forecasting models, replenishment recommendations, and model benchmarks.
Also provides the seller dataset upload, validation, and preview endpoints.
"""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.src.predict import InventoryPredictor
from backend.src import upload as upload_store
from backend.src.validation import validate_upload, COLUMN_ALIASES, REQUIRED_CANONICAL
from backend.src.forecasting import generate_seller_forecast
from backend.src.replenishment import generate_batch_replenishment

app = FastAPI(
    title="Inventory Compass API",
    description="Demand forecasting and inventory decision engine",
    version="1.0.0",
)

# Enable CORS for frontend Vite dev server and production clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize predictor singleton
try:
    predictor = InventoryPredictor()
except Exception as e:
    predictor = None
    print(f"Warning: InventoryPredictor failed to initialize: {e}")


class PredictRequest(BaseModel):
    inventory_level: Optional[float] = Field(None, alias="Inventory Level")
    price: Optional[float] = Field(None, alias="Price")
    discount: Optional[float] = Field(None, alias="Discount")
    holiday_promotion: Optional[int] = Field(None, alias="Holiday/Promotion")
    competitor_pricing: Optional[float] = Field(None, alias="Competitor Pricing")
    lead_time_days: Optional[float] = Field(1.0)
    safety_stock_days: Optional[float] = Field(2.0)
    features: Optional[Dict[str, Any]] = None

    class Config:
        populate_by_name = True


@app.get("/")
def root():
    return {
        "service": "Inventory Compass API",
        "status": "online",
        "model_loaded": predictor is not None,
    }


@app.get("/health")
@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "inventory-compass-backend",
        "model_loaded": predictor is not None,
    }


@app.get("/api/model/metadata")
def get_model_metadata():
    if predictor is None:
        raise HTTPException(status_code=503, detail="Predictor not initialized")
    return predictor.metadata


@app.get("/api/model/f1-metrics")
def get_f1_metrics():
    f1_path = Path(__file__).resolve().parent.parent / "reports" / "f1_metrics.json"
    if not f1_path.exists():
        raise HTTPException(status_code=404, detail="F1 metrics not generated yet")
    with open(f1_path, "r", encoding="utf-8") as f:
        return json.load(f)


@app.get("/api/model/benchmarks")
def get_model_benchmarks():
    csv_path = Path(__file__).resolve().parent.parent / "reports" / "model_comparison.csv"
    if not csv_path.exists():
        raise HTTPException(status_code=404, detail="Model comparison report not found")
    import pandas as pd
    df = pd.read_csv(csv_path)
    df.columns = df.columns.str.strip()
    benchmarks = []
    for _, row in df.iterrows():
        benchmarks.append({
            "model": str(row["Model"]).strip(),
            "modelName": str(row["Model"]).strip(),
            "mae": float(row["MAE"]),
            "rmse": float(row["RMSE"]),
            "wape": float(row["WAPE(%)"]),
            "valMae": float(row["MAE"]),
            "valRmse": float(row["RMSE"]),
            "valWape": float(row["WAPE(%)"]),
            "split": str(row.get("Split", "Val")).strip(),
            "trainTimeSec": float(row.get("Train_s", 0)),
            "trainingTime": f"{float(row.get('Train_s', 0)):.2f}s",
            "isChampion": "Linear Regression" in str(row["Model"]),
        })
    return benchmarks


@app.post("/api/predict")
def predict_demand(req: PredictRequest):
    if predictor is None:
        raise HTTPException(status_code=503, detail="Model is not loaded")

    # Combine top-level fields and arbitrary features
    payload = req.model_dump(by_alias=True, exclude_unset=True)
    if "features" in payload and isinstance(payload["features"], dict):
        payload.update(payload.pop("features"))

    safety_days = float(payload.pop("safety_stock_days", 2.0))
    decision = predictor.forecast_inventory_decision(payload, safety_stock_days=safety_days)
    return {
        "status": "success",
        "isDemo": False,
        "data": decision,
    }



# ---------------------------------------------------------------------------
# Upload & Validation Endpoints
# ---------------------------------------------------------------------------

ALLOWED_CONTENT_TYPES = {"text/csv", "application/csv", "application/octet-stream", "text/plain"}
MAX_UPLOAD_BYTES = 50 * 1024 * 1024  # 50 MB


class ColumnMappingRequest(BaseModel):
    """Explicit column mapping override submitted by the seller UI."""
    mapping: Dict[str, str]  # {canonical_name: seller_header}


@app.get("/api/upload/schema")
def get_upload_schema():
    """Return accepted column aliases for the seller column-mapping UI."""
    return {
        "required_canonical_columns": sorted(REQUIRED_CANONICAL),
        "optional_canonical_columns": sorted(
            set(COLUMN_ALIASES.keys()) - REQUIRED_CANONICAL
        ),
        "accepted_aliases": COLUMN_ALIASES,
    }


@app.post("/api/upload", status_code=201)
async def upload_dataset(file: UploadFile = File(...)):
    """
    Accept a seller CSV upload.
    Returns upload_id, display filename, size, detected columns, and a 5-row preview.
    Does NOT run full validation — call POST /api/upload/{upload_id}/validate for that.
    """
    # Content-type check (allow octet-stream since many browsers send it for .csv)
    content_type = (file.content_type or "").split(";")[0].strip().lower()
    if content_type and content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail=(
                f"Unsupported file type '{content_type}'. "
                f"Please upload a CSV file (.csv)."
            ),
        )

    # Filename extension check
    original_name = file.filename or "upload.csv"
    if not original_name.lower().endswith(".csv"):
        raise HTTPException(
            status_code=415,
            detail="File must have a .csv extension.",
        )

    # Read and size check
    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(file_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=(
                f"File size {len(file_bytes) / (1024*1024):.1f} MB exceeds "
                f"the {MAX_UPLOAD_BYTES // (1024*1024)} MB limit."
            ),
        )

    # Create session (writes temp file)
    upload_id = upload_store.create_session(file_bytes, original_name)

    # Run a quick column-detection pass (not full validation)
    quick_result = validate_upload(file_bytes, original_name)
    upload_store.update_session_validation(upload_id, quick_result)

    session = upload_store.get_session(upload_id)
    return {
        "upload_id": upload_id,
        "status": session["status"],
        "display_filename": session["display_filename"],
        "file_size_bytes": session["file_size_bytes"],
        "row_count": session["row_count"],
        "detected_columns": session["detected_columns"],
        "canonical_mapping": session["canonical_mapping"],
        "unmapped_columns": session["unmapped_columns"],
        "date_range": session["date_range"],
        "preview_rows": session["preview_rows"],
        "validation_errors": session["validation_errors"],
        "validation_warnings": session["validation_warnings"],
    }


@app.get("/api/upload/{upload_id}")
def get_upload_session(upload_id: str):
    """Return current state of an upload session."""
    session = upload_store.get_session(upload_id)
    if session is None:
        raise HTTPException(
            status_code=404,
            detail=f"Upload session '{upload_id}' not found or has expired.",
        )
    return session


@app.post("/api/upload/{upload_id}/validate")
def validate_upload_session(upload_id: str, body: Optional[ColumnMappingRequest] = None):
    """
    Run (or re-run) full validation on an uploaded dataset.
    Optionally accepts a seller-supplied column mapping override.

    Returns updated validation results including errors, warnings,
    date range, and preview rows.
    """
    temp_path = upload_store.get_temp_path(upload_id)
    if temp_path is None:
        raise HTTPException(
            status_code=404,
            detail=f"Upload session '{upload_id}' not found or has expired.",
        )

    file_bytes = temp_path.read_bytes()
    explicit_mapping = body.mapping if body else None
    result = validate_upload(file_bytes, str(temp_path.name), canonical_map=explicit_mapping)
    upload_store.update_session_validation(upload_id, result)

    return {
        "upload_id": upload_id,
        "status": result["status"],
        "row_count": result["row_count"],
        "detected_columns": result["detected_columns"],
        "canonical_mapping": result["canonical_mapping"],
        "unmapped_columns": result["unmapped_columns"],
        "date_range": result["date_range"],
        "preview_rows": result["preview_rows"],
        "validation_errors": result["errors"],
        "validation_warnings": result["warnings"],
    }


@app.get("/api/upload/{upload_id}/preview")
def get_upload_preview(upload_id: str):
    """Return 5-row preview and column info for an upload session."""
    session = upload_store.get_session(upload_id)
    if session is None:
        raise HTTPException(
            status_code=404,
            detail=f"Upload session '{upload_id}' not found or has expired.",
        )
    return {
        "upload_id": upload_id,
        "display_filename": session["display_filename"],
        "row_count": session["row_count"],
        "detected_columns": session["detected_columns"],
        "canonical_mapping": session["canonical_mapping"],
        "unmapped_columns": session["unmapped_columns"],
        "preview_rows": session["preview_rows"],
    }


@app.delete("/api/upload/{upload_id}", status_code=204)
def delete_upload_session(upload_id: str):
    """Delete an upload session and its temporary file."""
    deleted = upload_store.delete_session(upload_id)
    if not deleted:
        raise HTTPException(
            status_code=404,
            detail=f"Upload session '{upload_id}' not found.",
        )


# ---------------------------------------------------------------------------
# Seller Forecasting Endpoints
# ---------------------------------------------------------------------------

class ForecastRequest(BaseModel):
    """Parameters for generating multi-step demand forecast."""
    horizon_days: int = Field(default=7, description="Forecast horizon in days (7, 14, or 30)")
    model_preference: str = Field(default="auto", description="Strategy: auto, seller_trained, pretrained, baseline")
    store_id: Optional[str] = Field(default=None, description="Optional Store ID filter")
    product_id: Optional[str] = Field(default=None, description="Optional Product ID filter")


@app.post("/api/forecast/{upload_id}")
def create_forecast(
    upload_id: str,
    horizon_days: Optional[int] = None,
    req: Optional[ForecastRequest] = None,
):
    """
    Generate multi-step demand forecast directly from a seller's uploaded dataset.
    Predictions are generated recursively over 7, 14, or 30 days without data leakage.
    Supports params via JSON body or query string.
    """
    body = req or ForecastRequest()
    eff_horizon = horizon_days if horizon_days is not None else body.horizon_days
    try:
        result = generate_seller_forecast(
            upload_id=upload_id,
            horizon_days=eff_horizon,
            model_preference=body.model_preference,
            store_id=body.store_id,
            product_id=body.product_id,
        )
        return result
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Forecasting engine error: {str(exc)}")


@app.get("/api/forecast/{upload_id}")
def get_cached_forecast(upload_id: str):
    """Return the cached forecast for an upload session, if already generated."""
    cached = upload_store.get_session_forecast(upload_id)
    if cached is None:
        raise HTTPException(
            status_code=404,
            detail=f"No forecast has been generated yet for upload session '{upload_id}'. Call POST /api/forecast/{upload_id} first.",
        )
    return cached


# ---------------------------------------------------------------------------
# Inventory Replenishment Endpoints
# ---------------------------------------------------------------------------

class ReplenishmentRequest(BaseModel):
    """Parameters for generating inventory replenishment recommendations."""
    lead_time_days: float = Field(default=3.0, description="Supplier lead time in days (>= 1.0)")
    safety_stock_days: float = Field(default=2.0, description="Safety stock buffer in days (>= 0.0)")
    horizon_days: int = Field(default=7, description="Forecast horizon in days (7, 14, or 30)")
    inventory_overrides: Optional[Dict[str, float]] = Field(default=None, description="Optional per-SKU inventory overrides")


@app.post("/api/replenishment/{upload_id}")
def create_replenishment(
    upload_id: str,
    lead_time_days: Optional[float] = None,
    safety_stock_days: Optional[float] = None,
    horizon_days: Optional[int] = None,
    req: Optional[ReplenishmentRequest] = None,
):
    """
    Generate inventory replenishment recommendations for a seller upload session.
    Calculates lead-time demand, safety stock, reorder points, stockout risk tiers,
    and recommended integer reorder quantities.
    Supports params via JSON body or query string.
    """
    body = req or ReplenishmentRequest()
    eff_lead = lead_time_days if lead_time_days is not None else body.lead_time_days
    eff_safety = safety_stock_days if safety_stock_days is not None else body.safety_stock_days
    eff_horizon = horizon_days if horizon_days is not None else body.horizon_days

    try:
        result = generate_batch_replenishment(
            upload_id=upload_id,
            lead_time_days=eff_lead,
            safety_stock_days=eff_safety,
            horizon_days=eff_horizon,
            inventory_overrides=body.inventory_overrides,
        )
        return result
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Replenishment error: {str(exc)}")


@app.get("/api/replenishment/{upload_id}")
def get_cached_replenishment(upload_id: str):
    """Return the cached replenishment recommendations for an upload session, if already generated."""
    cached = upload_store.get_session_replenishment(upload_id)
    if cached is None:
        raise HTTPException(
            status_code=404,
            detail=f"No replenishment recommendations have been generated yet for session '{upload_id}'. Call POST /api/replenishment/{upload_id} first.",
        )
    return cached


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.src.main:app", host="0.0.0.0", port=8000, reload=True)
