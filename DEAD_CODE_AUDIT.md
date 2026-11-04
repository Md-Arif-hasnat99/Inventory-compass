# Dead Code Audit — Inventory-compass (tester perspective)

Date: 2026-11-04 · Scope: `backend/**` + `frontend/**` (excl. `.venv`, `node_modules`, caches)
Legend: 🔴 definitely dead · 🟠 unused symbol/prop · 🟡 questionable / needs decision · ✅ verified live

---

## 1. Backend — dead functions & classes

| Status | File | Symbol | Line | Evidence |
|---|---|---|---|---|
| 🔴 | `backend/src/preprocessing.py` | `save_processed_data()` | 281 | Only ref = its own re-export in `src/__init__.py:5,14`. Never called by src, tests, CLI, notebook or endpoint. |
| 🔴 | `backend/src/upload.py` | `list_sessions()` | 131 | Zero call sites. Its `List` typing import (`upload.py:27`) exists only for this. |
| 🔴 | `backend/src/generate_f1_graph.py` | `generate_f1_analysis()` + whole module | 23 | Never imported; only self-run via `__main__` (191–192). Not in any README/doc/test. |
| 🟡 | `backend/src/train.py` | `train_and_select_best_model()` | 45 | Only caller = own `__main__` (185). Notebook re-implements training inline. |
| 🟡 | `backend/src/preprocessing.py` | `load_raw_data()` | 30 | Only callers: `train.py:183` (CLI) + dead `generate_f1_graph.py:30`. |
| 🟡 | `backend/src/predict.py` | `forecast_inventory_decision()` | 76 | Production caller only via dead `POST /api/predict`; otherwise test-only (`test_pipeline.py:110`). |
| 🟠 | `backend/src/preprocessing.py` | `impute_missing_values(fit=False, imputer_stats=…)` path | 121–185 | The `fit=False` reuse path is exercised only by tests; production always uses `fit=True`. |

## 2. Backend — dead modules / files

| Status | File | Note |
|---|---|---|
| 🔴 | `backend/src/generate_f1_graph.py` | Never imported; sole consumer of `matplotlib`/`seaborn` in `src/`. |
| 🟡 | `backend/src/train.py` | Reachable only via `__main__`; but `__init__.py:8` eagerly imports it → **every app start pulls in `xgboost`**. |
| 🟡 | `backend/notebooks/build_nb.py` | Never invoked; generated `.ipynb` already committed. ⚠️ No `__main__` guard — importing it **overwrites the notebook** (line 691). |
| 🔴 | `backend/.env.example` (`DATABASE_URL`, `API_SECRET_KEY`) | Backend reads no env vars at all — leftover DB template. |
| 🔴 | `backend/reports/*.png` (8 files: `eda_*`, `actual_vs_predicted`, `feature_importances`, `model_comparison_mae`, `f1_score_graph`) | Tracked but never read/served/embedded — display-only orphans. |
| 🔴 | `backend/data/processed/clean_inventory.csv` | Intermediate written by notebook; read by nothing (training reads raw CSV). |
| 🔴 | `backend/models/inventory_compass_model_bundle.zip` | Created by notebook cell; referenced by no code. |

## 3. Backend — dead API endpoints

| Status | Endpoint | Route line | Caller? |
|---|---|---|---|
| 🔴 | `POST /api/predict` | `main.py:119` (+ `PredictRequest:43–54`) | No frontend fetch anywhere, no test, undocumented. |
| 🔴 | `GET /api/upload/schema` | `main.py:152` | Frontend defines `getSchema` but never invokes it; no test. |
| 🔴 | `GET /api/upload/{id}/preview` | `main.py:274` | Frontend defines `getPreview` but never invokes it; no test. |
| 🟡 | `GET /` | `main.py:57` | No caller/test/doc. |
| 🟡 | `GET /health`, `/api/health` | `main.py:66–68` | No caller — but conventional monitoring endpoint: **infra check before deleting**. |
| 🟡 | `GET /api/forecast/{id}` (cached) | `main.py:347` | No production caller; test-covered only. |
| 🟡 | `GET /api/replenishment/{id}` (cached) | `main.py:407` | No production caller; test-covered only. |

## 4. Backend — unused imports & locals

Unused imports: `main.py:9 List` · `train.py:8 os`, `train.py:15 numpy` · `forecasting.py:13 datetime`, `:14 Union`, `:24 add_calendar_features` · `features.py:7 Any, Union` · `test_e2e_workflow.py:14 os` · `test_upload_validation.py:11 Path`, `:12 Any, Dict`, `:15 pytest` · `test_preprocessing_features.py:12–14 FEATURE_COLS, TARGET_COL, add_calendar_features`.

Unused locals: `generate_f1_graph.py:32 encoders`, `:33 val_df` · `train.py:56 encoders`.

## 5. Backend — duplication / stale legacy

- `main.py:144 MAX_UPLOAD_BYTES` duplicates `validation.py:50 MAX_FILE_SIZE_BYTES` (both 50 MB).
- Reorder-point/risk-tier math duplicated: `predict.py:91–108` vs `replenishment.py:55–78`.
- Feature `row_dict` block duplicated verbatim: `forecasting.py:344–369` vs `:373–398`.
- `predict.py:34–36` reads `metadata["model_file"]`, but shipped `model_metadata.json` has no such key → branch always falls through.
- `main.py:419–421` `__main__` block duplicates documented `uvicorn …` CLI.
- Stale test expectations: `test_e2e_workflow.py:103` (`"valid_with_warnings"` never produced), `:115` (`"pretrained_pipeline"` vs actual `"pretrained_compatible"`), `:185` posts `column_mapping` but model expects `mapping` → override silently ignored.
- No commented-out code, no `TODO`/`FIXME` in backend.

## 6. Backend — requirements.txt

- 🔴 **Missing & required**: `python-multipart` (app currently **fails to import** — `RuntimeError` at `main.py:165`), `httpx` (needed by `TestClient` in 3 test files).
- 🟠 Unused at runtime: `matplotlib`, `seaborn` (only dead `generate_f1_graph.py` + notebook), `jupyter` (borderline — notebook only).

---

## 7. Frontend — dead components & routes

| Status | Item | Evidence |
|---|---|---|
| 🔴 | `src/features/model-performance/ModelPerformancePage.tsx` (538 lines) | Never imported; `App.tsx:72` redirects `/model-performance`→`/guide`; no nav entry. |
| 🔴 | `src/components/ui/EmptyState.tsx` | Zero importers. |
| 🔴 | Route `/model-performance` (`App.tsx:72`) + SEO entry `useDocumentSeo.ts:52` | Dead redirect stub, no inbound links. |
| 🟠 | Route `/dashboard` (`App.tsx:62`) + `routeTitles['/dashboard']` (`:19`) + `ROUTE_SEO['/dashboard']` | Duplicate of `/`; no inbound link — URL-only reachability. |

## 8. Frontend — dead exported functions / types

| File | Export | Line |
|---|---|---|
| `services/model.service.ts` | `modelService` (entire object) | 38 — only consumer is dead page |
| `services/upload.service.ts` | `getPreview()` | 71 |
| `services/upload.service.ts` | `getSchema()` | 98 (+ type `types/upload.ts:34 UploadSchema`) |
| `services/forecast.service.ts` | `getCachedSellerForecast()` | 52 |
| `services/inventory.service.ts` | `getProductById()` | 54 |
| `services/inventory.service.ts` | `getCachedSellerReplenishment()` | 97 |
| `services/api-client.ts` | `ApiError` class, `IS_DEMO_MODE_DEFAULT` | 17, 8 |
| `types/forecast.ts` | `interface ForecastFilter` | 18 |
| `mocks/demo-data.ts` | `REAL_MODEL_BENCHMARKS`, `REAL_MODEL_METADATA` | 360, 369 |

## 9. Frontend — unused npm dependencies

- `clsx` (pkg:14) — zero imports.
- `tailwind-merge` (pkg:20) — zero imports.
- `postcss` (pkg:30), `autoprefixer` (pkg:28) — no PostCSS config; Tailwind v4 via `@tailwindcss/vite`.
- `@tanstack/react-query` (pkg:13) — only `QueryClientProvider` mounted; `useQuery`/`useMutation` = 0 matches → no-op provider (`providers.tsx:2`).

## 10. Frontend — unused imports / locals / props

Unused imports (17): `InventoryPage.tsx:21 STORES` + 7 lucide icons (5,7,10–14) · `ProductsPage.tsx:3 TrendingUp, Package` · `SettingsPage.tsx:2 SettingsIcon, Database, Moon, ShieldAlert` · `InventoryGuidePage.tsx:7–15` 7 icons · (dead page: 4 icons).
Root cause: `tsconfig.app.json:22–23` `noUnusedLocals/Parameters = false`.

Unused locals/state: `DashboardPage.tsx:49 loading` · `InventoryPage.tsx:31 loading` · `SettingsPage.tsx:9 demoMode/setDemoMode` (always-true no-op) · `ForecastPage.tsx:101 realMetrics` · `UploadContext.tsx:18,51 sessionLoading`, `:14 activeUploadId` (write-only).

Unused props: `Topbar.tsx:11 onRefresh` (refresh button spins 600 ms, does nothing) · `Topbar.tsx:13 isDemoMode` · `PageContainer.tsx:8 className` · `Badge.tsx:7 className`, `:6 children` · `TermTooltip.tsx:96–97 showIcon, className`.
Unreachable Badge cases: `Badge.tsx:29–40` (`CHAMPION`, `DEMO`, `REAL`).

## 11. Frontend — unused assets

`src/assets/vite.svg`, `src/assets/react.svg`, `src/assets/hero.png`, `public/favicon.svg`, `public/icons.svg` — zero references. (`public/compass.svg` ✅ used.)

---

## 12. Repo hygiene (root)

- `.gitignore:120–121` ignores `prd.md` & `PROJECT_DOCUMENTATION.md` → **project docs are unversioned**.
- Uncommitted work: 8 modified frontend files + 3 untracked additions (`TermTooltip.tsx`, `features/guide/`, `hooks/`).
- ⚠️ **Not dead but broken**: `backend/models/*.joblib` is gitignored+untracked → fresh clone can't init `InventoryPredictor` → all API 503s.
- `pytest` 9.0.3 and 9.1.1 caches coexist → env version drift.

## 13. Recommended removal order

1. **Fix first**: add `python-multipart` + `httpx` to `requirements.txt`; fix 3 stale test expectations; decide on `.gitignore` doc rules.
2. **Safe delete**: `ModelPerformancePage.tsx` + `model.service.ts` + `REAL_MODEL_*` mocks + dead route/SEO; `EmptyState.tsx`; unused deps (`clsx`, `tailwind-merge`, `postcss`, `autoprefixer`); unused assets; dead service methods (§8); unused imports/locals/props (§10).
3. **Safe delete (backend)**: `save_processed_data`, `list_sessions`, `generate_f1_graph.py`, `/api/predict` + `PredictRequest`, `/api/upload/schema` + `/api/upload/{id}/preview` (+ frontend twins), orphaned report PNGs, `clean_inventory.csv`, model bundle zip, `.env.example` env vars.
4. **Decide**: `train.py` CLI vs notebook as canonical path; cached GET endpoints (test-covered only); `/health` (infra); `/dashboard` route; react-query provider (adopt it or remove it).
