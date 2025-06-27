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

export interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{
      line: number;
      column: number;
    }>;
    path?: Array<string | number>;
    extensions?: {
      code?: string;
      [key: string]: any;
    };
  }>;
}

export interface GraphQLError {
  message: string;
  locations?: Array<{
    line: number;
    column: number;
  }>;
  path?: Array<string | number>;
  extensions?: {
    code?: string;
    [key: string]: any;
  };
}

// Type guards для безпечної перевірки
export function isGraphQLResponse(obj: unknown): obj is GraphQLResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    ('data' in obj || 'errors' in obj)
  );
}

export function hasGraphQLErrors(obj: unknown): obj is { errors: GraphQLError[] } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'errors' in obj &&
    Array.isArray((obj as any).errors) &&
    (obj as any).errors.length > 0
  );
}
