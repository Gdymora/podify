export class PodifyError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;

  constructor(message: string, code: string, statusCode?: number) {
    super(message);
    this.name = 'PodifyError';
    this.code = code;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class APIError extends PodifyError {
  constructor(message: string, statusCode: number) {
    super(message, 'API_ERROR', statusCode);
    this.name = 'APIError';
  }
}

export class AuthenticationError extends PodifyError {
  constructor(message: string = 'Invalid API key') {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends PodifyError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class TimeoutError extends PodifyError {
  constructor(message: string) {
    super(message, 'TIMEOUT_ERROR');
    this.name = 'TimeoutError';
  }
}

export class EndpointNotFoundError extends PodifyError {
  constructor(endpointId: string) {
    super(`Endpoint ${endpointId} not found`, 'ENDPOINT_NOT_FOUND', 404);
    this.name = 'EndpointNotFoundError';
  }
}

export class JobNotFoundError extends PodifyError {
  constructor(jobId: string) {
    super(`Job ${jobId} not found`, 'JOB_NOT_FOUND', 404);
    this.name = 'JobNotFoundError';
  }
}