// src/lib/api-client.ts - Базовий API клієнт з правильною типізацією
import { APIError } from '../errors';
import { RunPodAPIResponse } from '../types/api-responses';
import { isRunPodError } from '../types/type-guards';

export class APIClient {
  private apiKey: string;
  private baseUrl: string;
  private headers: Record<string, string>;
  private timeout: number;

  constructor(apiKey: string, baseUrl: string = 'https://api.runpod.io', timeout: number = 30000) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.timeout = timeout;
    this.headers = { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' };
  }

  // Generic HTTP request method з правильною типізацією
  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: { ...this.headers, ...options.headers },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new APIError(`HTTP ${response.status}: ${response.statusText}`, response.status);
      }

      const data = await response.json();

      // Перевірка на GraphQL помилки
      if (isRunPodError(data)) {
        throw new APIError(data.errors.map((e) => e.message).join(', '), 400);
      }

      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof APIError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new APIError('Request timeout', 408);
        }
        throw new APIError(`Network error: ${error.message}`, 0);
      }

      throw new APIError('Unknown error occurred', 500);
    }
  }

  // GraphQL request з типізацією
  async graphql<T>(query: string, variables?: any): Promise<T> {
    const response = await this.request<RunPodAPIResponse<T>>(`${this.baseUrl}/graphql`, {
      method: 'POST',
      body: JSON.stringify({ query, variables }),
    });

    if (response.data) {
      return response.data;
    }

    throw new APIError('No data in GraphQL response', 500);
  }

  // REST API request з типізацією
  async rest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl.replace('/graphql', '')}${endpoint}`;
    return this.request<T>(url, options);
  }
}
