
#!/bin/bash

# 🚀 Podify Project Initialization Script

echo "🚀 Initializing Podify project..."

# Створення структури директорій
echo "📁 Creating directory structure..."
mkdir -p src/{types,lib,errors}
mkdir -p tests/{unit,integration}
mkdir -p examples
mkdir -p docs
mkdir -p scripts
mkdir -p .github/workflows

# Встановлення залежностей
echo "📦 Installing dependencies..."
npm install

# Ініціалізація Git hooks
echo "🔧 Setting up Git hooks..."
npx husky install

# Створення .env.example
echo "📝 Creating .env.example..."
cat > .env.example << EOF
# RunPod API Configuration
RUNPOD_API_KEY=your_runpod_api_key_here

# Development settings
NODE_ENV=development
LOG_LEVEL=debug

# Test settings (for .env.test)
TEST_TIMEOUT=30000
EOF

# Створення початкового README
echo "📚 Creating README..."
cat > README.md << EOF
# 🚀 Podify

Потужна TypeScript бібліотека для автоматизації RunPod Serverless API

## 🚀 Quick Start

\`\`\`typescript
import { RunPodClient, ServerlessManager } from 'podify';

const client = new RunPodClient({ apiKey: 'your-api-key' });
const manager = new ServerlessManager(client);

// Автоматичне розгортання
const { endpoint } = await manager.deployServerless({
  name: 'my-api',
  imageUri: 'your-docker-image',
  gpuIds: ['NVIDIA GeForce RTX 4090'],
});
\`\`\`

## 📚 Documentation

[Full Documentation](https://podify.dev/docs)

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)
EOF

echo "✅ Project initialized successfully!"
echo "📋 Next steps:"
echo "1. Copy .env.example to .env and add your RunPod API key"
echo "2. Run 'npm run dev' to start development"
echo "3. Run 'npm test' to run tests"
echo "4. Check examples/ directory for usage examples"