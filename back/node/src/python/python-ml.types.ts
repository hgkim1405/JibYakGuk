// Provisional internal contract, aligned with the Phase 1 ranking interface.
// Revisit it after the validated Drug Master and feature definitions exist.
export interface RankingCandidate {
  drugId: string;
  features?: Record<string, number>;
}

export interface RankingRequest {
  context: Record<string, unknown>;
  candidates: RankingCandidate[];
}

export interface RankedCandidate {
  drugId: string;
  score: number;
  confidence: number;
  featureContributions: Record<string, number>;
}

export interface RankingResponse {
  rankings: RankedCandidate[];
  modelVersion: string;
}
