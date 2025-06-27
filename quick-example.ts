// quick-example.ts - Швидкий приклад використання
import dotenv from 'dotenv';
dotenv.config();

async function quickExample() {
    console.log('🚀 Podify Quick Example');
    
    try {
        // Імпортуємо тільки необхідне
        const { RunPodClient } = await import('./src/lib/client');
        
        const apiKey = process.env.RUNPOD_API_KEY;
        if (!apiKey || apiKey === 'your_runpod_api_key_here') {
            console.log('⚠️ Налаштуйте RUNPOD_API_KEY в .env файлі');
            return;
        }
        
        const client = new RunPodClient({ apiKey });
        
        console.log('📋 Отримуємо список endpoints...');
        const endpoints = await client.getEndpoints();
        
        console.log(`✅ Знайдено ${endpoints.length} endpoints:`);
        endpoints.forEach((endpoint, index) => {
            console.log(`${index + 1}. ${endpoint.name} (${endpoint.id})`);
            console.log(`   Workers: ${endpoint.workersCount}/${endpoint.workersMax}`);
            console.log(`   GPU: ${endpoint.gpuIds.join(', ')}`);
            console.log('');
        });
        
        if (endpoints.length === 0) {
            console.log('💡 Немає endpoints. Створіть перший endpoint:');
            console.log('   npx ts-node examples/basic-usage.ts');
        }
        
    } catch (error: any) {
        console.error('❌ Помилка:', error.message);
    }
}

quickExample();
