/**
 * Scoring System for Constraint Ranch
 * 
 * Implements the scoring mechanics:
 * - Base score from constraints satisfied
 * - Time bonus for speed
 * - Elegance bonus for efficiency
 * - Streak multipliers
 * - Hint penalties
 * 
 * @module scoring
 */

import { Constraint, PuzzleType } from './types';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Complete score breakdown for a puzzle attempt
 */
export interface ScoreBreakdown {
  // Base scoring
  baseScore: number;
  constraintsScore: number;
  
  // Bonuses
  timeBonus: number;
  eleganceBonus: number;
  firstAttemptBonus: number;
  noHintsBonus: number;
  perfectSolutionBonus: number;
  
  // Multipliers
  difficultyMultiplier: number;
  streakMultiplier: number;
  levelMultiplier: number;
  
  // Penalties
  hintPenalty: number;
  timePenalty: number;
  
  // Final calculations
  subtotal: number;
  total: number;
  
  // Metadata
  isPerfect: boolean;
  grade: ScoreGrade;
}

/**
 * Score grade levels
 */
export type ScoreGrade = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';

/**
 * Configuration for scoring calculation
 */
export interface ScoringConfig {
  // Time limits
  timeLimit: number; // seconds
  optimalTime: number; // seconds for maximum time bonus
  
  // Bonus rates
  timeBonusRate: number; // bonus per second under limit
  eleganceThreshold: number; // movement efficiency for elegance bonus
  
  // Multipliers
  difficultyMultipliers: Record<number, number>;
  streakCap: number; // maximum streak multiplier
  
  // Penalties
  hintPenalties: Record<number, number>; // penalty per hint level
  overtimePenaltyRate: number; // penalty per second over time limit
}

/**
 * Player statistics for scoring
 */
export interface PlayerStats {
  currentStreak: number;
  totalPuzzlesCompleted: number;
  perfectSolutions: number;
  averageTime: number;
  fastestTimes: Record<string, number>;
}

/**
 * Solution metrics for elegance calculation
 */
export interface SolutionMetrics {
  totalMoves: number;
  optimalMoves: number;
  backtracks: number;
  totalTime: number;
  constraintIterations: number;
  hiddenDimensionsUsed: number;
}

/**
 * Constraint verification result
 */
export interface ConstraintResult {
  constraint: Constraint;
  satisfied: boolean;
  margin: number; // how close to the constraint boundary (0 = exact, positive = margin)
  exact: boolean; // was this satisfied exactly (using hidden dimensions)?
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  timeLimit: 300, // 5 minutes
  optimalTime: 60, // 1 minute for max bonus
  
  timeBonusRate: 2, // 2 points per second saved
  eleganceThreshold: 0.9, // 90% efficiency for elegance bonus
  
  difficultyMultipliers: {
    1: 1.0,
    2: 1.25,
    3: 1.5,
    4: 2.0,
    5: 2.5
  },
  streakCap: 2.0, // Max 2x streak multiplier
  
  hintPenalties: {
    1: 0.1, // 10% penalty for level 1 hint
    2: 0.25, // 25% penalty for level 2 hint
    3: 0.5 // 50% penalty for level 3 hint
  },
  overtimePenaltyRate: 1 // 1 point penalty per second over
};

// ============================================================================
// Core Scoring Functions
// ============================================================================

/**
 * Calculate complete score breakdown for a puzzle attempt.
 */
export function calculateScore(
  puzzleType: PuzzleType,
  difficulty: number,
  baseExperience: number,
  constraintResults: ConstraintResult[],
  timeTaken: number,
  hintsUsed: number[],
  metrics: SolutionMetrics,
  playerStats: PlayerStats,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): ScoreBreakdown {
  // 1. Calculate base score from constraints
  const constraintsScore = calculateConstraintsScore(
    constraintResults,
    baseExperience
  );
  
  // 2. Calculate time bonus
  const timeBonus = calculateTimeBonus(
    timeTaken,
    config.timeLimit,
    config.optimalTime,
    config.timeBonusRate
  );
  
  // 3. Calculate elegance bonus
  const eleganceBonus = calculateEleganceBonus(
    metrics,
    config.eleganceThreshold,
    baseExperience
  );
  
  // 4. Calculate first attempt bonus
  const firstAttemptBonus = playerStats.totalPuzzlesCompleted === 0 
    ? baseExperience * 0.5 
    : 0;
  
  // 5. Calculate no hints bonus
  const noHintsBonus = hintsUsed.length === 0 
    ? baseExperience * 0.2 
    : 0;
  
  // 6. Check for perfect solution
  const isPerfect = constraintResults.every(r => r.satisfied && r.exact) &&
                    metrics.totalMoves === metrics.optimalMoves &&
                    timeTaken <= config.optimalTime;
  const perfectSolutionBonus = isPerfect ? baseExperience * 0.5 : 0;
  
  // 7. Calculate penalties
  const hintPenalty = calculateHintPenalty(hintsUsed, config.hintPenalties);
  const timePenalty = calculateTimePenalty(
    timeTaken,
    config.timeLimit,
    config.overtimePenaltyRate
  );
  
  // 8. Calculate multipliers
  const difficultyMultiplier = config.difficultyMultipliers[difficulty] || 1.0;
  const streakMultiplier = Math.min(
    1 + (playerStats.currentStreak * 0.1),
    config.streakCap
  );
  const levelMultiplier = calculateLevelMultiplier(puzzleType, difficulty);
  
  // 9. Calculate subtotal
  const subtotal = constraintsScore + timeBonus + eleganceBonus + 
                   firstAttemptBonus + noHintsBonus + perfectSolutionBonus -
                   hintPenalty - timePenalty;
  
  // 10. Calculate final total with multipliers
  const total = Math.round(
    subtotal * difficultyMultiplier * streakMultiplier * levelMultiplier
  );
  
  // 11. Determine grade
  const grade = calculateGrade(total, baseExperience, difficulty);
  
  return {
    baseScore: baseExperience,
    constraintsScore,
    timeBonus,
    eleganceBonus,
    firstAttemptBonus,
    noHintsBonus,
    perfectSolutionBonus,
    difficultyMultiplier,
    streakMultiplier,
    levelMultiplier,
    hintPenalty,
    timePenalty,
    subtotal,
    total,
    isPerfect,
    grade
  };
}

/**
 * Calculate score from constraint satisfaction.
 */
export function calculateConstraintsScore(
  results: ConstraintResult[],
  baseExperience: number
): number {
  const satisfiedCount = results.filter(r => r.satisfied).length;
  const totalCount = results.length;
  
  if (totalCount === 0) return baseExperience;
  
  // Base points for each satisfied constraint
  const pointsPerConstraint = baseExperience / totalCount;
  
  // Bonus for exact satisfaction
  const exactBonus = results
    .filter(r => r.satisfied && r.exact)
    .reduce((sum, r) => sum + pointsPerConstraint * 0.2, 0);
  
  return Math.round(
    (satisfiedCount / totalCount) * baseExperience + exactBonus
  );
}

/**
 * Calculate time bonus based on completion speed.
 */
export function calculateTimeBonus(
  timeTaken: number,
  timeLimit: number,
  optimalTime: number,
  bonusRate: number
): number {
  if (timeTaken <= optimalTime) {
    // Maximum bonus for completing in optimal time
    return Math.round((timeLimit - optimalTime) * bonusRate);
  }
  
  if (timeTaken >= timeLimit) {
    // No bonus if over time limit
    return 0;
  }
  
  // Proportional bonus for time between optimal and limit
  const timeSaved = timeLimit - timeTaken;
  const maxPossible = timeLimit - optimalTime;
  const ratio = timeSaved / maxPossible;
  
  return Math.round(ratio * (timeLimit - optimalTime) * bonusRate);
}

/**
 * Calculate elegance bonus based on solution efficiency.
 */
export function calculateEleganceBonus(
  metrics: SolutionMetrics,
  threshold: number,
  baseExperience: number
): number {
  if (metrics.optimalMoves === 0) return 0;
  
  const efficiency = metrics.optimalMoves / metrics.totalMoves;
  
  if (efficiency < threshold) {
    return 0;
  }
  
  // Bonus scales with efficiency above threshold
  const bonusScale = (efficiency - threshold) / (1 - threshold);
  
  // Extra bonus for using hidden dimensions (exact constraint satisfaction)
  const hiddenDimBonus = metrics.hiddenDimensionsUsed > 0 ? 0.1 : 0;
  
  return Math.round(baseExperience * (0.1 + bonusScale * 0.2 + hiddenDimBonus));
}

/**
 * Calculate penalty for using hints.
 */
export function calculateHintPenalty(
  hintsUsed: number[],
  penalties: Record<number, number>
): number {
  return hintsUsed.reduce((sum, level) => {
    const penalty = penalties[level] || 0;
    return sum + penalty;
  }, 0);
}

/**
 * Calculate penalty for overtime.
 */
export function calculateTimePenalty(
  timeTaken: number,
  timeLimit: number,
  penaltyRate: number
): number {
  if (timeTaken <= timeLimit) return 0;
  return Math.round((timeTaken - timeLimit) * penaltyRate);
}

/**
 * Calculate level multiplier based on puzzle type and difficulty.
 */
export function calculateLevelMultiplier(
  puzzleType: PuzzleType,
  difficulty: number
): number {
  // Advanced puzzles have higher multipliers
  const typeMultipliers: Record<PuzzleType, number> = {
    spatial: 1.0,
    routing: 1.1,
    breeding: 1.2,
    coordination: 1.3,
    advanced: 1.5
  };
  
  const baseMultiplier = typeMultipliers[puzzleType] || 1.0;
  
  // Scale with difficulty
  return baseMultiplier * (1 + (difficulty - 1) * 0.1);
}

/**
 * Calculate grade based on score ratio.
 */
export function calculateGrade(
  total: number,
  baseExperience: number,
  difficulty: number
): ScoreGrade {
  // Maximum possible score (roughly)
  const maxScore = baseExperience * 3 * (1 + difficulty * 0.5);
  const ratio = total / maxScore;
  
  if (ratio >= 0.95) return 'S';
  if (ratio >= 0.85) return 'A';
  if (ratio >= 0.70) return 'B';
  if (ratio >= 0.55) return 'C';
  if (ratio >= 0.40) return 'D';
  return 'F';
}

// ============================================================================
// Experience and Progression
// ============================================================================

/**
 * XP requirements per level (exponential curve).
 */
export const XP_PER_LEVEL: Record<number, number> = {
  1: 0,
  2: 100,
  3: 283,
  4: 520,
  5: 812,
  6: 1155,
  7: 1549,
  8: 1993,
  9: 2486,
  10: 3027,
  11: 3617,
  12: 4255,
  13: 4941,
  14: 5674,
  15: 6455,
  16: 7283,
  17: 8158,
  18: 9080,
  19: 10048,
  20: 10964,
  21: 11925,
  22: 12932,
  23: 13985,
  24: 15084,
  25: 16228,
  26: 17418,
  27: 18652,
  28: 19932,
  29: 21257,
  30: 22527,
  31: 23841,
  32: 25200,
  33: 26604,
  34: 28052,
  35: 29544,
  36: 31080,
  37: 32660,
  38: 34284,
  39: 35952,
  40: 37663
};

/**
 * Get total XP required to reach a level.
 */
export function getTotalXPForLevel(level: number): number {
  let total = 0;
  for (let l = 2; l <= level; l++) {
    total += XP_PER_LEVEL[l] || Math.floor(100 * Math.pow(l, 1.5));
  }
  return total;
}

/**
 * Get current level from total XP.
 */
export function getLevelFromXP(totalXP: number): number {
  let accumulated = 0;
  let level = 1;
  
  for (let l = 2; l <= 40; l++) {
    const required = XP_PER_LEVEL[l] || Math.floor(100 * Math.pow(l, 1.5));
    if (accumulated + required > totalXP) {
      return level;
    }
    accumulated += required;
    level = l;
  }
  
  return 40;
}

/**
 * Get title for a level.
 */
export function getTitleForLevel(level: number): string {
  if (level <= 4) return 'Ranch Hand';
  if (level <= 9) return 'Drover';
  if (level <= 14) return 'Trail Boss';
  if (level <= 19) return 'Wrangler';
  if (level <= 24) return 'Rancher';
  if (level <= 29) return 'Overseer';
  if (level <= 34) return 'Trailblazer';
  if (level <= 39) return 'Ranch Master';
  return 'Constraint Sage';
}

// ============================================================================
// Achievement Integration
// ============================================================================

/**
 * Achievement definition
 */
export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'puzzle' | 'breeding' | 'coordination' | 'progression' | 'social' | 'special';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  icon: string;
  hidden: boolean;
  experience: number;
  credits: number;
}

/**
 * Check for achievement unlocks based on score.
 */
export function checkAchievementUnlocks(
  puzzleId: string,
  puzzleType: PuzzleType,
  score: ScoreBreakdown,
  playerStats: PlayerStats
): Achievement[] {
  const unlocked: Achievement[] = [];
  
  // First puzzle completion
  if (playerStats.totalPuzzlesCompleted === 0) {
    unlocked.push({
      id: 'first-puzzle',
      name: 'First Steps',
      description: 'Complete your first puzzle',
      category: 'puzzle',
      tier: 'bronze',
      icon: '🧩',
      hidden: false,
      experience: 50,
      credits: 25
    });
  }
  
  // Perfect solution
  if (score.isPerfect) {
    unlocked.push({
      id: `perfect-${puzzleId}`,
      name: 'Perfectionist',
      description: `Achieve a perfect score on ${puzzleId}`,
      category: 'puzzle',
      tier: 'silver',
      icon: '⭐',
      hidden: false,
      experience: 100,
      credits: 50
    });
  }
  
  // S-grade
  if (score.grade === 'S') {
    unlocked.push({
      id: `s-grade-${puzzleId}`,
      name: 'S-Rank Achiever',
      description: `Get an S-grade on ${puzzleId}`,
      category: 'puzzle',
      tier: 'gold',
      icon: '🏆',
      hidden: false,
      experience: 150,
      credits: 75
    });
  }
  
  // Streak achievements
  if (playerStats.currentStreak >= 7) {
    unlocked.push({
      id: 'streak-week',
      name: 'Dedicated Rancher',
      description: 'Play 7 days in a row',
      category: 'progression',
      tier: 'bronze',
      icon: '📅',
      hidden: false,
      experience: 100,
      credits: 50
    });
  }
  
  if (playerStats.currentStreak >= 30) {
    unlocked.push({
      id: 'streak-month',
      name: 'Loyal Rancher',
      description: 'Play 30 days in a row',
      category: 'progression',
      tier: 'silver',
      icon: '🗓️',
      hidden: false,
      experience: 300,
      credits: 150
    });
  }
  
  return unlocked;
}

// ============================================================================
// Export
// ============================================================================

export default {
  calculateScore,
  calculateConstraintsScore,
  calculateTimeBonus,
  calculateEleganceBonus,
  calculateHintPenalty,
  calculateTimePenalty,
  calculateLevelMultiplier,
  calculateGrade,
  getTotalXPForLevel,
  getLevelFromXP,
  getTitleForLevel,
  checkAchievementUnlocks,
  DEFAULT_SCORING_CONFIG,
  XP_PER_LEVEL
};
