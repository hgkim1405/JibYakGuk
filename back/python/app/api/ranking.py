from fastapi import APIRouter, HTTPException, status

from app.schemas.ranking import RankingRequest, RankingResponse

router = APIRouter(prefix="/ranking", tags=["ranking"])


@router.post("/predict", response_model=RankingResponse)
def predict_ranking(_request: RankingRequest) -> RankingResponse:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Ranking is unavailable until validated candidate data and features exist.",
    )
