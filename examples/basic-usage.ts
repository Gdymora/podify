import { RunPodClient, ServerlessManager } from '../src';  // ✅ Імпорт з index
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  // Ініціалізація клієнта
  const client = new RunPodClient({ 
    apiKey: process.env.RUNPOD_API_KEY!
  });

  const manager = new ServerlessManager(client);

  try {
    // 1. Створення Serverless endpoint
    const endpointConfig = {
      name: 'stable-diffusion-api',
      imageUri: 'runpod/stable-diffusion:latest',
      gpuIds: ['NVIDIA GeForce RTX 4090'],
      workersMin: 0,
      workersMax: 5,
      scalerType: 'QUEUE_DELAY' as const,
      scalerValue: 2,
      containerDiskInGb: 50,
      env: { 
        MODEL_NAME: 'stable-diffusion-v1-5', 
        TORCH_CUDA_ARCH_LIST: '8.6' 
      },
      ports: '8080/http',
      startCommand: 'python app.py',
    };

    console.log('🚀 Створюємо Serverless endpoint...');
    const { endpoint, isReady } = await manager.deployServerless(endpointConfig);

    console.log('✅ Endpoint створено:', endpoint.id);
    console.log('🔄 Готовність:', isReady ? 'Готовий' : 'Очікуємо');

    // 2. Запуск задачі
    const jobResult = await client.runJob(endpoint.id, {
      input: {
        prompt: 'Beautiful sunset over mountains, digital art',
        width: 512,
        height: 512,
        num_inference_steps: 50,
      },
      webhook: 'https://your-webhook.com/callback',
    });

    console.log('📋 Задача запущена:', jobResult.id);

    // 3. Очікування результату
    const completedJob = await client.waitForJob(jobResult.id, 180000);
    console.log('✅ Задача завершена:', completedJob.status);

    if (completedJob.status === 'COMPLETED') {
      console.log('🎯 Результат:', completedJob.output);
    }

    // 4. Масштабування воркерів
    console.log('📈 Масштабуємо до 3 воркерів...');
    await client.scaleWorkers(endpoint.id, 3);

    // 5. Отримання списку всіх endpoints
    const endpoints = await client.getEndpoints();
    console.log(
      '📋 Всі endpoints:',
      endpoints.map((e) => ({ id: e.id, name: e.name }))
    );

    // 6. Cleanup
    console.log('🧹 Видаляємо тестовий endpoint...');
    await client.deleteEndpoint(endpoint.id);
    console.log('✅ Cleanup завершено');

  } catch (error) {
    console.error('❌ Помилка:', error);
  }
}

// Запуск прикладу
if (require.main === module) {
  main()
    .then(() => {
      console.log('🎉 Приклад завершено успішно!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Приклад провалився:', error);
      process.exit(1);
    });
}

export { main };