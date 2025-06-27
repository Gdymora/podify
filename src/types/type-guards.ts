// src/types/api-responses.ts
export interface RunPodAPIResponse<T = any> {
  data?: T;
  errors?: Array<{
    message: string;
    code?: string;
    path?: string[];
  }>;
}

export interface ServerlessJobResponse {
  id: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'TIMED_OUT';
  input?: any;
  output?: any;
  executionTime?: number;
  delayTime?: number;
  createdAt?: string;
  startedAt?: string;
  completedAt?: string;
  webhook?: string;
  error?: string;
}

export interface EndpointResponse {
  id: string;
  name: string;
  imageUri: string;
  workersCount: number;
  workersMin: number;
  workersMax: number;
  idleTimeout: number;
  scalerType: string;
  scalerValue: number;
  locations: string[];
  gpuIds: string[];
  createdAt?: string;
  updatedAt?: string;
}

// src/types/index.ts (оновлений)
export interface RunPodConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
}

export interface EndpointConfig {
  name: string;
  imageUri: string;
  gpuIds: string[];
  scalerType?: 'QUEUE_DELAY' | 'REQUEST_COUNT';
  scalerValue?: number;
  workersMin?: number;
  workersMax?: number;
  containerDiskInGb?: number;
  volumeInGb?: number;
  volumeMountPath?: string;
  env?: Record<string, string>;
  ports?: string;
  startCommand?: string;
  idleTimeout?: number;
}

export interface Endpoint {
  id: string;
  name: string;
  imageUri: string;
  workersCount: number;
  workersMin: number;
  workersMax: number;
  idleTimeout: number;
  scalerType: string;
  scalerValue: number;
  locations: string[];
  gpuIds: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ServerlessJob {
  id: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'TIMED_OUT';
  input?: any;
  output?: any;
  executionTime?: number;
  delayTime?: number;
  createdAt?: string;
  startedAt?: string;
  completedAt?: string;
  webhook?: string;
  error?: string;
}

export interface RunJobInput {
  input?: any;
  webhook?: string;
  policy?: {
    ttl?: number;
    retryPolicy?: {
      maxRetryCount?: number;
      delayMs?: number;
    };
  };
}

// src/lib/type-guards.ts
export function isServerlessJob(obj: any): obj is ServerlessJob {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.status === 'string' &&
    ['IN_QUEUE', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED', 'TIMED_OUT'].includes(obj.status)
  );
}

export function isEndpoint(obj: any): obj is Endpoint {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.imageUri === 'string' &&
    typeof obj.workersCount === 'number'
  );
}

export function isRunPodError(obj: any): obj is { errors: Array<{ message: string }> } {
  return (
    obj &&
    typeof obj === 'object' &&
    Array.isArray(obj.errors) &&
    obj.errors.length > 0 &&
    typeof obj.errors[0].message === 'string'
  );
}