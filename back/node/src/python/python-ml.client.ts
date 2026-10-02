import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RankingRequest, RankingResponse } from './python-ml.types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRankingResponse(value: unknown): value is RankingResponse {
  if (!isRecord(value) || typeof value.modelVersion !== 'string' || !Array.isArray(value.rankings)) {
    return false;
  }

  return value.rankings.every((item) => {
    if (!isRecord(item) || typeof item.drugId !== 'string') return false;
    if (typeof item.score !== 'number' || !Number.isFinite(item.score)) return false;
    if (typeof item.confidence !== 'number' || !Number.isFinite(item.confidence)) return false;
    if (!isRecord(item.featureContributions)) return false;
    return Object.values(item.featureContributions).every(
      (contribution) => typeof contribution === 'number' && Number.isFinite(contribution),
    );
  });
}

@Injectable()
export class PythonMlClient {
  constructor(private readonly config: ConfigService) {}

  async predictRanking(request: RankingRequest): Promise<RankingResponse> {
    const configuredUrl = this.config.get<string>('PYTHON_ML_BASE_URL');
    if (!configuredUrl) {
      throw new ServiceUnavailableException('Python ML service URL is not configured.');
    }

    try {
      const response = await fetch(`${configuredUrl.replace(/\/$/, '')}/ranking/predict`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        throw new Error(`Python ML service returned HTTP ${response.status}.`);
      }

      const payload: unknown = await response.json();
      if (!isRankingResponse(payload)) {
        throw new Error('Python ML service returned an invalid ranking response.');
      }
      return payload;
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown upstream error.';
      throw new ServiceUnavailableException(`Python ML service is unavailable: ${detail}`);
    }
  }
}
