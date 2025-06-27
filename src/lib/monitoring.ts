import { RunPodClient } from './client'; 
import { formatDuration, debounce } from './utils';

export interface MonitoringMetrics {
  endpointId: string;
  endpointName: string;
  activeWorkers: number;
  queuedJobs: number;
  completedJobs: number;
  failedJobs: number;
  avgExecutionTime: number;
  lastUpdated: Date;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: (metrics: MonitoringMetrics) => boolean;
  action: (metrics: MonitoringMetrics) => Promise<void>;
  enabled: boolean;
}

export class MonitoringService {
  private client: RunPodClient;
  private metrics: Map<string, MonitoringMetrics> = new Map();
  private alertRules: AlertRule[] = [];
  private monitoringInterval?: NodeJS.Timeout;

  constructor(client: RunPodClient) {
    this.client = client;
  }

  // Додавання правила алертів
  addAlertRule(rule: AlertRule): void {
    this.alertRules.push(rule);
    console.log(`📊 Alert rule added: ${rule.name}`);
  }

  // Видалення правила алертів
  removeAlertRule(ruleId: string): void {
    this.alertRules = this.alertRules.filter(rule => rule.id !== ruleId);
    console.log(`🗑️ Alert rule removed: ${ruleId}`);
  }

  // Збір метрик для endpoint
  async collectMetrics(endpointId: string): Promise<MonitoringMetrics> {
    try {
      const endpoint = await this.client.getEndpoint(endpointId);
      
      const metrics: MonitoringMetrics = {
        endpointId: endpoint.id,
        endpointName: endpoint.name,
        activeWorkers: endpoint.workersCount,
        queuedJobs: 0, // Потрібен окремий API виклик
        completedJobs: 0, // Потрібен окремий API виклик
        failedJobs: 0, // Потрібен окремий API виклик
        avgExecutionTime: 0, // Розрахунок на основі історії
        lastUpdated: new Date(),
      };

      this.metrics.set(endpointId, metrics);
      await this.checkAlerts(metrics);
      
      return metrics;
    } catch (error) {
      console.error(`❌ Failed to collect metrics for ${endpointId}:`, error);
      throw error;
    }
  }

  // Перевірка алертів
  private async checkAlerts(metrics: MonitoringMetrics): Promise<void> {
    for (const rule of this.alertRules) {
      if (rule.enabled && rule.condition(metrics)) {
        try {
          console.log(`🚨 Alert triggered: ${rule.name}`);
          await rule.action(metrics);
        } catch (error) {
          console.error(`❌ Alert action failed for ${rule.name}:`, error);
        }
      }
    }
  }

  // Запуск моніторингу
  startMonitoring(endpointIds: string[], intervalMs: number = 30000): void {
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    console.log(`📊 Starting monitoring for ${endpointIds.length} endpoints`);
    
    this.monitoringInterval = setInterval(async () => {
      for (const endpointId of endpointIds) {
        try {
          await this.collectMetrics(endpointId);
        } catch (error) {
          console.error(`❌ Monitoring failed for ${endpointId}:`, error);
        }
      }
    }, intervalMs);
  }

  // Зупинка моніторингу
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
      console.log('⏹️ Monitoring stopped');
    }
  }

  // ✅ Виправлений метод getMetrics з правильною типізацією
  getMetrics(): MonitoringMetrics[];
  getMetrics(endpointId: string): MonitoringMetrics | null;
  getMetrics(endpointId?: string): MonitoringMetrics[] | MonitoringMetrics | null {
    if (endpointId) {
      return this.metrics.get(endpointId) || null;
    }
    return Array.from(this.metrics.values());
  }

  // ✅ Виправлений метод generateReport
  generateReport(endpointId?: string): string {
    let metricsArray: MonitoringMetrics[];

    if (endpointId) {
      const singleMetric = this.metrics.get(endpointId);
      if (!singleMetric) {
        return `📊 No metrics available for endpoint: ${endpointId}`;
      }
      metricsArray = [singleMetric];
    } else {
      metricsArray = Array.from(this.metrics.values());
    }

    if (metricsArray.length === 0) {
      return '📊 No metrics available';
    }

    let report = '📊 **Podify Monitoring Report**\n\n';
    
    // ✅ Тепер TypeScript знає що metric точно існує
    for (const metric of metricsArray) {
      report += `**${metric.endpointName}** (${metric.endpointId})\n`;
      report += `- Active Workers: ${metric.activeWorkers}\n`;
      report += `- Queued Jobs: ${metric.queuedJobs}\n`;
      report += `- Completed Jobs: ${metric.completedJobs}\n`;
      report += `- Failed Jobs: ${metric.failedJobs}\n`;
      report += `- Avg Execution Time: ${formatDuration(metric.avgExecutionTime)}\n`;
      report += `- Last Updated: ${metric.lastUpdated.toISOString()}\n\n`;
    }

    return report;
  }

  // ✅ Додатковий метод для безпечного отримання метрик
  getMetricsSafe(endpointId?: string): MonitoringMetrics[] {
    if (endpointId) {
      const metric = this.metrics.get(endpointId);
      return metric ? [metric] : [];
    }
    return Array.from(this.metrics.values());
  }

  // ✅ Метод для перевірки чи існують метрики
  hasMetrics(endpointId?: string): boolean {
    if (endpointId) {
      return this.metrics.has(endpointId);
    }
    return this.metrics.size > 0;
  }

  // ✅ Метод для отримання останніх метрик з перевіркою
  getLatestMetrics(endpointId: string): MonitoringMetrics | null {
    const metric = this.metrics.get(endpointId);
    if (!metric) {
      console.warn(`⚠️ No metrics found for endpoint: ${endpointId}`);
      return null;
    }
    return metric;
  }

  // ✅ Безпечний метод для роботи з метриками
  withMetrics<T>(
    endpointId: string, 
    callback: (metrics: MonitoringMetrics) => T
  ): T | null {
    const metrics = this.metrics.get(endpointId);
    if (!metrics) {
      console.warn(`⚠️ No metrics available for endpoint: ${endpointId}`);
      return null;
    }
    return callback(metrics);
  }
}

// ✅ Предвизначені правила алертів з type safety
export const createAlertRules = (client: RunPodClient) => ({
  highFailureRate: (threshold: number = 0.1): AlertRule => ({
    id: 'high-failure-rate',
    name: 'High Failure Rate',
    condition: (metrics: MonitoringMetrics) => {
      const total = metrics.completedJobs + metrics.failedJobs;
      return total > 0 && (metrics.failedJobs / total) > threshold;
    },
    action: async (metrics: MonitoringMetrics) => {
      console.log(`🚨 High failure rate detected for ${metrics.endpointName}: ${metrics.failedJobs} failed jobs`);
    },
    enabled: true,
  }),

  noActiveWorkers: (): AlertRule => ({
    id: 'no-active-workers',
    name: 'No Active Workers',
    condition: (metrics: MonitoringMetrics) => metrics.activeWorkers === 0 && metrics.queuedJobs > 0,
    action: async (metrics: MonitoringMetrics) => {
      console.log(`🚨 No active workers but ${metrics.queuedJobs} jobs queued for ${metrics.endpointName}`);
      try {
        await client.scaleWorkers(metrics.endpointId, 1);
        console.log(`⚡ Auto-scaled ${metrics.endpointName} to 1 worker`);
      } catch (error) {
        console.error('❌ Auto-scaling failed:', error);
      }
    },
    enabled: true,
  }),

  longExecutionTime: (thresholdMs: number = 300000): AlertRule => ({
    id: 'long-execution-time',
    name: 'Long Execution Time',
    condition: (metrics: MonitoringMetrics) => metrics.avgExecutionTime > thresholdMs,
    action: async (metrics: MonitoringMetrics) => {
      console.log(`🚨 Long execution time detected for ${metrics.endpointName}: ${formatDuration(metrics.avgExecutionTime)}`);
    },
    enabled: true,
  }),

  highQueueSize: (threshold: number = 10): AlertRule => ({
    id: 'high-queue-size',
    name: 'High Queue Size',
    condition: (metrics: MonitoringMetrics) => metrics.queuedJobs > threshold,
    action: async (metrics: MonitoringMetrics) => {
      console.log(`🚨 High queue size detected for ${metrics.endpointName}: ${metrics.queuedJobs} jobs queued`);
      try {
        const currentWorkers = metrics.activeWorkers;
        const newWorkerCount = Math.min(currentWorkers + 1, 5);
        if (newWorkerCount > currentWorkers) {
          await client.scaleWorkers(metrics.endpointId, newWorkerCount);
          console.log(`⚡ Auto-scaled ${metrics.endpointName} from ${currentWorkers} to ${newWorkerCount} workers`);
        }
      } catch (error) {
        console.error('❌ Auto-scaling failed:', error);
      }
    },
    enabled: true,
  }),
});