
import { RunPodClient, ServerlessManager } from '../src';
import dotenv from 'dotenv';

dotenv.config();

async function batchProcessingExample() {
  const client = new RunPodClient({
    apiKey: process.env.RUNPOD_API_KEY!,
  });

  const manager = new ServerlessManager(client);

  try {
    // Створюємо endpoint для batch обробки
    const endpointConfig = {
      name: 'batch-processing-test',
      imageUri: 'runpod/base:0.4.0',
      gpuIds: ['NVIDIA GeForce RTX 4090'],
      workersMin: 0,
      workersMax: 3,
    };

    console.log('🚀 Створюємо endpoint для batch обробки...');
    const { endpoint } = await manager.deployServerless(endpointConfig);
    
    console.log(`✅ Endpoint створено: ${endpoint.id}`);

    // Масштабуємо до декількох воркерів
    console.log('📈 Масштабуємо до 2 воркерів...');
    await client.scaleWorkers(endpoint.id, 2);

    // Підготовка batch задач
    const batchJobs = [
      { input: { task: 'process_data_1', data: [1, 2, 3] } },
      { input: { task: 'process_data_2', data: [4, 5, 6] } },
      { input: { task: 'process_data_3', data: [7, 8, 9] } },
      { input: { task: 'process_data_4', data: [10, 11, 12] } },
      { input: { task: 'process_data_5', data: [13, 14, 15] } },
    ];

    console.log(`🚀 Запускаємо batch обробку (${batchJobs.length} задач)...`);
    
    // Запуск всіх задач
    const jobs = await client.runBatchJobs(endpoint.id, batchJobs);
    console.log(`📋 Запущено ${jobs.length} задач`);

    // Очікування завершення всіх задач з progress tracking
    console.log('⏳ Очікуємо завершення всіх задач...');
    
    const results = await Promise.all(
      jobs.map(async (job, index) => {
        try {
          const result = await client.waitForJob(job.id, 60000);
          console.log(`✅ Задача ${index + 1}/${jobs.length} завершена: ${result.status}`);
          return result;
        } catch (error) {
          console.log(`❌ Задача ${index + 1}/${jobs.length} провалилась: ${error}`);
          return null;
        }
      })
    );

    // Аналіз результатів
    const successful = results.filter(r => r && r.status === 'COMPLETED').length;
    const failed = results.filter(r => !r || r.status === 'FAILED').length;
    
    console.log('\n📊 Результати batch обробки:');
    console.log(`✅ Успішно: ${successful}`);
    console.log(`❌ Провалилось: ${failed}`);
    console.log(`📈 Відсоток успіху: ${Math.round((successful / jobs.length) * 100)}%`);

    // Cleanup
    console.log('🧹 Видаляємо тестовий endpoint...');
    await client.deleteEndpoint(endpoint.id);
    console.log('✅ Cleanup завершено');

  } catch (error) {
    console.error('❌ Помилка batch обробки:', error);
  }
}

// Запуск прикладу
if (require.main === module) {
  batchProcessingExample()
    .then(() => {
      console.log('🎉 Batch processing завершено!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Batch processing провалився:', error);
      process.exit(1);
    });
}

export { batchProcessingExample };