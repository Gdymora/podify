import { RunPodClient } from './client'; 
import { sleep } from './utils';
import { Endpoint, EndpointConfig } from '@/types/type-guards';

export interface DeploymentResult {
  endpoint: Endpoint;
  isReady: boolean;
  deploymentTime: number;
}

export interface AutoScaleOptions {
  maxQueueSize?: number;
  scaleUpFactor?: number;
  scaleDownDelay?: number;
  minWorkers?: number;
  maxWorkers?: number;
}

export class ServerlessManager {
  private client: RunPodClient;

  constructor(client: RunPodClient) {
    this.client = client;
  }

  // Автоматичне створення та налаштування endpoint
  async deployServerless(config: EndpointConfig): Promise<DeploymentResult> {
    const startTime = Date.now();
    
    console.log(`🚀 Deploying serverless endpoint: ${config.name}`);
    
    try {
      // Створюємо endpoint
      const endpoint = await this.client.createEndpoint(config);
      console.log(`✅ Endpoint created: ${endpoint.id}`);
      
      // Чекаємо поки endpoint буде готовий
      const isReady = await this.waitForEndpointReady(endpoint.id);
      
      const deploymentTime = Date.now() - startTime;
      
      console.log(`${isReady ? '✅' : '⚠️'} Deployment ${isReady ? 'completed' : 'timeout'} in ${deploymentTime}ms`);
      
      return { 
        endpoint, 
        isReady, 
        deploymentTime 
      };
    } catch (error) {
      console.error(`❌ Deployment failed for ${config.name}:`, error);
      throw error;
    }
  }

  // Очікування готовності endpoint
  async waitForEndpointReady(
    endpointId: string, 
    timeout: number = 300000,
    pollInterval: number = 5000
  ): Promise<boolean> {
    const startTime = Date.now();
    
    console.log(`⏳ Waiting for endpoint ${endpointId} to be ready...`);
    
    while (Date.now() - startTime < timeout) {
      try {
        const endpoint = await this.client.getEndpoint(endpointId);
        
        if (endpoint.workersCount > 0) {
          console.log(`✅ Endpoint ${endpointId} is ready with ${endpoint.workersCount} workers`);
          return true;
        }
        
        console.log(`⏳ Endpoint not ready yet, waiting... (${Math.round((Date.now() - startTime) / 1000)}s)`);
        await sleep(pollInterval);
      } catch (error) {
        console.log(`⏳ Endpoint not accessible yet, continuing to wait...`);
        await sleep(pollInterval);
      }
    }
    
    console.warn(`⚠️ Endpoint ${endpointId} readiness timeout after ${timeout}ms`);
    return false;
  }

  // Автоматичне масштабування
  async autoScale(endpointId: string, options: AutoScaleOptions = {}): Promise<void> {
    const {
      maxQueueSize = 10,
      scaleUpFactor = 2,
      scaleDownDelay = 60000,
      minWorkers = 0,
      maxWorkers = 10
    } = options;

    console.log(`🔄 Starting auto-scaling for endpoint ${endpointId}`);

    // Тут можна додати логіку моніторингу черги та автоматичного масштабування
    // Наразі це базова структура
    
    const endpoint = await this.client.getEndpoint(endpointId);
    console.log(`📊 Current workers: ${endpoint.workersCount} (min: ${minWorkers}, max: ${maxWorkers})`);
    
    // Додати логіку на основі метрик черги
    // if (queueSize > maxQueueSize && endpoint.workersCount < maxWorkers) {
    //   const newWorkerCount = Math.min(endpoint.workersCount * scaleUpFactor, maxWorkers);
    //   await this.client.scaleWorkers(endpointId, newWorkerCount);
    // }
  }

  // Deployment pipeline для декількох endpoints
  async deployPipeline(configs: EndpointConfig[]): Promise<Endpoint[]> {
    console.log(`🚀 Starting deployment pipeline for ${configs.length} endpoints`);
    
    const results: Endpoint[] = [];
    const errors: Array<{ config: EndpointConfig; error: Error }> = [];
    
    for (const config of configs) {
      try {
        console.log(`📦 Deploying ${config.name}...`);
        const { endpoint } = await this.deployServerless(config);
        results.push(endpoint);
        console.log(`✅ ${config.name} deployed successfully`);
      } catch (error) {
        console.error(`❌ Failed to deploy ${config.name}:`, error);
        errors.push({ config, error: error as Error });
      }
    }
    
    if (errors.length > 0) {
      console.warn(`⚠️ Pipeline completed with ${errors.length} errors`);
      errors.forEach(({ config, error }) => {
        console.error(`  - ${config.name}: ${error.message}`);
      });
    } else {
      console.log(`🎉 Pipeline completed successfully! ${results.length} endpoints deployed`);
    }
    
    return results;
  }

  // Batch deployment з parallel processing
  async deployBatch(configs: EndpointConfig[], concurrency: number = 3): Promise<DeploymentResult[]> {
    console.log(`🚀 Batch deployment: ${configs.length} endpoints, concurrency: ${concurrency}`);
    
    const chunks: EndpointConfig[][] = [];
    for (let i = 0; i < configs.length; i += concurrency) {
      chunks.push(configs.slice(i, i + concurrency));
    }
    
    const allResults: DeploymentResult[] = [];
    
    for (const chunk of chunks) {
      console.log(`📦 Processing batch of ${chunk.length} endpoints...`);
      
      const chunkPromises = chunk.map(config => 
        this.deployServerless(config).catch(error => ({
          endpoint: null as any,
          isReady: false,
          deploymentTime: 0,
          error
        }))
      );
      
      const chunkResults = await Promise.all(chunkPromises);
      allResults.push(...chunkResults);
    }
    
    const successful = allResults.filter(r => r.isReady).length;
    console.log(`🎯 Batch deployment complete: ${successful}/${configs.length} successful`);
    
    return allResults;
  }

  // Cleanup endpoints
  async cleanup(endpointIds: string[]): Promise<{ deleted: string[]; failed: string[] }> {
    console.log(`🧹 Cleaning up ${endpointIds.length} endpoints...`);
    
    const deleted: string[] = [];
    const failed: string[] = [];
    
    for (const endpointId of endpointIds) {
      try {
        await this.client.deleteEndpoint(endpointId);
        deleted.push(endpointId);
        console.log(`✅ Deleted endpoint: ${endpointId}`);
      } catch (error) {
        failed.push(endpointId);
        console.error(`❌ Failed to delete endpoint ${endpointId}:`, error);
      }
    }
    
    console.log(`🧹 Cleanup complete: ${deleted.length} deleted, ${failed.length} failed`);
    return { deleted, failed };
  }
} 