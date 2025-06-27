import { RunPodClient, ServerlessManager } from '../../src';

describe('Serverless Integration Tests', () => {
  let client: RunPodClient;
  let manager: ServerlessManager;

  beforeAll(() => {
    const apiKey = process.env.RUNPOD_API_KEY;
    if (!apiKey) {
      throw new Error('RUNPOD_API_KEY environment variable is required for integration tests');
    }
    
    client = new RunPodClient({ apiKey });
    manager = new ServerlessManager(client);
  });

  describe('Endpoint lifecycle', () => {
    let endpointId: string;

    it('should create and deploy endpoint', async () => {
      const config = {
        name: `test-endpoint-${Date.now()}`,
        imageUri: 'runpod/base:0.4.0',
        gpuIds: ['NVIDIA GeForce RTX 4090'],
        workersMin: 0,
        workersMax: 1,
      };

      const { endpoint } = await manager.deployServerless(config);
      endpointId = endpoint.id;

      expect(endpoint.id).toBeTruthy();
      expect(endpoint.name).toBe(config.name);
    }, 60000);

    it('should scale workers', async () => {
      if (!endpointId) return;

      const scaledEndpoint = await client.scaleWorkers(endpointId, 2);
      expect(scaledEndpoint.workersCount).toBe(2);
    }, 30000);

    afterAll(async () => {
      if (endpointId) {
        try {
          await client.deleteEndpoint(endpointId);
        } catch (error) {
          console.warn('Failed to cleanup test endpoint:', error);
        }
      }
    });
  });
});