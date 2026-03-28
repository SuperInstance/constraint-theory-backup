/**
 * Workflow Execution Engine
 * 
 * Core execution engine for DAG-based workflows with:
 * - Parallel step execution
 * - State management and persistence
 * - Error recovery and retry logic
 * - Constraint checking during execution
 * - Real-time progress tracking
 * 
 * @module engine/executor
 * @version 1.0.0
 */

import type { 
  Workflow, 
  WorkflowStep, 
  WorkflowResult, 
  StepResult,
  WorkflowStatus,
  ExecutionStatus,
  ConstraintStatus
} from '../types/workflow';
import type { 
  Constraint, 
  ConstraintViolation,
  ConstraintValidationResult 
} from '../types/constraints';
import { DAGBuilder, ExecutionPlanner, type WorkflowDAG, type ExecutionPlan, type ExecutionStage } from '../workflow/dag';
import { WorkflowValidator, type ConstraintContext } from '../workflow/validation';
import { ExactNumber, CT_FINANCIAL_SUM, hiddenDimensions } from '../workflow/arithmetic';

// ============================================
// Types
// ============================================

/**
 * Execution context passed to step executors
 */
export interface ExecutionContext {
  /** Workflow execution ID */
  executionId: string;
  /** Workflow input */
  input: Record<string, unknown>;
  /** Step results so far */
  stepResults: Map<string, StepResult>;
  /** Current timestamp */
  timestamp: Date;
  /** Workflow metadata */
  metadata: Record<string, unknown>;
  /** Retry count for current step */
  retryCount: number;
  /** Parent execution ID (for sub-workflows) */
  parentExecutionId?: string;
}

/**
 * Step executor function type
 */
export type StepExecutor = (
  step: WorkflowStep,
  context: ExecutionContext
) => Promise<StepResult>;

/**
 * State change listener
 */
export type StateChangeListener = (
  executionId: string,
  status: ExecutionStatus,
  previousStatus: ExecutionStatus | null
) => void | Promise<void>;

/**
 * Step completion listener
 */
export type StepCompletionListener = (
  executionId: string,
  stepId: string,
  result: StepResult
) => void | Promise<void>;

/**
 * Executor configuration
 */
export interface ExecutorConfig {
  /** Maximum parallel step executions */
  maxParallelism: number;
  /** Default step timeout (ms) */
  defaultTimeout: number;
  /** Maximum retries for failed steps */
  maxRetries: number;
  /** Enable state persistence */
  persistState: boolean;
  /** State persistence interval (ms) */
  persistInterval: number;
  /** Enable constraint checking */
  checkConstraints: boolean;
  /** Maximum total workflow duration (ms) */
  maxWorkflowDuration: number;
  /** Secret provider for credentials */
  secretProvider?: SecretProvider;
}

/**
 * Secret provider interface
 */
export interface SecretProvider {
  getSecret(key: string): Promise<string | undefined>;
  setSecret(key: string, value: string): Promise<void>;
  deleteSecret(key: string): Promise<void>;
}

/**
 * Execution state for persistence
 */
export interface ExecutionState {
  executionId: string;
  workflowName: string;
  workflowVersion: string;
  status: WorkflowStatus;
  input: Record<string, unknown>;
  stepResults: Record<string, StepResult>;
  startedAt: string;
  updatedAt: string;
  currentStage: number;
  constraintStatus: ConstraintStatus[];
  error?: {
    code: string;
    message: string;
    stepId?: string;
  };
}

// ============================================
// Workflow Executor Class
// ============================================

/**
 * Main workflow execution engine
 */
export class WorkflowExecutor {
  private config: ExecutorConfig;
  private dag: WorkflowDAG | null = null;
  private plan: ExecutionPlan | null = null;
  private state: ExecutionState | null = null;
  private stepExecutors: Map<string, StepExecutor> = new Map();
  private stateListeners: StateChangeListener[] = [];
  private stepListeners: StepCompletionListener[] = [];
  private abortController: AbortController | null = null;

  constructor(config: Partial<ExecutorConfig> = {}) {
    this.config = {
      maxParallelism: 10,
      defaultTimeout: 30000,
      maxRetries: 3,
      persistState: true,
      persistInterval: 1000,
      checkConstraints: true,
      maxWorkflowDuration: 86400000, // 24 hours
      ...config
    };

    // Register built-in step executors
    this.registerBuiltInExecutors();
  }

  // ========================================
  // Executor Registration
  // ========================================

  /**
   * Register a custom step executor
   */
  registerExecutor(action: string, executor: StepExecutor): void {
    this.stepExecutors.set(action, executor);
  }

  /**
   * Register built-in executors
   */
  private registerBuiltInExecutors(): void {
    // Compute action - for exact arithmetic operations
    this.registerExecutor('compute', async (step, context) => {
      const startTime = Date.now();
      try {
        const operation = step.input.operation as string;
        const values = step.input.values as (number | ExactNumber)[];
        
        let result: ExactNumber;
        switch (operation) {
          case 'sum':
            result = CT_FINANCIAL_SUM(values);
            break;
          case 'add':
            result = ExactNumber.fromFloat(values[0] as number).add(
              ExactNumber.fromFloat(values[1] as number)
            );
            break;
          default:
            throw new Error(`Unknown compute operation: ${operation}`);
        }

        return {
          id: step.id,
          name: step.name,
          success: true,
          result: result.toFloat(),
          duration: Date.now() - startTime
        };
      } catch (error) {
        return {
          id: step.id,
          name: step.name,
          success: false,
          duration: Date.now() - startTime,
          error: {
            code: 'COMPUTE_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error'
          }
        };
      }
    });

    // Route action - for conditional routing
    this.registerExecutor('route', async (step, context) => {
      const startTime = Date.now();
      const amount = step.input.amount as number;
      
      // Simple routing logic based on thresholds
      let route = 'auto';
      if (amount > 5000) route = 'director';
      else if (amount > 100) route = 'manager';

      return {
        id: step.id,
        name: step.name,
        success: true,
        result: { route },
        duration: Date.now() - startTime
      };
    });

    // Approve action
    this.registerExecutor('approve', async (step, context) => {
      const startTime = Date.now();
      return {
        id: step.id,
        name: step.name,
        success: true,
        result: { approved: true, approvedAt: new Date().toISOString() },
        duration: Date.now() - startTime
      };
    });

    // Wait action - for async workflows
    this.registerExecutor('wait', async (step, context) => {
      const startTime = Date.now();
      const timeout = step.waitFor?.timeout || step.timeout || this.config.defaultTimeout;
      
      // In a real implementation, this would wait for an external event
      // For now, we simulate with a timeout
      return {
        id: step.id,
        name: step.name,
        success: true,
        result: { waited: true, timeout },
        duration: Math.min(Date.now() - startTime, timeout)
      };
    });

    // Validate action
    this.registerExecutor('validate', async (step, context) => {
      const startTime = Date.now();
      const data = step.input.data;
      
      // Basic validation
      const errors: string[] = [];
      if (!data) {
        errors.push('Data is required');
      }

      return {
        id: step.id,
        name: step.name,
        success: errors.length === 0,
        result: { valid: errors.length === 0, errors },
        duration: Date.now() - startTime
      };
    });
  }

  // ========================================
  // Event Listeners
  // ========================================

  /**
   * Add state change listener
   */
  onStateChange(listener: StateChangeListener): void {
    this.stateListeners.push(listener);
  }

  /**
   * Add step completion listener
   */
  onStepComplete(listener: StepCompletionListener): void {
    this.stepListeners.push(listener);
  }

  /**
   * Notify state listeners
   */
  private async notifyStateListeners(
    status: ExecutionStatus,
    previousStatus: ExecutionStatus | null
  ): Promise<void> {
    if (!this.state) return;

    for (const listener of this.stateListeners) {
      try {
        await listener(this.state.executionId, status, previousStatus);
      } catch (error) {
        console.error('State listener error:', error);
      }
    }
  }

  /**
   * Notify step listeners
   */
  private async notifyStepListeners(stepId: string, result: StepResult): Promise<void> {
    if (!this.state) return;

    for (const listener of this.stepListeners) {
      try {
        await listener(this.state.executionId, stepId, result);
      } catch (error) {
        console.error('Step listener error:', error);
      }
    }
  }

  // ========================================
  // Workflow Execution
  // ========================================

  /**
   * Execute a workflow
   */
  async execute(
    workflow: Workflow,
    input: Record<string, unknown>,
    executionId?: string
  ): Promise<WorkflowResult> {
    const startTime = Date.now();
    this.abortController = new AbortController();

    // Initialize execution state
    this.state = this.initializeState(workflow, input, executionId);
    await this.notifyStateListeners(
      this.buildExecutionStatus('running'),
      null
    );

    try {
      // 1. Validate workflow
      const validator = new WorkflowValidator();
      const validationResult = validator.validate(workflow);
      
      if (!validationResult.valid) {
        throw new Error(
          `Workflow validation failed: ${validationResult.structuralErrors.map(e => e.message).join(', ')}`
        );
      }

      // 2. Build DAG and execution plan
      this.dag = DAGBuilder.fromWorkflow(workflow);
      this.plan = ExecutionPlanner.createPlan(this.dag);

      // 3. Execute stages
      for (let stageIndex = 0; stageIndex < this.plan.stages.length; stageIndex++) {
        if (this.abortController.signal.aborted) {
          throw new Error('Execution aborted');
        }

        this.state.currentStage = stageIndex;
        const stage = this.plan.stages[stageIndex];
        
        await this.executeStage(workflow, stage, stageIndex);
      }

      // 4. Build result
      const duration = Date.now() - startTime;
      const result: WorkflowResult = {
        success: true,
        result: this.buildOutput(),
        duration,
        steps: Object.values(this.state.stepResults),
        executionId: this.state.executionId,
        startedAt: this.state.startedAt,
        completedAt: new Date().toISOString()
      };

      this.state.status = 'completed';
      await this.notifyStateListeners(this.buildExecutionStatus('completed'), null);

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.state.status = 'failed';
      this.state.error = {
        code: 'EXECUTION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      };

      await this.notifyStateListeners(this.buildExecutionStatus('failed'), null);

      return {
        success: false,
        duration,
        steps: Object.values(this.state.stepResults),
        error: {
          code: 'EXECUTION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        executionId: this.state.executionId,
        startedAt: this.state.startedAt,
        completedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Initialize execution state
   */
  private initializeState(
    workflow: Workflow,
    input: Record<string, unknown>,
    executionId?: string
  ): ExecutionState {
    return {
      executionId: executionId || this.generateExecutionId(),
      workflowName: workflow.name,
      workflowVersion: workflow.version,
      status: 'pending',
      input,
      stepResults: {},
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentStage: 0,
      constraintStatus: []
    };
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Execute a single stage
   */
  private async executeStage(
    workflow: Workflow,
    stage: ExecutionStage,
    stageIndex: number
  ): Promise<void> {
    // Get steps that can execute in parallel
    const executableSteps = stage.steps.filter(stepId => {
      return this.canExecuteStep(stepId);
    });

    if (executableSteps.length === 0) {
      return;
    }

    // Execute steps in parallel
    const results = await Promise.allSettled(
      executableSteps.map(stepId => this.executeStep(workflow, stepId))
    );

    // Process results
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const stepId = executableSteps[i];

      if (result.status === 'fulfilled') {
        this.state!.stepResults[stepId] = result.value;
        await this.notifyStepListeners(stepId, result.value);
      } else {
        // Handle rejection
        this.state!.stepResults[stepId] = {
          id: stepId,
          success: false,
          duration: 0,
          error: {
            code: 'STEP_FAILED',
            message: result.reason?.message || 'Step execution failed'
          }
        };
      }
    }
  }

  /**
   * Check if a step can execute (all dependencies satisfied)
   */
  private canExecuteStep(stepId: string): boolean {
    if (!this.dag || !this.state) return false;

    const node = this.dag.nodes.get(stepId);
    if (!node) return false;

    // Check all dependencies have completed successfully
    for (const depId of node.dependencies) {
      const depResult = this.state.stepResults[depId];
      if (!depResult || !depResult.success) {
        return false;
      }
    }

    return true;
  }

  /**
   * Execute a single step
   */
  private async executeStep(
    workflow: Workflow,
    stepId: string
  ): Promise<StepResult> {
    const step = workflow.steps.find(s => s.id === stepId);
    if (!step) {
      throw new Error(`Step not found: ${stepId}`);
    }

    const startTime = Date.now();
    let attempts = 0;
    const maxAttempts = (step.retry?.maxAttempts || this.config.maxRetries) + 1;

    while (attempts < maxAttempts) {
      attempts++;

      try {
        // Check condition if present
        if (step.condition && !this.evaluateCondition(step.condition)) {
          return {
            id: stepId,
            name: step.name,
            success: true,
            result: { skipped: true, reason: 'Condition not met' },
            duration: Date.now() - startTime,
            attempts
          };
        }

        // Build execution context
        const context = this.buildExecutionContext(step);

        // Check constraints before execution
        if (this.config.checkConstraints && step.constraints) {
          const constraintResult = await this.checkConstraints(step.constraints, context);
          if (!constraintResult.valid) {
            throw new Error(
              `Constraint violation: ${constraintResult.violations.map(v => v.message).join(', ')}`
            );
          }
        }

        // Execute step
        const timeout = step.timeout || this.config.defaultTimeout;
        const result = await this.executeWithTimeout(step, context, timeout);

        return {
          ...result,
          attempts
        };

      } catch (error) {
        // Check if we should retry
        if (attempts < maxAttempts && this.shouldRetry(error, step)) {
          const delay = this.calculateRetryDelay(attempts, step.retry);
          await this.sleep(delay);
          continue;
        }

        // Handle error
        return {
          id: stepId,
          name: step.name,
          success: false,
          duration: Date.now() - startTime,
          attempts,
          error: {
            code: 'STEP_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error',
            cause: error
          }
        };
      }
    }

    // Should not reach here
    return {
      id: stepId,
      name: step.name,
      success: false,
      duration: Date.now() - startTime,
      attempts,
      error: {
        code: 'MAX_RETRIES',
        message: 'Maximum retries exceeded'
      }
    };
  }

  /**
   * Execute step with timeout
   */
  private async executeWithTimeout(
    step: WorkflowStep,
    context: ExecutionContext,
    timeout: number
  ): Promise<StepResult> {
    const startTime = Date.now();

    return new Promise<StepResult>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Step timed out after ${timeout}ms`));
      }, timeout);

      this.executeStepInternal(step, context)
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Internal step execution logic
   */
  private async executeStepInternal(
    step: WorkflowStep,
    context: ExecutionContext
  ): Promise<StepResult> {
    const startTime = Date.now();

    // Determine executor
    const action = step.action || step.connector || 'unknown';
    const executor = this.stepExecutors.get(action);

    if (!executor) {
      throw new Error(`No executor registered for action: ${action}`);
    }

    // Resolve input expressions
    const resolvedInput = this.resolveInputExpressions(step.input, context);
    const resolvedStep = { ...step, input: resolvedInput };

    // Execute
    return executor(resolvedStep, context);
  }

  /**
   * Build execution context
   */
  private buildExecutionContext(step: WorkflowStep): ExecutionContext {
    return {
      executionId: this.state!.executionId,
      input: this.state!.input,
      stepResults: new Map(Object.entries(this.state!.stepResults)),
      timestamp: new Date(),
      metadata: {},
      retryCount: 0,
      parentExecutionId: undefined
    };
  }

  /**
   * Resolve input expressions (${input.field}, ${steps.stepId.result})
   */
  private resolveInputExpressions(
    input: Record<string, unknown>,
    context: ExecutionContext
  ): Record<string, unknown> {
    const resolved: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(input)) {
      resolved[key] = this.resolveExpression(value, context);
    }

    return resolved;
  }

  /**
   * Resolve a single expression
   */
  private resolveExpression(value: unknown, context: ExecutionContext): unknown {
    if (typeof value === 'string') {
      // Match ${...} expressions
      const expressionMatch = value.match(/^\$\{(.+)\}$/);
      if (expressionMatch) {
        return this.evaluatePath(expressionMatch[1], context);
      }
    }

    if (Array.isArray(value)) {
      return value.map(v => this.resolveExpression(v, context));
    }

    if (typeof value === 'object' && value !== null) {
      const resolved: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        resolved[k] = this.resolveExpression(v, context);
      }
      return resolved;
    }

    return value;
  }

  /**
   * Evaluate a path expression
   */
  private evaluatePath(path: string, context: ExecutionContext): unknown {
    const parts = path.split('.');
    let value: unknown = context;

    for (const part of parts) {
      if (value === null || value === undefined) return undefined;

      if (part === 'input') {
        value = context.input;
      } else if (part === 'steps') {
        // Next part is step ID
        continue;
      } else if (parts[0] === 'steps' && parts[1] === part) {
        // We're at the step ID
        const stepResult = context.stepResults.get(part);
        if (!stepResult) return undefined;
        value = stepResult;
      } else if (part === 'result') {
        value = (value as StepResult).result;
      } else if (typeof value === 'object' && value !== null) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Evaluate condition expression
   */
  private evaluateCondition(condition: string): boolean {
    if (!this.state) return false;

    const context = this.buildExecutionContext({} as WorkflowStep);
    
    // Simple condition evaluation
    // Supports: ${field} === value, ${field} !== value
    const equalityMatch = condition.match(/^\$\{(.+?)\}\s*(===|!==)\s*(.+)$/);
    if (equalityMatch) {
      const [, path, operator, expectedValue] = equalityMatch;
      const actualValue = this.evaluatePath(path, context);
      const expected = expectedValue.trim().replace(/^["']|["']$/g, '');
      
      if (operator === '===') {
        return actualValue === expected;
      } else {
        return actualValue !== expected;
      }
    }

    // Default to true if we can't parse
    return true;
  }

  /**
   * Check constraints
   */
  private async checkConstraints(
    constraints: Constraint[],
    context: ExecutionContext
  ): Promise<ConstraintValidationResult> {
    const violations: ConstraintViolation[] = [];
    const warnings: ConstraintViolation[] = [];
    const startTime = Date.now();

    const validator = new WorkflowValidator();
    const constraintContext: ConstraintContext = {
      input: context.input,
      stepResults: context.stepResults,
      timestamp: context.timestamp,
      executionId: context.executionId
    };

    for (const constraint of constraints) {
      const result = validator.evaluateConstraint(constraint, constraintContext);
      
      if (!result.satisfied) {
        const violation: ConstraintViolation = {
          type: constraint.type,
          message: result.message || `Constraint ${constraint.type} not satisfied`,
          severity: constraint.severity || 'error',
          details: { config: constraint.config, actualValue: result.actualValue }
        };

        if (violation.severity === 'error') {
          violations.push(violation);
        } else {
          warnings.push(violation);
        }
      }
    }

    return {
      valid: violations.length === 0,
      violations,
      warnings,
      duration: Date.now() - startTime
    };
  }

  /**
   * Determine if error should trigger retry
   */
  private shouldRetry(error: unknown, step: WorkflowStep): boolean {
    // Check step retry config
    if (step.retry) {
      // If retryOnErrors is specified, check if error matches
      if (step.retry.retryOnErrors?.length) {
        const errorCode = (error as { code?: string })?.code;
        return step.retry.retryOnErrors.includes(errorCode || '');
      }
      return true;
    }
    return false;
  }

  /**
   * Calculate retry delay with backoff
   */
  private calculateRetryDelay(attempt: number, retryConfig?: { backoff?: string; baseDelayMs?: number }): number {
    const baseDelay = retryConfig?.baseDelayMs || 1000;
    const backoff = retryConfig?.backoff || 'exponential';

    switch (backoff) {
      case 'exponential':
        return Math.min(baseDelay * Math.pow(2, attempt - 1), 30000);
      case 'linear':
        return Math.min(baseDelay * attempt, 30000);
      default:
        return baseDelay;
    }
  }

  /**
   * Build output from step results
   */
  private buildOutput(): Record<string, unknown> {
    if (!this.state) return {};

    const output: Record<string, unknown> = {};
    
    // Collect results from exit nodes
    if (this.dag) {
      for (const exitId of this.dag.exitPoints) {
        const result = this.state.stepResults[exitId];
        if (result?.success && result.result) {
          output[exitId] = result.result;
        }
      }
    }

    return output;
  }

  /**
   * Build execution status
   */
  private buildExecutionStatus(status: WorkflowStatus): ExecutionStatus {
    if (!this.state || !this.dag) {
      return {
        executionId: '',
        workflowName: '',
        status: 'pending',
        completedSteps: [],
        failedSteps: [],
        pendingSteps: [],
        constraints: [],
        progress: 0,
        startedAt: new Date().toISOString()
      };
    }

    const allSteps = [...this.dag.nodes.keys()];
    const completedSteps = Object.keys(this.state.stepResults).filter(
      id => this.state!.stepResults[id].success
    );
    const failedSteps = Object.keys(this.state.stepResults).filter(
      id => !this.state!.stepResults[id].success
    );
    const pendingSteps = allSteps.filter(
      id => !this.state!.stepResults[id]
    );

    return {
      executionId: this.state.executionId,
      workflowName: this.state.workflowName,
      status,
      currentStep: this.getCurrentStep(),
      completedSteps,
      failedSteps,
      pendingSteps,
      constraints: this.state.constraintStatus,
      progress: (completedSteps.length / allSteps.length) * 100,
      startedAt: this.state.startedAt,
      estimatedTimeRemaining: this.estimateTimeRemaining()
    };
  }

  /**
   * Get current step being executed
   */
  private getCurrentStep(): string | undefined {
    if (!this.plan || !this.state) return undefined;
    
    const stage = this.plan.stages[this.state.currentStage];
    return stage?.steps.find(stepId => !this.state!.stepResults[stepId]);
  }

  /**
   * Estimate remaining time
   */
  private estimateTimeRemaining(): number | undefined {
    if (!this.plan || !this.state) return undefined;

    // Calculate average step duration
    const completedDurations = Object.values(this.state.stepResults)
      .filter(r => r.success)
      .map(r => r.duration);
    
    if (completedDurations.length === 0) return undefined;
    
    const avgDuration = completedDurations.reduce((a, b) => a + b, 0) / completedDurations.length;
    
    // Count remaining steps
    const remainingSteps = this.plan.stages
      .slice(this.state.currentStage)
      .reduce((count, stage) => count + stage.steps.length, 0);
    
    return remainingSteps * avgDuration;
  }

  /**
   * Abort execution
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * Pause execution
   */
  async pause(): Promise<void> {
    if (this.state && this.state.status === 'running') {
      this.state.status = 'paused';
      await this.notifyStateListeners(this.buildExecutionStatus('paused'), null);
    }
  }

  /**
   * Resume execution
   */
  async resume(): Promise<void> {
    if (this.state && this.state.status === 'paused') {
      this.state.status = 'running';
      await this.notifyStateListeners(this.buildExecutionStatus('running'), null);
    }
  }

  /**
   * Get current state
   */
  getState(): ExecutionState | null {
    return this.state ? { ...this.state } : null;
  }

  /**
   * Utility: sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================
// Execution Utilities
// ============================================

/**
 * Create a workflow executor with default configuration
 */
export function createExecutor(config?: Partial<ExecutorConfig>): WorkflowExecutor {
  return new WorkflowExecutor(config);
}

/**
 * Execute a workflow with default executor
 */
export async function executeWorkflow(
  workflow: Workflow,
  input: Record<string, unknown>,
  executionId?: string
): Promise<WorkflowResult> {
  const executor = new WorkflowExecutor();
  return executor.execute(workflow, input, executionId);
}

/**
 * Calculate hidden dimensions for ML workflow precision
 * Formula: k = ⌈log₂(1/ε)⌉
 */
export function calculateMLPrecision(epsilon: number): number {
  return hiddenDimensions(epsilon);
}

// ============================================
// Exports
// ============================================

export default {
  WorkflowExecutor,
  createExecutor,
  executeWorkflow,
  calculateMLPrecision
};
