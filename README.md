# @gdymora/runpod-api

TypeScript library for automating [RunPod](https://runpod.io) infrastructure — pods, serverless endpoints, network volumes, GPU management, and job orchestration.

## Installation

```bash
# npm
npm install @gdymora/runpod-api

# pnpm
pnpm add @gdymora/runpod-api

# or directly from GitHub
pnpm add github:Gdymora/podify
```

## Quick Start

```typescript
import { RunPodClient, PodManager, StorageManager, ServerlessManager } from '@gdymora/runpod-api';

const client = new RunPodClient({ apiKey: process.env.RUNPOD_API_KEY! });
```

## Modules

### RunPodClient — Core API client

Handles all HTTP communication with the RunPod GraphQL and REST APIs.

```typescript
const client = new RunPodClient({ apiKey: 'your-key', timeout: 30000 });

// Serverless endpoints
const endpoints = await client.getEndpoints();
const endpoint  = await client.getEndpoint('endpoint-id');
await client.createEndpoint({ name: 'my-api', gpuIds: ['NVIDIA GeForce RTX 4090'], workersMax: 3 });
await client.deleteEndpoint('endpoint-id');
await client.scaleWorkers('endpoint-id', 5);

// Templates
const templates = await client.getTemplates();
const comfy     = await client.searchComfyUITemplates();
const results   = await client.searchTemplates('pytorch', true); // includePublic = true
const tpl       = await client.getRecommendedTemplate('stable-diffusion');

// GPU
const gpuTypes   = await client.getGpuTypes();
const available  = await client.getAvailableGpus();         // HIGH / MEDIUM stock only
const secure     = await client.getSecureCloudGpus();
const community  = await client.getCommunityCloudGpus();
const cheapest   = await client.getCheapestGpu(true);       // true = community cloud
const gpuInfo    = await client.getGpuInfo('NVIDIA RTX A6000');

// Resource overview
const stats = await client.getResourceStats();
// { totalTemplates, comfyTemplates, publicTemplates, totalGpus, availableGpus, ... }

// Smart endpoint — auto-selects GPU and template
const ep = await client.createSmartEndpoint({
  name: 'comfy-api',
  task: 'comfyui',          // auto-picks matching template
  communityCloud: true,
  maxPrice: 0.5,            // $/hr ceiling
  workersMax: 2,
});

// Serverless jobs
const job    = await client.runJob('endpoint-id', { input: { prompt: '...' } });
const status = await client.getJobStatus(job.id);
const result = await client.waitForJob(job.id, 300000);      // timeout ms
await client.cancelJob(job.id);
const logs   = await client.getJobLogs(job.id);              // { logs: string[] }

// Batch jobs
const jobs = await client.runBatchJobs('endpoint-id', [
  { input: { prompt: 'cat' } },
  { input: { prompt: 'dog' } },
]);
```

---

### PodManager — GPU pod lifecycle

```typescript
import { PodManager } from '@gdymora/runpod-api';

const pods = new PodManager(client);

const list  = await pods.listPods();
const pod   = await pods.getPod('pod-id');
const stats = await pods.getPodsStats();   // { total, running, stopped, ... }

// Create
const newPod = await pods.createPod({
  name: 'training-run',
  imageName: 'runpod/pytorch:2.1.0-py3.10-cuda11.8.0-devel-ubuntu22.04',
  gpuTypeId: 'NVIDIA GeForce RTX 4090',
  gpuCount: 1,
  containerDiskInGb: 50,
  volumeInGb: 100,
  volumeMountPath: '/workspace',
  cloudType: 'COMMUNITY',
  ports: '8888/http,6006/http',
  env: [{ key: 'JUPYTER_PASSWORD', value: 'secret' }],
});

// Smart pod — auto-selects cheapest GPU from a ranked list
const smart = await pods.createSmartPod({
  name: 'auto-pod',
  imageName: 'runpod/pytorch:2.1.0',
  gpuPriority: ['NVIDIA RTX A6000', 'NVIDIA GeForce RTX 4090', 'NVIDIA RTX A5000'],
  containerDiskInGb: 30,
  cloudType: 'COMMUNITY',
});

// Control
await pods.stopPod('pod-id');
await pods.resumePod('pod-id');
await pods.terminatePod('pod-id');
await pods.stopAllPods();

// GPU discovery
const gpus    = await pods.getGpuTypes();
const cheapGpu = await pods.findCheapestGpu({ communityCloud: true, minMemoryInGb: 24 });

// Logs
const { logs } = await pods.getPodLogs('pod-id');
```

---

### StorageManager — Network volumes

```typescript
import { StorageManager } from '@gdymora/runpod-api';

const storage = new StorageManager(client);

// List & query
const volumes     = await storage.listVolumes();
const volume      = await storage.getVolume('volume-id');
const dataCenters = await storage.getDataCenters();
const stats       = await storage.getVolumeStats();  // { total, totalSizeGb, attached, ... }
const attachments = await storage.getVolumeAttachments('volume-id');

// Find
const found    = await storage.findVolumeByName('my-dataset');
const byDC     = await storage.getVolumesByDataCenter('US-TX-3');
const largest  = await storage.getLargestVolumes(5);
const usage    = await storage.getVolumeUsageInfo('volume-id');
const exported = await storage.exportVolumesInfo();  // full summary array

// Check availability
const available = await storage.isVolumeNameAvailable('new-volume');
const unique    = await storage.generateUniqueVolumeName('dataset');

// Create
const vol = await storage.createVolume({
  name: 'my-dataset',
  size: 50,
  dataCenterId: 'US-TX-3',
});

// Smart create — picks best data center by availability
const smart = await storage.createSmartVolume({
  name: 'auto-vol',
  size: 100,
});

// Delete
await storage.deleteVolume('volume-id');

// Validation
const validation = storage.validateVolumeConfig({ name: 'ok', size: 50, dataCenterId: 'US-TX-3' });
// { valid: true } | { valid: false, errors: string[] }
```

---

### ServerlessManager — High-level deployment

```typescript
import { ServerlessManager } from '@gdymora/runpod-api';

const manager = new ServerlessManager(client);

// Deploy with auto-scaling
const { endpoint, config } = await manager.deployServerless({
  name: 'inference-api',
  imageUri: 'myorg/my-model:latest',
  gpuIds: ['NVIDIA GeForce RTX 4090'],
  workersMin: 0,
  workersMax: 5,
});

// Auto-scale based on queue depth
await manager.autoScale('endpoint-id', {
  targetQueueDepth: 10,
  minWorkers: 0,
  maxWorkers: 8,
});
```

---

### MonitoringService — Alerting

```typescript
import { MonitoringService, createAlertRules } from '@gdymora/runpod-api';

const monitor = new MonitoringService(client);
const rules   = createAlertRules();

monitor.addAlertRule(rules.highFailureRate);
monitor.addAlertRule(rules.slowResponse);

const metrics = await monitor.getMetrics('endpoint-id');
const alerts  = await monitor.checkAlerts('endpoint-id');
```

---

## Types

Key exported types:

```typescript
import type {
  RunPodConfig,
  Endpoint, EndpointConfig,
  ServerlessJob, RunJobInput,
  Template, GpuType, ResourceStats,
  Pod, PodCreateInput,
  NetworkVolume, NetworkVolumeCreateInput,
} from '@gdymora/runpod-api';
```

---

## Error handling

```typescript
import { APIError, ValidationError } from '@gdymora/runpod-api';

try {
  await client.getPod('bad-id');
} catch (err) {
  if (err instanceof APIError)        console.error(err.statusCode, err.message);
  if (err instanceof ValidationError) console.error('Bad input:', err.message);
}
```

---

## License

MIT
