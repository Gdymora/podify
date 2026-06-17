# 🚀 Podify

Потужна TypeScript бібліотека для автоматизації RunPod Serverless API

## 🚀 Quick Start

```bash
# npm
npm install @gdymora/runpod-api

# pnpm (або напряму з GitHub)
pnpm add @gdymora/runpod-api
# pnpm add github:Gdymora/podify
```

```typescript
import { RunPodClient, ServerlessManager } from '@gdymora/runpod-api';

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
