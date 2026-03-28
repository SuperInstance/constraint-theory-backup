/**
 * Advanced Puzzle Engine for Constraint Ranch
 * 
 * Implements complex puzzles combining multiple mechanics with hidden dimensions.
 * Teaches system design, optimization, and the Grand Unified Constraint Theory.
 * 
 * @module advanced
 */

import {
  AdvancedPuzzle,
  Constraint,
  ConstraintValidationResult,
  PuzzleValidationResult,
  ConstraintPuzzle
} from './types';

import { ConstraintResult, SolutionMetrics } from './scoring';

import {
  HiddenDimensionPosition,
  ExactRational,
  calculateHiddenDimensions,
  encodeWithHiddenDimensions,
  fromExactRational,
  verifyHolonomy,
  defaultLattice
} from './hidden-dimensions';

// ============================================================================
// Types
// ============================================================================

/**
 * Advanced puzzle state
 */
export interface AdvancedPuzzleState {
  subPuzzleResults: Map<string, PuzzleValidationResult>;
  resources: Map<string, number>;
  agents: AdvancedAgent[];
  time: number;
  hiddenDimensionUsage: number;
  holonomyConsistent: boolean;
}

/**
 * Agent in advanced puzzle
 */
export interface AdvancedAgent {
  id: string;
  species: string;
  position: HiddenDimensionPosition;
  traits: Map<string, number>;
  status: 'idle' | 'working' | 'training' | 'breeding';
}

/**
 * Advanced puzzle metrics
 */
export interface AdvancedMetrics {
  subPuzzleCompletionRate: number;
  resourceEfficiency: number;
  hiddenDimensionPrecision: number;
  holonomyScore: number;
  overallEfficiency: number;
}

// ============================================================================
// Hidden Dimension Concepts
// ============================================================================

/**
 * Calculate the hidden dimension precision for a set of constraints.
 * 
 * From GUCT: k = ⌈log₂(1/ε)⌉
 * The hidden dimensions encode the precision needed for exact constraint satisfaction.
 */
export function calculateHiddenDimensionPrecision(
  constraints: Constraint[]
): number {
  // Find the tightest tolerance among constraints
  let minTolerance = 0.001; // Default 0.1%
  
  for (const constraint of constraints) {
    if (constraint.tolerance && constraint.tolerance < minTolerance) {
      minTolerance = constraint.tolerance;
    }
    if (typeof constraint.value === 'number' && constraint.value > 0 && constraint.value < 1) {
      // For ratio constraints, the tolerance is inherent in the value
      const impliedTolerance = constraint.value * 0.01;
      minTolerance = Math.min(minTolerance, impliedTolerance);
    }
  }
  
  // Calculate hidden dimensions needed
  const hiddenDims = calculateHiddenDimensions(minTolerance);
  
  return hiddenDims;
}

/**
 * Verify cross-plane consistency using holonomy checking.
 * 
 * In GUCT, a constraint system is consistent iff the holonomy
 * around all cycles is zero.
 */
export function verifyCrossPlaneConsistency(
  positions: HiddenDimensionPosition[]
): { isConsistent: boolean; information: number } {
  const result = verifyHolonomy(positions);
  
  return {
    isConsistent: result.isConsistent,
    information: result.totalInformation
  };
}

/**
 * Encode a solution with hidden dimensions for exact constraint satisfaction.
 */
export function encodeSolutionWithHiddenDimensions(
  positions: Array<{ x: number; y: number }>,
  constraints: Constraint[]
): HiddenDimensionPosition[] {
  const precision = calculateHiddenDimensionPrecision(constraints);
  const epsilon = Math.pow(2, -precision);
  
  return positions.map(pos => 
    encodeWithHiddenDimensions(pos.x, pos.y, epsilon)
  );
}

// ============================================================================
// Constraint Validation
// ============================================================================

/**
 * Validate an advanced constraint.
 */
export function validateAdvancedConstraint(
  constraint: Constraint,
  state: AdvancedPuzzleState,
  metrics: AdvancedMetrics,
  epsilon: number = 1e-10
): ConstraintValidationResult {
  const validators: Record<string, AdvancedConstraintValidator> = {
    'complete-all-subpuzzles': validateCompleteAllSubpuzzles,
    'resource-limit': validateResourceLimit,
    'time-limit': validateTimeLimit,
    'min-score': validateMinScore,
    'perfect-chain': validatePerfectChain,
    'trait-matches-task': validateTraitMatchesTask,
    'min-throughput': validateMinThroughputAdvanced,
    'ecosystem-balance': validateEcosystemBalance,
    'resource-sustainability': validateResourceSustainability,
    'trait-exceeds-genetic-max': validateTraitExceedsGeneticMaxAdvanced,
    'impossible-task': validateImpossibleTask,
    'perfect-coordination': validatePerfectCoordination,
    'master-challenge-complete': validateMasterChallengeComplete,
    'perfect-score': validatePerfectScore,
    'hidden-dimension-consistency': validateHiddenDimensionConsistency
  };
  
  const validator = validators[constraint.type];
  if (!validator) {
    return {
      constraint,
      satisfied: false,
      margin: 0,
      exact: false,
      message: `Unknown advanced constraint: ${constraint.type}`
    };
  }
  
  return validator(constraint, state, metrics, epsilon);
}

type AdvancedConstraintValidator = (
  constraint: Constraint,
  state: AdvancedPuzzleState,
  metrics: AdvancedMetrics,
  epsilon: number
) => ConstraintValidationResult;

function validateCompleteAllSubpuzzles(
  constraint: Constraint,
  state: AdvancedPuzzleState,
  _metrics: AdvancedMetrics,
  _epsilon: number
): ConstraintValidationResult {
  const total = state.subPuzzleResults.size;
  const completed = Array.from(state.subPuzzleResults.values()).filter(r => r.valid).length;
  
  const satisfied = completed === total;
  
  return {
    constraint,
    satisfied,
    margin: completed / total,
    exact: true,
    message: satisfied
      ? `All ${total} sub-puzzles complete`
      : `${completed}/${total} sub-puzzles complete`
  };
}

function validateResourceLimit(
  constraint: Constraint,
  state: AdvancedPuzzleState,
  _metrics: AdvancedMetrics,
  _epsilon: number
): ConstraintValidationResult {
  const resourceType = constraint.unit || 'default';
  const limit = constraint.value as number;
  const used = state.resources.get(resourceType) ?? 0;
  
  const satisfied = used <= limit;
  
  return {
    constraint,
    satisfied,
    margin: limit - used,
    exact: used === limit,
    message: satisfied
      ? `${resourceType} usage ${used} within limit ${limit}`
      : `${resourceType} usage ${used} exceeds limit ${limit}`
  };
}

function validateTimeLimit(
  constraint: Constraint,
  state: AdvancedPuzzleState,
  _metrics: AdvancedMetrics,
  _epsilon: number
): ConstraintValidationResult {
  const limit = constraint.value as number;
  const satisfied = state.time <= limit;
  
  return {
    constraint,
    satisfied,
    margin: limit - state.time,
    exact: state.time === limit,
    message: satisfied
      ? `Time ${state.time}s within limit ${limit}s`
      : `Time ${state.time}s exceeds limit ${limit}s`
  };
}

function validateMinScore(
  constraint: Constraint,
  state: AdvancedPuzzleState,
  _metrics: AdvancedMetrics,
  _epsilon: number
): ConstraintValidationResult {
  const minScore = constraint.value as number;
  const totalScore = Array.from(state.subPuzzleResults.values())
    .reduce((sum, r) => sum + r.score, 0);
  
  const satisfied = totalScore >= minScore;
  
  return {
    constraint,
    satisfied,
    margin: totalScore - minScore,
    exact: totalScore === minScore,
    message: satisfied
      ? `Score ${totalScore} meets minimum ${minScore}`
      : `Score ${totalScore} below minimum ${minScore}`
  };
}

function validatePerfectChain(
  constraint: Constraint,
  state: AdvancedPuzzleState,
  _metrics: AdvancedMetrics,
  _epsilon: number
): ConstraintValidationResult {
  const allPerfect = Array.from(state.subPuzzleResults.values())
    .every(r => r.isPerfect);
  
  return {
    constraint,
    satisfied: allPerfect,
    margin: allPerfect ? 1 : 0,
    exact: true,
    message: allPerfect
      ? 'All sub-puzzles achieved perfect scores'
      : 'Not all sub-puzzles are perfect'
  };
}

function validateTraitMatchesTask(
  constraint: Constraint,
  state: AdvancedPuzzleState,
  _metrics: AdvancedMetrics,
  _epsilon: number
): ConstraintValidationResult {
  // Check if agent traits match their assigned tasks
  let matched = 0;
  let total = 0;
  
  for (const agent of state.agents) {
    if (agent.status === 'working') {
      total++;
      // Simplified matching - in production would check task requirements
      if (agent.traits.size > 0) {
        matched++;
      }
    }
  }
  
  const matchRate = total > 0 ? matched / total : 1;
  const satisfied = matchRate >= 0.9;
  
  return {
    constraint,
    satisfied,
    margin: matchRate,
    exact: matchRate === 1,
    message: satisfied
      ? 'Agent traits well-matched to tasks'
      : 'Some agents have mismatched traits'
  };
}

function validateMinThroughputAdvanced(
  constraint: Constraint,
  _state: AdvancedPuzzleState,
  metrics: AdvancedMetrics,
  _epsilon: number
): ConstraintValidationResult {
  const minThroughput = constraint.value as number;
  const actualThroughput = metrics.overallEfficiency * 100;
  const satisfied = actualThroughput >= minThroughput;
  
  return {
    constraint,
    satisfied,
    margin: actualThroughput - minThroughput,
    exact: actualThroughput === minThroughput,
    message: satisfied
      ? `Throughput ${actualThroughput.toFixed(1)} meets requirement`
      : `Throughput ${actualThroughput.toFixed(1)} below requirement`
  };
}

function validateEcosystemBalance(
  constraint: Constraint,
  state: AdvancedPuzzleState,
  metrics: AdvancedMetrics,
  _epsilon: number
): ConstraintValidationResult {
  // Ecosystem balance requires:
  // 1. All sub-puzzles complete
  // 2. Resource efficiency > 80%
  // 3. Holonomy consistent
  const subPuzzleRate = metrics.subPuzzleCompletionRate;
  const resourceEfficiency = metrics.resourceEfficiency;
  const holonomy = state.holonomyConsistent;
  
  const score = (subPuzzleRate + resourceEfficiency) / 2;
  const satisfied = score >= 0.8 && holonomy;
  
  return {
    constraint,
    satisfied,
    margin: score,
    exact: score >= 0.99 && holonomy,
    message: satisfied
      ? 'Ecosystem is balanced'
      : 'Ecosystem needs adjustment'
  };
}

function validateResourceSustainability(
  constraint: Constraint,
  state: AdvancedPuzzleState,
  _metrics: AdvancedMetrics,
  _epsilon: number
): ConstraintValidationResult {
  // Check if resource usage is sustainable
  let sustainable = true;
  const usage: string[] = [];
  
  for (const [resource, amount] of state.resources) {
    if (amount > 100) { // Arbitrary threshold
      sustainable = false;
      usage.push(`${resource}: ${amount}`);
    }
  }
  
  return {
    constraint,
    satisfied: sustainable,
    margin: sustainable ? 1 : 0,
    exact: true,
    message: sustainable
      ? 'Resource usage is sustainable'
      : `High resource usage: ${usage.join(', ')}`
  };
}

function validateTraitExceedsGeneticMaxAdvanced(
  constraint: Constraint,
  state: AdvancedPuzzleState,
  _metrics: AdvancedMetrics,
  _epsilon: number
): ConstraintValidationResult {
  // Check if any agent has traits that exceed genetic limits (via Night School)
  let exceeded = false;
  const exceededTraits: string[] = [];
  
  for (const agent of state.agents) {
    for (const [trait, value] of agent.traits) {
      // Genetic max is typically 0.9
      if (value > 0.9) {
        exceeded = true;
        exceededTraits.push(`${agent.id}.${trait}: ${value.toFixed(2)}`);
      }
    }
  }
  
  return {
    constraint,
    satisfied: exceeded,
    margin: exceeded ? 1 : 0,
    exact: false,
    message: exceeded
      ? `Traits exceeded: ${exceededTraits.join(', ')}`
      : 'No traits exceed genetic limits'
  };
}

function validateImpossibleTask(
  constraint: Constraint,
  state: AdvancedPuzzleState,
  metrics: AdvancedMetrics,
  _epsilon: number
): ConstraintValidationResult {
  // Impossible tasks require:
  // 1. Trait exceeds genetic max (Night School used)
  // 2. Perfect coordination
  // 3. Hidden dimension consistency
  const hasExceededTraits = state.agents.some(a => 
    Array.from(a.traits.values()).some(v => v > 0.9)
  );
  const isPerfectCoord = metrics.overallEfficiency >= 0.95;
  const isHolonomyConsistent = state.holonomyConsistent;
  
  const satisfied = hasExceededTraits && isPerfectCoord && isHolonomyConsistent;
  
  return {
    constraint,
    satisfied,
    margin: satisfied ? 1 : 0,
    exact: false,
    message: satisfied
      ? 'Impossible task achieved!'
      : 'Task requirements not met'
  };
}

function validatePerfectCoordination(
  constraint: Constraint,
  _state: AdvancedPuzzleState,
  metrics: AdvancedMetrics,
  _epsilon: number
): ConstraintValidationResult {
  const satisfied = metrics.overallEfficiency >= 0.99;
  
  return {
    constraint,
    satisfied,
    margin: metrics.overallEfficiency,
    exact: metrics.overallEfficiency >= 0.999,
    message: satisfied
      ? 'Perfect coordination achieved'
      : 'Coordination needs improvement'
  };
}

function validateMasterChallengeComplete(
  constraint: Constraint,
  state: AdvancedPuzzleState,
  metrics: AdvancedMetrics,
  _epsilon: number
): ConstraintValidationResult {
  // Master challenge requires everything
  const allSubPuzzlesComplete = Array.from(state.subPuzzleResults.values())
    .every(r => r.valid);
  const allPerfect = Array.from(state.subPuzzleResults.values())
    .every(r => r.isPerfect);
  const highEfficiency = metrics.overallEfficiency >= 0.95;
  const holonomyOk = state.holonomyConsistent;
  
  const satisfied = allSubPuzzlesComplete && highEfficiency && holonomyOk;
  const perfect = satisfied && allPerfect;
  
  return {
    constraint,
    satisfied,
    margin: perfect ? 2 : satisfied ? 1 : 0,
    exact: perfect,
    message: perfect
      ? 'Master challenge completed perfectly!'
      : satisfied
        ? 'Master challenge completed'
        : 'Master challenge incomplete'
  };
}

function validatePerfectScore(
  constraint: Constraint,
  state: AdvancedPuzzleState,
  _metrics: AdvancedMetrics,
  _epsilon: number
): ConstraintValidationResult {
  const allPerfect = Array.from(state.subPuzzleResults.values())
    .every(r => r.isPerfect);
  const holonomyOk = state.holonomyConsistent;
  
  const satisfied = allPerfect && holonomyOk;
  
  return {
    constraint,
    satisfied,
    margin: satisfied ? 1 : 0,
    exact: true,
    message: satisfied
      ? 'Perfect score achieved!'
      : 'Score not perfect'
  };
}

function validateHiddenDimensionConsistency(
  constraint: Constraint,
  state: AdvancedPuzzleState,
  _metrics: AdvancedMetrics,
  _epsilon: number
): ConstraintValidationResult {
  const satisfied = state.holonomyConsistent;
  
  return {
    constraint,
    satisfied,
    margin: state.hiddenDimensionUsage,
    exact: state.holonomyConsistent,
    message: satisfied
      ? `Hidden dimensions consistent (${state.hiddenDimensionUsage} dimensions used)`
      : 'Hidden dimension inconsistency detected'
  };
}

// ============================================================================
// Metrics Calculation
// ============================================================================

/**
 * Calculate advanced puzzle metrics.
 */
export function calculateAdvancedMetrics(state: AdvancedPuzzleState): AdvancedMetrics {
  // Sub-puzzle completion rate
  const total = state.subPuzzleResults.size;
  const completed = Array.from(state.subPuzzleResults.values()).filter(r => r.valid).length;
  const subPuzzleCompletionRate = total > 0 ? completed / total : 0;
  
  // Resource efficiency
  let resourceEfficiency = 1;
  for (const [_resource, amount] of state.resources) {
    resourceEfficiency = Math.min(resourceEfficiency, 1 - (amount / 1000));
  }
  
  // Hidden dimension precision
  const hiddenDimensionPrecision = state.hiddenDimensionUsage / 34; // Max is ~34 for epsilon = 1e-10
  
  // Holonomy score
  const holonomyScore = state.holonomyConsistent ? 1 : 0;
  
  // Overall efficiency
  const overallEfficiency = (
    subPuzzleCompletionRate * 0.4 +
    resourceEfficiency * 0.2 +
    holonomyScore * 0.2 +
    hiddenDimensionPrecision * 0.2
  );
  
  return {
    subPuzzleCompletionRate,
    resourceEfficiency,
    hiddenDimensionPrecision,
    holonomyScore,
    overallEfficiency
  };
}

// ============================================================================
// Solution Validation
// ============================================================================

/**
 * Validate an advanced puzzle solution.
 */
export function validateAdvancedSolution(
  puzzle: AdvancedPuzzle,
  subPuzzleResults: Map<string, PuzzleValidationResult>,
  resources: Map<string, number>,
  agentPositions: Array<{ x: number; y: number }>,
  agentTraits: Map<string, Map<string, number>>,
  epsilon: number = 1e-10
): PuzzleValidationResult {
  // Encode positions with hidden dimensions
  const positions = encodeSolutionWithHiddenDimensions(
    agentPositions,
    puzzle.constraints
  );
  
  // Verify holonomy consistency
  const holonomyResult = verifyCrossPlaneConsistency(positions);
  
  // Build state
  const state: AdvancedPuzzleState = {
    subPuzzleResults,
    resources,
    agents: puzzle.initialState.agents.map((agent, i) => ({
      id: agent.id,
      species: agent.species,
      position: positions[i] || encodeWithHiddenDimensions(agent.position.x, agent.position.y, epsilon),
      traits: agentTraits.get(agent.id) || new Map(Object.entries(agent.traits)),
      status: 'idle'
    })),
    time: 0,
    hiddenDimensionUsage: calculateHiddenDimensionPrecision(puzzle.constraints),
    holonomyConsistent: holonomyResult.isConsistent
  };
  
  // Calculate metrics
  const metrics = calculateAdvancedMetrics(state);
  
  // Validate all constraints
  const constraintResults = puzzle.constraints.map(constraint =>
    validateAdvancedConstraint(constraint, state, metrics, epsilon)
  );
  
  // Check overall validity
  const allSatisfied = constraintResults.every(r => r.satisfied);
  const allExact = constraintResults.every(r => r.exact);
  
  const valid = allSatisfied && holonomyResult.isConsistent;
  const isPerfect = valid && allExact;
  
  // Calculate score
  const satisfiedCount = constraintResults.filter(r => r.satisfied).length;
  const baseScore = (satisfiedCount / constraintResults.length) * puzzle.rewards.experience;
  
  // Bonus for hidden dimension usage
  const hiddenDimBonus = Math.round(state.hiddenDimensionUsage * 5);
  
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
  
  if (!holonomyResult.isConsistent) {
    errors.push('Holonomy inconsistency detected in hidden dimensions');
  }
  
  return {
    valid,
    constraints: constraintResults,
    score: baseScore + hiddenDimBonus,
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

/**
 * Get solution metrics for scoring.
 */
export function getSolutionMetrics(
  state: AdvancedPuzzleState,
  moves: number,
  optimalMoves: number
): SolutionMetrics {
  return {
    totalMoves: moves,
    optimalMoves,
    backtracks: 0,
    totalTime: state.time,
    constraintIterations: state.subPuzzleResults.size,
    hiddenDimensionsUsed: state.hiddenDimensionUsage
  };
}

// ============================================================================
// Export
// ============================================================================

export default {
  calculateHiddenDimensionPrecision,
  verifyCrossPlaneConsistency,
  encodeSolutionWithHiddenDimensions,
  validateAdvancedConstraint,
  validateAdvancedSolution,
  calculateAdvancedMetrics,
  getScoringConstraintResults,
  getSolutionMetrics
};
