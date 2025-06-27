import { RunPodClient, ServerlessManager } from '../src';  // ✅ Виправлений імпорт
import dotenv from 'dotenv';

dotenv.config();

async function advancedDeploymentExample() {
  const client = new RunPodClient({
    apiKey: process.env.RUNPOD_API_KEY!,
  });

  const manager = new ServerlessManager(client);

  // Конфігурація для різних сервісів
  const deploymentConfigs = [
    {
      name: 'text-generation-api',
      imageUri: 'runpod/transformers:latest',
      gpuIds: ['NVIDIA A100'],
      workersMin: 1,
      workersMax: 10,
      env: {
        MODEL_NAME: 'gpt-3.5-turbo',
        MAX_TOKENS: '2048',
      },
    },
    {
      name: 'image-upscaler-api',
      imageUri: 'runpod/real-esrgan:latest',
      gpuIds: ['NVIDIA GeForce RTX 4090'],
      workersMin: 0,
      workersMax: 5,
      env: {
        MODEL_NAME: 'RealESRGAN_x4plus',
      },
    },
    {
      name: 'speech-to-text-api',
      imageUri: 'runpod/whisper:latest',
      gpuIds: ['NVIDIA GeForce RTX 3080'],
      workersMin: 0,
      workersMax: 3,
      env: {
        MODEL_SIZE: 'large-v2',
      },
    },
  ];

  console.log('🚀 Розгортаємо декілька сервісів...');
  
  try {
    const deployedEndpoints = await manager.deployPipeline(deploymentConfigs);
    
    console.log('✅ Всі сервіси розгорнуто:');
    deployedEndpoints.forEach(endpoint => {
      console.log(`- ${endpoint.name}: ${endpoint.id}`);
    });

    // Тестування кожного сервісу
    for (const endpoint of deployedEndpoints) {
      console.log(`🧪 Тестуємо ${endpoint.name}...`);
      
      const testJob = await client.runJob(endpoint.id, {
        input: { test: true },
      });
      
      console.log(`📋 Тестова задача: ${testJob.id}`);
    }

    // Cleanup після тестування
    console.log('🧹 Cleanup тестових endpoints...');
    const endpointIds = deployedEndpoints.map(e => e.id);
    await manager.cleanup(endpointIds);
    console.log('✅ Cleanup завершено');

  } catch (error) {
    console.error('❌ Помилка при розгортанні:', error);
  }
}

// Запуск прикладу
if (require.main === module) {
  advancedDeploymentExample()
    .then(() => {
      console.log('🎉 Advanced deployment завершено!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Advanced deployment провалився:', error);
      process.exit(1);
    });
}

export { advancedDeploymentExample };