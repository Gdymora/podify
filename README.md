# 🚀 Podify

Потужна TypeScript бібліотека для автоматизації RunPod Serverless API

## 🚀 Quick Start

```bash
npm install podify
```

```typescript
import { RunPodClient, ServerlessManager } from 'podify';

const client = new RunPodClient({ apiKey: 'your-api-key' });
const manager = new ServerlessManager(client);

// Автоматичне розгортання
const { endpoint } = await manager.deployServerless({
  name: 'my-api',
  imageUri: 'your-docker-image',
  gpuIds: ['NVIDIA GeForce RTX 4090'],
});
```

## 📚 Features

- ✅ Повне управління Serverless endpoints
- ✅ Batch processing задач
- ✅ Автоматичне масштабування
- ✅ Моніторинг та алерти
- ✅ TypeScript підтримка
- ✅ Error handling та retry логіка

## 🛠️ Development

```bash
# Install dependencies
npm install

# Start development
npm run dev

# Run tests
npm test

# Build
npm run build
```

## 📖 Documentation

See [docs/](./docs/) for detailed documentation.

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md).

## 📄 License

MIT
