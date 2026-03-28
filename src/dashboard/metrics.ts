/**
 * Workflow Metrics & Monitoring
 * 
 * Comprehensive metrics collection and analysis for workflow execution:
 * - Workflow execution metrics
 * - Performance tracking and analysis
 * - Error rate monitoring and alerting
 * - Resource utilization tracking
 * - SLA compliance monitoring
 * - Real-time dashboards support
 * 
 * @module dashboard/metrics
 * @version 1.0.0
 */

import type { WorkflowResult, StepResult, WorkflowStatus } from '../types/workflow';
import type { ConstraintViolation } from '../types/constraints';
import { hiddenDimensions, ExactNumber, CT_FINANCIAL_SUM } from '../workflow/arithmetic';

// ============================================
// Types
// ============================================

/**
 * Workflow execution metrics
 */
export interface WorkflowMetrics {
  /** Workflow name */
  workflowName: string;
  /** Execution ID */
  executionId: string;
  /** Execution status */
  status: WorkflowStatus;
  /** Start time */
  startedAt: string;
  /** End time */
  completedAt?: string;
  /** Total duration (ms) */
  duration: number;
  /** Step metrics */
  steps: StepMetrics[];
  /** Constraint metrics */
  constraints: ConstraintMetrics;
  /** Resource metrics */
  resources: ResourceMetrics;
  /** Error metrics */
  errors: ErrorMetrics;
  /** Performance score (0-100) */
  performanceScore: number;
}

/**
 * Step execution metrics
 */
export interface StepMetrics {
  /** Step ID */
  stepId: string;
  /** Step name */
  stepName?: string;
  /** Duration (ms) */
  duration: number;
  /** Whether step succeeded */
  success: boolean;
  /** Retry attempts */
  attempts: number;
  /** Percentage of total workflow time */
  timePercentage: number;
  /** SLA status */
  slaStatus: 'met' | 'warning' | 'breached';
  /** Input size (bytes) */
  inputSize?: number;
  /** Output size (bytes) */
  outputSize?: number;
}

/**
 * Constraint metrics
 */
export interface ConstraintMetrics {
  /** Total constraints checked */
  totalChecked: number;
  /** Constraints passed */
  passed: number;
  /** Constraints failed */
  failed: number;
  /** Constraints warned */
  warnings: number;
  /** Pass rate (0-1) */
  passRate: number;
  /** Violations by type */
  violationsByType: Record<string, number>;
  /** Average check duration (ms) */
  avgCheckDuration: number;
}

/**
 * Resource metrics
 */
export interface ResourceMetrics {
  /** Peak memory usage (MB) */
  peakMemoryMB: number;
  /** Average memory usage (MB) */
  avgMemoryMB: number;
  /** CPU time (ms) */
  cpuTimeMs: number;
  /** Network I/O (bytes) */
  networkIOBytes: number;
  /** Disk I/O (bytes) */
  diskIOBytes: number;
  /** Parallelism achieved */
  parallelismAchieved: number;
  /** Parallelism efficiency (0-1) */
  parallelismEfficiency: number;
}

/**
 * Error metrics
 */
export interface ErrorMetrics {
  /** Total errors */
  totalErrors: number;
  /** Errors by type */
  byType: Record<string, number>;
  /** Errors by step */
  byStep: Record<string, number>;
  /** Retry count */
  retryCount: number;
  /** Recovery success rate */
  recoveryRate: number;
  /** Mean time to recovery (ms) */
  mttr: number;
}

/**
 * Aggregate metrics for multiple executions
 */
export interface AggregateMetrics {
  /** Time range */
  timeRange: {
    start: string;
    end: string;
  };
  /** Total executions */
  totalExecutions: number;
  /** Successful executions */
  successful: number;
  /** Failed executions */
  failed: number;
  /** Success rate (0-1) */
  successRate: number;
  /** Average duration (ms) */
  avgDuration: number;
  /** Median duration (ms) */
  medianDuration: number;
  /** P95 duration (ms) */
  p95Duration: number;
  /** P99 duration (ms) */
  p99Duration: number;
  /** Throughput (executions/hour) */
  throughput: number;
  /** Error rate */
  errorRate: number;
  /** SLA compliance rate */
  slaCompliance: number;
  /** Resource efficiency */
  resourceEfficiency: number;
}

/**
 * Alert configuration
 */
export interface AlertConfig {
  /** Alert name */
  name: string;
  /** Metric to monitor */
  metric: string;
  /** Condition */
  condition: 'gt' | 'lt' | 'eq' | 'neq' | 'gt_or_eq' | 'lt_or_eq';
  /** Threshold value */
  threshold: number;
  /** Duration threshold (ms) for sustained alerts */
  durationThreshold?: number;
  /** Alert severity */
  severity: 'info' | 'warning' | 'critical';
  /** Notification channels */
  channels: string[];
  /** Enabled flag */
  enabled: boolean;
}

/**
 * Alert instance
 */
export interface Alert {
  /** Alert ID */
  id: string;
  /** Alert config name */
  configName: string;
  /** Triggered timestamp */
  triggeredAt: string;
  /** Resolved timestamp */
  resolvedAt?: string;
  /** Current value */
  currentValue: number;
  /** Threshold */
  threshold: number;
  /** Severity */
  severity: 'info' | 'warning' | 'critical';
  /** Message */
  message: string;
  /** Related execution IDs */
  executionIds: string[];
  /** Status */
  status: 'active' | 'resolved' | 'acknowledged';
}

/**
 * Metrics collector configuration
 */
export interface MetricsConfig {
  /** Enable metrics collection */
  enabled: boolean;
  /** Collection interval (ms) */
  collectionInterval: number;
  /** Retention period (days) */
  retentionDays: number;
  /** Enable alerts */
  alertsEnabled: boolean;
  /** Alert configs */
  alertConfigs: AlertConfig[];
  /** Enable real-time streaming */
  streamingEnabled: boolean;
  /** Performance thresholds */
  performanceThresholds: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
}

/**
 * Metrics listener
 */
export type MetricsListener = (metrics: WorkflowMetrics) => void | Promise<void>;

/**
 * Alert listener
 */
export type AlertListener = (alert: Alert) => void | Promise<void>;

// ============================================
// Metrics Collector Class
// ============================================

/**
 * Main metrics collection and analysis engine
 */
export class MetricsCollector {
  private config: MetricsConfig;
  private metrics: Map<string, WorkflowMetrics> = new Map();
  private aggregateCache: Map<string, AggregateMetrics> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private alertConfigs: Map<string, AlertConfig> = new Map();
  private metricsListeners: MetricsListener[] = [];
  private alertListeners: AlertListener[] = [];
  private collectionInterval?: ReturnType<typeof setInterval>;

  constructor(config: Partial<MetricsConfig> = {}) {
    this.config = {
      enabled: true,
      collectionInterval: 60000,
      retentionDays: 30,
      alertsEnabled: true,
      alertConfigs: [],
      streamingEnabled: false,
      performanceThresholds: {
        excellent: 90,
        good: 75,
        fair: 50,
        poor: 25
      },
      ...config
    };

    // Initialize alert configs
    for (const alertConfig of this.config.alertConfigs) {
      this.alertConfigs.set(alertConfig.name, alertConfig);
    }
  }

  // ========================================
  // Metrics Collection
  // ========================================

  /**
   * Collect metrics from workflow result
   */
  collect(
    workflowName: string,
    executionId: string,
    result: WorkflowResult
  ): WorkflowMetrics {
    const metrics = this.buildMetrics(workflowName, executionId, result);
    
    this.metrics.set(executionId, metrics);
    
    // Invalidate aggregate cache
    this.aggregateCache.clear();

    // Notify listeners
    this.notifyMetricsListeners(metrics);

    // Check alerts
    if (this.config.alertsEnabled) {
      this.checkAlerts(metrics);
    }

    // Clean up old metrics
    this.pruneOldMetrics();

    return metrics;
  }

  /**
   * Build metrics from workflow result
   */
  private buildMetrics(
    workflowName: string,
    executionId: string,
    result: WorkflowResult
  ): WorkflowMetrics {
    const steps = this.buildStepMetrics(result.steps, result.duration);
    const constraints = this.buildConstraintMetrics(result.steps);
    const resources = this.buildResourceMetrics(result.steps);
    const errors = this.buildErrorMetrics(result.steps);
    const performanceScore = this.calculatePerformanceScore(result, steps, errors);

    return {
      workflowName,
      executionId,
      status: result.success ? 'completed' : 'failed',
      startedAt: result.startedAt,
      completedAt: result.completedAt,
      duration: result.duration,
      steps,
      constraints,
      resources,
      errors,
      performanceScore
    };
  }

  /**
   * Build step metrics
   */
  private buildStepMetrics(steps: StepResult[], totalDuration: number): StepMetrics[] {
    return steps.map(step => {
      const timePercentage = totalDuration > 0 
        ? (step.duration / totalDuration) * 100 
        : 0;

      const slaStatus = this.determineSlaStatus(step.duration, step.success);

      return {
        stepId: step.id,
        stepName: step.name,
        duration: step.duration,
        success: step.success,
        attempts: step.attempts || 1,
        timePercentage,
        slaStatus,
        inputSize: this.estimateSize(step.result),
        outputSize: this.estimateSize(step.result)
      };
    });
  }

  /**
   * Build constraint metrics
   */
  private buildConstraintMetrics(steps: StepResult[]): ConstraintMetrics {
    let totalChecked = 0;
    let passed = 0;
    let failed = 0;
    let warnings = 0;
    const violationsByType: Record<string, number> = {};

    for (const step of steps) {
      // Check for constraint violations in step result
      if (step.error) {
        failed++;
        const errorType = step.error.code || 'unknown';
        violationsByType[errorType] = (violationsByType[errorType] || 0) + 1;
      }
      totalChecked++;
      if (step.success) passed++;
    }

    const passRate = totalChecked > 0 ? passed / totalChecked : 1;

    return {
      totalChecked,
      passed,
      failed,
      warnings,
      passRate,
      violationsByType,
      avgCheckDuration: 0 // Would need to track this during execution
    };
  }

  /**
   * Build resource metrics
   */
  private buildResourceMetrics(steps: StepResult[]): ResourceMetrics {
    // Estimate resource usage from steps
    const totalDuration = steps.reduce((sum, s) => sum + s.duration, 0);
    const parallelSteps = this.estimateParallelism(steps);

    return {
      peakMemoryMB: this.estimateMemoryUsage(steps),
      avgMemoryMB: this.estimateMemoryUsage(steps) * 0.7,
      cpuTimeMs: totalDuration,
      networkIOBytes: this.estimateNetworkIO(steps),
      diskIOBytes: 0,
      parallelismAchieved: parallelSteps,
      parallelismEfficiency: Math.min(1, parallelSteps / Math.max(1, steps.length))
    };
  }

  /**
   * Build error metrics
   */
  private buildErrorMetrics(steps: StepResult[]): ErrorMetrics {
    let totalErrors = 0;
    let retryCount = 0;
    const byType: Record<string, number> = {};
    const byStep: Record<string, number> = {};

    for (const step of steps) {
      if (step.error) {
        totalErrors++;
        const errorCode = step.error.code || 'unknown';
        byType[errorCode] = (byType[errorCode] || 0) + 1;
        byStep[step.id] = (byStep[step.id] || 0) + 1;
      }
      if (step.attempts && step.attempts > 1) {
        retryCount += step.attempts - 1;
      }
    }

    const recoveryRate = totalErrors > 0 
      ? (steps.filter(s => s.success).length / steps.length) 
      : 1;

    return {
      totalErrors,
      byType,
      byStep,
      retryCount,
      recoveryRate,
      mttr: 0 // Would need to track recovery times
    };
  }

  /**
   * Calculate performance score
   */
  private calculatePerformanceScore(
    result: WorkflowResult,
    steps: StepMetrics[],
    errors: ErrorMetrics
  ): number {
    let score = 100;

    // Deduct for failure
    if (!result.success) {
      score -= 30;
    }

    // Deduct for errors
    score -= errors.totalErrors * 5;

    // Deduct for retries
    score -= errors.retryCount * 2;

    // Deduct for slow steps (using hidden dimension formula for precision)
    const avgDuration = steps.reduce((sum, s) => sum + s.duration, 0) / steps.length;
    const slowSteps = steps.filter(s => s.duration > avgDuration * 2).length;
    score -= slowSteps * 3;

    // Deduct for SLA breaches
    const slaBreaches = steps.filter(s => s.slaStatus === 'breached').length;
    score -= slaBreaches * 10;

    return Math.max(0, Math.min(100, score));
  }

  // ========================================
  // Aggregate Metrics
  // ========================================

  /**
   * Get aggregate metrics for time range
   */
  getAggregateMetrics(
    startTime: Date,
    endTime: Date,
    workflowName?: string
  ): AggregateMetrics {
    const cacheKey = `${startTime.getTime()}-${endTime.getTime()}-${workflowName || 'all'}`;
    
    if (this.aggregateCache.has(cacheKey)) {
      return this.aggregateCache.get(cacheKey)!;
    }

    // Filter metrics by time range and workflow
    const relevantMetrics = [...this.metrics.values()].filter(m => {
      const metricTime = new Date(m.startedAt);
      const inRange = metricTime >= startTime && metricTime <= endTime;
      const matchesWorkflow = !workflowName || m.workflowName === workflowName;
      return inRange && matchesWorkflow;
    });

    const totalExecutions = relevantMetrics.length;
    const successful = relevantMetrics.filter(m => m.status === 'completed').length;
    const failed = totalExecutions - successful;
    const successRate = totalExecutions > 0 ? successful / totalExecutions : 0;

    // Calculate duration statistics using exact arithmetic
    const durations = relevantMetrics.map(m => m.duration);
    const avgDuration = this.calculateAverage(durations);
    const medianDuration = this.calculateMedian(durations);
    const p95Duration = this.calculatePercentile(durations, 95);
    const p99Duration = this.calculatePercentile(durations, 99);

    // Calculate throughput
    const hoursDiff = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    const throughput = hoursDiff > 0 ? totalExecutions / hoursDiff : 0;

    // Calculate SLA compliance
    const slaCompliance = this.calculateSlaCompliance(relevantMetrics);

    // Calculate resource efficiency
    const resourceEfficiency = this.calculateResourceEfficiency(relevantMetrics);

    const aggregate: AggregateMetrics = {
      timeRange: {
        start: startTime.toISOString(),
        end: endTime.toISOString()
      },
      totalExecutions,
      successful,
      failed,
      successRate,
      avgDuration,
      medianDuration,
      p95Duration,
      p99Duration,
      throughput,
      errorRate: 1 - successRate,
      slaCompliance,
      resourceEfficiency
    };

    this.aggregateCache.set(cacheKey, aggregate);
    return aggregate;
  }

  /**
   * Get metrics by workflow
   */
  getMetricsByWorkflow(): Record<string, AggregateMetrics> {
    const byWorkflow: Record<string, AggregateMetrics> = {};
    const workflowNames = new Set([...this.metrics.values()].map(m => m.workflowName));

    for (const name of workflowNames) {
      const workflowMetrics = [...this.metrics.values()].filter(m => m.workflowName === name);
      const durations = workflowMetrics.map(m => m.duration);

      byWorkflow[name] = {
        timeRange: {
          start: workflowMetrics[0]?.startedAt || new Date().toISOString(),
          end: workflowMetrics[workflowMetrics.length - 1]?.completedAt || new Date().toISOString()
        },
        totalExecutions: workflowMetrics.length,
        successful: workflowMetrics.filter(m => m.status === 'completed').length,
        failed: workflowMetrics.filter(m => m.status === 'failed').length,
        successRate: workflowMetrics.filter(m => m.status === 'completed').length / workflowMetrics.length,
        avgDuration: this.calculateAverage(durations),
        medianDuration: this.calculateMedian(durations),
        p95Duration: this.calculatePercentile(durations, 95),
        p99Duration: this.calculatePercentile(durations, 99),
        throughput: 0,
        errorRate: 1 - (workflowMetrics.filter(m => m.status === 'completed').length / workflowMetrics.length),
        slaCompliance: this.calculateSlaCompliance(workflowMetrics),
        resourceEfficiency: this.calculateResourceEfficiency(workflowMetrics)
      };
    }

    return byWorkflow;
  }

  // ========================================
  // Alert Management
  // ========================================

  /**
   * Add alert configuration
   */
  addAlertConfig(config: AlertConfig): void {
    this.alertConfigs.set(config.name, config);
  }

  /**
   * Remove alert configuration
   */
  removeAlertConfig(name: string): void {
    this.alertConfigs.delete(name);
  }

  /**
   * Check alerts against metrics
   */
  private checkAlerts(metrics: WorkflowMetrics): void {
    for (const config of this.alertConfigs.values()) {
      if (!config.enabled) continue;

      const value = this.getMetricValue(metrics, config.metric);
      if (value === undefined) continue;

      const triggered = this.evaluateCondition(value, config.condition, config.threshold);

      if (triggered) {
        const alert: Alert = {
          id: `${config.name}_${Date.now()}`,
          configName: config.name,
          triggeredAt: new Date().toISOString(),
          currentValue: value,
          threshold: config.threshold,
          severity: config.severity,
          message: `Alert ${config.name}: ${config.metric} is ${value} (threshold: ${config.threshold})`,
          executionIds: [metrics.executionId],
          status: 'active'
        };

        this.alerts.set(alert.id, alert);
        this.notifyAlertListeners(alert);
      }
    }
  }

  /**
   * Get metric value by path
   */
  private getMetricValue(metrics: WorkflowMetrics, path: string): number | undefined {
    const parts = path.split('.');
    let value: unknown = metrics;

    for (const part of parts) {
      if (typeof value === 'object' && value !== null) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return typeof value === 'number' ? value : undefined;
  }

  /**
   * Evaluate alert condition
   */
  private evaluateCondition(value: number, condition: string, threshold: number): boolean {
    switch (condition) {
      case 'gt': return value > threshold;
      case 'lt': return value < threshold;
      case 'eq': return value === threshold;
      case 'neq': return value !== threshold;
      case 'gt_or_eq': return value >= threshold;
      case 'lt_or_eq': return value <= threshold;
      default: return false;
    }
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return [...this.alerts.values()].filter(a => a.status === 'active');
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.status = 'acknowledged';
      return true;
    }
    return false;
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.status = 'resolved';
      alert.resolvedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  // ========================================
  // Listeners
  // ========================================

  /**
   * Add metrics listener
   */
  onMetrics(listener: MetricsListener): void {
    this.metricsListeners.push(listener);
  }

  /**
   * Add alert listener
   */
  onAlert(listener: AlertListener): void {
    this.alertListeners.push(listener);
  }

  /**
   * Notify metrics listeners
   */
  private notifyMetricsListeners(metrics: WorkflowMetrics): void {
    for (const listener of this.metricsListeners) {
      try {
        listener(metrics);
      } catch (error) {
        console.error('Metrics listener error:', error);
      }
    }
  }

  /**
   * Notify alert listeners
   */
  private notifyAlertListeners(alert: Alert): void {
    for (const listener of this.alertListeners) {
      try {
        listener(alert);
      } catch (error) {
        console.error('Alert listener error:', error);
      }
    }
  }

  // ========================================
  // Utility Methods
  // ========================================

  /**
   * Calculate average using exact arithmetic
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = CT_FINANCIAL_SUM(values);
    return sum.divide(values.length).toFloat();
  }

  /**
   * Calculate median
   */
  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 
      ? sorted[mid] 
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Calculate percentile
   */
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
  }

  /**
   * Determine SLA status
   */
  private determineSlaStatus(duration: number, success: boolean): 'met' | 'warning' | 'breached' {
    if (!success) return 'breached';
    if (duration < 10000) return 'met';
    if (duration < 30000) return 'warning';
    return 'breached';
  }

  /**
   * Estimate size of object
   */
  private estimateSize(obj: unknown): number {
    if (obj === null || obj === undefined) return 0;
    if (typeof obj === 'string') return obj.length;
    if (typeof obj === 'number') return 8;
    if (typeof obj === 'boolean') return 4;
    if (Array.isArray(obj)) {
      return obj.reduce((sum, item) => sum + this.estimateSize(item), 0);
    }
    if (typeof obj === 'object') {
      return Object.entries(obj).reduce(
        (sum, [key, value]) => sum + key.length + this.estimateSize(value),
        0
      );
    }
    return 0;
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(steps: StepResult[]): number {
    return steps.reduce((sum, step) => sum + this.estimateSize(step.result) / (1024 * 1024), 0);
  }

  /**
   * Estimate network I/O
   */
  private estimateNetworkIO(steps: StepResult[]): number {
    return steps.reduce((sum, step) => {
      const size = this.estimateSize(step.result);
      return sum + size * 2; // Assume request + response
    }, 0);
  }

  /**
   * Estimate parallelism
   */
  private estimateParallelism(steps: StepResult[]): number {
    // Count steps that could run in parallel based on dependencies
    // This is a simplification - actual parallelism depends on DAG
    const totalDuration = steps.reduce((sum, s) => sum + s.duration, 0);
    const maxDuration = Math.max(...steps.map(s => s.duration));
    return totalDuration > 0 ? totalDuration / maxDuration : 1;
  }

  /**
   * Calculate SLA compliance
   */
  private calculateSlaCompliance(metrics: WorkflowMetrics[]): number {
    if (metrics.length === 0) return 1;
    
    const compliant = metrics.filter(m => 
      m.steps.every(s => s.slaStatus !== 'breached')
    ).length;
    
    return compliant / metrics.length;
  }

  /**
   * Calculate resource efficiency
   */
  private calculateResourceEfficiency(metrics: WorkflowMetrics[]): number {
    if (metrics.length === 0) return 1;
    
    const totalEfficiency = metrics.reduce((sum, m) => 
      sum + m.resources.parallelismEfficiency, 0
    );
    
    return totalEfficiency / metrics.length;
  }

  /**
   * Prune old metrics
   */
  private pruneOldMetrics(): void {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.config.retentionDays);

    for (const [id, metrics] of this.metrics) {
      if (new Date(metrics.startedAt) < cutoff) {
        this.metrics.delete(id);
      }
    }
  }

  /**
   * Get metrics for execution
   */
  getMetrics(executionId: string): WorkflowMetrics | undefined {
    return this.metrics.get(executionId);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): WorkflowMetrics[] {
    return [...this.metrics.values()];
  }
}

// ============================================
// Performance Analyzer
// ============================================

/**
 * Performance analysis utilities
 */
export class PerformanceAnalyzer {
  /**
   * Analyze workflow performance trends
   */
  static analyzeTrends(metrics: WorkflowMetrics[]): {
    durationTrend: 'improving' | 'stable' | 'degrading';
    errorTrend: 'improving' | 'stable' | 'degrading';
    performanceTrend: 'improving' | 'stable' | 'degrading';
    recommendations: string[];
  } {
    if (metrics.length < 2) {
      return {
        durationTrend: 'stable',
        errorTrend: 'stable',
        performanceTrend: 'stable',
        recommendations: ['Collect more data for trend analysis']
      };
    }

    const durations = metrics.map(m => m.duration);
    const errors = metrics.map(m => m.errors.totalErrors);
    const scores = metrics.map(m => m.performanceScore);

    const durationTrend = this.calculateTrend(durations);
    const errorTrend = this.calculateTrend(errors);
    const performanceTrend = this.calculateTrend(scores);

    const recommendations: string[] = [];

    if (durationTrend === 'degrading') {
      recommendations.push('Consider optimizing slow steps or increasing parallelism');
    }

    if (errorTrend === 'degrading') {
      recommendations.push('Investigate increasing error rates - may indicate service degradation');
    }

    if (performanceTrend === 'degrading') {
      recommendations.push('Overall performance declining - review recent changes');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance is stable - continue monitoring');
    }

    return {
      durationTrend: durationTrend === 'increasing' ? 'degrading' : durationTrend === 'decreasing' ? 'improving' : 'stable',
      errorTrend: errorTrend === 'increasing' ? 'degrading' : errorTrend === 'decreasing' ? 'improving' : 'stable',
      performanceTrend: performanceTrend === 'increasing' ? 'improving' : performanceTrend === 'decreasing' ? 'degrading' : 'stable',
      recommendations
    };
  }

  /**
   * Calculate trend direction
   */
  private static calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 2) return 'stable';

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const change = (secondAvg - firstAvg) / firstAvg;

    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  /**
   * Identify bottlenecks
   */
  static identifyBottlenecks(metrics: WorkflowMetrics[]): {
    stepId: string;
    avgDuration: number;
    impact: 'high' | 'medium' | 'low';
    suggestion: string;
  }[] {
    const stepDurations = new Map<string, number[]>();

    for (const m of metrics) {
      for (const step of m.steps) {
        if (!stepDurations.has(step.stepId)) {
          stepDurations.set(step.stepId, []);
        }
        stepDurations.get(step.stepId)!.push(step.duration);
      }
    }

    const bottlenecks: Array<{
      stepId: string;
      avgDuration: number;
      impact: 'high' | 'medium' | 'low';
      suggestion: string;
    }> = [];

    for (const [stepId, durations] of stepDurations) {
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      
      let impact: 'high' | 'medium' | 'low' = 'low';
      let suggestion = '';

      if (avgDuration > 30000) {
        impact = 'high';
        suggestion = 'Consider caching, parallelization, or async processing';
      } else if (avgDuration > 10000) {
        impact = 'medium';
        suggestion = 'Review step implementation for optimization opportunities';
      }

      if (impact !== 'low') {
        bottlenecks.push({ stepId, avgDuration, impact, suggestion });
      }
    }

    return bottlenecks.sort((a, b) => b.avgDuration - a.avgDuration);
  }
}

// ============================================
// Factory Functions
// ============================================

/**
 * Create metrics collector
 */
export function createMetricsCollector(config?: Partial<MetricsConfig>): MetricsCollector {
  return new MetricsCollector(config);
}

// ============================================
// Exports
// ============================================

export default {
  MetricsCollector,
  PerformanceAnalyzer,
  createMetricsCollector
};
