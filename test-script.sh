# 🚀 Test and Run Podify

echo "🔍 Перевіряємо готовність проекту..."

# 1. Перевірка структури файлів
echo "📁 Структура файлів:"
ls -la src/
echo ""
ls -la src/lib/
echo ""

# 2. Перевірка package.json
echo "📦 Перевірка package.json:"
if [ -f "package.json" ]; then
    echo "✅ package.json існує"
    grep -q "node-fetch" package.json && echo "✅ node-fetch встановлено" || echo "❌ node-fetch відсутній"
    grep -q "dotenv" package.json && echo "✅ dotenv встановлено" || echo "❌ dotenv відсутній"
    grep -q "typescript" package.json && echo "✅ typescript встановлено" || echo "❌ typescript відсутній"
else
    echo "❌ package.json не знайдено!"
fi

# 3. Перевірка .env файлу
echo "🔐 Перевірка environment:"
if [ -f ".env" ]; then
    echo "✅ .env файл існує"
    grep -q "RUNPOD_API_KEY" .env && echo "✅ RUNPOD_API_KEY налаштовано" || echo "❌ RUNPOD_API_KEY відсутній"
else
    echo "❌ .env файл не знайдено!"
    echo "💡 Створюємо .env файл..."
    cat > .env << 'EOF'
# 🚀 Podify Configuration
RUNPOD_API_KEY=your_runpod_api_key_here
NODE_ENV=development
LOG_LEVEL=info
EOF
    echo "✅ .env файл створено. Додайте ваш RUNPOD_API_KEY!"
fi

# 4. Перевірка TypeScript компіляції
echo "🔧 Перевірка TypeScript:"
if npx tsc --noEmit 2>/dev/null; then
    echo "✅ TypeScript компіляція успішна"
else
    echo "❌ TypeScript помилки:"
    npx tsc --noEmit
fi

# 5. Створення тестового файлу
echo "🧪 Створюємо простий тест..."

cat > test-basic.ts << 'EOF'
// test-basic.ts - Простий тест імпортів
import dotenv from 'dotenv';

// Завантажуємо environment variables
dotenv.config();

async function testImports() {
    console.log('🚀 Тестуємо імпорти Podify...');
    
    try {
        // Тестуємо базові імпорти
        console.log('📦 Імпортуємо класи...');
        
        const { RunPodClient } = await import('./src/lib/client');
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
EOF

# 6. Створення швидкого прикладу
cat > quick-example.ts << 'EOF'
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
EOF

# 7. Спробуємо запустити тест
echo "🚀 Запускаємо простий тест..."
echo "📝 Команди для запуску:"
echo ""
echo "1. Простий тест імпортів:"
echo "   npx ts-node test-basic.ts"
echo ""
echo "2. Швидкий приклад:"
echo "   npx ts-node quick-example.ts"
echo ""
echo "3. Базовий приклад (якщо є):"
echo "   npx ts-node examples/basic-usage.ts"
echo ""

# Автоматичний запуск простого тесту
echo "🧪 Автоматично запускаємо тест імпортів..."
if command -v npx &> /dev/null; then
    npx ts-node test-basic.ts
else
    echo "❌ npx не знайдено. Встановіть Node.js та npm"
fi

# chmod +x test-script.sh
# ./test-script.sh