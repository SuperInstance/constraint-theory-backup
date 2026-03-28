/**
 * Coordination Puzzle Engine for Constraint Ranch
 * 
 * Implements multi-agent coordination puzzles.
 * Teaches distributed systems, consensus, and synchronization.
 * 
 * @module coordination
 */

import {
  CoordinationPuzzle,
  CoordinationSolution,
  Constraint,
  ConstraintValidationResult,
  PuzzleValidationResult,
  Position
} from './types';

import { ConstraintResult } from './scoring';

import {
  HiddenDimensionPosition,
  encodeWithHiddenDimensions,
  fromExactRational,
  exactDistance
} from './hidden-dimensions';

// ============================================================================
// Types
// ============================================================================

/**
 * Agent in coordination puzzle
 */
export interface CoordAgent {
  id: string;
  species: string;
  position: HiddenDimensionPosition;
  originalPosition: Position;
  role: 'leader' | 'follower' | 'sync';
  tasks: TaskAssignment[];
  syncOffset: number; // Time offset for synchronization
}

/**
 * Task in coordination puzzle
 */
export interface TaskAssignment {
  id: string;
  requiredAgents: number;
  location: Position;
  assignedAgents: string[];
  startTime: number;
  endTime: number;
  status: 'pending' | 'in-progress' | 'complete';
}

/**
 * Coordination state
 */
export interface CoordinationState {
  agents: CoordAgent[];
  tasks: TaskAssignment[];
  time: number;
  syncTolerance: number;
  leaderId: string | null;
  consensusReached: boolean;
  collisions: Array<{ agents: [string, string]; time: number }>;
}

/**
 * Coordination metrics
 */
export interface CoordinationMetrics {
  avgSyncDelay: number;
  maxSyncDelay: number;
  leaderReachability: number;
  taskCompletionRate: number;
  collisionCount: number;
  efficiency: number;
  quorumLevel: number;
}

// ============================================================================
// Constraint Validation
// ============================================================================

/**
 * Validate a coordination constraint.
 */
export function validateCoordinationConstraint(
  constraint: Constraint,
  state: CoordinationState,
  metrics: CoordinationMetrics,
  epsilon: number = 1e-10
): ConstraintValidationResult {
  const validators: Record<string, CoordinationConstraintValidator> = {
    'all-tasks-complete': validateAllTasksComplete,
    'max-time': validateMaxTime,
    'min-efficiency': validateMinEfficiencyCoord,
    'no-collision': validateNoCollision,
    'sync-required': validateSyncRequired,
    'leader-designated': validateLeaderDesignated,
    'quorum-reached': validateQuorumReached,
    'log-replicated': validateLogReplicated,
    'no-resource-conflict': validateNoResourceConflict,
    'agents-coordinated': validateAgentsCoordinated,
    'consensus-reached': validateConsensusReached,
    'all-nodes-synced': validateAllNodesSynced,
    'sync-achieved': validateSyncAchieved,
    'majority-agreement': validateMajorityAgreement
  };
  
  const validator = validators[constraint.type];
  if (!validator) {
    return {
      constraint,
      satisfied: false,
      margin: 0,
      exact: false,
      message: `Unknown coordination constraint: ${constraint.type}`
    };
  }
  
  return validator(constraint, state, metrics, epsilon);
}

type CoordinationConstraintValidator = (
  constraint: Constraint,
  state: CoordinationState,
  metrics: CoordinationMetrics,
  epsilon: number
) => ConstraintValidationResult;

function validateAllTasksComplete(
  constraint: Constraint,
  state: CoordinationState,
  _metrics: CoordinationMetrics,
  _epsilon: number
): ConstraintValidationResult {
  const completedTasks = state.tasks.filter(t => t.status === 'complete').length;
  const totalTasks = state.tasks.length;
  const satisfied = completedTasks === totalTasks;
  
  return {
    constraint,
    satisfied,
    margin: completedTasks,
    exact: true,
    message: satisfied
      ? `All ${totalTasks} tasks complete`
      : `${totalTasks - completedTasks} tasks incomplete`
  };
}

function validateMaxTime(
  constraint: Constraint,
  state: CoordinationState,
  _metrics: CoordinationMetrics,
  _epsilon: number
): ConstraintValidationResult {
  const maxTime = constraint.value as number;
  const satisfied = state.time <= maxTime;
  
  return {
    constraint,
    satisfied,
    margin: maxTime - state.time,
    exact: state.time === maxTime,
    message: satisfied
      ? `Time ${state.time}s within limit ${maxTime}s`
      : `Time ${state.time}s exceeds limit ${maxTime}s`
  };
}

function validateMinEfficiencyCoord(
  constraint: Constraint,
  _state: CoordinationState,
  metrics: CoordinationMetrics,
  _epsilon: number
): ConstraintValidationResult {
  const minEfficiency = constraint.value as number;
  const satisfied = metrics.efficiency >= minEfficiency;
  
  return {
    constraint,
    satisfied,
    margin: metrics.efficiency - minEfficiency,
    exact: metrics.efficiency >= 0.99,
    message: satisfied
      ? `Efficiency ${(metrics.efficiency * 100).toFixed(1)}% meets requirement`
      : `Efficiency ${(metrics.efficiency * 100).toFixed(1)}% below requirement`
  };
}

function validateNoCollision(
  constraint: Constraint,
  state: CoordinationState,
  _metrics: CoordinationMetrics,
  _epsilon: number
): ConstraintValidationResult {
  const satisfied = state.collisions.length === 0;
  
  return {
    constraint,
    satisfied,
    margin: -state.collisions.length,
    exact: true,
    message: satisfied
      ? 'No collisions detected'
      : `${state.collisions.length} collisions detected`
  };
}

function validateSyncRequired(
  constraint: Constraint,
  state: CoordinationState,
  metrics: CoordinationMetrics,
  epsilon: number
): ConstraintValidationResult {
  const maxSyncDelay = state.syncTolerance;
  const satisfied = metrics.maxSyncDelay <= maxSyncDelay + epsilon;
  
  return {
    constraint,
    satisfied,
    margin: maxSyncDelay - metrics.maxSyncDelay,
    exact: metrics.maxSyncDelay === 0,
    message: satisfied
      ? `Sync delay ${metrics.maxSyncDelay}ms within tolerance ${maxSyncDelay}ms`
      : `Sync delay ${metrics.maxSyncDelay}ms exceeds tolerance ${maxSyncDelay}ms`
  };
}

function validateLeaderDesignated(
  constraint: Constraint,
  state: CoordinationState,
  _metrics: CoordinationMetrics,
  _epsilon: number
): ConstraintValidationResult {
  const hasLeader = state.leaderId !== null;
  const leaderCount = state.agents.filter(a => a.role === 'leader').length;
  const exactlyOne = hasLeader && leaderCount === 1;
  
  return {
    constraint,
    satisfied: exactlyOne,
    margin: leaderCount === 1 ? 1 : 0,
    exact: true,
    message: exactlyOne
      ? `Leader designated: ${state.leaderId}`
      : leaderCount === 0
        ? 'No leader designated'
        : `${leaderCount} leaders (should be 1)`
  };
}

function validateQuorumReached(
  constraint: Constraint,
  _state: CoordinationState,
  metrics: CoordinationMetrics,
  _epsilon: number
): ConstraintValidationResult {
  const requiredQuorum = constraint.value as number;
  const satisfied = metrics.quorumLevel >= requiredQuorum;
  
  return {
    constraint,
    satisfied,
    margin: metrics.quorumLevel - requiredQuorum,
    exact: metrics.quorumLevel === state.agents.length,
    message: satisfied
      ? `Quorum ${metrics.quorumLevel} meets requirement ${requiredQuorum}`
      : `Quorum ${metrics.quorumLevel} below requirement ${requiredQuorum}`
  };
}

function validateLogReplicated(
  constraint: Constraint,
  _state: CoordinationState,
  metrics: CoordinationMetrics,
  _epsilon: number
): ConstraintValidationResult {
  const majority = Math.ceil(_state.agents.length / 2);
  const satisfied = metrics.quorumLevel >= majority;
  
  return {
    constraint,
    satisfied,
    margin: metrics.quorumLevel - majority,
    exact: metrics.quorumLevel === _state.agents.length,
    message: satisfied
      ? 'Log replicated to majority of nodes'
      : 'Log not fully replicated'
  };
}

function validateNoResourceConflict(
  constraint: Constraint,
  state: CoordinationState,
  _metrics: CoordinationMetrics,
  _epsilon: number
): ConstraintValidationResult {
  // Check for concurrent access to same resource/task
  const conflicts: string[] = [];
  
  for (let t = 0; t < state.time; t++) {
    const activeTasks = state.tasks.filter(
      task => task.startTime <= t && task.endTime > t
    );
    
    for (const task of activeTasks) {
      const agentsOnTask = task.assignedAgents;
      // Check if agents are in the same location at same time
      // (simplified - in production would check actual positions)
      if (agentsOnTask.length > task.requiredAgents) {
        conflicts.push(task.id);
      }
    }
  }
  
  const satisfied = conflicts.length === 0;
  
  return {
    constraint,
    satisfied,
    margin: -conflicts.length,
    exact: true,
    message: satisfied
      ? 'No resource conflicts'
      : `${conflicts.length} resource conflicts detected`
  };
}

function validateAgentsCoordinated(
  _constraint: Constraint,
  state: CoordinationState,
  _metrics: CoordinationMetrics,
  _epsilon: number
): ConstraintValidationResult {
  // Check if agents are properly coordinated
  const allHaveTasks = state.agents.every(a => a.tasks.length > 0);
  const allTasksAssigned = state.tasks.every(t => t.assignedAgents.length >= t.requiredAgents);
  
  const satisfied = allHaveTasks && allTasksAssigned;
  
  return {
    constraint,
    satisfied,
    margin: allTasksAssigned ? 1 : 0,
    exact: true,
    message: satisfied
      ? 'All agents properly coordinated'
      : 'Coordination incomplete'
  };
}

function validateConsensusReached(
  _constraint: Constraint,
  state: CoordinationState,
  _metrics: CoordinationMetrics,
  _epsilon: number
): ConstraintValidationResult {
  return {
    constraint: _constraint,
    satisfied: state.consensusReached,
    margin: state.consensusReached ? 1 : 0,
    exact: true,
    message: state.consensusReached
      ? 'Consensus reached'
      : 'Consensus not reached'
  };
}

function validateAllNodesSynced(
  _constraint: Constraint,
  _state: CoordinationState,
  metrics: CoordinationMetrics,
  _epsilon: number
): ConstraintValidationResult {
  const allSynced = metrics.avgSyncDelay === 0;
  
  return {
    constraint: _constraint,
    satisfied: allSynced,
    margin: -metrics.avgSyncDelay,
    exact: true,
    message: allSynced
      ? 'All nodes synchronized'
      : `Avg sync delay: ${metrics.avgSyncDelay}ms`
  };
}

function validateSyncAchieved(
  _constraint: Constraint,
  state: CoordinationState,
  _metrics: CoordinationMetrics,
  _epsilon: number
): ConstraintValidationResult {
  const allSynced = state.agents.every(a => a.syncOffset === 0);
  
  return {
    constraint: _constraint,
    satisfied: allSynced,
    margin: allSynced ? 1 : 0,
    exact: true,
    message: allSynced
      ? 'Synchronization achieved'
      : 'Synchronization not achieved'
  };
}

function validateMajorityAgreement(
  constraint: Constraint,
  _state: CoordinationState,
  metrics: CoordinationMetrics,
  _epsilon: number
): ConstraintValidationResult {
  const required = constraint.value as number;
  const satisfied = metrics.quorumLevel >= required;
  
  return {
    constraint,
    satisfied,
    margin: metrics.quorumLevel - required,
    exact: metrics.quorumLevel === _state.agents.length,
    message: satisfied
      ? `Majority agreement: ${metrics.quorumLevel} nodes`
      : `Majority not reached: ${metrics.quorumLevel}/${required} needed`
  };
}

// ============================================================================
// Metrics Calculation
// ============================================================================

/**
 * Calculate coordination metrics from state.
 */
export function calculateCoordinationMetrics(state: CoordinationState): CoordinationMetrics {
  // Sync delays
  const syncDelays = state.agents.map(a => Math.abs(a.syncOffset));
  const avgSyncDelay = syncDelays.reduce((a, b) => a + b, 0) / syncDelays.length;
  const maxSyncDelay = Math.max(...syncDelays);
  
  // Leader reachability (how many agents can reach the leader)
  let leaderReachability = 1;
  if (state.leaderId) {
    const leader = state.agents.find(a => a.id === state.leaderId);
    if (leader) {
      const reachable = state.agents.filter(a => {
        const dist = Math.sqrt(
          Math.pow(fromExactRational(a.position.visible.x) - fromExactRational(leader.position.visible.x), 2) +
          Math.pow(fromExactRational(a.position.visible.y) - fromExactRational(leader.position.visible.y), 2)
        );
        return dist <= 100; // Max communication range
      }).length;
      leaderReachability = reachable / state.agents.length;
    }
  }
  
  // Task completion rate
  const completedTasks = state.tasks.filter(t => t.status === 'complete').length;
  const taskCompletionRate = state.tasks.length > 0 ? completedTasks / state.tasks.length : 0;
  
  // Efficiency
  const efficiency = (taskCompletionRate + leaderReachability) / 2;
  
  // Quorum level
  const quorumLevel = state.agents.filter(a => a.role !== 'sync').length;
  
  return {
    avgSyncDelay,
    maxSyncDelay,
    leaderReachability,
    taskCompletionRate,
    collisionCount: state.collisions.length,
    efficiency,
    quorumLevel
  };
}

// ============================================================================
// Solution Validation
// ============================================================================

/**
 * Validate a complete coordination puzzle solution.
 */
export function validateCoordinationSolution(
  puzzle: CoordinationPuzzle,
  solution: CoordinationSolution,
  epsilon: number = 1e-10
): PuzzleValidationResult {
  // Build coordination state from solution
  const agents: CoordAgent[] = puzzle.initialState.agents.map(agent => ({
    id: agent.id,
    species: agent.species,
    position: encodeWithHiddenDimensions(agent.position.x, agent.position.y, epsilon),
    originalPosition: agent.position,
    role: 'follower' as const,
    tasks: [],
    syncOffset: 0
  }));
  
  // Apply schedules from solution
  const tasks: TaskAssignment[] = puzzle.initialState.tasks.map(task => ({
    id: task.id,
    requiredAgents: task.requiredAgents,
    location: task.location,
    assignedAgents: [],
    startTime: 0,
    endTime: 0,
    status: 'pending' as const
  }));
  
  let maxTime = 0;
  
  for (const schedule of solution.schedules) {
    const agent = agents.find(a => a.id === schedule.agentId);
    if (!agent) continue;
    
    for (const assignment of schedule.taskAssignments) {
      const task = tasks.find(t => t.id === assignment.taskId);
      if (!task) continue;
      
      agent.tasks.push({
        id: task.id,
        requiredAgents: task.requiredAgents,
        location: task.location,
        assignedAgents: [agent.id],
        startTime: assignment.startTime,
        endTime: assignment.endTime,
        status: 'complete'
      });
      
      task.assignedAgents.push(agent.id);
      task.startTime = Math.min(task.startTime || assignment.startTime, assignment.startTime);
      task.endTime = Math.max(task.endTime || assignment.endTime, assignment.endTime);
      task.status = task.assignedAgents.length >= task.requiredAgents ? 'complete' : 'in-progress';
      
      maxTime = Math.max(maxTime, assignment.endTime);
    }
  }
  
  // Detect collisions
  const collisions: Array<{ agents: [string, string]; time: number }> = [];
  for (let i = 0; i < agents.length; i++) {
    for (let j = i + 1; j < agents.length; j++) {
      const a1 = agents[i];
      const a2 = agents[j];
      
      // Check if agents are at same location at same time
      for (const t1 of a1.tasks) {
        for (const t2 of a2.tasks) {
          if (t1.startTime === t2.startTime && 
              t1.location.x === t2.location.x && 
              t1.location.y === t2.location.y) {
            collisions.push({
              agents: [a1.id, a2.id],
              time: t1.startTime
            });
          }
        }
      }
    }
  }
  
  // Determine leader
  const leaderId = agents.find(a => a.role === 'leader')?.id ?? null;
  
  const state: CoordinationState = {
    agents,
    tasks,
    time: maxTime,
    syncTolerance: 0,
    leaderId,
    consensusReached: tasks.every(t => t.status === 'complete'),
    collisions
  };
  
  // Calculate metrics
  const metrics = calculateCoordinationMetrics(state);
  
  // Validate all constraints
  const constraintResults = puzzle.constraints.map(constraint =>
    validateCoordinationConstraint(constraint, state, metrics, epsilon)
  );
  
  // Check overall validity
  const allSatisfied = constraintResults.every(r => r.satisfied);
  const allExact = constraintResults.every(r => r.exact);
  
  const valid = allSatisfied;
  const isPerfect = valid && allExact && collisions.length === 0;
  
  // Calculate score
  const satisfiedCount = constraintResults.filter(r => r.satisfied).length;
  const score = (satisfiedCount / constraintResults.length) * puzzle.rewards.experience;
  
  // Bonus for no collisions
  const collisionBonus = collisions.length === 0 ? 50 : 0;
  
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
    score: score + collisionBonus,
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
  validateCoordinationConstraint,
  validateCoordinationSolution,
  calculateCoordinationMetrics,
  getScoringConstraintResults
};
