# Python API and intelligence modules

Python `3.11.x`, FastAPI, and Pydantic. NumPy, pandas, and scikit-learn are included as the initial data/ML toolchain. PyTorch is intentionally not included at this stage.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e .
Copy-Item .env.example .env
python -m uvicorn app.main:app --reload
```

`GET /health` reports process readiness. Ranking and question endpoints are contract placeholders and return HTTP 501 until verified drug data, features, and a reviewed Question Bank are available. No training data or recommendation behavior is bundled.
