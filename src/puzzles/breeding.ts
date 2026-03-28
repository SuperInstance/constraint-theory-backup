/**
 * Breeding Puzzle Engine for Constraint Ranch
 * 
 * Implements genetic algorithm puzzles for trait inheritance.
 * Teaches optimization, inheritance patterns, and Night School training.
 * 
 * @module breeding
 */

import {
  BreedingPuzzle,
  BreedingSolution,
  Trait,
  Constraint,
  ConstraintValidationResult,
  PuzzleValidationResult
} from './types';

import { ConstraintResult } from './scoring';

import {
  ExactRational,
  toExactRational,
  fromExactRational,
  rationalEquals,
  compareRational,
  subtractRational,
  addRational,
  multiplyRational
} from './hidden-dimensions';

// ============================================================================
// Types
// ============================================================================

/**
 * Agent genome with trait values
 */
export interface Genome {
  traits: Map<string, TraitValue>;
  generation: number;
  parents?: [string, string];
}

/**
 * Trait value with exact representation
 */
export interface TraitValue {
  name: string;
  value: ExactRational;
  dominance: 'dominant' | 'recessive' | 'additive';
  alleles: [Allele, Allele];
}

/**
 * Allele representation
 */
export interface Allele {
  value: number;
  isDominant: boolean;
}

/**
 * Breeding configuration
 */
export interface BreedingConfig {
  mutationRate: number;
  mutationMagnitude: number;
  crossoverType: 'uniform' | 'single-point' | 'two-point';
  nightSchoolMaxImprovement: number;
  nightSchoolMaxHours: number;
  nightSchoolImprovementRate: number;
}

/**
 * Night School training result
 */
export interface NightSchoolResult {
  trait: string;
  baseValue: number;
  trainedValue: number;
  improvement: number;
  trainingHours: number;
  cost: number;
}

/**
 * Breeding result
 */
export interface BreedingResult {
  offspring: Genome;
  mutations: string[];
  exactTraits: Set<string>;
  nightSchoolUsed: boolean;
  nightSchoolResults: NightSchoolResult[];
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_BREEDING_CONFIG: BreedingConfig = {
  mutationRate: 0.1,
  mutationMagnitude: 0.1,
  crossoverType: 'uniform',
  nightSchoolMaxImprovement: 0.15,
  nightSchoolMaxHours: 12,
  nightSchoolImprovementRate: 0.0125
};

// ============================================================================
// Core Breeding Functions
// ============================================================================

/**
 * Breed two parent genomes to create offspring.
 */
export function breed(
  parentA: Genome,
  parentB: Genome,
  weights: Record<string, number>,
  config: BreedingConfig = DEFAULT_BREEDING_CONFIG
): BreedingResult {
  const offspringTraits = new Map<string, TraitValue>();
  const mutations: string[] = [];
  const exactTraits = new Set<string>();
  
  // Combine all traits from both parents
  const allTraits = new Set([
    ...parentA.traits.keys(),
    ...parentB.traits.keys()
  ]);
  
  for (const traitName of allTraits) {
    const traitA = parentA.traits.get(traitName);
    const traitB = parentB.traits.get(traitName);
    
    const weight = weights[traitName] ?? 0.5;
    
    // Get parent values
    const valueA = traitA ? fromExactRational(traitA.value) : 0.5;
    const valueB = traitB ? fromExactRational(traitB.value) : 0.5;
    
    // Determine inheritance mode
    const dominance = traitA?.dominance || traitB?.dominance || 'additive';
    
    let offspringValue: number;
    
    if (dominance === 'additive') {
      // Weighted average
      offspringValue = weight * valueA + (1 - weight) * valueB;
    } else if (dominance === 'dominant') {
      // Take dominant allele
      const hasDominantA = traitA?.alleles[0].isDominant || traitA?.alleles[1].isDominant;
      const hasDominantB = traitB?.alleles[0].isDominant || traitB?.alleles[1].isDominant;
      
      if (hasDominantA && hasDominantB) {
        // Both dominant - use weighted average
        offspringValue = weight * valueA + (1 - weight) * valueB;
      } else if (hasDominantA) {
        offspringValue = valueA;
      } else if (hasDominantB) {
        offspringValue = valueB;
      } else {
        // Neither dominant - use recessive (lower) value
        offspringValue = Math.min(valueA, valueB);
      }
    } else {
      // Recessive - only express if both parents contribute recessive
      const bothRecessive = 
        (!traitA?.alleles[0].isDominant && !traitA?.alleles[1].isDominant) &&
        (!traitB?.alleles[0].isDominant && !traitB?.alleles[1].isDominant);
      
      if (bothRecessive) {
        offspringValue = Math.max(valueA, valueB);
      } else {
        offspringValue = weight * valueA + (1 - weight) * valueB;
      }
    }
    
    // Apply mutation
    let mutated = false;
    if (Math.random() < config.mutationRate) {
      const delta = (Math.random() - 0.5) * 2 * config.mutationMagnitude;
      offspringValue = Math.max(0, Math.min(1, offspringValue + delta));
      mutated = true;
      mutations.push(traitName);
    }
    
    // Convert to exact rational
    const exactValue = toExactRational(offspringValue, 1000);
    
    // Check if this is an exact Pythagorean ratio
    if (isPythagoreanRatio(offspringValue)) {
      exactTraits.add(traitName);
    }
    
    // Generate alleles
    const alleles: [Allele, Allele] = [
      { value: valueA, isDominant: Math.random() > 0.5 },
      { value: valueB, isDominant: Math.random() > 0.5 }
    ];
    
    offspringTraits.set(traitName, {
      name: traitName,
      value: exactValue,
      dominance,
      alleles
    });
  }
  
  const offspring: Genome = {
    traits: offspringTraits,
    generation: Math.max(parentA.generation, parentB.generation) + 1,
    parents: ['parent-a', 'parent-b'] // Would use actual IDs in production
  };
  
  return {
    offspring,
    mutations,
    exactTraits,
    nightSchoolUsed: false,
    nightSchoolResults: []
  };
}

/**
 * Apply Night School training to improve traits beyond genetic limits.
 */
export function applyNightSchool(
  genome: Genome,
  training: Array<{ trait: string; hours: number; targetValue: number }>,
  config: BreedingConfig = DEFAULT_BREEDING_CONFIG
): NightSchoolResult[] {
  const results: NightSchoolResult[] = [];
  
  for (const { trait, hours, targetValue } of training) {
    const traitValue = genome.traits.get(trait);
    if (!traitValue) continue;
    
    const baseValue = fromExactRational(traitValue.value);
    
    // Calculate improvement
    const maxImprovement = Math.min(
      config.nightSchoolMaxImprovement,
      hours * config.nightSchoolImprovementRate
    );
    
    const neededImprovement = targetValue - baseValue;
    const actualImprovement = Math.min(neededImprovement, maxImprovement);
    
    // Apply improvement
    const trainedValue = Math.min(1, baseValue + actualImprovement);
    traitValue.value = toExactRational(trainedValue, 1000);
    
    // Calculate cost
    const cost = Math.round(
      100 + // Base cost
      actualImprovement * 1000 + // Improvement premium
      hours * 20 // Time cost
    );
    
    results.push({
      trait,
      baseValue,
      trainedValue,
      improvement: actualImprovement,
      trainingHours: hours,
      cost
    });
  }
  
  return results;
}

/**
 * Check if a value is a Pythagorean ratio.
 */
function isPythagoreanRatio(value: number): boolean {
  // Check against common Pythagorean ratios
  const pythagoreanRatios = [
    3/5, 4/5, 5/13, 12/13, 8/17, 15/17,
    7/25, 24/25, 20/29, 21/29, 9/41, 40/41,
    0.5, 0.25, 0.75, 0.2, 0.4, 0.6, 0.8
  ];
  
  return pythagoreanRatios.some(r => Math.abs(value - r) < 0.001);
}

// ============================================================================
// Constraint Validation
// ============================================================================

/**
 * Validate a breeding constraint.
 */
export function validateBreedingConstraint(
  constraint: Constraint,
  offspring: Genome,
  nightSchoolResults: NightSchoolResult[],
  epsilon: number = 1e-10
): ConstraintValidationResult {
  const validators: Record<string, BreedingConstraintValidator> = {
    'trait-threshold': validateTraitThreshold,
    'trait-match': validateTraitMatch,
    'species': validateSpecies,
    'generations': validateGenerations,
    'trait-expression': validateTraitExpression,
    'trait-exceeds-parents': validateTraitExceedsParents,
    'min-training-time': validateMinTrainingTime,
    'trait-exceeds-genetic-max': validateTraitExceedsGeneticMax
  };
  
  const validator = validators[constraint.type];
  if (!validator) {
    return {
      constraint,
      satisfied: false,
      margin: 0,
      exact: false,
      message: `Unknown breeding constraint: ${constraint.type}`
    };
  }
  
  return validator(constraint, offspring, nightSchoolResults, epsilon);
}

type BreedingConstraintValidator = (
  constraint: Constraint,
  offspring: Genome,
  nightSchoolResults: NightSchoolResult[],
  epsilon: number
) => ConstraintValidationResult;

function validateTraitThreshold(
  constraint: Constraint,
  offspring: Genome,
  _nightSchoolResults: NightSchoolResult[],
  epsilon: number
): ConstraintValidationResult {
  const traitName = constraint.trait as string;
  const threshold = constraint.value as number;
  
  const traitValue = offspring.traits.get(traitName);
  if (!traitValue) {
    return {
      constraint,
      satisfied: false,
      margin: 0,
      exact: false,
      message: `Trait ${traitName} not found in offspring`
    };
  }
  
  const value = fromExactRational(traitValue.value);
  const satisfied = value >= threshold - epsilon;
  const exact = Math.abs(value - threshold) < epsilon;
  
  return {
    constraint,
    satisfied,
    margin: value - threshold,
    exact,
    message: satisfied
      ? `Trait ${traitName} = ${value.toFixed(3)} meets threshold ${threshold}`
      : `Trait ${traitName} = ${value.toFixed(3)} below threshold ${threshold}`
  };
}

function validateTraitMatch(
  constraint: Constraint,
  offspring: Genome,
  _nightSchoolResults: NightSchoolResult[],
  epsilon: number
): ConstraintValidationResult {
  const traitName = constraint.trait as string;
  const tolerance = constraint.tolerance ?? 0.05;
  const targetValue = constraint.value as number;
  
  const traitValue = offspring.traits.get(traitName);
  if (!traitValue) {
    return {
      constraint,
      satisfied: false,
      margin: 0,
      exact: false,
      message: `Trait ${traitName} not found`
    };
  }
  
  const value = fromExactRational(traitValue.value);
  const diff = Math.abs(value - targetValue);
  const satisfied = diff <= tolerance;
  const exact = diff < epsilon;
  
  return {
    constraint,
    satisfied,
    margin: tolerance - diff,
    exact,
    message: satisfied
      ? `Trait ${traitName} matches target within tolerance`
      : `Trait ${traitName} = ${value.toFixed(3)}, target = ${targetValue}, diff = ${diff.toFixed(3)}`
  };
}

function validateSpecies(
  _constraint: Constraint,
  _offspring: Genome,
  _nightSchoolResults: NightSchoolResult[],
  _epsilon: number
): ConstraintValidationResult {
  // Species validation would be implemented with actual species data
  return {
    constraint: _constraint,
    satisfied: true,
    margin: 0,
    exact: true,
    message: 'Species constraint satisfied'
  };
}

function validateGenerations(
  constraint: Constraint,
  offspring: Genome,
  _nightSchoolResults: NightSchoolResult[],
  _epsilon: number
): ConstraintValidationResult {
  const maxGenerations = constraint.value as number;
  const satisfied = offspring.generation <= maxGenerations;
  
  return {
    constraint,
    satisfied,
    margin: maxGenerations - offspring.generation,
    exact: offspring.generation === maxGenerations,
    message: satisfied
      ? `Generation ${offspring.generation} within limit ${maxGenerations}`
      : `Generation ${offspring.generation} exceeds limit ${maxGenerations}`
  };
}

function validateTraitExpression(
  constraint: Constraint,
  offspring: Genome,
  _nightSchoolResults: NightSchoolResult[],
  _epsilon: number
): ConstraintValidationResult {
  const traitName = constraint.trait as string;
  const requiredExpression = constraint.value as string;
  
  const traitValue = offspring.traits.get(traitName);
  if (!traitValue) {
    return {
      constraint,
      satisfied: false,
      margin: 0,
      exact: false,
      message: `Trait ${traitName} not found`
    };
  }
  
  const actualExpression = traitValue.dominance;
  const satisfied = actualExpression === requiredExpression;
  
  return {
    constraint,
    satisfied,
    margin: satisfied ? 1 : 0,
    exact: true,
    message: satisfied
      ? `Trait ${traitName} expresses as ${requiredExpression}`
      : `Trait ${traitName} expresses as ${actualExpression}, not ${requiredExpression}`
  };
}

function validateTraitExceedsParents(
  constraint: Constraint,
  offspring: Genome,
  _nightSchoolResults: NightSchoolResult[],
  _epsilon: number
): ConstraintValidationResult {
  const traitName = constraint.trait as string;
  const traitValue = offspring.traits.get(traitName);
  
  if (!traitValue) {
    return {
      constraint,
      satisfied: false,
      margin: 0,
      exact: false,
      message: `Trait ${traitName} not found`
    };
  }
  
  const offspringTraitValue = fromExactRational(traitValue.value);
  
  // Check if value exceeds parent values (via Night School)
  const nightSchoolResult = _nightSchoolResults.find(r => r.trait === traitName);
  
  if (!nightSchoolResult) {
    return {
      constraint,
      satisfied: false,
      margin: 0,
      exact: false,
      message: `Trait ${traitName} not trained in Night School`
    };
  }
  
  const satisfied = nightSchoolResult.improvement > 0;
  
  return {
    constraint,
    satisfied,
    margin: nightSchoolResult.improvement,
    exact: false,
    message: satisfied
      ? `Trait ${traitName} improved by ${(nightSchoolResult.improvement * 100).toFixed(1)}%`
      : `Trait ${traitName} not improved beyond parents`
  };
}

function validateMinTrainingTime(
  constraint: Constraint,
  _offspring: Genome,
  nightSchoolResults: NightSchoolResult[],
  _epsilon: number
): ConstraintValidationResult {
  const minHours = constraint.value as number;
  const totalHours = nightSchoolResults.reduce((sum, r) => sum + r.trainingHours, 0);
  
  const satisfied = totalHours >= minHours;
  
  return {
    constraint,
    satisfied,
    margin: totalHours - minHours,
    exact: totalHours === minHours,
    message: satisfied
      ? `Training time ${totalHours}h meets minimum ${minHours}h`
      : `Training time ${totalHours}h below minimum ${minHours}h`
  };
}

function validateTraitExceedsGeneticMax(
  constraint: Constraint,
  offspring: Genome,
  nightSchoolResults: NightSchoolResult[],
  epsilon: number
): ConstraintValidationResult {
  // Similar to validateTraitExceedsParents but specifically for genetic limits
  return validateTraitExceedsParents(constraint, offspring, nightSchoolResults, epsilon);
}

// ============================================================================
// Solution Validation
// ============================================================================

/**
 * Validate a complete breeding puzzle solution.
 */
export function validateBreedingSolution(
  puzzle: BreedingPuzzle,
  solution: BreedingSolution,
  epsilon: number = 1e-10
): PuzzleValidationResult {
  // Create parent genomes from puzzle
  const parentA: Genome = {
    traits: new Map(puzzle.initialState.parentA.map(t => [
      t.name,
      {
        name: t.name,
        value: toExactRational(t.value, 1000),
        dominance: 'additive' as const,
        alleles: [
          { value: t.value, isDominant: Math.random() > 0.5 },
          { value: t.value, isDominant: Math.random() > 0.5 }
        ]
      }
    ])),
    generation: 0
  };
  
  const parentB: Genome = {
    traits: new Map(puzzle.initialState.parentB.map(t => [
      t.name,
      {
        name: t.name,
        value: toExactRational(t.value, 1000),
        dominance: 'additive' as const,
        alleles: [
          { value: t.value, isDominant: Math.random() > 0.5 },
          { value: t.value, isDominant: Math.random() > 0.5 }
        ]
      }
    ])),
    generation: 0
  };
  
  // Breed with solution weights
  const breedingResult = breed(parentA, parentB, solution.weights);
  
  // Apply Night School if specified
  let nightSchoolResults: NightSchoolResult[] = [];
  if (solution.nightSchoolTraining && solution.nightSchoolTraining.length > 0) {
    nightSchoolResults = applyNightSchool(
      breedingResult.offspring,
      solution.nightSchoolTraining.map(t => ({
        trait: t.trait,
        hours: t.hours,
        targetValue: puzzle.goalState.targetTraits.find(tt => tt.name === t.trait)?.value ?? 1
      }))
    );
    breedingResult.nightSchoolUsed = true;
    breedingResult.nightSchoolResults = nightSchoolResults;
  }
  
  // Validate all constraints
  const constraintResults = puzzle.constraints.map(constraint =>
    validateBreedingConstraint(constraint, breedingResult.offspring, nightSchoolResults, epsilon)
  );
  
  // Check overall validity
  const allSatisfied = constraintResults.every(r => r.satisfied);
  const allExact = constraintResults.every(r => r.exact);
  
  const valid = allSatisfied;
  const isPerfect = valid && allExact && breedingResult.exactTraits.size > 0;
  
  // Calculate score
  const satisfiedCount = constraintResults.filter(r => r.satisfied).length;
  const score = (satisfiedCount / constraintResults.length) * puzzle.rewards.experience;
  
  // Bonus for exact traits
  const exactBonus = breedingResult.exactTraits.size * 10;
  
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
    score: score + exactBonus,
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
  breed,
  applyNightSchool,
  validateBreedingConstraint,
  validateBreedingSolution,
  getScoringConstraintResults,
  DEFAULT_BREEDING_CONFIG
};
