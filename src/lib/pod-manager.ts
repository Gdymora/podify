// src/lib/pod-manager.ts - Виправлена версія з правильними GraphQL запитами
import { RunPodClient } from "./client";
import { APIError, ValidationError } from "../errors";

// ✅ Правильні типи згідно з RunPod API
export interface Pod {
  id: string;
  name: string;
  imageName: string;
  desiredStatus:
    | "CREATED"
    | "RUNNING"
    | "STOPPED"
    | "TERMINATED"
    | "STARTING"
    | "RESTARTING"
    | "FAILED";
  containerDiskInGb: number;
  costPerHr: number;
  adjustedCostPerHr: number;
  dockerArgs?: string;
  env: string[]; // RunPod повертає масив рядків, не об'єктів
  gpuCount: number;
  gpuPowerLimitPercent: number;
  lastStatusChange: string;
  locked: boolean;
  machineId: string;
  memoryInGb: number;
  podType: "INTERRUPTABLE" | "ON_DEMAND";
  port?: number;
  ports?: string;
  templateId?: string;
  uptimeSeconds?: number;
  vcpuCount: number;
  volumeInGb?: number;
  volumeMountPath?: string;
  networkVolumeId?: string;
  createdAt: string;
  lastStartedAt?: string;
  // Machine info
  machine?: {
    podHostId: string;
    gpuDisplayName: string;
    location: string;
  };
}

export interface PodCreateInput {
  cloudType?: "SECURE" | "COMMUNITY" | "ALL";
  gpuCount: number;
  gpuTypeId?: string;
  name: string;
  imageName: string;
  containerDiskInGb: number;
  dataCenterId?: string;
  volumeInGb?: number;
  volumeMountPath?: string;
  networkVolumeId?: string;
  ports?: string;
  env?: Array<{ key: string; value: string }>;
  dockerArgs?: string;
  minVcpuCount?: number;
  minMemoryInGb?: number;
  minDisk?: number;
  templateId?: string;
}

export interface GpuType {
  id: string;
  displayName: string;
  manufacturer?: string;
  memoryInGb: number;
  cudaCores?: number;
  secureCloud: boolean;
  communityCloud: boolean;
  securePrice?: number;
  communityPrice?: number;
  oneMonthPrice?: number;
  threeMonthPrice?: number;
  sixMonthPrice?: number;
  oneWeekPrice?: number;
  communitySpotPrice?: number;
  secureSpotPrice?: number;
  maxGpuCount?: number;
  maxGpuCountCommunityCloud?: number;
  maxGpuCountSecureCloud?: number;
  minPodGpuCount?: number;
  lowestPrice?: {
    gpuName: string;
    gpuTypeId: string;
    minimumBidPrice?: number;
    uninterruptablePrice?: number;
    stockStatus: string;
    rentalPercentage?: number;
    rentedCount?: number;
    totalCount?: number;
  };
}

export class PodManager {
  private client: RunPodClient;

  constructor(client: RunPodClient) {
    this.client = client;
  }

  /**
   * ✅ Отримує список усіх активних подів поточного користувача
   */
  public async listPods(): Promise<Pod[]> {
    console.log("🔄 Fetching all active pods...");
    try {
      const response = await this.client.graphql<{ myself: { pods: Pod[] } }>(`
        query MyPods {
          myself {
            pods {
              id
              name
              imageName
              desiredStatus
              containerDiskInGb
              costPerHr
              adjustedCostPerHr
              dockerArgs
              env
              gpuCount
              gpuPowerLimitPercent
              lastStatusChange
              locked
              machineId
              memoryInGb
              podType
              port
              ports
              templateId
              uptimeSeconds
              vcpuCount
              volumeInGb
              volumeMountPath
              networkVolumeId
              createdAt
              lastStartedAt
              machine {
                podHostId
              }
            }
          }
        }
      `);

      if (!response.myself || !Array.isArray(response.myself.pods)) {
        throw new APIError("Invalid pods response structure", 500);
      }

      console.log(`✅ Знайдено ${response.myself.pods.length} pods`);
      return response.myself.pods;
    } catch (error) {
      console.error("❌ Error listing pods:", error);
      throw error;
    }
  }

  /**
   * ✅ Отримує інформацію про конкретний под за його ID
   */
  public async getPod(podId: string): Promise<Pod> {
    if (!podId) throw new ValidationError("Pod ID is required.");
    console.log(`🔄 Fetching pod with ID: ${podId}...`);

    try {
      const response = await this.client.graphql<{ pod: Pod }>(
        `
        query GetPod($input: PodFilter!) {
          pod(input: $input) {
            id
            name
            imageName
            desiredStatus
            containerDiskInGb
            costPerHr
            adjustedCostPerHr
            dockerArgs
            env
            gpuCount
            gpuPowerLimitPercent
            lastStatusChange
            locked
            machineId
            memoryInGb
            podType
            port
            ports
            templateId
            uptimeSeconds
            vcpuCount
            volumeInGb
            volumeMountPath
            networkVolumeId
            createdAt
            lastStartedAt
            machine {
              podHostId
              gpuDisplayName
              location
            }
          }
        }
      `,
        { input: { podId } }
      );

      if (!response.pod) {
        throw new APIError(`Pod with ID ${podId} not found.`, 404);
      }

      return response.pod;
    } catch (error) {
      console.error(`❌ Error getting pod ${podId}:`, error);
      throw error;
    }
  }

  /**
   * ✅ Створює новий под (використовує правильний API endpoint)
   */
  public async createPod(config: PodCreateInput): Promise<Pod> {
    console.log(`🚀 Creating pod: ${config.name}...`);

    try {
      const response = await this.client.graphql<{
        podFindAndDeployOnDemand: Pod;
      }>(
        `
        mutation CreatePod($input: PodFindAndDeployOnDemandInput!) {
          podFindAndDeployOnDemand(input: $input) {
            id
            name
            imageName
            desiredStatus
            containerDiskInGb
            costPerHr
            adjustedCostPerHr
            gpuCount
            machineId
            machine {
              podHostId
            }
          }
        }
      `,
        { input: config }
      );

      if (!response.podFindAndDeployOnDemand) {
        throw new APIError(
          "Failed to create pod: No pod data in response.",
          500
        );
      }

      console.log(
        `✅ Pod created with ID: ${response.podFindAndDeployOnDemand.id}`
      );
      return response.podFindAndDeployOnDemand;
    } catch (error) {
      console.error(`❌ Error creating pod ${config.name}:`, error);
      throw error;
    }
  }

  /**
   * ✅ Зупиняє под
   */
  public async stopPod(podId: string): Promise<Pod> {
    if (!podId) throw new ValidationError("Pod ID is required.");
    console.log(`🛑 Stopping pod with ID: ${podId}...`);

    try {
      const response = await this.client.graphql<{ podStop: Pod }>(
        `
        mutation StopPod($input: PodStopInput!) {
          podStop(input: $input) {
            id
            name
            desiredStatus
          }
        }
      `,
        { input: { podId } }
      );

      if (!response.podStop) {
        throw new APIError("Failed to stop pod: No pod data in response.", 500);
      }

      console.log(`✅ Pod ${podId} stopped.`);
      return response.podStop;
    } catch (error) {
      console.error(`❌ Error stopping pod ${podId}:`, error);
      throw error;
    }
  }

  /**
   * ✅ Відновлює під (resume)
   */
  public async resumePod(podId: string, gpuCount?: number): Promise<Pod> {
    if (!podId) throw new ValidationError("Pod ID is required.");
    console.log(`▶️ Resuming pod with ID: ${podId}...`);

    try {
      const response = await this.client.graphql<{ podResume: Pod }>(
        `
        mutation ResumePod($input: PodResumeInput!) {
          podResume(input: $input) {
            id
            name
            desiredStatus
            machineId
            machine {
              podHostId
            }
          }
        }
      `,
        { input: { podId, ...(gpuCount && { gpuCount }) } }
      );

      if (!response.podResume) {
        throw new APIError(
          "Failed to resume pod: No pod data in response.",
          500
        );
      }

      console.log(`✅ Pod ${podId} resumed.`);
      return response.podResume;
    } catch (error) {
      console.error(`❌ Error resuming pod ${podId}:`, error);
      throw error;
    }
  }

  /**
   * ✅ Термінує (видаляє) под
   */
  public async terminatePod(podId: string): Promise<boolean> {
    if (!podId) throw new ValidationError("Pod ID is required.");
    console.log(`💥 Terminating pod with ID: ${podId}...`);

    try {
      await this.client.graphql<{ podTerminate: null }>(
        `
        mutation TerminatePod($input: PodTerminateInput!) {
          podTerminate(input: $input)
        }
      `,
        { input: { podId } }
      );

      console.log(`✅ Pod ${podId} terminated.`);
      return true;
    } catch (error) {
      console.error(`❌ Error terminating pod ${podId}:`, error);
      throw error;
    }
  }

  /**
   * ✅ Отримує список доступних типів GPU з правильною структурою
   */
  public async getGpuTypes(): Promise<GpuType[]> {
    console.log("🔄 Fetching available GPU types...");

    try {
      const response = await this.client.graphql<{ gpuTypes: GpuType[] }>(`
        query GpuTypes {
          gpuTypes {
            id
            displayName
            manufacturer
            memoryInGb
            cudaCores
            secureCloud
            communityCloud
            securePrice
            communityPrice
            oneMonthPrice
            threeMonthPrice
            sixMonthPrice
            oneWeekPrice
            communitySpotPrice
            secureSpotPrice
            maxGpuCount
            maxGpuCountCommunityCloud
            maxGpuCountSecureCloud
            minPodGpuCount
           
          }
        }
      `);

      if (!Array.isArray(response.gpuTypes)) {
        throw new APIError("Invalid GPU types response structure", 500);
      }

      console.log(`✅ Знайдено ${response.gpuTypes.length} типів GPU`);
      return response.gpuTypes;
    } catch (error) {
      console.error("❌ Error fetching GPU types:", error);
      throw error;
    }
  }

  /**
   * ✅ Знаходить найдешевший доступний GPU (покращена версія з fallback)
   */
  public async findCheapestGpu(
    gpuCount: number = 1,
    communityCloud: boolean = true,
    stockFilter: boolean = false
  ): Promise<GpuType | null> {
    if (gpuCount <= 0) throw new ValidationError("GPU count must be positive.");
    console.log(
      `🔄 Searching for cheapest GPU: count=${gpuCount}, community=${communityCloud}...`
    );

    try {
      const gpuTypes = await this.getGpuTypes();

      // Спочатку пробуємо зі строгими критеріями
      let filteredGpus = gpuTypes.filter((gpu) =>
        communityCloud ? gpu.communityCloud : gpu.secureCloud
      );

      // Фільтруємо за можливою кількістю GPU
      filteredGpus = filteredGpus.filter((gpu) => {
        const maxCount = communityCloud
          ? gpu.maxGpuCountCommunityCloud
          : gpu.maxGpuCountSecureCloud;
        return !maxCount || maxCount >= gpuCount;
      });

      // Додатковий фільтр: тільки GPU з відомими цінами
      filteredGpus = filteredGpus.filter((gpu) => {
        const hasPrice = communityCloud
          ? gpu.communityPrice !== undefined && gpu.communityPrice !== null
          : gpu.securePrice !== undefined && gpu.securePrice !== null;
        return hasPrice;
      });

      // Якщо нічого не знайшли, пробуємо менш строгі критерії
      if (filteredGpus.length === 0) {
        console.log(
          "⚠️ No GPUs found with strict criteria, trying fallback..."
        );

        // Fallback 1: пробуємо обидва типи хмари
        filteredGpus = gpuTypes.filter(
          (gpu) => gpu.communityCloud || gpu.secureCloud
        );

        // Fallback 2: якщо і так нічого немає, беремо будь-які GPU
        if (filteredGpus.length === 0) {
          filteredGpus = gpuTypes;
        }
      }

      if (filteredGpus.length === 0) {
        console.log("⚠️ No suitable GPUs found for the given criteria.");
        return null;
      }

      // Знаходимо найдешевший
      const cheapestGpu = filteredGpus.reduce((cheapest, current) => {
        let cheapestPrice: number;
        let currentPrice: number;

        if (communityCloud) {
          cheapestPrice =
            cheapest.communityPrice ??
            cheapest.communitySpotPrice ??
            cheapest.securePrice ??
            Infinity;
          currentPrice =
            current.communityPrice ??
            current.communitySpotPrice ??
            current.securePrice ??
            Infinity;
        } else {
          cheapestPrice =
            cheapest.securePrice ?? cheapest.communityPrice ?? Infinity;
          currentPrice =
            current.securePrice ?? current.communityPrice ?? Infinity;
        }

        return currentPrice < cheapestPrice ? current : cheapest;
      });

      console.log(
        `✅ Found cheapest GPU: ${cheapestGpu.displayName} (${
          cheapestGpu.id
        }) - Price: ${
          communityCloud ? cheapestGpu.communityPrice : cheapestGpu.securePrice
        }/hr`
      );
      return cheapestGpu;
    } catch (error) {
      console.error("❌ Error finding cheapest GPU:", error);
      throw error;
    }
  }

  /**
   * ✅ Створює під з автоматичним вибором найдешевшого GPU
   */
  public async createSmartPod(config: {
    name: string;
    imageName: string;
    containerDiskInGb: number;
    gpuCount?: number;
    communityCloud?: boolean;
    volumeInGb?: number;
    volumeMountPath?: string;
    ports?: string;
    env?: Array<{ key: string; value: string }>;
    dockerArgs?: string;
    templateId?: string;
  }): Promise<Pod> {
    console.log(`🤖 Creating smart pod: ${config.name}`);

    const gpuCount = config.gpuCount || 1;
    const communityCloud = config.communityCloud ?? true;

    // Автоматично знаходимо найдешевший GPU
    const cheapestGpu = await this.findCheapestGpu(gpuCount, communityCloud);

    if (!cheapestGpu) {
      throw new APIError(
        "No available GPUs found for the specified criteria",
        404
      );
    }

    const podConfig: PodCreateInput = {
      name: config.name,
      imageName: config.imageName,
      containerDiskInGb: config.containerDiskInGb,
      gpuCount,
      gpuTypeId: cheapestGpu.id,
      cloudType: communityCloud ? "COMMUNITY" : "SECURE",
      volumeInGb: config.volumeInGb,
      volumeMountPath: config.volumeMountPath || "/workspace",
      ports: config.ports,
      env: config.env,
      dockerArgs: config.dockerArgs,
      templateId: config.templateId,
    };

    console.log(`💰 Using GPU: ${cheapestGpu.displayName} (${cheapestGpu.id})`);
    return this.createPod(podConfig);
  }

  /**
   * ✅ Отримує статистику підів
   */
  public async getPodsStats(): Promise<{
    total: number;
    running: number;
    stopped: number;
    terminated: number;
    failed: number;
    totalCostPerHr: number;
  }> {
    const pods = await this.listPods();

    const stats = {
      total: pods.length,
      running: 0,
      stopped: 0,
      terminated: 0,
      failed: 0,
      totalCostPerHr: 0,
    };

    pods.forEach((pod) => {
      switch (pod.desiredStatus) {
        case "RUNNING":
          stats.running++;
          stats.totalCostPerHr += pod.costPerHr || 0;
          break;
        case "STOPPED":
          stats.stopped++;
          break;
        case "TERMINATED":
          stats.terminated++;
          break;
        case "FAILED":
          stats.failed++;
          break;
      }
    });

    return stats;
  }

  /**
   * ✅ Batch операції для підів
   */
  public async stopAllPods(): Promise<{ stopped: string[]; failed: string[] }> {
    const pods = await this.listPods();
    const runningPods = pods.filter((p) => p.desiredStatus === "RUNNING");

    const results = { stopped: [] as string[], failed: [] as string[] };

    for (const pod of runningPods) {
      try {
        await this.stopPod(pod.id);
        results.stopped.push(pod.id);
      } catch (error) {
        console.error(`Failed to stop pod ${pod.id}:`, error);
        results.failed.push(pod.id);
      }
    }

    console.log(
      `🛑 Batch stop: ${results.stopped.length} stopped, ${results.failed.length} failed`
    );
    return results;
  }

  async getPodLogs(podId: string): Promise<{ logs: string[] }> {
    if (!podId) throw new ValidationError('Pod ID is required');
    return this.client.getJobLogs(podId);
  }
}
