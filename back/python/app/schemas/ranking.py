from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class RankingCandidate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    drug_id: str = Field(alias="drugId")
    features: dict[str, float] = Field(default_factory=dict)


class RankingRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    context: dict[str, Any]
    candidates: list[RankingCandidate]


class RankedCandidate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    drug_id: str = Field(alias="drugId")
    score: float
    confidence: float
    feature_contributions: dict[str, float] = Field(alias="featureContributions")


class RankingResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    rankings: list[RankedCandidate]
    model_version: str = Field(alias="modelVersion")
