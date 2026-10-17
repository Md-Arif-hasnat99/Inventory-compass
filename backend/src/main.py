"""
FastAPI Microservice for Inventory Compass.
Serves forecasting models, replenishment recommendations, and model benchmarks.
"""

from typing import Any, Dict, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.src.predict import InventoryPredictor

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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.src.main:app", host="0.0.0.0", port=8000, reload=True)
