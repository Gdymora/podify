import {
  Endpoint,
  EndpointConfig,
  RunJobInput,
  RunPodConfig,
  ServerlessJob,
} from '@/types/type-guards';
import { APIError, ValidationError } from '../errors';
import { GraphQLResponse, hasGraphQLErrors, isGraphQLResponse } from '../types';

export class RunPodClient {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;
  private headers: Record<string, string>;

  constructor(config: RunPodConfig) {
    if (!config.apiKey) {
      throw new ValidationError('API key is required');
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.runpod.io';
    this.timeout = config.timeout || 30000;
    this.headers = { 'Content-Type': 'application/json' };
  }

  private async makeRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      console.log(`🔗 API Request: ${options.method || 'GET'} ${url}`);

      const response = await fetch(url, {
        ...options,
        headers: { ...this.headers, ...options.headers },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log(`📊 Response: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorBody = await response.text();
          if (errorBody) {
            console.log(`❌ Error body: ${errorBody}`);
            errorMessage += ` - ${errorBody}`;
          }
        } catch (e) {
          // Ignore error reading body
        }
        throw new APIError(errorMessage, response.status);
      }

      const data: unknown = await response.json();

      // ✅ Type-safe перевірка на GraphQL помилки
      if (hasGraphQLErrors(data)) {
        const errorMessages = data.errors.map((error) => error.message).join(', ');
        throw new APIError(`GraphQL Error: ${errorMessages}`, 400);
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

  // ✅ Type-safe GraphQL метод
  async graphql<T>(query: string, variables?: any): Promise<T> {
    const rawResponse = await this.makeRequest<GraphQLResponse<T>>(
      `${this.baseUrl}/graphql?api_key=${this.apiKey}`,
      { method: 'POST', body: JSON.stringify({ query, variables }) }
    );

    // ✅ Type-safe перевірка структури відповіді
    if (!isGraphQLResponse(rawResponse)) {
      throw new APIError('Invalid GraphQL response format', 500);
    }

    if (hasGraphQLErrors(rawResponse)) {
      const errorMessages = rawResponse.errors.map((error) => error.message).join(', ');
      throw new APIError(`GraphQL Error: ${errorMessages}`, 400);
    }

    if (!rawResponse.data) {
      throw new APIError('No data in GraphQL response', 500);
    }

    return rawResponse.data;
  }

  // ✅ Type-safe REST метод
  private async restRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await this.makeRequest<T>(url, options);
    return response;
  }

  async getEndpoints(): Promise<Endpoint[]> {
    const query = `
      query {
        myself {
          endpoints {
            id
            name
            workersMin
            workersMax
            idleTimeout
            scalerType
            scalerValue
            locations
            gpuIds
          }
        }
      }
    `;

    try {
      console.log('📋 Отримуємо endpoints через GraphQL...');
      const result = await this.graphql<{ myself: { endpoints: Endpoint[] } }>(query);

      // ✅ Type-safe перевірка структури
      if (!result.myself || !Array.isArray(result.myself.endpoints)) {
        throw new APIError('Invalid endpoints response structure', 500);
      }

      const endpoints = result.myself.endpoints;
      console.log(`✅ Знайдено ${endpoints.length} endpoints`);
      return endpoints;
    } catch (error) {
      console.error('❌ getEndpoints error:', error);
      throw error;
    }
  }

  async getEndpoint(endpointId: string): Promise<Endpoint> {
    if (!endpointId || typeof endpointId !== 'string') {
      throw new ValidationError('Valid endpoint ID is required');
    }

    const endpoints = await this.getEndpoints();
    const endpoint = endpoints.find((e) => e.id === endpointId);

    if (!endpoint) {
      throw new APIError(`Endpoint ${endpointId} not found`, 404);
    }

    return endpoint;
  }

  async createEndpoint(config: EndpointConfig): Promise<Endpoint> {
    const mutation = `
      mutation CreateEndpoint($input: SaveEndpointInput!) {
        saveEndpoint(input: $input) {
          id
          name
          imageUri
          workersCount
          workersMin
          workersMax
          idleTimeout
          scalerType
          scalerValue
          locations
          gpuIds
        }
      }
    `;

    const variables = {
      input: {
        name: config.name,
        imageUri: config.imageUri,
        gpuIds: config.gpuIds,
        scalerType: config.scalerType || 'QUEUE_DELAY',
        scalerValue: config.scalerValue || 1,
        workersMin: config.workersMin || 0,
        workersMax: config.workersMax || 1,
        containerDiskInGb: config.containerDiskInGb || 20,
        volumeInGb: config.volumeInGb || 0,
        volumeMountPath: config.volumeMountPath || '',
        env: config.env ? Object.entries(config.env).map(([name, value]) => ({ name, value })) : [],
        ports: config.ports || '',
        startCommand: config.startCommand || '',
        idleTimeout: config.idleTimeout || 5,
      },
    };

    const result = await this.graphql<{ saveEndpoint: Endpoint }>(mutation, variables);

    if (!result.saveEndpoint) {
      throw new APIError('Invalid createEndpoint response', 500);
    }

    return result.saveEndpoint;
  }

  async deleteEndpoint(endpointId: string): Promise<boolean> {
    if (!endpointId || typeof endpointId !== 'string') {
      throw new ValidationError('Valid endpoint ID is required');
    }

    const mutation = `
      mutation DeleteEndpoint($endpointId: String!) {
        deleteEndpoint(id: $endpointId)
      }
    `;

    const result = await this.graphql<{ deleteEndpoint: boolean }>(mutation, { endpointId });
    return Boolean(result.deleteEndpoint);
  }

  async scaleWorkers(endpointId: string, workersCount: number): Promise<Endpoint> {
    if (!endpointId || typeof endpointId !== 'string') {
      throw new ValidationError('Valid endpoint ID is required');
    }

    if (typeof workersCount !== 'number' || workersCount < 0) {
      throw new ValidationError('Valid workers count is required');
    }

    const mutation = `
      mutation ScaleWorkers($input: UpdateEndpointWorkersCountInput!) {
        updateEndpointWorkersCount(input: $input) {
          id
          name
          workersCount
          workersMin
          workersMax
        }
      }
    `;

    const variables = { input: { endpointId, workersCount } };

    const result = await this.graphql<{ updateEndpointWorkersCount: Endpoint }>(
      mutation,
      variables
    );

    if (!result.updateEndpointWorkersCount) {
      throw new APIError('Invalid scaleWorkers response', 500);
    }

    return result.updateEndpointWorkersCount;
  }

  // ✅ Serverless методи з type safety
  async runJob(endpointId: string, jobInput: RunJobInput): Promise<ServerlessJob> {
    if (!endpointId || typeof endpointId !== 'string') {
      throw new ValidationError('Valid endpoint ID is required');
    }

    console.log(`🚀 Running job on endpoint: ${endpointId}`);

    const response = await this.restRequest<ServerlessJob>(`/v2/${endpointId}/run`, {
      method: 'POST',
      body: JSON.stringify(jobInput),
    });

    // ✅ Type-safe валідація job response
    if (
      !response ||
      typeof response !== 'object' ||
      !('id' in response) ||
      !('status' in response)
    ) {
      throw new APIError('Invalid job response format', 500);
    }

    return response;
  }

  async getJobStatus(jobId: string): Promise<ServerlessJob> {
    if (!jobId || typeof jobId !== 'string') {
      throw new ValidationError('Valid job ID is required');
    }

    const response = await this.restRequest<ServerlessJob>(`/v2/status/${jobId}`, {
      method: 'GET',
    });

    // ✅ Type-safe валідація
    if (
      !response ||
      typeof response !== 'object' ||
      !('id' in response) ||
      !('status' in response)
    ) {
      throw new APIError('Invalid job status response format', 500);
    }

    return response;
  }

  async getJobResults(jobId: string): Promise<ServerlessJob> {
    if (!jobId || typeof jobId !== 'string') {
      throw new ValidationError('Valid job ID is required');
    }

    const response = await this.restRequest<ServerlessJob>(`/v2/results/${jobId}`, {
      method: 'GET',
    });

    if (!response || typeof response !== 'object' || !('id' in response)) {
      throw new APIError('Invalid job results response format', 500);
    }

    return response;
  }

  async cancelJob(jobId: string): Promise<ServerlessJob> {
    if (!jobId || typeof jobId !== 'string') {
      throw new ValidationError('Valid job ID is required');
    }

    const response = await this.restRequest<ServerlessJob>(`/v2/cancel/${jobId}`, {
      method: 'POST',
    });

    if (!response || typeof response !== 'object' || !('id' in response)) {
      throw new APIError('Invalid cancel job response format', 500);
    }

    return response;
  }

  async getJobLogs(jobId: string): Promise<{ logs: string[] }> {
    if (!jobId || typeof jobId !== 'string') {
      throw new ValidationError('Valid job ID is required');
    }

    const response = await this.restRequest<{ logs: string[] }>(`/v2/logs/${jobId}`, {
      method: 'GET',
    });

    // ✅ Type-safe валідація logs
    if (
      !response ||
      typeof response !== 'object' ||
      !('logs' in response) ||
      !Array.isArray(response.logs)
    ) {
      throw new APIError('Invalid logs response format', 500);
    }

    return response;
  }

  async waitForJob(
    jobId: string,
    timeout: number = 300000,
    pollInterval: number = 2000
  ): Promise<ServerlessJob> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const job = await this.getJobStatus(jobId);

      if (['COMPLETED', 'FAILED', 'CANCELLED', 'TIMED_OUT'].includes(job.status)) {
        return job;
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new ValidationError(`Job ${jobId} timeout after ${timeout}ms`);
  }

  async runBatchJobs(endpointId: string, jobs: RunJobInput[]): Promise<ServerlessJob[]> {
    if (!endpointId || !Array.isArray(jobs) || jobs.length === 0) {
      throw new ValidationError('Valid endpoint ID and non-empty jobs array are required');
    }

    const promises = jobs.map((job) => this.runJob(endpointId, job));
    return Promise.all(promises);
  }
}
