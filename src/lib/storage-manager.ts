// src/lib/storage-manager.ts - Виправлена версія з правильними REST API запитами
import { RunPodClient } from "./client";
import { APIError, ValidationError } from "../errors";

// ✅ Типи згідно з RunPod REST API
export interface NetworkVolume {
  id: string;
  name: string;
  size: number; // В GB
  dataCenterId: string;
  dataCenter?: {
    id: string;
    name: string;
    location: string;
  };
}

// ✅ Додатковий тип для детальної інформації про том
export interface VolumeInfo extends NetworkVolume {
  createdAt?: string;
  attachedPods?: string[]; // IDs підів, до яких приєднано
  region?: string;
}

export interface NetworkVolumeCreateInput {
  name: string;
  size: number; // В GB
  dataCenterId: string;
}

export class StorageManager {
  private client: RunPodClient;
  private apiKey: string;

  constructor(client: RunPodClient) {
    this.client = client;
    // Отримуємо API ключ з environment
    this.apiKey = process.env.RUNPOD_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('⚠️ RUNPOD_API_KEY not found in environment variables');
    }
  }

  /**
   * ✅ Базовий REST запит до RunPod API
   */
  private async restRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `https://rest.runpod.io/v1${endpoint}`;
    
    const defaultHeaders = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    console.log(`🔗 REST Request: ${config.method || 'GET'} ${url}`);

    const response = await fetch(url, config);

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.message) {
          errorMessage += ` - ${errorData.message}`;
        } else if (errorData.error) {
          errorMessage += ` - ${errorData.error}`;
        }
      } catch {
        if (errorText) {
          errorMessage += ` - ${errorText}`;
        }
      }
      
      throw new APIError(errorMessage, response.status);
    }

    const data = await response.json();
    return data as T;
  }

  /**
   * ✅ Отримує список усіх Network Volumes поточного користувача через GraphQL
   */
  public async listVolumes(): Promise<NetworkVolume[]> {
    console.log("🔄 Fetching all network volumes via GraphQL...");
    try {
      const response = await this.client.graphql<{
        myself: { networkVolumes: NetworkVolume[] };
      }>(`
        query MyNetworkVolumes {
          myself {
            networkVolumes {
              id
              name
              size
              dataCenterId
              dataCenter {
                id
                name
                location
              }
            }
          }
        }
      `);

      if (!response.myself || !Array.isArray(response.myself.networkVolumes)) {
        throw new APIError("Invalid network volumes response structure", 500);
      }

      console.log(
        `✅ Знайдено ${response.myself.networkVolumes.length} network volumes`
      );
      return response.myself.networkVolumes;
    } catch (error) {
      console.error("❌ Error listing network volumes:", error);
      throw error;
    }
  }

  /**
   * ✅ Отримує інформацію про конкретне Network Volume за його ID через REST API
   */
  public async getVolume(volumeId: string): Promise<NetworkVolume | null> {
    if (!volumeId) throw new ValidationError("Volume ID is required.");
    console.log(`🔄 Fetching network volume with ID: ${volumeId}...`);

    try {
      // Використовуємо REST API endpoint: GET /v1/networkvolumes/{networkVolumeId}
      const volume = await this.restRequest<NetworkVolume>(`/networkvolumes/${volumeId}`);
      
      console.log(`✅ Found network volume: ${volume.name}`);
      return volume;
    } catch (error) {
      if (error instanceof APIError && error.statusCode === 404) {
        console.log(`⚠️ Network volume with ID ${volumeId} not found.`);
        return null;
      }
      
      console.error(`❌ Error getting network volume ${volumeId}:`, error);
      throw error;
    }
  }

  /**
   * ✅ Отримує список доступних data centers через GraphQL
   */
  public async getDataCenters(): Promise<Array<{ id: string; name: string; location: string; storageSupport?: boolean }>> {
    console.log('🔄 Starting getDataCenters request...');
    
    try {
      console.log('📡 Sending GraphQL request to RunPod API...');
      
      const response = await this.client.graphql<{ 
        gpuTypes: Array<{ 
          id?: string;
          displayName?: string;
          nodeGroupDatacenters?: Array<{
            id: string;
            name: string;
            location: string;
            storageSupport?: boolean;
          }>
        }> 
      }>(`
        query GetDataCentersFromGPU {
          gpuTypes {
            id
            displayName
            nodeGroupDatacenters {
              id
              name
              location
              storageSupport
            }
          }
        }
      `);

      console.log('✅ GraphQL response received:', {
        hasGpuTypes: !!response.gpuTypes,
        gpuTypesCount: response.gpuTypes?.length || 0
      });

      if (!response.gpuTypes) {
        console.warn('⚠️ No gpuTypes in response, using fallback');
        return this.getFallbackDataCenters();
      }

      // Збираємо дата-центри з детальним логуванням
      const dataCentersMap = new Map<string, { 
        id: string; 
        name: string; 
        location: string; 
        storageSupport?: boolean;
      }>();
      
      let totalGpuTypes = 0;
      let gpuTypesWithDataCenters = 0;
      
      response.gpuTypes.forEach((gpu, index) => {
        totalGpuTypes++;
        
        if (gpu.nodeGroupDatacenters && gpu.nodeGroupDatacenters.length > 0) {
          gpuTypesWithDataCenters++;
          console.log(`🎮 GPU ${index + 1} (${gpu.displayName || gpu.id}): ${gpu.nodeGroupDatacenters.length} datacenters`);
          
          gpu.nodeGroupDatacenters.forEach(dc => {
            if (dc.id && dc.name && dc.location) {
              dataCentersMap.set(dc.id, {
                id: dc.id,
                name: dc.name,
                location: dc.location,
                storageSupport: dc.storageSupport
              });
              console.log(`  📍 ${dc.id} (${dc.location})`);
            } else {
              console.warn('⚠️ Invalid datacenter structure:', dc);
            }
          });
        } else {
          console.log(`🎮 GPU ${index + 1} (${gpu.displayName || gpu.id}): no datacenters`);
        }
      });

      const dataCenters = Array.from(dataCentersMap.values());
      
      console.log(`📊 Summary: ${totalGpuTypes} GPU types, ${gpuTypesWithDataCenters} with datacenters, ${dataCenters.length} unique datacenters`);
      
      // Якщо отримали менше 5 дата-центрів, додаємо відомі
      if (dataCenters.length < 5) {
        console.log('⚠️ Too few datacenters from API, adding known ones...');
        const knownDataCenters = this.getFallbackDataCenters();
        
        knownDataCenters.forEach(dc => {
          if (!dataCentersMap.has(dc.id)) {
            dataCentersMap.set(dc.id, dc);
          }
        });
        
        const finalResult = Array.from(dataCentersMap.values());
        console.log(`✅ Final result with fallback: ${finalResult.length} datacenters`);
        return finalResult;
      }
      
      console.log(`✅ Success: ${dataCenters.length} datacenters from API`);
      return dataCenters;
      
    } catch (error) {
      console.error('❌ getDataCenters error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        fullError: error
      });
      
      // Повертаємо fallback замість кидання помилки
      console.log('🚨 Using complete fallback due to error...');
      return this.getFallbackDataCenters();
    }
  }

  /**
   * 🔄 Fallback метод з відомими дата-центрами
   */
  private getFallbackDataCenters(): Array<{ id: string; name: string; location: string; storageSupport: boolean }> {
    return [
      { id: 'CA-MTL-1', name: 'CA-MTL-1', location: 'Canada', storageSupport: true },
      { id: 'CA-MTL-3', name: 'CA-MTL-3', location: 'Canada', storageSupport: true },
      { id: 'CA-MTL-4', name: 'CA-MTL-4', location: 'Canada', storageSupport: true },
      { id: 'EU-CZ-1', name: 'EU-CZ-1', location: 'Europe', storageSupport: true },
      { id: 'EU-RO-1', name: 'EU-RO-1', location: 'Europe', storageSupport: true },
      { id: 'EU-SE-1', name: 'EU-SE-1', location: 'Europe', storageSupport: true },
      { id: 'US-CA-2', name: 'US-CA-2', location: 'United States', storageSupport: true },
      { id: 'US-GA-2', name: 'US-GA-2', location: 'United States', storageSupport: true },
      { id: 'US-IL-1', name: 'US-IL-1', location: 'United States', storageSupport: true },
      { id: 'US-KS-2', name: 'US-KS-2', location: 'United States', storageSupport: true },
      { id: 'US-MO-1', name: 'US-MO-1', location: 'United States', storageSupport: true },
      { id: 'US-NC-1', name: 'US-NC-1', location: 'United States', storageSupport: true },
      { id: 'US-TX-3', name: 'US-TX-3', location: 'United States', storageSupport: true },
      { id: 'US-WA-1', name: 'US-WA-1', location: 'United States', storageSupport: true }
    ];
  }

  /**
   * ✅ Створення Network Volume через REST API
   * Документація: POST /v1/networkvolumes
   */
  public async createVolume(config: NetworkVolumeCreateInput): Promise<NetworkVolume> {
    console.log(`🚀 Creating network volume: ${config.name} with size ${config.size}GB...`);

    try {
      // Використовуємо REST API endpoint: POST /v1/networkvolumes
      const volume = await this.restRequest<NetworkVolume>('/networkvolumes', {
        method: 'POST',
        body: JSON.stringify({
          dataCenterId: config.dataCenterId,
          name: config.name,
          size: config.size
        })
      });

      console.log(`✅ Network volume created with ID: ${volume.id}`);
      return volume;

    } catch (error) {
      console.error(`❌ Error creating network volume:`, error);
      throw error;
    }
  }

  /**
   * ✅ Видалення Network Volume через REST API
   * Документація: DELETE /v1/networkvolumes/{networkVolumeId}
   */
  public async deleteVolume(volumeId: string): Promise<boolean> {
    if (!volumeId) throw new ValidationError("Volume ID is required.");
    console.log(`🗑️ Deleting network volume with ID: ${volumeId}...`);

    try {
      // Використовуємо REST API endpoint: DELETE /v1/networkvolumes/{networkVolumeId}
      await this.restRequest(`/networkvolumes/${volumeId}`, {
        method: 'DELETE'
      });

      console.log(`✅ Network volume ${volumeId} deleted successfully.`);
      return true;

    } catch (error) {
      console.error(`❌ Error deleting network volume ${volumeId}:`, error);
      throw error;
    }
  }

  /**
   * ✅ Оновлення Network Volume через REST API
   * Документація: PATCH /v1/networkvolumes/{networkVolumeId}
   */
  public async updateVolume(
    volumeId: string, 
    updates: { name?: string; size?: number }
  ): Promise<NetworkVolume> {
    if (!volumeId) throw new ValidationError("Volume ID is required.");
    console.log(`🔄 Updating network volume ${volumeId}...`);

    try {
      // Використовуємо REST API endpoint: PATCH /v1/networkvolumes/{networkVolumeId}
      const volume = await this.restRequest<NetworkVolume>(`/networkvolumes/${volumeId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });

      console.log(`✅ Network volume ${volumeId} updated successfully.`);
      return volume;

    } catch (error) {
      console.error(`❌ Error updating network volume ${volumeId}:`, error);
      throw error;
    }
  }

  /**
   * ✅ Перевіряє чи Network Volume приєднано до поду через GraphQL
   */
  public async getVolumeAttachments(volumeId: string): Promise<string[]> {
    if (!volumeId) throw new ValidationError("Volume ID is required.");
    console.log(`🔍 Checking attachments for volume ${volumeId}...`);

    try {
      // Отримуємо всі поди і перевіряємо networkVolumeId
      const response = await this.client.graphql<{
        myself: {
          pods: Array<{ id: string; name: string; networkVolumeId?: string }>;
        };
      }>(`
        query PodsWithVolumes {
          myself {
            pods {
              id
              name
              networkVolumeId
            }
          }
        }
      `);

      if (!response.myself?.pods) {
        return [];
      }

      const attachedPods = response.myself.pods
        .filter((pod) => pod.networkVolumeId === volumeId)
        .map((pod) => pod.id);

      console.log(
        `✅ Volume ${volumeId} attached to ${attachedPods.length} pods`
      );
      return attachedPods;
    } catch (error) {
      console.error(
        `❌ Error checking volume attachments for ${volumeId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * ✅ Отримує статистику використання Network Volumes
   */
  public async getVolumeStats(): Promise<{
    totalVolumes: number;
    totalSize: number;
    attachedVolumes: number;
    unattachedVolumes: number;
    dataCenterDistribution: Record<string, number>;
  }> {
    console.log("📊 Calculating volume statistics...");

    try {
      const volumes = await this.listVolumes();

      const stats = {
        totalVolumes: volumes.length,
        totalSize: 0,
        attachedVolumes: 0,
        unattachedVolumes: 0,
        dataCenterDistribution: {} as Record<string, number>,
      };

      // Отримуємо інформацію про прикріплення
      const attachmentPromises = volumes.map(async (volume) => {
        const attachments = await this.getVolumeAttachments(volume.id);
        return { volumeId: volume.id, isAttached: attachments.length > 0 };
      });

      const attachmentResults = await Promise.all(attachmentPromises);

      volumes.forEach((volume, index) => {
        stats.totalSize += volume.size;

        // Розподіл по data centers
        const dcName = volume.dataCenter?.name || volume.dataCenterId;
        stats.dataCenterDistribution[dcName] =
          (stats.dataCenterDistribution[dcName] || 0) + 1;

        // Статистика прикріплень
        if (attachmentResults[index].isAttached) {
          stats.attachedVolumes++;
        } else {
          stats.unattachedVolumes++;
        }
      });

      console.log(
        `📊 Stats: ${stats.totalVolumes} volumes, ${stats.totalSize}GB total`
      );
      return stats;
    } catch (error) {
      console.error("❌ Error calculating volume stats:", error);
      throw error;
    }
  }

  /**
   * ✅ Знаходить Network Volume за назвою
   */
  public async findVolumeByName(name: string): Promise<NetworkVolume | null> {
    if (!name) throw new ValidationError("Volume name is required.");
    console.log(`🔍 Searching for volume with name: ${name}...`);

    try {
      const volumes = await this.listVolumes();
      const volume = volumes.find((v) => v.name === name);

      if (volume) {
        console.log(`✅ Found volume: ${volume.id}`);
      } else {
        console.log(`⚠️ Volume with name "${name}" not found`);
      }

      return volume || null;
    } catch (error) {
      console.error(`❌ Error searching for volume ${name}:`, error);
      throw error;
    }
  }

  /**
   * ✅ Фільтрує Network Volumes за data center
   */
  public async getVolumesByDataCenter(dataCenterId: string): Promise<NetworkVolume[]> {
    if (!dataCenterId) throw new ValidationError("Data center ID is required.");
    console.log(`🔍 Filtering volumes by data center: ${dataCenterId}...`);

    try {
      const volumes = await this.listVolumes();
      const filteredVolumes = volumes.filter(
        (v) => v.dataCenterId === dataCenterId
      );

      console.log(
        `✅ Found ${filteredVolumes.length} volumes in data center ${dataCenterId}`
      );
      return filteredVolumes;
    } catch (error) {
      console.error(
        `❌ Error filtering volumes by data center ${dataCenterId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * ✅ Отримує найбільші Network Volumes
   */
  public async getLargestVolumes(limit: number = 5): Promise<NetworkVolume[]> {
    console.log(`🔍 Finding ${limit} largest volumes...`);

    try {
      const volumes = await this.listVolumes();
      const sortedVolumes = volumes
        .sort((a, b) => b.size - a.size)
        .slice(0, limit);

      console.log(`✅ Found ${sortedVolumes.length} largest volumes`);
      return sortedVolumes;
    } catch (error) {
      console.error("❌ Error finding largest volumes:", error);
      throw error;
    }
  }

  /**
   * ✅ Перевіряє доступність назви для нового volume
   */
  public async isVolumeNameAvailable(name: string): Promise<boolean> {
    if (!name) throw new ValidationError("Volume name is required.");

    try {
      const existingVolume = await this.findVolumeByName(name);
      return existingVolume === null;
    } catch (error) {
      console.error(
        `❌ Error checking volume name availability for ${name}:`,
        error
      );
      throw error;
    }
  }

  /**
   * ✅ Генерує унікальну назву для volume
   */
  public async generateUniqueVolumeName(baseName: string): Promise<string> {
    if (!baseName) throw new ValidationError("Base name is required.");

    let counter = 1;
    let candidateName = baseName;

    while (!(await this.isVolumeNameAvailable(candidateName))) {
      candidateName = `${baseName}-${counter}`;
      counter++;

      // Безпека від нескінченного циклу
      if (counter > 100) {
        throw new APIError(
          "Unable to generate unique volume name after 100 attempts",
          500
        );
      }
    }

    console.log(`💡 Generated unique volume name: ${candidateName}`);
    return candidateName;
  }

  /**
   * ✅ Створює Network Volume з автоматичним вибором data center
   */
  public async createSmartVolume(config: {
    name: string;
    size: number;
    preferredRegion?: string; // 'US', 'EU', etc.
    autoUniqueName?: boolean;
  }): Promise<NetworkVolume> {
    console.log(`🤖 Creating smart volume: ${config.name}`);

    try {
      // Автоматично генеруємо унікальну назву якщо потрібно
      let volumeName = config.name;
      if (config.autoUniqueName) {
        volumeName = await this.generateUniqueVolumeName(config.name);
      }

      // Отримуємо доступні data centers
      const dataCenters = await this.getDataCenters();

      if (dataCenters.length === 0) {
        throw new APIError("No data centers available", 404);
      }

      // Вибираємо data center
      let selectedDataCenter = dataCenters[0]; // За замовчуванням перший

      if (config.preferredRegion) {
        const preferredDC = dataCenters.find((dc) =>
          dc.location
            .toUpperCase()
            .includes(config.preferredRegion!.toUpperCase())
        );
        if (preferredDC) {
          selectedDataCenter = preferredDC;
          console.log(
            `💡 Selected preferred data center: ${selectedDataCenter.name} (${selectedDataCenter.location})`
          );
        } else {
          console.log(
            `⚠️ Preferred region ${config.preferredRegion} not found, using ${selectedDataCenter.name}`
          );
        }
      }

      const volumeConfig: NetworkVolumeCreateInput = {
        name: volumeName,
        size: config.size,
        dataCenterId: selectedDataCenter.id,
      };

      return this.createVolume(volumeConfig);
    } catch (error) {
      console.error(`❌ Error creating smart volume ${config.name}:`, error);
      throw error;
    }
  }

  /**
   * ✅ Валідує конфігурацію volume перед створенням
   */
  public validateVolumeConfig(config: NetworkVolumeCreateInput): string[] {
    const errors: string[] = [];

    if (!config.name || config.name.trim().length === 0) {
      errors.push("Volume name is required");
    }

    if (config.name && config.name.length > 50) {
      errors.push("Volume name must be 50 characters or less");
    }

    if (config.name && !/^[a-zA-Z0-9-_]+$/.test(config.name)) {
      errors.push(
        "Volume name can only contain letters, numbers, hyphens, and underscores"
      );
    }

    if (!config.size || config.size <= 0) {
      errors.push("Volume size must be positive");
    }

    if (config.size && config.size > 1000) {
      errors.push("Volume size cannot exceed 1000GB");
    }

    if (!config.dataCenterId || config.dataCenterId.trim().length === 0) {
      errors.push("Data center ID is required");
    }

    return errors;
  }

  /**
   * ✅ Отримує детальну інформацію про використання volume
   */
  public async getVolumeUsageInfo(volumeId: string): Promise<{
    volume: NetworkVolume;
    attachedPods: string[];
    isInUse: boolean;
    canDelete: boolean;
    recommendations: string[];
  }> {
    if (!volumeId) throw new ValidationError("Volume ID is required.");

    try {
      const volume = await this.getVolume(volumeId);
      if (!volume) {
        throw new APIError(`Volume ${volumeId} not found`, 404);
      }

      const attachedPods = await this.getVolumeAttachments(volumeId);
      const isInUse = attachedPods.length > 0;
      const canDelete = !isInUse;

      const recommendations: string[] = [];

      if (isInUse) {
        recommendations.push(
          `Volume прикріплено до ${attachedPods.length} під(ів). Відключіть перед видаленням.`
        );
      }

      if (volume.size > 100) {
        recommendations.push(
          "Великий volume - переконайтеся що всі дані збережені."
        );
      }

      if (!isInUse && volume.size > 10) {
        recommendations.push(
          "Volume не використовується - розгляньте можливість видалення для економії коштів."
        );
      }

      return {
        volume,
        attachedPods,
        isInUse,
        canDelete,
        recommendations,
      };
    } catch (error) {
      console.error(
        `❌ Error getting volume usage info for ${volumeId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * ✅ Експортує інформацію про всі volumes у JSON
   */
  public async exportVolumesInfo(): Promise<{
    exportedAt: string;
    totalVolumes: number;
    totalSize: number;
    volumes: Array<
      NetworkVolume & { attachedPods: string[]; isInUse: boolean }
    >;
  }> {
    console.log("📤 Exporting volumes information...");

    try {
      const volumes = await this.listVolumes();

      const volumesWithUsage = await Promise.all(
        volumes.map(async (volume) => {
          const attachedPods = await this.getVolumeAttachments(volume.id);
          return {
            ...volume,
            attachedPods,
            isInUse: attachedPods.length > 0,
          };
        })
      );

      const totalSize = volumes.reduce((sum, v) => sum + v.size, 0);

      const exportData = {
        exportedAt: new Date().toISOString(),
        totalVolumes: volumes.length,
        totalSize,
        volumes: volumesWithUsage,
      };

      console.log(
        `✅ Exported information for ${volumes.length} volumes (${totalSize}GB total)`
      );
      return exportData;
    } catch (error) {
      console.error("❌ Error exporting volumes info:", error);
      throw error;
    }
  }
}