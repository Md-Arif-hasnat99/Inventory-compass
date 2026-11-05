# Inventory Compass

Retail demand forecasting and inventory replenishment planning.

Inventory Compass is a full-stack application that turns historical retail sales data into multi-horizon demand forecasts and reorder recommendations. The backend is a FastAPI service built on pandas, NumPy, and scikit-learn; the frontend is a React 19 and TypeScript application built with Vite and Tailwind CSS.

---

## Table of contents

1. [Overview](#1-overview)
2. [Key capabilities](#2-key-capabilities)
3. [Technology stack](#3-technology-stack)
4. [System architecture](#4-system-architecture)
5. [Repository structure](#5-repository-structure)
6. [How it works](#6-how-it-works)
7. [Mathematical model](#7-mathematical-model)
8. [API reference](#8-api-reference)
9. [CSV input schema](#9-csv-input-schema)
10. [Column mapping](#10-column-mapping)
11. [Validation rules](#11-validation-rules)
12. [Demo data and seller data](#12-demo-data-and-seller-data)
13. [Data and session lifecycle](#13-data-and-session-lifecycle)
14. [Frontend](#14-frontend)
15. [Getting started](#15-getting-started)
16. [Environment variables](#16-environment-variables)
17. [Testing and verification](#17-testing-and-verification)
18. [Security considerations](#18-security-considerations)
19. [Known limitations](#19-known-limitations)
20. [Documentation](#20-documentation)
21. [License](#21-license)

---

## 1. Overview

Inventory Compass converts a seller-provided sales history CSV into:

- a multi-horizon demand forecast per store and product for 7, 14, or 30 days;
- a model-provenance record describing how the forecast was produced;
- holdout evaluation metrics (MAE, RMSE, WAPE, R-squared);
- reorder point, safety stock, lead-time demand, stockout risk tier, and integer reorder quantity per SKU.

The application operates in two explicitly labeled data modes:

- **Seller data mode** - a CSV uploaded through the API is validated, processed, and used for forecasting and replenishment.
- **Demo mode** - an in-memory sample dataset is used for product exploration. Demo mode is labeled in the interface and never overwrites a failed seller request.

---

## 2. Key capabilities

- Flexible CSV ingestion with automatic column-alias resolution and manual mapping override.
- Seven data-integrity validation checks before any model runs.
- Leakage-free temporal feature engineering with per-series lags and rolling statistics.
- Chronological 80/20 model evaluation with real holdout metrics.
- Three forecasting strategies with explicit provenance: seller-trained Ridge regression, pretrained Linear Regression, and moving-average baseline.
- Recursive multi-step rollout for 7, 14, and 30-day horizons.
- Reorder point, safety stock, and integer order-quantity calculation with HIGH, MEDIUM, and LOW stockout risk tiers.
- Per-session forecast and replenishment caching with a two-hour session lifetime.
- Responsive React interface with route-level metadata, a shared footer, and Terms and Conditions.

---

## 3. Technology stack

### Backend

| Component | Version or library |
| :--- | :--- |
| Language | Python 3.10+ |
| API framework | FastAPI |
| ASGI server | Uvicorn |
| Data processing | pandas, NumPy |
| Modeling | scikit-learn, XGBoost (dependency), joblib |
| Validation | Custom schema and alias resolver |
| Testing | pytest |

### Frontend

| Component | Version or library |
| :--- | :--- |
| UI library | React 19 |
| Language | TypeScript |
| Build tool | Vite 8 |
| Routing | React Router DOM 7 |
| Styling | Tailwind CSS 4 |
| Charts | Recharts 3 |
| Linting | oxlint |

### Model artifacts

| Artifact | Purpose |
| :--- | :--- |
| `backend/models/best_model_linear_regression.joblib` | Pretrained champion regressor |
| `backend/models/model_metadata.json` | Feature list, medians, and training metrics |
| `backend/models/inventory_compass_model_bundle.zip` | Portable model bundle |
| `backend/reports/model_comparison.csv` | Historical benchmark comparison |
| `backend/reports/f1_metrics.json` | Stockout-detection evaluation metrics |

The pretrained champion is a Linear Regression model trained on 24 features with a 1-day-ahead target. Its metadata records a test MAE of 68.777, RMSE of 87.801, and WAPE of 50.41 percent on a synthetic retail dataset. The metadata explicitly notes that results may not generalize to real-world data.

---

## 4. System architecture

```
+--------------------------------------------------------------------------+
|                     Frontend (React 19 + TypeScript)                     |
|                                                                          |
|  Landing page            Workspace shell                                 |
|  - Product overview      - Collapsible sidebar and mobile drawer         |
|  - Demo preview          - Page title and dataset status in the topbar   |
|  - Workflow pipeline     - Overview, upload, forecasts, inventory,      |
|                          replenishment, products, guide, settings       |
|                                                                          |
|  API client: VITE_API_BASE_URL (default http://localhost:8000)           |
+-----------------------------------+--------------------------------------+
                                    |
                                    | HTTP REST (JSON and multipart/form-data)
                                    v
+--------------------------------------------------------------------------+
|                        Backend (FastAPI, Python 3.10)                    |
|                                                                          |
|  +----------------------+   +---------------------------------------+   |
|  | Upload and session   |   | Validation engine                     |   |
|  | - UUID4 session IDs  |   | - Column alias resolution             |   |
|  | - 50 MB limit        |   | - Date parsing and range check        |   |
|  | - Temp file per      |   | - Demand value checks                 |   |
|  |   session            |   | - Duplicate detection                 |   |
|  | - Two-hour TTL       |   | - Sufficiency and continuity checks   |   |
|  +----------+-----------+   +-------------------+-------------------+   |
|             |                                   |                       |
|             v                                   v                       |
|  +----------------------+   +---------------------------------------+   |
|  | Preprocessing        |   | Feature engineering                   |   |
|  | - Standardization    |   | - Calendar features                   |   |
|  | - Cleaning and       |   | - Lags: 1, 7, 14                      |   |
|  |   deduplication      |   | - Rolling mean: 7, 14, 30             |   |
|  | - Median imputation  |   | - Rolling standard deviation: 7       |   |
|  | - Series grouping    |   | - Categorical label encoding          |   |
|  +----------+-----------+   +-------------------+-------------------+   |
|             |                                   |                       |
|             v                                   v                       |
|  +----------------------+   +---------------------------------------+   |
|  | Forecasting engine   |   | Replenishment engine                  |   |
|  | - Ridge regression   |   | - Daily demand from forecast mean     |   |
|  | - Chronological 80/20|   | - Lead-time demand (LTD)              |   |
|  | - Recursive rollout  |   | - Safety stock (SS)                   |   |
|  | - Baseline fallback  |   | - Reorder point (ROP = LTD + SS)      |   |
|  | - Model provenance   |   | - Risk tiers and reorder quantity     |   |
|  +----------+-----------+   +-------------------+-------------------+   |
|             |                                   |                       |
|             +-----------------+-----------------+                       |
|                               v                                         |
|                 +----------------------------------+                    |
|                 | In-memory session cache          |                    |
|                 | forecast and replenishment data  |                    |
|                 +----------------------------------+                    |
+--------------------------------------------------------------------------+
```

---

## 5. Repository structure

```
Inventory-compass/
|-- backend/
|   |-- data/
|   |   |-- raw/                         # Reference retail dataset
|   |   `-- processed/                   # Cleaned training data
|   |-- models/                          # Serialized model artifacts and metadata
|   |-- notebooks/                       # Exploratory and training notebook
|   |-- reports/                         # Evaluation CSV, JSON, and charts
|   |-- src/
|   |   |-- evaluate.py                  # MAE, RMSE, WAPE, R2 metrics
|   |   |-- features.py                  # Leakage-free temporal feature pipeline
|   |   |-- forecasting.py               # Seller forecasting and recursive rollout
|   |   |-- main.py                      # FastAPI application and endpoints
|   |   |-- predict.py                   # Pretrained model inference
|   |   |-- preprocessing.py             # Cleaning, standardization, imputation
|   |   |-- replenishment.py             # ROP, safety stock, and reorder engine
|   |   |-- train.py                     # Model training pipeline
|   |   |-- upload.py                    # Upload session store and temp files
|   |   `-- validation.py                # Schema validation and alias resolution
|   |-- tests/                           # 82 pytest tests across six modules
|   `-- requirements.txt
|-- docs/
|   `-- TERMS_AND_CONDITIONS.md
|-- frontend/
|   |-- public/
|   |   `-- compass.svg
|   |-- src/
|   |   |-- app/                         # Router, providers, SEO sync
|   |   |-- components/
|   |   |   |-- charts/                  # Demand and forecast charts
|   |   |   |-- layout/                  # Shell, sidebar, topbar, footer
|   |   |   `-- ui/                      # Buttons, forms, tables, icons
|   |   |-- context/                     # Upload session context
|   |   |-- features/                    # Products and guide pages
|   |   |-- hooks/                       # Route-level document SEO
|   |   |-- pages/                       # Landing, overview, upload, forecast,
|   |   |                                # replenishment, settings, terms
|   |   |-- services/                    # Typed API clients
|   |   `-- types/                       # Shared TypeScript contracts
|   |-- index.html
|   |-- package.json
|   `-- vite.config.ts
|-- PROJECT_DOCUMENTATION.md             # Extended technical documentation
|-- plan.md                              # Frontend redesign implementation plan
|-- LICENSE                              # Apache License 2.0
`-- README.md
```

---

## 6. How it works

### Stage 1 - Upload

`POST /api/upload` accepts a multipart CSV file. The service checks the content type, the 50 MB size limit, and that the file is not empty. It then creates a UUID4 session, writes the bytes to an OS temporary file, and parses the header row.

The response includes the upload ID, row count, detected columns, an automatically resolved canonical mapping, unmapped columns, and a five-row preview. Validation does not run automatically at this stage.

### Stage 2 - Validate

`POST /api/upload/{upload_id}/validate` performs the full validation pipeline. The caller may supply a mapping override in the request body:

```json
{
  "mapping": {
    "date": "SaleDate",
    "units_sold": "QuantitySold",
    "product_id": "ProductSKU",
    "store_id": "ShopID",
    "inventory_level": "InventoryOnHand"
  }
}
```

The result status is `valid`, `valid_with_warnings`, or `invalid`, with explicit error and warning lists, a parsed date range, and preview rows.

### Stage 3 - Preprocess

Validated data is standardized to canonical column names, cleaned, deduplicated, chronologically sorted, and median-imputed. Each `(Store ID, Product ID)` pair is treated as an independent time series.

### Stage 4 - Forecast

`POST /api/forecast/{upload_id}` builds features, selects a model strategy, trains when appropriate, evaluates on a chronological holdout split, refits on all available data, and runs a recursive rollout for the requested horizon.

The response includes per-day predictions, the model type and provenance, warnings, and holdout metrics when a seller model was trained.

### Stage 5 - Replenish

`POST /api/replenishment/{upload_id}` converts forecast demand into inventory decisions. Daily demand is the mean predicted demand across the requested horizon for each series. Current inventory comes from the last observed `Inventory Level` value or from a per-product override. The engine then calculates lead-time demand, safety stock, reorder point, risk tier, days of supply, and reorder quantity.

---

## 7. Mathematical model

### 7.1 Series definition

Let a series be one pair of store and product. For series $i$, the observed demand at day $t$ is $y_{i,t}$. Features for day $t$ are computed only from observations before $t$.

### 7.2 Feature engineering

Calendar features are derived from the date: day of week, day of month, month, ISO week of year, weekend flag, and quarter.

Temporal features use an explicit shift of one day before any window is computed:

$$
\text{lag}_k(i,t) = y_{i,t-k}, \qquad k \in \{1, 7, 14\}
$$

$$
\text{roll\_mean}_w(i,t) = \frac{1}{w} \sum_{j=1}^{w} y_{i,t-j}, \qquad w \in \{7, 14, 30\}
$$

$$
\text{roll\_std}_7(i,t) = \sqrt{\frac{1}{6} \sum_{j=1}^{7} \left(y_{i,t-j} - \text{roll\_mean}_7(i,t)\right)^2}
$$

Categorical fields (store, product, category, region, weather, seasonality) are label-encoded. Unseen categories in inference are mapped to $-1$ rather than silently coerced to class $0$.

Contextual numeric features include price, discount, inventory level, holiday or promotion flag, and competitor pricing when present.

The complete 24-feature vector is:

```
day_of_week, day_of_month, month, week_of_year, is_weekend, quarter,
lag_1, lag_7, lag_14,
roll_mean_7, roll_mean_14, roll_mean_30, roll_std_7,
store_enc, product_enc, category_enc, region_enc, weather_enc, season_enc,
Price, Discount, Inventory Level, Holiday/Promotion, Competitor Pricing
```

### 7.3 Forecast model

The seller-trained model is Ridge regression with $\alpha = 1.0$:

$$
\hat{y} = \beta_0 + \sum_{j=1}^{p} \beta_j x_j
$$

The objective minimizes squared error with L2 regularization:

$$
\min_{\beta} \sum_{i=1}^{n} \left(y_i - \hat{y}_i\right)^2 + \alpha \sum_{j=1}^{p} \beta_j^2
$$

Predictions are clipped at zero because demand cannot be negative:

$$
\hat{y} \leftarrow \max(0, \hat{y})
$$

Training uses an 80/20 chronological split. The earliest 80 percent of unique dates form the training set and the most recent 20 percent form the holdout test set. After metrics are computed, the model is refit on all valid rows for future forecasting.

### 7.4 Recursive multi-step rollout

For a horizon $H \in \{7, 14, 30\}$, the model predicts sequentially:

$$
\hat{y}_{t+h} = f\left(x_{t+h}\right), \qquad h = 1, \dots, H
$$

At step $h = 1$, lag and rolling features use observed actuals up to day $t$. For steps $h \ge 2$, earlier predictions replace unobserved actuals inside the lag and rolling windows. No future actual value is ever used.

### 7.5 Model selection and fallbacks

| Condition | Strategy | Provenance value |
| :--- | :--- | :--- |
| `model_preference = baseline` | Moving-average or mean baseline | `baseline_heuristic` |
| `auto` and unique dates < 14 | Moving-average or mean baseline | `baseline_heuristic` |
| `model_preference = pretrained` | Pretrained Linear Regression | `pretrained_compatible` |
| Otherwise, or pretrained load failure | Seller-trained Ridge regression | `seller_trained` |

Baseline behavior:

- With at least 7 unique dates, the forecast uses the mean of the last seven observations.
- With fewer than 7 unique dates, the forecast uses the overall mean demand.
- A warning is always attached to baseline forecasts.

### 7.6 Evaluation metrics

Metrics are computed only on the chronological holdout set.

Mean Absolute Error:

$$
\text{MAE} = \frac{1}{n} \sum_{i=1}^{n} \left| y_i - \hat{y}_i \right|
$$

Root Mean Squared Error:

$$
\text{RMSE} = \sqrt{\frac{1}{n} \sum_{i=1}^{n} \left( y_i - \hat{y}_i \right)^2}
$$

Weighted Absolute Percentage Error:

$$
\text{WAPE} = \frac{\sum_{i=1}^{n} \left| y_i - \hat{y}_i \right|}{\sum_{i=1}^{n} \left| y_i \right|} \times 100\%
$$

Coefficient of determination:

$$
R^2 = 1 - \frac{\sum_{i=1}^{n} \left( y_i - \hat{y}_i \right)^2}{\sum_{i=1}^{n} \left( y_i - \bar{y} \right)^2}
$$

WAPE is the primary supply-chain error measure because it remains defined when individual days have zero sales. A negative $R^2$ indicates the model performs worse than predicting the historical mean.

### 7.7 Replenishment model

For each series, daily demand $d$ is the mean forecast over the horizon:

$$
d = \frac{1}{H} \sum_{h=1}^{H} \hat{y}_{t+h}
$$

Expected lead-time demand, with supplier lead time $L$ in days:

$$
\text{LTD} = d \times L
$$

Safety stock, with buffer $B$ in days:

$$
\text{SS} = d \times B
$$

Reorder point:

$$
\text{ROP} = \text{LTD} + \text{SS}
$$

Net inventory, where $I_{\text{on hand}}$ is current stock and $I_{\text{on order}}$ is outstanding supply:

$$
I_{\text{net}} = I_{\text{on hand}} + I_{\text{on order}}
$$

Recommended integer reorder quantity:

$$
Q^* =
\begin{cases}
\left\lceil \text{ROP} - I_{\text{net}} \right\rceil, & I_{\text{net}} < \text{ROP} \\
0, & I_{\text{net}} \ge \text{ROP}
\end{cases}
$$

Days of supply:

$$
\text{Days of supply} = \frac{I_{\text{on hand}}}{d}
$$

When $d = 0$, no reorder is generated unless current inventory is zero or negative, in which case the risk is HIGH.

### 7.8 Risk classification

| Risk tier | Condition | Interpretation |
| :--- | :--- | :--- |
| HIGH | $I_{\text{on hand}} \le 0$ or $I_{\text{net}} < \text{LTD}$ | Stockout is expected before the next delivery |
| MEDIUM | $\text{LTD} \le I_{\text{net}} < \text{ROP}$ | Stock is below the target safety buffer |
| LOW | $I_{\text{net}} \ge \text{ROP}$ | Inventory covers lead-time demand and safety stock |

Risk is always rendered with a text label in the interface, not by color alone.

---

## 8. API reference

Base URL: `http://127.0.0.1:8000`

### Service and model

| Method | Path | Description |
| :--- | :--- | :--- |
| GET | `/` | Service name, status, and model-loaded flag |
| GET | `/health` | Health check with model-loaded flag |
| GET | `/api/health` | Alias of the health check |
| GET | `/api/model/metadata` | Model specification, medians, and training metrics |
| GET | `/api/model/f1-metrics` | Stockout-detection metrics from `reports/f1_metrics.json` |
| GET | `/api/model/benchmarks` | Model comparison rows from `reports/model_comparison.csv` |

### Upload and validation

| Method | Path | Description |
| :--- | :--- | :--- |
| POST | `/api/upload` | Upload a CSV; returns `201` with upload ID and preview |
| GET | `/api/upload/{upload_id}` | Retrieve current session state |
| POST | `/api/upload/{upload_id}/validate` | Validate the dataset or apply a mapping override |
| DELETE | `/api/upload/{upload_id}` | Delete the session and its temporary file; returns `204` |

### Forecasting

| Method | Path | Description |
| :--- | :--- | :--- |
| POST | `/api/forecast/{upload_id}` | Generate a forecast for horizon 7, 14, or 30 |
| GET | `/api/forecast/{upload_id}` | Retrieve the cached forecast |

`POST /api/forecast` accepts parameters in the query string or JSON body:

```json
{
  "horizon_days": 14,
  "model_preference": "auto",
  "store_id": null,
  "product_id": null
}
```

`model_preference` accepts `auto`, `seller_trained`, `pretrained`, or `baseline`.

### Replenishment

| Method | Path | Description |
| :--- | :--- | :--- |
| POST | `/api/replenishment/{upload_id}` | Generate or refresh replenishment recommendations |
| GET | `/api/replenishment/{upload_id}` | Retrieve cached recommendations |

```json
{
  "lead_time_days": 4,
  "safety_stock_days": 2,
  "horizon_days": 14,
  "inventory_overrides": {
    "SKU_101": 80
  }
}
```

Constraints: `lead_time_days >= 1.0`, `safety_stock_days >= 0.0`, and `horizon_days` in `{7, 14, 30}`.

Error responses use standard FastAPI semantics: `400` for invalid parameters, `404` for unknown or expired sessions, `500` for engine failures.

---

## 9. CSV input schema

Required columns are a date column and a units-sold column. Additional columns improve feature quality and replenishment accuracy.

```csv
Date,ShopID,ProductSKU,QuantitySold,InventoryOnHand,SellingPrice,Category
2024-01-01,Store_A,SKU_101,18,80,25.00,Apparel
2024-01-02,Store_A,SKU_101,15,65,25.00,Apparel
2024-01-03,Store_A,SKU_101,22,50,25.00,Apparel
2024-01-01,Store_B,SKU_102,12,40,15.50,Footwear
2024-01-02,Store_B,SKU_102,14,28,15.50,Footwear
```

Upload constraints:

- File extension: `.csv`
- Content type: `text/csv`, `application/csv`, `application/octet-stream`, or `text/plain`
- Maximum size: 50 MB
- Minimum rows: 8

---

## 10. Column mapping

The validator resolves common header variants to canonical fields.

| Canonical field | Required | Accepted headers |
| :--- | :--- | :--- |
| `date` | Yes | `Date`, `date`, `transaction_date`, `sale_date`, `order_date`, `sales_date`, `SaleDate` |
| `units_sold` | Yes | `Units Sold`, `units_sold`, `sales`, `quantity_sold`, `demand`, `qty_sold`, `units`, `quantity`, `qty`, `UnitsSold`, `QuantitySold` |
| `product_id` | No | `Product ID`, `product_id`, `ProductID`, `SKU`, `item_id`, `sku`, `ProductSKU` |
| `store_id` | No | `Store ID`, `store_id`, `StoreID`, `shop_id`, `store`, `location_id`, `ShopID` |
| `inventory_level` | No | `Inventory Level`, `inventory_level`, `stock`, `current_inventory`, `stock_level`, `inventory`, `on_hand`, `onhand`, `InventoryOnHand` |
| `price` | No | `Price`, `price`, `unit_price`, `selling_price`, `SellingPrice` |
| `discount` | No | `Discount`, `discount`, `discount_pct`, `discount_percent`, `disc` |
| `promotion` | No | `Holiday/Promotion`, `promotion`, `promo`, `is_promo`, `holiday`, `is_holiday` |
| `category` | No | `Category`, `category`, `product_category`, `dept`, `department` |
| `region` | No | `Region`, `region`, `area` |
| `weather` | No | `Weather Condition`, `weather`, `weather_condition` |
| `seasonality` | No | `Seasonality`, `seasonality`, `season` |
| `competitor_pricing` | No | `Competitor Pricing`, `competitor_pricing`, `comp_price`, `competitor_price` |

If automatic detection is wrong, submit an explicit mapping via the validation endpoint and the override is persisted on the session.

---

## 11. Validation rules

The validator applies the following checks in order:

1. **File content and size** - reject empty files and files larger than 50 MB.
2. **Header resolution** - resolve aliases to canonical fields; error if `date` or `units_sold` cannot be resolved.
3. **Date parsing** - parse dates and report unparseable or mixed formats as errors.
4. **Demand validity** - demand values must be numeric and non-negative.
5. **Duplicate records** - detect duplicate `(date, store, product)` combinations and emit warnings.
6. **Sufficiency** - require at least 8 rows for forecasting; warn when history is shorter than 14 unique dates.
7. **Temporal continuity** - detect large gaps and report them as warnings.

A dataset with blocking errors is marked `invalid`. A dataset with only warnings is marked `valid_with_warnings`.

---

## 12. Demo data and seller data

| Behavior | Seller data | Demo data |
| :--- | :--- | :--- |
| Source | Uploaded CSV session | In-memory sample fixtures |
| Badge | Dataset state pill in the topbar | `Demo data` pill in the topbar |
| Failure behavior | Explicit error state; no silent fallback | Local sample rendering |
| Provenance | Actual model type and holdout metrics | Demo labeling |
| Reset | Clear dataset in the topbar | Not applicable |

A failed seller request never replaces seller results with synthetic data.

---

## 13. Data and session lifecycle

- Sessions are stored in an in-memory dictionary within the backend process.
- Raw CSV bytes are written to an OS temporary file with a UUID-based name; client filenames are never used on disk.
- Session metadata includes status, filename, size, row count, detected columns, canonical mapping, validation results, preview rows, and cached forecast and replenishment payloads.
- Sessions expire after 7,200 seconds (two hours) and are purged lazily on the next write.
- `DELETE /api/upload/{upload_id}` removes the session and its temporary file immediately.

Because the store is process-scoped, restarting the backend clears all active sessions.

---

## 14. Frontend

The frontend is a single-page application with a public landing page and a workspace shell.

| Route | Page |
| :--- | :--- |
| `/` | Landing page with product overview, workflow pipeline, and demo preview |
| `/workspace` | Redirects to the overview |
| `/workspace/overview` | Dataset status, forecast summary, and replenishment priorities |
| `/workspace/upload` | CSV selection, mapping, validation, and session reset |
| `/workspace/forecasts` | Historical and forecast demand with horizon selection |
| `/workspace/inventory` | Inventory and replenishment recommendations |
| `/workspace/replenishment` | Replenishment recommendations |
| `/workspace/products` | Product catalog |
| `/workspace/guide` | Inventory terminology guide |
| `/workspace/settings` | Forecasting defaults and display preferences |
| `/terms` | Terms and Conditions |

Design conventions:

- Light theme with a restrained forest-green accent (`#2f6b4f`) and neutral surfaces.
- System font stack; no remote font dependencies.
- Custom inline SVG icon set; no emoji or icon fonts.
- No gradients; light glass treatment is limited to raised surfaces and has a solid fallback.
- Reduced-motion support through `prefers-reduced-motion`.
- Route-level document titles, descriptions, OpenGraph tags, Twitter cards, and canonical links through `SeoSync`.

---

## 15. Getting started

### Prerequisites

- Python 3.10 or newer
- Node.js 20.19 or newer (Vite 8 requirement)
- npm
- Git

### Backend

From the repository root in PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r backend/requirements.txt
uvicorn backend.src.main:app --host 127.0.0.1 --port 8000 --reload
```

The API is available at `http://127.0.0.1:8000`. Interactive documentation is available at `http://127.0.0.1:8000/docs`.

### Frontend

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

The development server runs at `http://localhost:5173`.

### Production build

```powershell
cd frontend
npm run build
```

The build output is written to `frontend/dist`.

---

## 16. Environment variables

Frontend (`frontend/.env`):

```env
VITE_API_BASE_URL=http://localhost:8000
```

If `VITE_API_BASE_URL` is not set, the client defaults to `http://localhost:8000`.

Backend (`backend/.env`, optional for local development):

```env
DATABASE_URL=postgresql://user:password@localhost:5432/inventory_compass
API_SECRET_KEY=change_me
```

The current backend does not require a database or an API secret for local use. These variables are reserved for future deployment.

---

## 17. Testing and verification

### Backend

From the repository root:

```powershell
python -m pytest backend/tests -v
```

The suite contains 82 tests across six modules:

| Module | Tests | Coverage |
| :--- | :--- | :--- |
| `test_upload_validation.py` | 32 | Alias resolution, schema checks, session management |
| `test_preprocessing_features.py` | 16 | Cleaning, imputation, lag and rolling safety |
| `test_replenishment.py` | 12 | ROP math, risk tiers, batching, caching |
| `test_forecasting.py` | 9 | Horizons, provenance, fallbacks, caching |
| `test_e2e_workflow.py` | 9 | Upload to replenishment end-to-end |
| `test_pipeline.py` | 4 | Cleaning, feature pipeline, metrics, inference |

Current result: 82 passed.

### Frontend

```powershell
cd frontend
npm run lint
npm run build
```

The lint command uses oxlint. The build command runs the TypeScript compiler and the Vite production build.

---

## 18. Security considerations

- Upload identifiers are UUID4 values and are not guessable.
- Client filenames are sanitized for display and never used as on-disk paths.
- Temporary files are created with `tempfile.mkstemp` and deleted on expiry or explicit deletion.
- Internal temporary paths are never returned to API clients.
- CORS is currently open (`allow_origins=["*"]`) for local development.
- There is no authentication or multi-tenant isolation. Do not deploy publicly without adding authentication and tenant-level access control.

---

## 19. Known limitations

1. **Short histories** - datasets with fewer than 14 unique dates fall back to moving-average baselines and cannot learn weekly or annual seasonality.
2. **Censored demand** - zero sales caused by stockouts are not corrected, which can understate true demand.
3. **Constant lead time** - supplier lead time is a policy input; stochastic lead-time variability is not modeled.
4. **Process-scoped sessions** - restarting the backend clears all upload sessions and cached results.
5. **Synthetic benchmark data** - the pretrained champion was trained on a synthetic retail dataset; its reported metrics may not generalize to real store data.
6. **No authentication** - the application is a single-tenant local workspace.

---

## 20. Documentation

- [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md) - extended architecture, validation, API, and evaluation reference.
- [docs/TERMS_AND_CONDITIONS.md](docs/TERMS_AND_CONDITIONS.md) - Terms and Conditions.
- [plan.md](plan.md) - frontend redesign implementation plan.
- [DEAD_CODE_AUDIT.md](DEAD_CODE_AUDIT.md) - dead-code audit and cleanup record.

---

## 21. License

Released under the Apache License 2.0. See [LICENSE](LICENSE) for the full text.
