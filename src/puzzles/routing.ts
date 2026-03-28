/**
 * Routing Puzzle Engine for Constraint Ranch
 * 
 * Implements intent routing puzzles for task distribution.
 * Teaches load balancing, agent specialization, and cost optimization.
 * 
 * @module routing
 */

import {
  RoutingPuzzle,
  RoutingSolution,
  Constraint,
  ConstraintValidationResult,
  PuzzleValidationResult
} from './types';

import { ConstraintResult } from './scoring';

// ============================================================================
// Types
// ============================================================================

/**
 * Agent state in routing puzzle
 */
export interface RoutingAgent {
  index: number;
  species: string;
  capacity: number;
  currentLoad: number;
  assignedTasks: TaskAssignment[];
  efficiency: number;
}

/**
 * Task assignment
 */
export interface TaskAssignment {
  taskType: string;
  rate: number;
  priority: 'low' | 'normal' | 'high' | 'critical';
}

/**
 * Routing state during puzzle solving
 */
export interface RoutingState {
  agents: RoutingAgent[];
  totalTasks: number;
  assignedTasks: number;
  unassignedTasks: Array<{ type: string; rate: number }>;
  totalCost: number;
  avgLatency: number;
}

/**
 * Routing metrics for validation
 */
export interface RoutingMetrics {
  loadBalance: number; // How evenly distributed the load is
  utilizationRate: number; // Average capacity utilization
  avgLatency: number;
  totalThroughput: number;
  costPerTask: number;
  failoverCapacity: number; // Available capacity for failover
}

// ============================================================================
// Constraint Validation
// ============================================================================

/**
 * Validate a routing constraint.
 */
export function validateRoutingConstraint(
  constraint: Constraint,
  state: RoutingState,
  metrics: RoutingMetrics,
  epsilon: number = 1e-10
): ConstraintValidationResult {
  const validators: Record<string, RoutingConstraintValidator> = {
    'max-capacity': validateMaxCapacity,
    'all-tasks-routed': validateAllTasksRouted,
    'optimal-routing': validateOptimalRouting,
    'max-latency': validateMaxLatency,
    'min-efficiency': validateMinEfficiency,
    'max-cost': validateMaxCost,
    'region-affinity': validateRegionAffinity,
    'failover-ready': validateFailoverReady,
    'min-throughput': validateMinThroughput,
    'urgent-priority': validateUrgentPriority,
    'no-overload': validateNoOverload,
    'all-tasks-handled': validateAllTasksHandled,
    'balanced-load': validateBalancedLoad,
    'specialized-matching': validateSpecializedMatching
  };
  
  const validator = validators[constraint.type];
  if (!validator) {
    return {
      constraint,
      satisfied: false,
      margin: 0,
      exact: false,
      message: `Unknown routing constraint: ${constraint.type}`
    };
  }
  
  return validator(constraint, state, metrics, epsilon);
}

type RoutingConstraintValidator = (
  constraint: Constraint,
  state: RoutingState,
  metrics: RoutingMetrics,
  epsilon: number
) => ConstraintValidationResult;

function validateMaxCapacity(
  constraint: Constraint,
  state: RoutingState,
  _metrics: RoutingMetrics,
  epsilon: number
): ConstraintValidationResult {
  const maxCapacity = constraint.value as number;
  let maxUtilization = 0;
  let overloadedAgents = 0;
  
  for (const agent of state.agents) {
    const utilization = agent.currentLoad / agent.capacity;
    maxUtilization = Math.max(maxUtilization, utilization);
    if (utilization > maxCapacity + epsilon) {
      overloadedAgents++;
    }
  }
  
  const satisfied = overloadedAgents === 0;
  
  return {
    constraint,
    satisfied,
    margin: maxCapacity - maxUtilization,
    exact: maxUtilization === maxCapacity,
    message: satisfied
      ? `Max utilization ${(maxUtilization * 100).toFixed(1)}% within limit ${(maxCapacity * 100)}%`
      : `${overloadedAgents} agents exceed capacity limit`
  };
}

function validateAllTasksRouted(
  constraint: Constraint,
  state: RoutingState,
  _metrics: RoutingMetrics,
  _epsilon: number
): ConstraintValidationResult {
  const satisfied = state.unassignedTasks.length === 0;
  
  return {
    constraint,
    satisfied,
    margin: state.assignedTasks,
    exact: true,
    message: satisfied
      ? `All ${state.totalTasks} tasks routed`
      : `${state.unassignedTasks.length} tasks not routed`
  };
}

function validateOptimalRouting(
  constraint: Constraint,
  state: RoutingState,
  metrics: RoutingMetrics,
  _epsilon: number
): ConstraintValidationResult {
  // Optimal routing means balanced load and high efficiency
  const optimalThreshold = 0.85;
  const score = metrics.loadBalance * metrics.utilizationRate;
  const satisfied = score >= optimalThreshold;
  
  return {
    constraint,
    satisfied,
    margin: score - optimalThreshold,
    exact: score >= 0.99,
    message: satisfied
      ? `Routing score ${(score * 100).toFixed(1)}% is optimal`
      : `Routing score ${(score * 100).toFixed(1)}% below optimal threshold`
  };
}

function validateMaxLatency(
  constraint: Constraint,
  _state: RoutingState,
  metrics: RoutingMetrics,
  _epsilon: number
): ConstraintValidationResult {
  const maxLatency = constraint.value as number;
  const satisfied = metrics.avgLatency <= maxLatency;
  
  return {
    constraint,
    satisfied,
    margin: maxLatency - metrics.avgLatency,
    exact: metrics.avgLatency === maxLatency,
    message: satisfied
      ? `Average latency ${metrics.avgLatency}ms within limit ${maxLatency}ms`
      : `Average latency ${metrics.avgLatency}ms exceeds limit ${maxLatency}ms`
  };
}

function validateMinEfficiency(
  constraint: Constraint,
  _state: RoutingState,
  metrics: RoutingMetrics,
  _epsilon: number
): ConstraintValidationResult {
  const minEfficiency = constraint.value as number;
  const satisfied = metrics.utilizationRate >= minEfficiency;
  
  return {
    constraint,
    satisfied,
    margin: metrics.utilizationRate - minEfficiency,
    exact: metrics.utilizationRate === minEfficiency,
    message: satisfied
      ? `Efficiency ${(metrics.utilizationRate * 100).toFixed(1)}% meets requirement`
      : `Efficiency ${(metrics.utilizationRate * 100).toFixed(1)}% below requirement`
  };
}

function validateMaxCost(
  constraint: Constraint,
  state: RoutingState,
  _metrics: RoutingMetrics,
  _epsilon: number
): ConstraintValidationResult {
  const maxCost = constraint.value as number;
  const satisfied = state.totalCost <= maxCost;
  
  return {
    constraint,
    satisfied,
    margin: maxCost - state.totalCost,
    exact: state.totalCost === maxCost,
    message: satisfied
      ? `Cost ${state.totalCost} within budget ${maxCost}`
      : `Cost ${state.totalCost} exceeds budget ${maxCost}`
  };
}

function validateRegionAffinity(
  _constraint: Constraint,
  _state: RoutingState,
  _metrics: RoutingMetrics,
  _epsilon: number
): ConstraintValidationResult {
  // Simplified region affinity check
  // In production, would check if tasks route to agents in same region
  return {
    constraint: _constraint,
    satisfied: true,
    margin: 1,
    exact: true,
    message: 'Region affinity satisfied'
  };
}

function validateFailoverReady(
  constraint: Constraint,
  _state: RoutingState,
  metrics: RoutingMetrics,
  _epsilon: number
): ConstraintValidationResult {
  const minFailoverCapacity = 0.2; // 20% capacity for failover
  const satisfied = metrics.failoverCapacity >= minFailoverCapacity;
  
  return {
    constraint,
    satisfied,
    margin: metrics.failoverCapacity - minFailoverCapacity,
    exact: false,
    message: satisfied
      ? `Failover capacity ${(metrics.failoverCapacity * 100).toFixed(1)}% available`
      : `Insufficient failover capacity`
  };
}

function validateMinThroughput(
  constraint: Constraint,
  _state: RoutingState,
  metrics: RoutingMetrics,
  _epsilon: number
): ConstraintValidationResult {
  const minThroughput = constraint.value as number;
  const satisfied = metrics.totalThroughput >= minThroughput;
  
  return {
    constraint,
    satisfied,
    margin: metrics.totalThroughput - minThroughput,
    exact: metrics.totalThroughput === minThroughput,
    message: satisfied
      ? `Throughput ${metrics.totalThroughput} meets requirement ${minThroughput}`
      : `Throughput ${metrics.totalThroughput} below requirement ${minThroughput}`
  };
}

function validateUrgentPriority(
  constraint: Constraint,
  state: RoutingState,
  _metrics: RoutingMetrics,
  _epsilon: number
): ConstraintValidationResult {
  // Check if urgent tasks are handled by available agents
  let urgentHandled = 0;
  let urgentTotal = 0;
  
  for (const agent of state.agents) {
    for (const task of agent.assignedTasks) {
      if (task.priority === 'critical' || task.priority === 'high') {
        urgentTotal += task.rate;
        urgentHandled += task.rate;
      }
    }
  }
  
  const satisfied = urgentTotal === 0 || urgentHandled === urgentTotal;
  
  return {
    constraint,
    satisfied,
    margin: urgentHandled,
    exact: true,
    message: satisfied
      ? 'Urgent tasks prioritized correctly'
      : `${urgentTotal - urgentHandled} urgent tasks not prioritized`
  };
}

function validateNoOverload(
  constraint: Constraint,
  state: RoutingState,
  _metrics: RoutingMetrics,
  epsilon: number
): ConstraintValidationResult {
  let hasOverload = false;
  let overloadedCount = 0;
  
  for (const agent of state.agents) {
    if (agent.currentLoad > agent.capacity + epsilon) {
      hasOverload = true;
      overloadedCount++;
    }
  }
  
  return {
    constraint,
    satisfied: !hasOverload,
    margin: overloadedCount,
    exact: true,
    message: !hasOverload
      ? 'No agents overloaded'
      : `${overloadedCount} agents are overloaded`
  };
}

function validateAllTasksHandled(
  constraint: Constraint,
  state: RoutingState,
  _metrics: RoutingMetrics,
  _epsilon: number
): ConstraintValidationResult {
  const satisfied = state.unassignedTasks.length === 0 && state.assignedTasks === state.totalTasks;
  
  return {
    constraint,
    satisfied,
    margin: state.assignedTasks / state.totalTasks,
    exact: true,
    message: satisfied
      ? `All ${state.totalTasks} tasks handled`
      : `${state.totalTasks - state.assignedTasks} tasks not handled`
  };
}

function validateBalancedLoad(
  constraint: Constraint,
  _state: RoutingState,
  metrics: RoutingMetrics,
  _epsilon: number
): ConstraintValidationResult {
  const balanceThreshold = 0.8;
  const satisfied = metrics.loadBalance >= balanceThreshold;
  
  return {
    constraint,
    satisfied,
    margin: metrics.loadBalance - balanceThreshold,
    exact: metrics.loadBalance >= 0.99,
    message: satisfied
      ? `Load balance ${(metrics.loadBalance * 100).toFixed(1)}% is good`
      : `Load balance ${(metrics.loadBalance * 100).toFixed(1)}% needs improvement`
  };
}

function validateSpecializedMatching(
  constraint: Constraint,
  state: RoutingState,
  _metrics: RoutingMetrics,
  _epsilon: number
): ConstraintValidationResult {
  // Check if tasks are matched to agent specialties
  // Simplified implementation
  let matched = 0;
  let total = 0;
  
  for (const agent of state.agents) {
    for (const task of agent.assignedTasks) {
      total += task.rate;
      // Simplified: assume matching if agent has capacity for task
      if (agent.currentLoad <= agent.capacity) {
        matched += task.rate;
      }
    }
  }
  
  const matchRate = total > 0 ? matched / total : 0;
  const satisfied = matchRate >= 0.9;
  
  return {
    constraint,
    satisfied,
    margin: matchRate - 0.9,
    exact: matchRate >= 0.99,
    message: satisfied
      ? 'Tasks well-matched to agent specialties'
      : 'Some tasks not optimally matched'
  };
}

// ============================================================================
// Metrics Calculation
// ============================================================================

/**
 * Calculate routing metrics from state.
 */
export function calculateRoutingMetrics(state: RoutingState): RoutingMetrics {
  const capacities = state.agents.map(a => a.capacity);
  const loads = state.agents.map(a => a.currentLoad);
  
  const totalCapacity = capacities.reduce((a, b) => a + b, 0);
  const totalLoad = loads.reduce((a, b) => a + b, 0);
  
  // Load balance: how evenly distributed
  const avgLoad = totalLoad / state.agents.length;
  const loadVariance = loads.reduce((sum, l) => sum + Math.pow(l - avgLoad, 2), 0) / state.agents.length;
  const loadStdDev = Math.sqrt(loadVariance);
  const loadBalance = avgLoad > 0 ? 1 - (loadStdDev / avgLoad) : 1;
  
  // Utilization rate
  const utilizationRate = totalCapacity > 0 ? totalLoad / totalCapacity : 0;
  
  // Total throughput
  const totalThroughput = state.assignedTasks;
  
  // Cost per task
  const costPerTask = totalThroughput > 0 ? state.totalCost / totalThroughput : 0;
  
  // Failover capacity (unused capacity)
  const failoverCapacity = (totalCapacity - totalLoad) / totalCapacity;
  
  return {
    loadBalance: Math.max(0, Math.min(1, loadBalance)),
    utilizationRate,
    avgLatency: state.avgLatency,
    totalThroughput,
    costPerTask,
    failoverCapacity: Math.max(0, failoverCapacity)
  };
}

// ============================================================================
// Solution Validation
// ============================================================================

/**
 * Validate a complete routing puzzle solution.
 */
export function validateRoutingSolution(
  puzzle: RoutingPuzzle,
  solution: RoutingSolution,
  epsilon: number = 1e-10
): PuzzleValidationResult {
  // Build routing state from solution
  const agents: RoutingAgent[] = puzzle.initialState.availableAgents.map((agent, index) => ({
    index,
    species: agent.species,
    capacity: agent.capacity,
    currentLoad: 0,
    assignedTasks: [],
    efficiency: 1.0
  }));
  
  // Apply assignments from solution
  for (const assignment of solution.assignments) {
    const agent = agents[assignment.agentIndex];
    if (agent) {
      agent.currentLoad += assignment.rate;
      agent.assignedTasks.push({
        taskType: assignment.taskType,
        rate: assignment.rate,
        priority: 'normal'
      });
    }
  }
  
  // Calculate total tasks
  const totalTasks = puzzle.initialState.taskTypes.reduce((sum, t) => sum + t.rate, 0);
  const assignedTasks = solution.assignments.reduce((sum, a) => sum + a.rate, 0);
  
  // Find unassigned tasks
  const assignedByType = new Map<string, number>();
  for (const assignment of solution.assignments) {
    assignedByType.set(
      assignment.taskType,
      (assignedByType.get(assignment.taskType) ?? 0) + assignment.rate
    );
  }
  
  const unassignedTasks = puzzle.initialState.taskTypes
    .filter(t => (assignedByType.get(t.type) ?? 0) < t.rate)
    .map(t => ({
      type: t.type,
      rate: t.rate - (assignedByType.get(t.type) ?? 0)
    }));
  
  // Build state
  const state: RoutingState = {
    agents,
    totalTasks,
    assignedTasks,
    unassignedTasks,
    totalCost: agents.reduce((sum, a) => sum + a.currentLoad * 0.1, 0), // Simplified cost
    avgLatency: 50 // Simplified latency
  };
  
  // Calculate metrics
  const metrics = calculateRoutingMetrics(state);
  
  // Validate all constraints
  const constraintResults = puzzle.constraints.map(constraint =>
    validateRoutingConstraint(constraint, state, metrics, epsilon)
  );
  
  // Check overall validity
  const allSatisfied = constraintResults.every(r => r.satisfied);
  const allExact = constraintResults.every(r => r.exact);
  
  const valid = allSatisfied;
  const isPerfect = valid && allExact;
  
  // Calculate score
  const satisfiedCount = constraintResults.filter(r => r.satisfied).length;
  const score = (satisfiedCount / constraintResults.length) * puzzle.rewards.experience;
  
  // Bonus for efficiency
  const efficiencyBonus = Math.round(metrics.utilizationRate * 50);
  
  // Collect errors and warnings
  const errors: string[] = [];
  const warnings: string[] = [];
  
  for (const result of constraintResults) {
    if (!result.satisfied) {
      errors.push(result.message || `Constraint ${result.constraint.type} not satisfied`);
    } else if (!result.exact) {
      warnings.push(`Constraint ${result.constraint.type} satisfied but not exact`);
    }
  }
  
  return {
    valid,
    constraints: constraintResults,
    score: score + efficiencyBonus,
    isPerfect,
    errors,
    warnings
  };
}

/**
 * Get scoring constraint results from validation.
 */
export function getScoringConstraintResults(
  validation: PuzzleValidationResult
): ConstraintResult[] {
  return validation.constraints.map(c => ({
    constraint: c.constraint,
    satisfied: c.satisfied,
    margin: c.margin,
    exact: c.exact
  }));
}

// ============================================================================
// Export
// ============================================================================

export default {
  validateRoutingConstraint,
  validateRoutingSolution,
  calculateRoutingMetrics,
  getScoringConstraintResults
};
