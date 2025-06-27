/**
 * Podify - RunPod TypeScript Automation Library
 * 
 * Потужна бібліотека для автоматизації RunPod Serverless API
 */

// Core classes
export { RunPodClient } from './lib/client';
export { ServerlessManager } from './lib/serverless';  
export { MonitoringService, createAlertRules } from './lib/monitoring';
export { APIClient } from './lib/api-client';

// Types
export * from './types';
export * from './types/api-responses';

// Errors
export * from './errors';

// Utilities
export * from './lib/utils';
export { isServerlessJob, isEndpoint, isRunPodError } from './types/type-guards';

// Interfaces for exports
export type { MonitoringMetrics, AlertRule } from './lib/monitoring';
export type { DeploymentResult, AutoScaleOptions } from './lib/serverless';

// Default export
import { RunPodClient } from "./lib/client";
export default RunPodClient;