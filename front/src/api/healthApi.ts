import { httpClient } from './httpClient';

export interface HealthResponse {
  status: 'ok';
}

export async function getHealth(): Promise<HealthResponse> {
  const response = await httpClient.get<HealthResponse>('/health');
  return response.data;
}
