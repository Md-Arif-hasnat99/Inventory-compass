# Inventory Compass — Technical & System Documentation

> **Tagline:** Navigate Demand. Optimize Inventory.  
> **System Architecture:** FastAPI (Python 3.10+) + React 19 / TypeScript / Vite  
> **Documentation Version:** 2.0 (Post Parts 1–8 Implementation)

---

## 1. Project Overview

**Inventory Compass** is a predictive retail intelligence and inventory optimization platform. It bridges data science and supply chain management by transforming raw seller transaction histories into multi-horizon demand forecasts and actionable purchase order recommendations.

The application operates in two distinct, explicitly labeled modes:
1. **Real Data Mode:** Upload a seller CSV dataset, map and validate columns, generate recursive multi-step forecasts via seller-trained regressors (or compatible pretrained models), and evaluate inventory replenishment triggers.
2. **Interactive Demo Mode:** Explore mock retail operations across 5 stores and 20 SKUs with pre-calculated benchmarks for development, testing, and UI preview without requiring an upload.

---

## 2. Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Frontend Client (React 19 + TypeScript)              │
│  - Topbar & Demo/Real Badge  - Upload & Column Mapping Preview         │
│  - Forecast Demand Ledger    - Replenishment & Stockout Risk Analysis  │
│  - Model Performance Board   - Global UploadContext Session Store      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP REST API (JSON / Multipart)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Backend Service (FastAPI / Python 3.10)              │
│                                                                        │
│  ┌───────────────────────┐  ┌───────────────────────────────────────┐  │
│  │   Upload & Validation │  │         Preprocessing Engine          │  │
│  │ - UUID4 Sessions      │  │ - Chronological Sorting               │  │
│  │ - 50MB NamedTempFiles │  │ - Group Separation (Product/Store)    │  │
│  │ - Flexible Aliases    │  │ - Lag (1,7,14) & Rolling Statistics   │  │
│  └───────────┬───────────┘  └───────────────────┬───────────────────┘  │
│              │                                  │                      │
│              ▼                                  ▼                      │
│  ┌───────────────────────┐  ┌───────────────────────────────────────┐  │
│  │  Demand Forecasting   │  │         Replenishment Engine          │  │
│  │ - Multi-step Rollout  │  │ - Lead-Time Demand (LTD)              │  │
│  │ - Holdout Evaluation  │  │ - Safety Stock Buffer (SS)            │  │
│  │ - Baseline Fallbacks  │  │ - Reorder Point (ROP = LTD + SS)      │  │
│  │ - Model Provenance    │  │ - Risk Tiers (HIGH / MEDIUM / LOW)    │  │
│  └───────────────────────┘  └───────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Repository Structure

```
Inventory-compass/
├── backend/
│   ├── models/                    # Serialized models and scalers (pkl/joblib)
│   ├── reports/
│   │   └── model_comparison.csv   # Historical ML evaluation benchmarks
│   ├── src/
│   │   ├── evaluate.py            # Chronological evaluation (MAE, RMSE, WAPE, R2)
│   │   ├── features.py            # Leakage-free temporal feature engineering
│   │   ├── forecasting.py         # Seller recursive forecasting & training engine
│   │   ├── main.py                # FastAPI REST API endpoints
│   │   ├── predict.py             # Single-point inference pipeline
│   │   ├── preprocessing.py       # Cleaning, standardization, and imputation
│   │   ├── replenishment.py       # ROP, safety stock, and reorder engine
│   │   ├── upload.py              # Upload session store & temporary file lifecycle
│   │   └── validation.py          # Column alias resolution & schema checks
│   └── tests/
│       ├── test_e2e_workflow.py   # Full upload-to-replenishment integration tests
│       ├── test_forecasting.py    # Forecasting rollout & metrics tests
│       ├── test_pipeline.py       # Baseline pipeline & inference tests
│       ├── test_preprocessing_features.py # Preprocessing & leakage tests
│       ├── test_replenishment.py  # Inventory math & edge-case tests
│       └── test_upload_validation.py # Upload & alias resolution tests
├── frontend/
│   ├── src/
│   │   ├── app/                   # App root and global context providers
│   │   ├── components/            # UI primitives, charts, Topbar, Sidebar
│   │   ├── context/               # UploadContext (persisted session & state)
│   │   ├── features/
│   │   │   ├── dashboard/         # Retail Operations overview
│   │   │   ├── forecasting/       # Demand forecasting interactive ledger
│   │   │   ├── inventory/         # Replenishment recommendations & PO draft
│   │   │   ├── model-performance/ # Verified benchmark comparison board
│   │   │   └── upload/            # CSV dropzone, mapping, & validation UI
│   │   ├── mocks/                 # Development demo data & offline fixtures
│   │   ├── services/              # API clients for upload, forecast, inventory
│   │   └── types/                 # TypeScript interfaces and contracts
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
└── PROJECT_DOCUMENTATION.md       # Complete technical guide
```

---

## 4. Windows Development Setup

### Prerequisites
* **Python**: 3.10.x or higher installed and added to `PATH`.
* **Node.js**: 18.x or 20.x LTS installed with `npm`.
* **Git**: Installed for version control.

---

## 5. Python Virtual Environment Setup

In PowerShell from repository root:

```powershell
# Create virtual environment
python -m venv .venv

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Upgrade pip
python -m pip install --upgrade pip
```

---

## 6. Backend Installation and Startup

```powershell
# Install dependencies
pip install fastapi uvicorn pydantic scikit-learn xgboost pandas numpy pytest httpx python-multipart

# Start development API server (runs on http://localhost:8000)
uvicorn backend.src.main:app --host 127.0.0.1 --port 8000 --reload
```

---

## 7. Frontend Installation and Startup

In a separate PowerShell terminal:

```powershell
cd frontend

# Install Node dependencies
npm install

# Start Vite development server (runs on http://localhost:5173)
npm run dev

# Run production build and typecheck
npm run build
```

---

## 8. CSV Upload Schema

A seller upload requires a minimum of **Date** and **Sales / Units Sold**. Additional columns enrich predictions and inventory calculations.

### Example Valid CSV Schema

```csv
Date,ShopID,ProductSKU,QuantitySold,InventoryOnHand,SellingPrice,Category
2024-01-01,Store_A,SKU_101,18,80,25.00,Apparel
2024-01-02,Store_A,SKU_101,15,65,25.00,Apparel
2024-01-03,Store_A,SKU_101,22,50,25.00,Apparel
2024-01-01,Store_B,SKU_102,12,40,15.50,Footwear
2024-01-02,Store_B,SKU_102,14,28,15.50,Footwear
```

---

## 9. Supported Column Mappings

The validation engine automatically maps common seller column headers to internal canonical fields:

| Canonical Field | Required | Accepted Aliases / Headers |
| :--- | :--- | :--- |
| `date` | **Yes** | `Date`, `date`, `transaction_date`, `sale_date`, `order_date`, `sales_date`, `SaleDate` |
| `units_sold` | **Yes** | `Units Sold`, `units_sold`, `sales`, `quantity_sold`, `demand`, `qty_sold`, `QuantitySold`, `UnitsSold` |
| `product_id` | Optional | `Product ID`, `product_id`, `ProductID`, `SKU`, `item_id`, `sku`, `ProductSKU` |
| `store_id` | Optional | `Store ID`, `store_id`, `StoreID`, `shop_id`, `store`, `location_id`, `ShopID` |
| `inventory_level`| Optional | `Inventory Level`, `inventory_level`, `stock`, `current_inventory`, `InventoryOnHand` |
| `price` | Optional | `Price`, `price`, `unit_price`, `selling_price`, `SellingPrice` |
| `category` | Optional | `Category`, `category`, `product_category`, `dept`, `department` |

---

## 10. Data Validation Rules

Before preprocessing, uploaded datasets undergo 7 validation checks:
1. **File Size Check:** Rejects files $> 50\text{ MB}$ or empty 0-byte files.
2. **Header Matching:** Resolves column aliases. Errors if `date` or `units_sold` cannot be resolved.
3. **Date Parsing:** Parses dates chronologically. Rejects datasets with unparseable or mixed date formats.
4. **Demand Value Check:** Validates that demand values are numerical and $\ge 0$. Flagged negative entries cause validation errors.
5. **Duplicate Detection:** Identifies duplicate `(date, store, product)` records. Emits warnings and averages duplicates during preprocessing.
6. **Sufficiency Check:** Requires at least 8 observations per series for time-series modeling. Warns if history is $< 14$ days.
7. **Temporal Continuity:** Detects large date gaps in transaction histories.

---

## 11. API Endpoint Specifications

### Upload & Validation
* `POST /api/upload`: Accepts multipart CSV file. Returns `upload_id` (UUID4), preview rows, and detected headers. (Status: `201 Created`).
* `GET /api/upload/{upload_id}`: Retrieves upload session status and metadata.
* `POST /api/upload/{upload_id}/validate`: Validates dataset or applies custom user column mapping override.
* `DELETE /api/upload/{upload_id}`: Deletes upload session and removes temporary CSV file from disk.

### Forecasting
* `POST /api/forecast/{upload_id}`: Generates multi-step demand predictions for horizon (7, 14, or 30 days). Returns predicted points, confidence bounds, model provenance, and test metrics.
* `GET /api/forecast/{upload_id}`: Retrieves cached forecast for the session.

### Inventory Replenishment
* `POST /api/replenishment/{upload_id}`: Calculates ROP, safety stock, risk tiers, and integer reorder quantities using forecast velocity and configured lead times.
* `GET /api/replenishment/{upload_id}`: Retrieves cached replenishment recommendations for the session.

### Model Benchmarks
* `GET /api/model/benchmarks`: Serves real benchmark evaluations from `model_comparison.csv` (MAE, RMSE, WAPE, train times).
* `GET /api/model/metadata`: Serves specification and training policy details for the baseline champion regressor.

---

## 12. Forecasting Strategy

### Multi-Step Recursive Rollout
Direct multi-step forecasting predicts daily demand sequentially for $t+1, t+2, \dots, t+H$:
1. At step $t+1$, lag features (`lag_1`, `lag_7`, `lag_14`) and rolling features (`roll_mean_7`, `roll_mean_14`, `roll_std_7`) are computed from observed actuals.
2. At step $t+2$ through $t+H$, prior predicted values recursively populate subsequent lag and rolling window inputs.
3. **No future actuals** are leaked into the forecasting horizon.

### Model Training & Selection Strategy
1. **Seller-Trained Regressor:** If the seller dataset has $\ge 30$ historical records, an Ridge/Linear regressor is trained directly on the seller's standardized features using an 80/20 chronological train/test split.
2. **Pretrained Pipeline Fallback:** If series length is modest (14–29 days), the system applies the pretrained retail champion model with calibrated group alignment.
3. **Baseline Moving Average:** For short histories ($< 14$ days), an empirical 7-day moving average baseline is returned with an explicit warning banner.

---

## 13. Model Provenance

Every forecast response includes explicit model provenance:
* `seller_trained`: Model fitted directly on the uploaded dataset with test evaluation metrics.
* `pretrained_pipeline`: Model trained on benchmark store data applied to seller data.
* `baseline_heuristic`: Empirical moving average applied due to insufficient history.

Provenance is visibly displayed in the UI banner and forecast cards.

---

## 14. Chronological Evaluation Methodology

To guarantee zero future data leakage:
* **No Random K-Fold Splitting:** Standard random train/test splits cause severe lookahead bias in time series.
* **Strict Temporal Partitions:** The earliest $80\%$ of dates are allocated to model training; the most recent $20\%$ of dates form the unseen test holdout set.
* **Lag Safety:** Lags are generated using `shift(1)` so that current day demand is never included in same-day feature vectors.

---

## 15. Regression Metrics and Their Limitations

Metrics reported in the application are computed exclusively on chronological holdout test sets:
* **MAE (Mean Absolute Error):** Measures average absolute deviation in units. Easy to interpret, robust to outliers.
* **RMSE (Root Mean Squared Error):** Penalizes large forecasting errors quadratically.
* **WAPE (Weighted Absolute Percentage Error):** $\frac{\sum |y - \hat{y}|}{\sum y} \times 100\%$. Avoids division-by-zero on zero-sales days.
* **$R^2$ (Coefficient of Determination):** Proportion of variance explained. Can be negative if the model performs worse than the historical mean.

*Limitation:* Metrics evaluate model accuracy under normal conditions and do not predict black-swan stock disruptions or sudden supplier disruptions.

---

## 16. Inventory Replenishment Assumptions

Replenishment recommendations follow standard supply-chain reorder formulas:

$$\text{Expected Lead-Time Demand (LTD)} = \text{Daily Forecast Demand} \times \text{Lead Time (Days)}$$
$$\text{Safety Stock (SS)} = \text{Daily Forecast Demand} \times \text{Safety Buffer (Days)}$$
$$\text{Reorder Point (ROP)} = \text{LTD} + \text{SS}$$
$$\text{Suggested Order Qty} = \max\left(0, \lceil \text{ROP} - \text{Current On-Hand Stock} - \text{Outstanding Orders} \rceil\right)$$

### Stockout Risk Tiers
* **`HIGH` (Critical):** Current Stock $\le \text{Expected Lead-Time Demand}$. Stockout is imminent before supplier delivery.
* **`MEDIUM` (Low Buffer):** $\text{Expected Lead Demand} < \text{Current Stock} \le \text{Reorder Point}$.
* **`LOW` (Adequate):** Current Stock $> \text{Reorder Point}$.

---

## 17. Demo Mode vs. Real Uploaded-Data Mode

| Capability | Real Uploaded-Data Mode | Interactive Demo Mode |
| :--- | :--- | :--- |
| **Data Source** | Seller CSV via `/api/upload` | In-memory mock fixtures |
| **Badge Indicator** | Green `Live Seller Data Active` badge | Amber `Demo Mode Active` badge |
| **Failure Behavior** | Displays explicit error banner; **never** falls back to demo data | Renders local demo simulation |
| **Model Provenance** | Displays actual trained model & holdout metrics | Labels demo champion model |
| **Session Control** | 1-click "Change Dataset" or clear session | 1-click "Upload Real Shop CSV" |

---

## 18. Known Limitations

1. **Stationarity & Seasonality:** Short seller uploads ($< 1$ year) cannot learn annual holiday seasonality.
2. **Stockout Censoring:** If historical data records zero sales because an item was out of stock, unadjusted demand models may under-forecast true consumer demand.
3. **Constant Lead Time:** Supplier lead times are user-configured policy inputs; stochastic lead-time variability is not modeled.
4. **Single-Node In-Memory Session Store:** Upload sessions live in memory on the backend process. Restarting the server clears active sessions.

---

## 19. Security Limitations

* **Session Isolation:** Upload sessions use UUID4 identifiers and isolated temporary files. Identifier collision is computationally infeasible.
* **Path Traversal Protection:** User filenames are never used on disk; files are written via `tempfile.mkstemp` with randomized prefixes.
* **No Authentication:** The current system operates as a single-tenant local workspace without user login or multi-tenant database partitioning. **Do not deploy to public internet without adding authentication middleware (e.g. OAuth2/JWT).**

---

## 20. Tests and Reproducibility

### Backend Test Suite
Run from repository root:
```powershell
python -m pytest backend/tests -v
```
* **Coverage:** 82 automated unit, pipeline, and end-to-end tests across 6 test modules:
  * `test_upload_validation.py` (22 tests)
  * `test_preprocessing_features.py` (16 tests)
  * `test_forecasting.py` (9 tests)
  * `test_replenishment.py` (12 tests)
  * `test_pipeline.py` (14 tests)
  * `test_e2e_workflow.py` (9 tests)

### Frontend Build & Lint
Run from `frontend/`:
```powershell
npm run lint
npm run build
```

---

## 21. Troubleshooting

* **Issue: "File must have a .csv extension"**  
  *Solution:* Ensure the uploaded file has a `.csv` extension and contains comma-separated plain text.
* **Issue: "Required columns not found"**  
  *Solution:* Verify your CSV has columns representing dates and units sold, or use the interactive column mapping UI to select the correct columns.
* **Issue: Frontend shows "Connecting to Backend..." or Network Error**  
  *Solution:* Ensure the backend server is running on `http://127.0.0.1:8000`. Verify CORS settings in `backend/src/main.py`.
* **Issue: Backend throws module import errors**  
  *Solution:* Activate the virtual environment (`.\.venv\Scripts\Activate.ps1`) and ensure dependencies are installed via `pip install -r backend/requirements.txt` or equivalent packages.

---

## 22. Final Handover & Roadmap Summary

### Completed Functionality (Parts 1–9)
1. **Audited Legacy Foundation:** Discovered and fixed silent synthetic fallbacks, unknown label encoding crashes, and hardcoded demo modes.
2. **Seller Upload & Validation System:** Full multipart upload, flexible header resolution, 7 integrity checks, and UUID4 session management.
3. **Leakage-Free Preprocessing:** Chronological ordering, group separation, `shift(1)` temporal features, and train-only imputation.
4. **Seller Demand Forecasting Engine:** Multi-step rollouts for 7/14/30 days, chronological evaluation metrics, and baseline moving average fallbacks.
5. **Inventory Replenishment Engine:** Systematic ROP, safety buffers, risk classification, and integer purchase orders.
6. **Frontend Integration & Mode Integrity:** Reactive `UploadContext`, explicit mode badges in topbar/ledger, interactive controls, and zero silent fallback to synthetic fixtures.
7. **End-to-End Verification:** 82 passing pytest automated tests; clean TypeScript production build.

### Future Work (Beyond Scope)
* Multi-tenant persistent database storage (PostgreSQL) replacing in-memory session dictionaries.
* User authentication and role-based access control (RBAC).
* Automated scheduled batch retraining jobs with drift detection.
* Advanced deep learning architectures (e.g. Temporal Fusion Transformers) for long-horizon seasonal forecasting.

