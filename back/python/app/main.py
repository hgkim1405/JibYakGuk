from fastapi import FastAPI

from app.api.health import router as health_router
from app.api.questions import router as questions_router
from app.api.ranking import router as ranking_router
from app.core.config import APP_NAME

app = FastAPI(title=APP_NAME)
app.include_router(health_router)
app.include_router(ranking_router)
app.include_router(questions_router)
