/**
 * Main Puzzle Engine for Constraint Ranch
 * 
 * Unified engine for all puzzle types with hidden dimension support.
 * Implements the Grand Unified Constraint Theory for exact constraint satisfaction.
 * 
 * @module engine
 */

// Re-export all types
export * from './types';

// Re-export all modules
export { 
  calculateHiddenDimensions,
  toExactRational,
  fromExactRational,
  snapToLattice,
  verifyHolonomy,
  encodeWithHiddenDimensions,
  defaultLattice,
  HiddenDimensionPosition,
  ExactRational,
  SnapResult,
  HolonomyResult
} from './hidden-dimensions';

export {
  calculateScore,
  calculateConstraintsScore,
  calculateTimeBonus,
  calculateEleganceBonus,
  calculateGrade,
  getTotalXPForLevel,
  getLevelFromXP,
  getTitleForLevel,
  checkAchievementUnlocks,
  ScoreBreakdown,
  ScoreGrade,
  PlayerStats,
  SolutionMetrics,
  ConstraintResult,
  DEFAULT_SCORING_CONFIG
} from './scoring';

export {
  validateSpatialSolution,
  validateSpatialConstraint,
  calculateCoverage,
  snapPositionsToLattice,
  SpatialPuzzleState,
  CoverageResult,
  DistanceResult
} from './spatial';

export {
  breed,
  applyNightSchool,
  validateBreedingSolution,
  validateBreedingConstraint,
  Genome,
  TraitValue,
  NightSchoolResult,
  BreedingResult,
  DEFAULT_BREEDING_CONFIG
} from './breeding';

export {
  validateRoutingSolution,
  validateRoutingConstraint,
  calculateRoutingMetrics,
  RoutingAgent,
  RoutingState,
  RoutingMetrics
} from './routing';

export {
  validateCoordinationSolution,
  validateCoordinationConstraint,
  calculateCoordinationMetrics,
  CoordAgent,
  CoordinationState,
  CoordinationMetrics
} from './coordination';

export {
  calculateHiddenDimensionPrecision,
  verifyCrossPlaneConsistency,
  encodeSolutionWithHiddenDimensions,
  validateAdvancedSolution,
  validateAdvancedConstraint,
  calculateAdvancedMetrics,
  AdvancedPuzzleState,
  AdvancedMetrics
} from './advanced';

// Import types
import {
  ConstraintPuzzle,
  SpatialPuzzle,
  RoutingPuzzle,
  BreedingPuzzle,
  CoordinationPuzzle,
  AdvancedPuzzle,
  SpatialSolution,
  RoutingSolution,
  BreedingSolution,
  CoordinationSolution,
  AdvancedSolution,
  PuzzleValidationResult,
  PuzzleType
} from './types';

import { 
  calculateScore, 
  ScoreBreakdown, 
  PlayerStats, 
  SolutionMetrics,
  ConstraintResult,
  DEFAULT_SCORING_CONFIG
} from './scoring';

import { validateSpatialSolution } from './spatial';
import { validateBreedingSolution } from './breeding';
import { validateRoutingSolution } from './routing';
import { validateCoordinationSolution } from './coordination';
import { validateAdvancedSolution, getSolutionMetrics } from './advanced';

import {
  calculateHiddenDimensions,
  encodeWithHiddenDimensions,
  verifyHolonomy
} from './hidden-dimensions';

// ============================================================================
// Main Engine Class
// ============================================================================

/**
 * Main puzzle engine class.
 * Provides unified interface for all puzzle types.
 */
export class PuzzleEngine {
  private epsilon: number;
  
  constructor(epsilon: number = 1e-10) {
    this.epsilon = epsilon;
  }
  
  /**
   * Validate a puzzle solution.
   */
  validateSolution(
    puzzle: ConstraintPuzzle,
    solution: unknown,
    resources?: Map<string, number>,
    agentTraits?: Map<string, Map<string, number>>
  ): PuzzleValidationResult {
    switch (puzzle.type) {
      case 'spatial':
        return validateSpatialSolution(
          puzzle as SpatialPuzzle,
          solution as SpatialSolution,
          this.epsilon
        );
      case 'routing':
        return validateRoutingSolution(
          puzzle as RoutingPuzzle,
          solution as RoutingSolution,
          this.epsilon
        );
      case 'breeding':
        return validateBreedingSolution(
          puzzle as BreedingPuzzle,
          solution as BreedingSolution,
          this.epsilon
        );
      case 'coordination':
        return validateCoordinationSolution(
          puzzle as CoordinationPuzzle,
          solution as CoordinationSolution,
          this.epsilon
        );
      case 'advanced':
        // For advanced puzzles, we need sub-puzzle results
        // This is a simplified version - full implementation would handle sub-puzzles
        return validateAdvancedSolution(
          puzzle as AdvancedPuzzle,
          new Map(), // Sub-puzzle results
          resources || new Map(),
          [],
          agentTraits || new Map(),
          this.epsilon
        );
      default:
        return {
          valid: false,
          constraints: [],
          score: 0,
          isPerfect: false,
          errors: [`Unknown puzzle type: ${(puzzle as { type: string }).type}`],
          warnings: []
        };
    }
  }
  
  /**
   * Calculate score for a puzzle attempt.
   */
  calculateScore(
    puzzle: ConstraintPuzzle,
    validationResult: PuzzleValidationResult,
    timeTaken: number,
    hintsUsed: number[],
    moves: number,
    optimalMoves: number,
    playerStats: PlayerStats
  ): ScoreBreakdown {
    const constraintResults: ConstraintResult[] = validationResult.constraints.map(c => ({
      constraint: c.constraint,
      satisfied: c.satisfied,
      margin: c.margin,
      exact: c.exact
    }));
    
    const metrics: SolutionMetrics = {
      totalMoves: moves,
      optimalMoves,
      backtracks: 0,
      totalTime: timeTaken,
      constraintIterations: puzzle.constraints.length,
      hiddenDimensionsUsed: calculateHiddenDimensions(this.epsilon)
    };
    
    return calculateScore(
      puzzle.type,
      puzzle.difficulty,
      puzzle.rewards.experience,
      constraintResults,
      timeTaken,
      hintsUsed,
      metrics,
      playerStats,
      DEFAULT_SCORING_CONFIG
    );
  }
  
  /**
   * Get hidden dimension count for precision.
   */
  getHiddenDimensionCount(epsilon?: number): number {
    return calculateHiddenDimensions(epsilon ?? this.epsilon);
  }
  
  /**
   * Encode a position with hidden dimensions.
   */
  encodePosition(x: number, y: number): ReturnType<typeof encodeWithHiddenDimensions> {
    return encodeWithHiddenDimensions(x, y, this.epsilon);
  }
  
  /**
   * Verify constraint consistency.
   */
  verifyConsistency(
    positions: Array<{ x: number; y: number }>
  ): { isConsistent: boolean; information: number } {
    const encodedPositions = positions.map(p => 
      encodeWithHiddenDimensions(p.x, p.y, this.epsilon)
    );
    const result = verifyHolonomy(encodedPositions);
    
    return {
      isConsistent: result.isConsistent,
      information: result.totalInformation
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new puzzle engine instance.
 */
export function createPuzzleEngine(epsilon: number = 1e-10): PuzzleEngine {
  return new PuzzleEngine(epsilon);
}

/**
 * Quick validation helper.
 */
export function validate(
  puzzle: ConstraintPuzzle,
  solution: unknown
): PuzzleValidationResult {
  const engine = createPuzzleEngine();
  return engine.validateSolution(puzzle, solution);
}

/**
 * Quick scoring helper.
 */
export function score(
  puzzle: ConstraintPuzzle,
  validationResult: PuzzleValidationResult,
  timeTaken: number,
  hintsUsed: number[] = [],
  moves: number = 1,
  optimalMoves: number = 1,
  playerStats: PlayerStats = {
    currentStreak: 0,
    totalPuzzlesCompleted: 0,
    perfectSolutions: 0,
    averageTime: 0,
    fastestTimes: {}
  }
): ScoreBreakdown {
  const engine = createPuzzleEngine();
  return engine.calculateScore(
    puzzle,
    validationResult,
    timeTaken,
    hintsUsed,
    moves,
    optimalMoves,
    playerStats
  );
}

// ============================================================================
// Puzzle Type Guards
// ============================================================================

/**
 * Check if puzzle is a spatial puzzle.
 */
export function isSpatialPuzzle(puzzle: ConstraintPuzzle): puzzle is SpatialPuzzle {
  return puzzle.type === 'spatial';
}

/**
 * Check if puzzle is a routing puzzle.
 */
export function isRoutingPuzzle(puzzle: ConstraintPuzzle): puzzle is RoutingPuzzle {
  return puzzle.type === 'routing';
}

/**
 * Check if puzzle is a breeding puzzle.
 */
export function isBreedingPuzzle(puzzle: ConstraintPuzzle): puzzle is BreedingPuzzle {
  return puzzle.type === 'breeding';
}

/**
 * Check if puzzle is a coordination puzzle.
 */
export function isCoordinationPuzzle(puzzle: ConstraintPuzzle): puzzle is CoordinationPuzzle {
  return puzzle.type === 'coordination';
}

/**
 * Check if puzzle is an advanced puzzle.
 */
export function isAdvancedPuzzle(puzzle: ConstraintPuzzle): puzzle is AdvancedPuzzle {
  return puzzle.type === 'advanced';
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Puzzle type display names.
 */
export const PUZZLE_TYPE_NAMES: Record<PuzzleType, string> = {
  spatial: 'Spatial Puzzles',
  routing: 'Routing Puzzles',
  breeding: 'Breeding Puzzles',
  coordination: 'Coordination Puzzles',
  advanced: 'Advanced Puzzles'
};

/**
 * Puzzle type descriptions.
 */
export const PUZZLE_TYPE_DESCRIPTIONS: Record<PuzzleType, string> = {
  spatial: 'Position agents optimally using exact geometric coordinates.',
  routing: 'Distribute tasks to agents with load balancing and specialization.',
  breeding: 'Create agents with specific traits through genetic inheritance.',
  coordination: 'Synchronize multiple agents for distributed tasks.',
  advanced: 'Complex puzzles combining multiple mechanics with hidden dimensions.'
};

/**
 * Default precision levels.
 */
export const PRECISION_LEVELS = {
  low: 1e-4,      // 4 hidden dimensions
  medium: 1e-6,   // 7 hidden dimensions
  high: 1e-8,     // 10 hidden dimensions
  exact: 1e-10    // 14 hidden dimensions
} as const;

// ============================================================================
// Default Export
// ============================================================================

export default {
  PuzzleEngine,
  createPuzzleEngine,
  validate,
  score,
  isSpatialPuzzle,
  isRoutingPuzzle,
  isBreedingPuzzle,
  isCoordinationPuzzle,
  isAdvancedPuzzle,
  PUZZLE_TYPE_NAMES,
  PUZZLE_TYPE_DESCRIPTIONS,
  PRECISION_LEVELS
};
