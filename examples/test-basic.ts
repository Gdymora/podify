// test-basic.ts - Простий тест імпортів
import dotenv from 'dotenv';

// Завантажуємо environment variables
dotenv.config();

async function testImports() {
    console.log('🚀 Тестуємо імпорти Podify...');
    
    try {
        // Тестуємо базові імпорти
        console.log('📦 Імпортуємо класи...');
        
        const { RunPodClient } = await import('../src');
        console.log('✅ RunPodClient імпортовано:', typeof RunPodClient);
        
        // Перевіряємо чи є API key
        const apiKey = process.env.RUNPOD_API_KEY;
        if (!apiKey || apiKey === 'your_runpod_api_key_here') {
            console.log('⚠️ RUNPOD_API_KEY не налаштовано в .env файлі');
            console.log('💡 Додайте ваш справжній API key для тестування з API');
            return;
        }
        
        // Створюємо клієнт
        console.log('🔧 Створюємо RunPod клієнт...');
        const client = new RunPodClient({ 
            apiKey: apiKey,
            timeout: 10000 // 10 секунд timeout для тесту
        });
        
        console.log('✅ Клієнт створено успішно!');
        
        // Простий тест API (отримання endpoints)
        console.log('📋 Тестуємо API connection...');
        const endpoints = await client.getEndpoints();
        console.log(`✅ API працює! Знайдено ${endpoints.length} endpoints`);
        
        if (endpoints.length > 0) {
            console.log('📊 Перший endpoint:', {
                id: endpoints[0].id,
                name: endpoints[0].name,
                workers: endpoints[0].workersCount
            });
        }
        
    } catch (error: any) {
        console.error('❌ Помилка тесту:', error.message);
        
        if (error.message.includes('401') || error.message.includes('unauthorized')) {
            console.log('🔑 Перевірте ваш RUNPOD_API_KEY');
        } else if (error.message.includes('network') || error.message.includes('timeout')) {
            console.log('🌐 Перевірте інтернет з\'єднання');
        } else {
            console.log('🔧 Можлива проблема з кодом:', error);
        }
    }
}

// Запуск тесту
testImports()
    .then(() => {
        console.log('🎉 Тест завершено!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Критична помилка:', error);
        process.exit(1);
    });
