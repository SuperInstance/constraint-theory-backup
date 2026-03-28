/**
 * Puzzle Type Definitions for Constraint Ranch
 * 
 * Re-exports and extends the types from the constraint-ranch repository
 * with hidden dimension support.
 * 
 * @module types
 */

// ============================================================================
// Core Types
// ============================================================================

export type PuzzleType = 'spatial' | 'routing' | 'breeding' | 'coordination' | 'advanced';

/**
 * Constraint definition
 */
export interface Constraint {
  type: string;
  value: number | string | boolean;
  unit?: string;
  trait?: string;
  tolerance?: number;
}

/**
 * Position in 2D space
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Trait for breeding puzzles
 */
export interface Trait {
  name: string;
  value: number;
}

/**
 * Agent species definition
 */
export interface AgentSpecies {
  id: string;
  name: string;
  emoji: string;
  size: string;
  specialty: string;
  traits: Record<string, [number, number]>;
}

/**
 * Zone for spatial puzzles
 */
export interface Zone {
  id: string;
  x: number;
  y: number;
  radius: number;
}

/**
 * Map size
 */
export interface MapSize {
  width: number;
  height: number;
}

/**
 * Puzzle rewards
 */
export interface PuzzleRewards {
  experience: number;
  unlocks?: string[];
  achievements?: string[];
}

/**
 * Hint with progressive reveal
 */
export interface Hint {
  level: number; // 1-3
  text: string;
}

// ============================================================================
// Base Puzzle Interface
// ============================================================================

export interface BasePuzzle {
  id: string;
  name: string;
  type: PuzzleType;
  difficulty: number; // 1-5
  description: string;
  constraints: Constraint[];
  hints: Hint[];
  rewards: PuzzleRewards;
}

// ============================================================================
// Spatial Puzzle
// ============================================================================

export interface SpatialPuzzle extends BasePuzzle {
  type: 'spatial';
  initialState: {
    mapSize: MapSize;
    zones: Zone[];
    obstacles?: Position[];
  };
  goalState: Constraint[];
  timeLimit?: number;
}

// ============================================================================
// Routing Puzzle
// ============================================================================

export interface RoutingPuzzle extends BasePuzzle {
  type: 'routing';
  initialState: {
    taskTypes: Array<{
      type: string;
      rate: number;
    }>;
    availableAgents: Array<{
      species: string;
      capacity: number;
    }>;
  };
  goalState: Constraint[];
}

// ============================================================================
// Breeding Puzzle
// ============================================================================

export interface BreedingPuzzle extends BasePuzzle {
  type: 'breeding';
  initialState: {
    parentA: Trait[];
    parentB: Trait[];
    genePool: string[];
  };
  goalState: {
    targetTraits: Trait[];
  };
}

// ============================================================================
// Coordination Puzzle
// ============================================================================

export interface CoordinationPuzzle extends BasePuzzle {
  type: 'coordination';
  initialState: {
    agents: Array<{
      id: string;
      species: string;
      position: Position;
    }>;
    tasks: Array<{
      id: string;
      requiredAgents: number;
      location: Position;
    }>;
  };
  goalState: Constraint[];
}

// ============================================================================
// Advanced Puzzle
// ============================================================================

export interface AdvancedPuzzle extends BasePuzzle {
  type: 'advanced';
  subPuzzles: Array<{
    type: PuzzleType;
    puzzle: ConstraintPuzzle;
    dependencies?: string[];
  }>;
  initialState: {
    agents: Array<{
      id: string;
      species: string;
      position: Position;
      traits: Map<string, number>;
    }>;
    resources: Record<string, number>;
    globalConstraints: Constraint[];
  };
  goalState: Constraint[];
}

// ============================================================================
// Union Types
// ============================================================================

export type ConstraintPuzzle = 
  | SpatialPuzzle 
  | RoutingPuzzle 
  | BreedingPuzzle 
  | CoordinationPuzzle
  | AdvancedPuzzle;

// ============================================================================
// Solution Types
// ============================================================================

/**
 * Agent placement solution for spatial puzzles
 */
export interface SpatialSolution {
  positions: Position[];
}

/**
 * Routing assignment solution
 */
export interface RoutingSolution {
  assignments: Array<{
    taskType: string;
    agentIndex: number;
    rate: number;
  }>;
}

/**
 * Breeding solution with inheritance weights
 */
export interface BreedingSolution {
  weights: Record<string, number>; // trait -> weight toward parent A
  nightSchoolTraining?: Array<{
    trait: string;
    hours: number;
  }>;
}

/**
 * Coordination solution with schedules
 */
export interface CoordinationSolution {
  schedules: Array<{
    agentId: string;
    taskAssignments: Array<{
      taskId: string;
      startTime: number;
      endTime: number;
    }>;
  }>;
}

/**
 * Advanced solution combining sub-solutions
 */
export interface AdvancedSolution {
  subSolutions: Map<string, unknown>;
  resourceAllocation: Record<string, number>;
}

// ============================================================================
// Game State Types
// ============================================================================

/**
 * Current state of an agent in the game
 */
export interface GameAgent {
  id: string;
  species: string;
  position: Position;
  traits: Record<string, number>;
  status: 'idle' | 'working' | 'training' | 'breeding';
  currentTask?: string;
  generation: number;
  parents?: [string, string];
}

/**
 * Player's ranch state
 */
export interface RanchState {
  playerId: string;
  level: number;
  experience: number;
  credits: number;
  agents: GameAgent[];
  completedPuzzles: Set<string>;
  achievements: Set<string>;
  unlocks: Set<string>;
  resources: Map<string, number>;
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Result of constraint validation
 */
export interface ConstraintValidationResult {
  constraint: Constraint;
  satisfied: boolean;
  margin: number;
  exact: boolean;
  message?: string;
}

/**
 * Complete puzzle validation result
 */
export interface PuzzleValidationResult {
  valid: boolean;
  constraints: ConstraintValidationResult[];
  score: number;
  isPerfect: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// Export All
// ============================================================================

export default {
  // Types are exported above
};
