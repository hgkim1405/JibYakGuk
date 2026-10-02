from fastapi import APIRouter, HTTPException, status

from app.schemas.questions import QuestionSelectionRequest, QuestionSelectionResponse

router = APIRouter(prefix="/questions", tags=["questions"])


@router.post("/next", response_model=QuestionSelectionResponse)
def select_next_question(_request: QuestionSelectionRequest) -> QuestionSelectionResponse:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Question selection is unavailable until a reviewed Question Bank exists.",
    )
