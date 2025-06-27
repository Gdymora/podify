
import { PodifyError, ValidationError, TimeoutError } from '../errors';

export const sleep = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

export const validateApiKey = (apiKey: string): void => {
  if (!apiKey || typeof apiKey !== 'string') {
    throw new ValidationError('API key is required and must be a string');
  }
  
  if (apiKey.length < 10) {
    throw new ValidationError('API key appears to be invalid (too short)');
  }
};

export const validateEndpointConfig = (config: any): void => {
  const required = ['name', 'imageUri', 'gpuIds'];
  
  for (const field of required) {
    if (!config[field]) {
      throw new ValidationError(`Field '${field}' is required`);
    }
  }
  
  if (!Array.isArray(config.gpuIds) || config.gpuIds.length === 0) {
    throw new ValidationError('gpuIds must be a non-empty array');
  }
};

export const formatDuration = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

export const retry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (i === maxRetries) {
        break;
      }
      
      console.warn(`Retry ${i + 1}/${maxRetries} failed:`, error);
      await sleep(delayMs * Math.pow(2, i)); // Exponential backoff
    }
  }
  
  throw lastError!;
};

export const createProgressTracker = (total: number) => {
  let completed = 0;
  
  return {
    increment: () => {
      completed++;
      const percentage = Math.round((completed / total) * 100);
      console.log(`Progress: ${completed}/${total} (${percentage}%)`);
    },
    getProgress: () => ({ completed, total, percentage: (completed / total) * 100 }),
  };
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  waitMs: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), waitMs);
  };
};

export const formatBytes = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

export const generateJobId = (): string => {
  return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const parseEnvVariables = (envArray: Array<{ name: string; value: string }>): Record<string, string> => {
  return envArray.reduce((acc, { name, value }) => {
    acc[name] = value;
    return acc;
  }, {} as Record<string, string>);
};

export const createRateLimiter = (requestsPerSecond: number) => {
  const requests: number[] = [];
  
  return async (): Promise<void> => {
    const now = Date.now();
    
    // Видаляємо старі запити (старше 1 секунди)
    while (requests.length > 0 && now - requests[0] > 1000) {
      requests.shift();
    }
    
    // Якщо досягли ліміту, чекаємо
    if (requests.length >= requestsPerSecond) {
      const oldestRequest = requests[0];
      const waitTime = 1000 - (now - oldestRequest);
      await sleep(waitTime);
      return createRateLimiter(requestsPerSecond)();
    }
    
    requests.push(now);
  };
};
