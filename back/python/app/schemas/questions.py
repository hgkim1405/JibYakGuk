from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class QuestionSelectionRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    state: dict[str, Any]


class QuestionSelectionResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    selected_question: dict[str, Any] | None = Field(alias="selectedQuestion")
