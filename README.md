# Inventory Compass 🧭

> **Navigate Demand. Optimize Inventory.**

Inventory Compass is a full-stack retail demand forecasting and inventory replenishment platform built with **FastAPI**, **scikit-learn**, and **React 19 + TypeScript + Vite**. It converts raw retail sales datasets into multi-horizon predictive demand projections and systematic purchase order replenishment recommendations.

---

## 🚀 Quick Start Guide

### 1. Backend Setup (FastAPI & ML Engine)

From the project root:

```powershell
# Create & activate Python virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install backend dependencies
pip install fastapi uvicorn pydantic scikit-learn xgboost pandas numpy pytest httpx python-multipart

# Start development API server (runs at http://127.0.0.1:8000)
uvicorn backend.src.main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Frontend Setup (React 19 + TypeScript + Vite)

In a separate terminal:

```powershell
cd frontend

# Install Node modules
npm install

# Start Vite development server (runs at http://localhost:5173)
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🛠️ Key Capabilities

* **Real Dataset Upload & Validation:** Upload shop transaction histories in CSV format up to 50MB with flexible automatic column alias detection (e.g. `SaleDate`, `ProductSKU`, `QuantitySold`).
* **Multi-Horizon Demand Forecasting:** Recursive rolling forecasting (7, 14, 30 days ahead) with temporal feature engineering (lags, rolling means/stds) and zero future data leakage.
* **Smart Replenishment Engine:** Reorder Point (ROP), safety stock calculations, and integer ceiling order quantities categorized by stockout risk tiers (`HIGH`, `MEDIUM`, `LOW`).
* **Strict Real Data Integrity:** Visibly distinguishable **Demo Mode** vs **Live Seller Mode**. Never silently replaces failed requests with synthetic fixtures.
* **Verified Model Performance:** Real holdout test benchmarks (MAE, RMSE, WAPE, $R^2$) served directly from historical evaluations.

---

## 🧪 Automated Testing

### Backend Test Suite (Pytest)
```powershell
python -m pytest backend/tests -v
```
* **82/82 tests passing** covering end-to-end integration, forecasting rollouts, preprocessing safety, replenishment math, and upload session security.

### Frontend Typecheck & Build
```powershell
cd frontend
npm run lint
npm run build
```

---

## 📖 Complete Documentation

For detailed architectural specifications, validation rules, regression metric formulas, API endpoint schemas, and troubleshooting, refer to:
* **[PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md)**: Full system technical guide.
