import { RunPodClient } from '../../src/lib/client';
import { EndpointConfig } from '../../src/types';

describe('RunPodClient', () => {
  let client: RunPodClient;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    client = new RunPodClient({ apiKey: mockApiKey });
    (fetch as jest.MockedFunction<typeof fetch>).mockClear();
  });

  describe('constructor', () => {
    it('should initialize with correct config', () => {
      expect(client).toBeInstanceOf(RunPodClient);
    });

    it('should throw error without API key', () => {
      expect(() => new RunPodClient({ apiKey: '' })).toThrow();
    });
  });

  describe('createEndpoint', () => {
    const mockConfig: EndpointConfig = {
      name: 'test-endpoint',
      imageUri: 'test/image:latest',
      gpuIds: ['NVIDIA GeForce RTX 4090'],
    };

    it('should create endpoint successfully', async () => {
      const mockResponse = {
        data: {
          saveEndpoint: {
            id: 'endpoint-123',
            name: 'test-endpoint',
            imageUri: 'test/image:latest',
            workersCount: 0,
            workersMin: 0,
            workersMax: 1,
          },
        },
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await client.createEndpoint(mockConfig);
      
      expect(result.id).toBe('endpoint-123');
      expect(result.name).toBe('test-endpoint');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/graphql'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockApiKey}`,
          }),
        })
      );
    });

    it('should handle API errors', async () => {
      const mockErrorResponse = {
        errors: [{ message: 'Invalid API key' }],
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockErrorResponse,
      } as Response);

      await expect(client.createEndpoint(mockConfig)).rejects.toThrow('Invalid API key');
    });
  });

  describe('runJob', () => {
    it('should run job successfully', async () => {
      const mockJobResponse = {
        id: 'job-123',
        status: 'IN_QUEUE',
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockJobResponse,
      } as Response);

      const result = await client.runJob('endpoint-123', {
        input: { test: 'data' },
      });

      expect(result.id).toBe('job-123');
      expect(result.status).toBe('IN_QUEUE');
    });
  });
});