import { RunPodClient, MonitoringService, createAlertRules } from '../src';  // ✅ Виправлений імпорт
import dotenv from 'dotenv';

dotenv.config();

async function monitoringExample() {
  const client = new RunPodClient({ 
    apiKey: process.env.RUNPOD_API_KEY! 
  });

  const monitoring = new MonitoringService(client);

  try {
    // Отримуємо список endpoints для моніторингу
    const endpoints = await client.getEndpoints();
    
    if (endpoints.length === 0) {
      console.log('📋 Немає endpoints для моніторингу');
      return;
    }

    const endpointId = endpoints[0].id;
    console.log(`📊 Моніторимо endpoint: ${endpoints[0].name} (${endpointId})`);

    // Додаємо правила алертів
    const alertRules = createAlertRules(client);
    
    monitoring.addAlertRule(alertRules.noActiveWorkers());
    monitoring.addAlertRule(alertRules.highFailureRate(0.2));
    monitoring.addAlertRule(alertRules.longExecutionTime(180000));

    // Запускаємо моніторинг
    monitoring.startMonitoring([endpointId], 10000); // Кожні 10 секунд

    // Симуляція моніторингу протягом 2 хвилин
    console.log('📊 Моніторинг запущено на 2 хвилини...');
    
    await new Promise(resolve => setTimeout(resolve, 120000)); // 2 хвилини

    // Зупиняємо моніторинг
    monitoring.stopMonitoring();

    // Генеруємо звіт
    const report = monitoring.generateReport();
    console.log('\n📋 Звіт моніторингу:');
    console.log(report);

  } catch (error) {
    console.error('❌ Помилка моніторингу:', error);
  }
}

// Запуск прикладу
if (require.main === module) {
  monitoringExample()
    .then(() => {
      console.log('🎉 Моніторинг завершено!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Моніторинг провалився:', error);
      process.exit(1);
    });
}

export { monitoringExample };