/**
 * Workflow Scheduler
 * 
 * Advanced workflow scheduling system with:
 * - Priority queue for workflow execution
 * - Resource management and allocation
 * - Cron-based and event-based scheduling
 * - Concurrency limits and throttling
 * - Execution history and audit trail
 * 
 * @module engine/scheduler
 * @version 1.0.0
 */

import type { Workflow, WorkflowResult } from '../types/workflow';
import { WorkflowExecutor, type ExecutorConfig, type ExecutionState } from './executor';
import { hiddenDimensions } from '../workflow/arithmetic';

// ============================================
// Types
// ============================================

/**
 * Scheduled workflow definition
 */
export interface ScheduledWorkflow {
  /** Unique schedule ID */
  id: string;
  /** Workflow definition */
  workflow: Workflow;
  /** Schedule configuration */
  schedule: ScheduleConfig;
  /** Priority (higher = more urgent) */
  priority: number;
  /** Resource requirements */
  resources: ResourceRequirements;
  /** Input template (can include expressions) */
  inputTemplate?: Record<string, unknown>;
  /** Enabled flag */
  enabled: boolean;
  /** Tags for categorization */
  tags: string[];
  /** Created timestamp */
  createdAt: string;
  /** Last modified timestamp */
  updatedAt: string;
  /** Metadata */
  metadata: Record<string, unknown>;
}

/**
 * Schedule configuration
 */
export type ScheduleConfig = 
  | CronSchedule
  | IntervalSchedule
  | EventSchedule
  | OneTimeSchedule;

/**
 * Cron-based schedule
 */
export interface CronSchedule {
  type: 'cron';
  /** Cron expression (e.g., "0 9 * * 1-5" = weekdays at 9 AM) */
  expression: string;
  /** Timezone (default: UTC) */
  timezone?: string;
  /** Start date */
  startDate?: string;
  /** End date */
  endDate?: string;
}

/**
 * Interval-based schedule
 */
export interface IntervalSchedule {
  type: 'interval';
  /** Interval in milliseconds */
  intervalMs: number;
  /** Align to start of interval (e.g., hour boundary) */
  align?: 'minute' | 'hour' | 'day';
  /** Start date */
  startDate?: string;
  /** End date */
  endDate?: string;
}

/**
 * Event-based schedule
 */
export interface EventSchedule {
  type: 'event';
  /** Event type to trigger on */
  eventType: string;
  /** Event filter (JSONPath or simple pattern) */
  filter?: Record<string, unknown>;
  /** Debounce interval (ms) */
  debounce?: number;
  /** Throttle interval (ms) */
  throttle?: number;
}

/**
 * One-time schedule
 */
export interface OneTimeSchedule {
  type: 'once';
  /** Scheduled execution time */
  scheduledAt: string;
}

/**
 * Resource requirements
 */
export interface ResourceRequirements {
  /** CPU units (1 = 1 core) */
  cpu?: number;
  /** Memory in MB */
  memory?: number;
  /** Maximum parallel steps */
  maxParallelism?: number;
  /** Estimated duration (ms) */
  estimatedDuration?: number;
  /** Required connectors */
  connectors?: string[];
  /** Required secrets */
  secrets?: string[];
}

/**
 * Scheduler configuration
 */
export interface SchedulerConfig {
  /** Maximum concurrent executions */
  maxConcurrency: number;
  /** Maximum queue size */
  maxQueueSize: number;
  /** Default priority for unscheduled workflows */
  defaultPriority: number;
  /** Execution timeout (ms) */
  executionTimeout: number;
  /** Retry failed schedules */
  retryFailedSchedules: boolean;
  /** Maximum retries for failed schedules */
  maxScheduleRetries: number;
  /** Persist execution history */
  persistHistory: boolean;
  /** History retention days */
  historyRetentionDays: number;
  /** Enable metrics collection */
  enableMetrics: boolean;
  /** Resource limits */
  resourceLimits: ResourceLimits;
}

/**
 * Resource limits
 */
export interface ResourceLimits {
  /** Maximum total CPU */
  maxCpu: number;
  /** Maximum total memory (MB) */
  maxMemory: number;
  /** Maximum concurrent executions per workflow */
  maxPerWorkflow: number;
}

/**
 * Execution queue item
 */
export interface QueueItem {
  /** Queue item ID */
  id: string;
  /** Scheduled workflow reference */
  scheduleId: string;
  /** Workflow to execute */
  workflow: Workflow;
  /** Input data */
  input: Record<string, unknown>;
  /** Priority */
  priority: number;
  /** Resource requirements */
  resources: ResourceRequirements;
  /** Queued timestamp */
  queuedAt: string;
  /** Scheduled execution time */
  scheduledAt?: string;
  /** Retry count */
  retryCount: number;
  /** Status */
  status: 'pending' | 'running' | 'completed' | 'failed';
}

/**
 * Execution history entry
 */
export interface ExecutionHistoryEntry {
  /** Execution ID */
  executionId: string;
  /** Schedule ID */
  scheduleId: string;
  /** Workflow name */
  workflowName: string;
  /** Input */
  input: Record<string, unknown>;
  /** Result */
  result?: WorkflowResult;
  /** Status */
  status: 'completed' | 'failed' | 'cancelled' | 'timeout';
  /** Started timestamp */
  startedAt: string;
  /** Completed timestamp */
  completedAt?: string;
  /** Duration (ms) */
  duration?: number;
  /** Error if failed */
  error?: string;
  /** Resources used */
  resourcesUsed?: ResourceRequirements;
}

/**
 * Scheduler metrics
 */
export interface SchedulerMetrics {
  /** Total scheduled workflows */
  totalScheduled: number;
  /** Currently running executions */
  runningExecutions: number;
  /** Queue size */
  queueSize: number;
  /** Total completed today */
  completedToday: number;
  /** Total failed today */
  failedToday: number;
  /** Average execution time (ms) */
  averageExecutionTime: number;
  /** Resource utilization */
  resourceUtilization: {
    cpu: number;
    memory: number;
  };
  /** Last execution timestamp */
  lastExecution?: string;
}

// ============================================
// Priority Queue Implementation
// ============================================

/**
 * Priority queue for workflow execution
 */
class PriorityQueue<T extends { priority: number }> {
  private items: T[] = [];

  /**
   * Add item to queue
   */
  enqueue(item: T): void {
    // Find insertion point (sorted by priority descending)
    let inserted = false;
    for (let i = 0; i < this.items.length; i++) {
      if (item.priority > this.items[i].priority) {
        this.items.splice(i, 0, item);
        inserted = true;
        break;
      }
    }
    
    if (!inserted) {
      this.items.push(item);
    }
  }

  /**
   * Remove and return highest priority item
   */
  dequeue(): T | undefined {
    return this.items.shift();
  }

  /**
   * Peek at highest priority item
   */
  peek(): T | undefined {
    return this.items[0];
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.items.length;
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.items.length === 0;
  }

  /**
   * Remove item by ID
   */
  remove(id: string): T | undefined {
    const index = this.items.findIndex(item => (item as unknown as { id: string }).id === id);
    if (index !== -1) {
      return this.items.splice(index, 1)[0];
    }
    return undefined;
  }

  /**
   * Get all items
   */
  getAll(): T[] {
    return [...this.items];
  }
}

// ============================================
// Workflow Scheduler Class
// ============================================

/**
 * Main workflow scheduler
 */
export class WorkflowScheduler {
  private config: SchedulerConfig;
  private schedules: Map<string, ScheduledWorkflow> = new Map();
  private queue: PriorityQueue<QueueItem> = new PriorityQueue();
  private runningExecutions: Map<string, { executor: WorkflowExecutor; item: QueueItem }> = new Map();
  private history: ExecutionHistoryEntry[] = [];
  private executor: WorkflowExecutor;
  private timerHandles: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private cronEvaluator: CronEvaluator;
  private metrics: SchedulerMetrics;
  private isRunning: boolean = false;

  constructor(config: Partial<SchedulerConfig> = {}) {
    this.config = {
      maxConcurrency: 10,
      maxQueueSize: 1000,
      defaultPriority: 5,
      executionTimeout: 86400000, // 24 hours
      retryFailedSchedules: true,
      maxScheduleRetries: 3,
      persistHistory: true,
      historyRetentionDays: 30,
      enableMetrics: true,
      resourceLimits: {
        maxCpu: 8,
        maxMemory: 16384,
        maxPerWorkflow: 5
      },
      ...config
    };

    this.executor = new WorkflowExecutor({
      maxParallelism: this.config.resourceLimits.maxPerWorkflow,
      maxWorkflowDuration: this.config.executionTimeout
    });

    this.cronEvaluator = new CronEvaluator();
    this.metrics = this.initializeMetrics();
  }

  // ========================================
  // Schedule Management
  // ========================================

  /**
   * Schedule a workflow
   */
  scheduleWorkflow(
    workflow: Workflow,
    schedule: ScheduleConfig,
    options: Partial<ScheduledWorkflow> = {}
  ): string {
    const id = options.id || this.generateId();
    
    const scheduledWorkflow: ScheduledWorkflow = {
      id,
      workflow,
      schedule,
      priority: options.priority ?? this.config.defaultPriority,
      resources: options.resources || {},
      inputTemplate: options.inputTemplate,
      enabled: options.enabled ?? true,
      tags: options.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: options.metadata || {}
    };

    this.schedules.set(id, scheduledWorkflow);

    // Set up schedule trigger
    this.setupScheduleTrigger(scheduledWorkflow);

    this.metrics.totalScheduled = this.schedules.size;

    return id;
  }

  /**
   * Update a scheduled workflow
   */
  updateSchedule(id: string, updates: Partial<ScheduledWorkflow>): boolean {
    const existing = this.schedules.get(id);
    if (!existing) return false;

    const updated: ScheduledWorkflow = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.schedules.set(id, updated);

    // Re-setup trigger if schedule changed
    if (updates.schedule) {
      this.clearScheduleTrigger(id);
      this.setupScheduleTrigger(updated);
    }

    return true;
  }

  /**
   * Cancel a scheduled workflow
   */
  cancelSchedule(id: string): boolean {
    const schedule = this.schedules.get(id);
    if (!schedule) return false;

    this.clearScheduleTrigger(id);
    this.schedules.delete(id);

    // Remove from queue if pending
    this.queue.remove(id);

    this.metrics.totalScheduled = this.schedules.size;

    return true;
  }

  /**
   * Get a scheduled workflow
   */
  getSchedule(id: string): ScheduledWorkflow | undefined {
    return this.schedules.get(id);
  }

  /**
   * List all scheduled workflows
   */
  listSchedules(): ScheduledWorkflow[] {
    return [...this.schedules.values()];
  }

  /**
   * List schedules by tag
   */
  listByTag(tag: string): ScheduledWorkflow[] {
    return [...this.schedules.values()].filter(s => s.tags.includes(tag));
  }

  // ========================================
  // Execution Management
  // ========================================

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    // Start processing queue
    this.processQueue();

    // Set up interval for cron evaluation
    this.setupCronEvaluation();
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    this.isRunning = false;

    // Clear all timers
    for (const handle of this.timerHandles.values()) {
      clearTimeout(handle);
    }
    this.timerHandles.clear();

    // Cancel running executions
    for (const [id, { executor }] of this.runningExecutions) {
      executor.abort();
    }
  }

  /**
   * Trigger immediate execution
   */
  async executeNow(
    scheduleId: string,
    input?: Record<string, unknown>,
    priority?: number
  ): Promise<string> {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }

    const queueItem: QueueItem = {
      id: this.generateId(),
      scheduleId,
      workflow: schedule.workflow,
      input: input || this.buildInput(schedule),
      priority: priority ?? schedule.priority,
      resources: schedule.resources,
      queuedAt: new Date().toISOString(),
      retryCount: 0,
      status: 'pending'
    };

    this.queue.enqueue(queueItem);
    this.metrics.queueSize = this.queue.size();

    // Try to process immediately
    if (this.isRunning) {
      this.processQueue();
    }

    return queueItem.id;
  }

  /**
   * Get execution status
   */
  getExecutionStatus(executionId: string): QueueItem | undefined {
    // Check running executions
    const running = this.runningExecutions.get(executionId);
    if (running) {
      return { ...running.item, status: 'running' };
    }

    // Check history
    const historyEntry = this.history.find(h => h.executionId === executionId);
    if (historyEntry) {
      return {
        id: executionId,
        scheduleId: historyEntry.scheduleId,
        workflow: { name: historyEntry.workflowName, version: '1.0.0', steps: [] },
        input: historyEntry.input,
        priority: 0,
        resources: {},
        queuedAt: historyEntry.startedAt,
        retryCount: 0,
        status: historyEntry.status === 'completed' ? 'completed' : 'failed'
      };
    }

    return undefined;
  }

  /**
   * Cancel a running execution
   */
  cancelExecution(executionId: string): boolean {
    const running = this.runningExecutions.get(executionId);
    if (running) {
      running.executor.abort();
      return true;
    }

    // Check queue
    const queueItem = this.queue.remove(executionId);
    if (queueItem) {
      this.metrics.queueSize = this.queue.size();
      return true;
    }

    return false;
  }

  // ========================================
  // Queue Processing
  // ========================================

  /**
   * Process the execution queue
   */
  private async processQueue(): Promise<void> {
    if (!this.isRunning) return;

    // Check concurrency limit
    if (this.runningExecutions.size >= this.config.maxConcurrency) {
      return;
    }

    // Check resource availability
    const availableResources = this.calculateAvailableResources();

    // Get next executable item
    const items = this.queue.getAll();
    for (const item of items) {
      if (this.canAllocateResources(item.resources, availableResources)) {
        const dequeuedItem = this.queue.dequeue();
        if (dequeuedItem) {
          this.executeItem(dequeuedItem);
          this.metrics.queueSize = this.queue.size();
        }
        break;
      }
    }

    // Schedule next processing
    if (!this.queue.isEmpty() && this.isRunning) {
      setTimeout(() => this.processQueue(), 100);
    }
  }

  /**
   * Execute a queued item
   */
  private async executeItem(item: QueueItem): Promise<void> {
    item.status = 'running';
    const startTime = Date.now();

    // Create executor for this execution
    const executorConfig: Partial<ExecutorConfig> = {
      maxParallelism: item.resources.maxParallelism || 10
    };

    const executor = new WorkflowExecutor(executorConfig);
    this.runningExecutions.set(item.id, { executor, item });

    try {
      const result = await executor.execute(item.workflow, item.input, item.id);

      // Record in history
      const historyEntry: ExecutionHistoryEntry = {
        executionId: item.id,
        scheduleId: item.scheduleId,
        workflowName: item.workflow.name,
        input: item.input,
        result,
        status: result.success ? 'completed' : 'failed',
        startedAt: item.queuedAt,
        completedAt: new Date().toISOString(),
        duration: result.duration,
        resourcesUsed: item.resources
      };

      this.addToHistory(historyEntry);

      item.status = result.success ? 'completed' : 'failed';

      // Update metrics
      this.updateMetrics(item, result.duration);

    } catch (error) {
      // Handle execution failure
      const historyEntry: ExecutionHistoryEntry = {
        executionId: item.id,
        scheduleId: item.scheduleId,
        workflowName: item.workflow.name,
        input: item.input,
        status: 'failed',
        startedAt: item.queuedAt,
        completedAt: new Date().toISOString(),
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        resourcesUsed: item.resources
      };

      this.addToHistory(historyEntry);

      // Retry if configured
      if (this.config.retryFailedSchedules && item.retryCount < this.config.maxScheduleRetries) {
        item.retryCount++;
        item.status = 'pending';
        item.priority = Math.max(1, item.priority - 1); // Lower priority on retry
        this.queue.enqueue(item);
      } else {
        item.status = 'failed';
      }

      this.metrics.failedToday++;
    } finally {
      this.runningExecutions.delete(item.id);
    }

    // Continue processing queue
    if (this.isRunning) {
      this.processQueue();
    }
  }

  // ========================================
  // Resource Management
  // ========================================

  /**
   * Calculate available resources
   */
  private calculateAvailableResources(): ResourceLimits {
    let usedCpu = 0;
    let usedMemory = 0;

    for (const { item } of this.runningExecutions.values()) {
      usedCpu += item.resources.cpu || 0;
      usedMemory += item.resources.memory || 0;
    }

    return {
      maxCpu: this.config.resourceLimits.maxCpu - usedCpu,
      maxMemory: this.config.resourceLimits.maxMemory - usedMemory,
      maxPerWorkflow: this.config.resourceLimits.maxPerWorkflow
    };
  }

  /**
   * Check if resources can be allocated
   */
  private canAllocateResources(
    required: ResourceRequirements,
    available: ResourceLimits
  ): boolean {
    if (required.cpu && required.cpu > available.maxCpu) return false;
    if (required.memory && required.memory > available.maxMemory) return false;
    return true;
  }

  // ========================================
  // Schedule Triggers
  // ========================================

  /**
   * Set up trigger for a scheduled workflow
   */
  private setupScheduleTrigger(schedule: ScheduledWorkflow): void {
    switch (schedule.schedule.type) {
      case 'cron':
        this.setupCronTrigger(schedule);
        break;
      case 'interval':
        this.setupIntervalTrigger(schedule);
        break;
      case 'once':
        this.setupOneTimeTrigger(schedule);
        break;
      case 'event':
        // Event triggers are handled externally
        break;
    }
  }

  /**
   * Set up cron-based trigger
   */
  private setupCronTrigger(schedule: ScheduledWorkflow): void {
    const cronSchedule = schedule.schedule as CronSchedule;
    const nextRun = this.cronEvaluator.getNextRun(cronSchedule.expression);
    
    if (nextRun) {
      const delay = nextRun.getTime() - Date.now();
      if (delay > 0) {
        const handle = setTimeout(() => {
          this.triggerSchedule(schedule.id);
        }, delay);
        this.timerHandles.set(schedule.id, handle);
      }
    }
  }

  /**
   * Set up interval-based trigger
   */
  private setupIntervalTrigger(schedule: ScheduledWorkflow): void {
    const intervalSchedule = schedule.schedule as IntervalSchedule;
    
    const handle = setInterval(() => {
      if (schedule.enabled) {
        this.triggerSchedule(schedule.id);
      }
    }, intervalSchedule.intervalMs);

    this.timerHandles.set(schedule.id, handle as unknown as ReturnType<typeof setTimeout>);
  }

  /**
   * Set up one-time trigger
   */
  private setupOneTimeTrigger(schedule: ScheduledWorkflow): void {
    const oneTimeSchedule = schedule.schedule as OneTimeSchedule;
    const scheduledTime = new Date(oneTimeSchedule.scheduledAt).getTime();
    const delay = scheduledTime - Date.now();

    if (delay > 0) {
      const handle = setTimeout(() => {
        this.triggerSchedule(schedule.id);
        // Remove schedule after execution
        this.cancelSchedule(schedule.id);
      }, delay);
      this.timerHandles.set(schedule.id, handle);
    }
  }

  /**
   * Clear a schedule trigger
   */
  private clearScheduleTrigger(id: string): void {
    const handle = this.timerHandles.get(id);
    if (handle) {
      clearTimeout(handle);
      this.timerHandles.delete(id);
    }
  }

  /**
   * Trigger a scheduled workflow
   */
  private triggerSchedule(scheduleId: string): void {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule || !schedule.enabled) return;

    const queueItem: QueueItem = {
      id: this.generateId(),
      scheduleId,
      workflow: schedule.workflow,
      input: this.buildInput(schedule),
      priority: schedule.priority,
      resources: schedule.resources,
      queuedAt: new Date().toISOString(),
      retryCount: 0,
      status: 'pending'
    };

    this.queue.enqueue(queueItem);
    this.metrics.queueSize = this.queue.size();

    // Set up next run for cron schedules
    if (schedule.schedule.type === 'cron') {
      this.clearScheduleTrigger(scheduleId);
      this.setupCronTrigger(schedule);
    }

    // Process queue
    if (this.isRunning) {
      this.processQueue();
    }
  }

  /**
   * Set up cron evaluation interval
   */
  private setupCronEvaluation(): void {
    // Evaluate crons every minute
    const handle = setInterval(() => {
      for (const schedule of this.schedules.values()) {
        if (schedule.schedule.type === 'cron' && schedule.enabled) {
          const nextRun = this.cronEvaluator.getNextRun(
            (schedule.schedule as CronSchedule).expression
          );
          
          if (nextRun && nextRun.getTime() <= Date.now() + 60000) {
            // Trigger if within the next minute
            this.triggerSchedule(schedule.id);
          }
        }
      }
    }, 60000);

    this.timerHandles.set('__cron_eval__', handle as unknown as ReturnType<typeof setTimeout>);
  }

  // ========================================
  // Event Handling
  // ========================================

  /**
   * Handle incoming event
   */
  handleEvent(eventType: string, eventData: Record<string, unknown>): void {
    for (const schedule of this.schedules.values()) {
      if (schedule.schedule.type === 'event') {
        const eventSchedule = schedule.schedule as EventSchedule;
        
        if (eventSchedule.eventType === eventType) {
          // Check filter if present
          if (eventSchedule.filter && !this.matchesFilter(eventData, eventSchedule.filter)) {
            continue;
          }

          // Check throttle
          if (eventSchedule.throttle) {
            // Implementation would track last trigger time
            continue;
          }

          this.triggerSchedule(schedule.id);
        }
      }
    }
  }

  /**
   * Check if event data matches filter
   */
  private matchesFilter(data: Record<string, unknown>, filter: Record<string, unknown>): boolean {
    for (const [key, value] of Object.entries(filter)) {
      if (data[key] !== value) return false;
    }
    return true;
  }

  // ========================================
  // History & Metrics
  // ========================================

  /**
   * Add entry to execution history
   */
  private addToHistory(entry: ExecutionHistoryEntry): void {
    if (!this.config.persistHistory) return;

    this.history.push(entry);

    // Prune old entries
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - this.config.historyRetentionDays);
    
    this.history = this.history.filter(e => 
      new Date(e.startedAt) >= retentionDate
    );
  }

  /**
   * Get execution history
   */
  getHistory(options: {
    scheduleId?: string;
    status?: 'completed' | 'failed' | 'cancelled' | 'timeout';
    limit?: number;
  } = {}): ExecutionHistoryEntry[] {
    let entries = [...this.history];

    if (options.scheduleId) {
      entries = entries.filter(e => e.scheduleId === options.scheduleId);
    }

    if (options.status) {
      entries = entries.filter(e => e.status === options.status);
    }

    if (options.limit) {
      entries = entries.slice(-options.limit);
    }

    return entries;
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): SchedulerMetrics {
    return {
      totalScheduled: 0,
      runningExecutions: 0,
      queueSize: 0,
      completedToday: 0,
      failedToday: 0,
      averageExecutionTime: 0,
      resourceUtilization: {
        cpu: 0,
        memory: 0
      }
    };
  }

  /**
   * Update metrics after execution
   */
  private updateMetrics(item: QueueItem, duration: number): void {
    this.metrics.runningExecutions = this.runningExecutions.size;
    this.metrics.lastExecution = new Date().toISOString();

    if (item.status === 'completed') {
      this.metrics.completedToday++;
    } else {
      this.metrics.failedToday++;
    }

    // Update average execution time
    const history = this.getHistory({ limit: 100 });
    const totalTime = history.reduce((sum, e) => sum + (e.duration || 0), 0);
    this.metrics.averageExecutionTime = totalTime / history.length;

    // Update resource utilization
    const available = this.calculateAvailableResources();
    this.metrics.resourceUtilization = {
      cpu: 1 - (available.maxCpu / this.config.resourceLimits.maxCpu),
      memory: 1 - (available.maxMemory / this.config.resourceLimits.maxMemory)
    };
  }

  /**
   * Get current metrics
   */
  getMetrics(): SchedulerMetrics {
    return { ...this.metrics };
  }

  // ========================================
  // Utility Methods
  // ========================================

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Build input from template
   */
  private buildInput(schedule: ScheduledWorkflow): Record<string, unknown> {
    if (!schedule.inputTemplate) return {};

    // Deep clone and resolve expressions
    return JSON.parse(JSON.stringify(schedule.inputTemplate));
  }
}

// ============================================
// Cron Evaluator
// ============================================

/**
 * Simple cron expression evaluator
 */
class CronEvaluator {
  /**
   * Get next run time from cron expression
   */
  getNextRun(expression: string, fromDate: Date = new Date()): Date | null {
    const parts = expression.split(' ');
    if (parts.length !== 5) return null;

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

    // Simple implementation - check every minute for next match
    let current = new Date(fromDate);
    current.setSeconds(0);
    current.setMilliseconds(0);
    current.setMinutes(current.getMinutes() + 1); // Start from next minute

    // Check up to 1 year ahead
    const maxDate = new Date(fromDate);
    maxDate.setFullYear(maxDate.getFullYear() + 1);

    while (current < maxDate) {
      if (this.matchesCron(current, minute, hour, dayOfMonth, month, dayOfWeek)) {
        return current;
      }
      current.setMinutes(current.getMinutes() + 1);
    }

    return null;
  }

  /**
   * Check if date matches cron expression
   */
  private matchesCron(
    date: Date,
    minute: string,
    hour: string,
    dayOfMonth: string,
    month: string,
    dayOfWeek: string
  ): boolean {
    return (
      this.matchesField(date.getMinutes(), minute, 0, 59) &&
      this.matchesField(date.getHours(), hour, 0, 23) &&
      this.matchesField(date.getDate(), dayOfMonth, 1, 31) &&
      this.matchesField(date.getMonth() + 1, month, 1, 12) &&
      this.matchesField(date.getDay(), dayOfWeek, 0, 6)
    );
  }

  /**
   * Check if value matches cron field
   */
  private matchesField(value: number, field: string, min: number, max: number): boolean {
    if (field === '*') return true;

    // Handle ranges (e.g., "1-5")
    if (field.includes('-')) {
      const [start, end] = field.split('-').map(Number);
      return value >= start && value <= end;
    }

    // Handle lists (e.g., "1,3,5")
    if (field.includes(',')) {
      return field.split(',').map(Number).includes(value);
    }

    // Handle steps (e.g., "*/5")
    if (field.startsWith('*/')) {
      const step = parseInt(field.slice(2));
      return value % step === 0;
    }

    // Simple value
    return parseInt(field) === value;
  }
}

// ============================================
// Factory Functions
// ============================================

/**
 * Create a workflow scheduler
 */
export function createScheduler(config?: Partial<SchedulerConfig>): WorkflowScheduler {
  return new WorkflowScheduler(config);
}

/**
 * Quick schedule a workflow
 */
export function scheduleWorkflow(
  workflow: Workflow,
  schedule: ScheduleConfig,
  options?: Partial<ScheduledWorkflow>
): { scheduler: WorkflowScheduler; scheduleId: string } {
  const scheduler = new WorkflowScheduler();
  const scheduleId = scheduler.scheduleWorkflow(workflow, schedule, options);
  return { scheduler, scheduleId };
}

// ============================================
// Exports
// ============================================

export default {
  WorkflowScheduler,
  createScheduler,
  scheduleWorkflow
};
