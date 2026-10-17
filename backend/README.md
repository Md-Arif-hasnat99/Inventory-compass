# Inventory Compass - Backend (ML)

This folder contains all machine-learning, data-processing, and model-serving code.

## Structure

| Path | Purpose |
|------|---------|
| `data/raw/` | Raw input data - NOT committed |
| `data/processed/` | Cleaned datasets - NOT committed |
| `models/` | Serialised trained models - NOT committed |
| `notebooks/` | Exploratory Jupyter notebooks |
| `src/` | Importable Python source modules |
| `tests/` | Unit and integration tests |
| `requirements.txt` | Python dependencies |
| `.env.example` | Template for environment variables |

## Quick Start

Activate the virtual environment at the repo root, then:

    pip install -r backend/requirements.txt
    jupyter notebook backend/notebooks/
