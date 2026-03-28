/**
 * Spatial Puzzle Engine for Constraint Ranch
 * 
 * Implements positioning puzzles with constraint snapping using hidden dimensions.
 * Teaches exact geometric calculations and coverage optimization.
 * 
 * @module spatial
 */

import {
  SpatialPuzzle,
  SpatialSolution,
  Position,
  Constraint,
  ConstraintValidationResult,
  PuzzleValidationResult,
  Zone
} from './types';

import {
  HiddenDimensionPosition,
  ExactRational,
  calculateHiddenDimensions,
  toExactRational,
  fromExactRational,
  snapToLattice,
  exactDistance,
  isEquilateralTriangle,
  verifyHolonomy,
  defaultLattice,
  encodeWithHiddenDimensions,
  rationalEquals,
  compareRational,
  subtractRational,
  addRational,
  multiplyRational,
  isRationalZero
} from './hidden-dimensions';

import { ConstraintResult } from './scoring';

// ============================================================================
// Types
// ============================================================================

/**
 * Spatial puzzle state during solving
 */
export interface SpatialPuzzleState {
  puzzle: SpatialPuzzle;
  agentPositions: HiddenDimensionPosition[];
  originalPositions: Position[];
  timeElapsed: number;
  moves: number;
  optimalMoves: number;
}

/**
 * Coverage calculation result
 */
export interface CoverageResult {
  totalArea: number;
  coveredArea: number;
  coverageRatio: number;
  uncoveredZones: string[];
  overlapAreas: Map<string, number>;
}

/**
 * Distance calculation result
 */
export interface DistanceResult {
  positions: [Position, Position][];
  distances: number[];
  maxDistance: number;
  minDistance: number;
  avgDistance: number;
}

/**
 * Triangle formation result
 */
export interface TriangleResult {
  isValid: boolean;
  isEquilateral: boolean;
  sideLengths: [number, number, number];
  angles: [number, number, number];
  area: number;
}

// ============================================================================
// Constraint Validation Functions
// ============================================================================

/**
 * Validate a spatial constraint against positions.
 */
export function validateSpatialConstraint(
  constraint: Constraint,
  positions: HiddenDimensionPosition[],
  zones: Zone[],
  epsilon: number = 1e-10
): ConstraintValidationResult {
  const validators: Record<string, ConstraintValidator> = {
    'max-distance': validateMaxDistance,
    'min-coverage': validateMinCoverage,
    'agent-count': validateAgentCount,
    'on-perimeter': validateOnPerimeter,
    'even-spacing': validateEvenSpacing,
    'equilateral': validateEquilateral,
    'hexagonal-pattern': validateHexagonalPattern,
    'side-length': validateSideLength,
    'neighbor-distance': validateNeighborDistance,
    'max-overlap': validateMaxOverlap,
    'all-zones-covered': validateAllZonesCovered
  };
  
  const validator = validators[constraint.type];
  if (!validator) {
    return {
      constraint,
      satisfied: false,
      margin: 0,
      exact: false,
      message: `Unknown constraint type: ${constraint.type}`
    };
  }
  
  return validator(constraint, positions, zones, epsilon);
}

type ConstraintValidator = (
  constraint: Constraint,
  positions: HiddenDimensionPosition[],
  zones: Zone[],
  epsilon: number
) => ConstraintValidationResult;

/**
 * Validate maximum distance between agents.
 */
function validateMaxDistance(
  constraint: Constraint,
  positions: HiddenDimensionPosition[],
  zones: Zone[],
  epsilon: number
): ConstraintValidationResult {
  const maxAllowed = constraint.value as number;
  let maxDistance = 0;
  let exact = true;
  
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const dist2 = exactDistance(positions[i], positions[j]);
      const dist = Math.sqrt(fromExactRational(dist2));
      maxDistance = Math.max(maxDistance, dist);
      
      // Check if distance is exact (Pythagorean)
      const floatDist = Math.sqrt(dist);
      exact = exact && (Math.abs(floatDist - Math.round(floatDist)) < epsilon);
    }
  }
  
  const satisfied = maxDistance <= maxAllowed;
  const margin = maxAllowed - maxDistance;
  
  return {
    constraint,
    satisfied,
    margin,
    exact,
    message: satisfied
      ? `Maximum distance ${maxDistance.toFixed(2)} is within limit ${maxAllowed}`
      : `Maximum distance ${maxDistance.toFixed(2)} exceeds limit ${maxAllowed}`
  };
}

/**
 * Validate minimum coverage of zones.
 */
function validateMinCoverage(
  constraint: Constraint,
  positions: HiddenDimensionPosition[],
  zones: Zone[],
  epsilon: number
): ConstraintValidationResult {
  const minRequired = constraint.value as number;
  const coverage = calculateCoverage(positions, zones, 50); // Default agent radius
  
  const satisfied = coverage.coverageRatio >= minRequired;
  const margin = coverage.coverageRatio - minRequired;
  
  return {
    constraint,
    satisfied,
    margin,
    exact: coverage.coverageRatio >= 1, // Exact if 100% coverage
    message: satisfied
      ? `Coverage ${(coverage.coverageRatio * 100).toFixed(1)}% meets requirement ${(minRequired * 100)}%`
      : `Coverage ${(coverage.coverageRatio * 100).toFixed(1)}% below requirement ${(minRequired * 100)}%`
  };
}

/**
 * Validate agent count.
 */
function validateAgentCount(
  constraint: Constraint,
  positions: HiddenDimensionPosition[],
  zones: Zone[],
  epsilon: number
): ConstraintValidationResult {
  const required = constraint.value as number;
  const actual = positions.length;
  
  return {
    constraint,
    satisfied: actual === required,
    margin: Math.abs(actual - required),
    exact: actual === required,
    message: actual === required
      ? `Agent count ${actual} matches requirement`
      : `Agent count ${actual} doesn't match requirement ${required}`
  };
}

/**
 * Validate agents are on perimeter of a circle.
 */
function validateOnPerimeter(
  constraint: Constraint,
  positions: HiddenDimensionPosition[],
  zones: Zone[],
  epsilon: number
): ConstraintValidationResult {
  if (zones.length === 0) {
    return {
      constraint,
      satisfied: false,
      margin: 0,
      exact: false,
      message: 'No zone defined for perimeter check'
    };
  }
  
  const zone = zones[0]; // Use first zone as the circle
  let maxDeviation = 0;
  let allExact = true;
  
  for (const pos of positions) {
    const x = fromExactRational(pos.visible.x);
    const y = fromExactRational(pos.visible.y);
    
    // Distance from center
    const dx = x - zone.x;
    const dy = y - zone.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Deviation from perimeter
    const deviation = Math.abs(dist - zone.radius);
    maxDeviation = Math.max(maxDeviation, deviation);
    
    // Check if exact (on Pythagorean circle)
    allExact = allExact && deviation < epsilon;
  }
  
  const satisfied = maxDeviation < epsilon * 10;
  
  return {
    constraint,
    satisfied,
    margin: epsilon * 10 - maxDeviation,
    exact: allExact,
    message: satisfied
      ? 'All agents on perimeter'
      : `Max deviation ${maxDeviation.toFixed(4)} from perimeter`
  };
}

/**
 * Validate even spacing between agents.
 */
function validateEvenSpacing(
  constraint: Constraint,
  positions: HiddenDimensionPosition[],
  zones: Zone[],
  epsilon: number
): ConstraintValidationResult {
  if (positions.length < 2) {
    return {
      constraint,
      satisfied: true,
      margin: 0,
      exact: true,
      message: 'Single agent trivially evenly spaced'
    };
  }
  
  // Calculate angular spacing around center
  const centerX = positions.reduce((sum, p) => sum + fromExactRational(p.visible.x), 0) / positions.length;
  const centerY = positions.reduce((sum, p) => sum + fromExactRational(p.visible.y), 0) / positions.length;
  
  const angles = positions.map(p => {
    const x = fromExactRational(p.visible.x) - centerX;
    const y = fromExactRational(p.visible.y) - centerY;
    return Math.atan2(y, x);
  }).sort((a, b) => a - b);
  
  // Calculate angular differences
  const angularDiffs = angles.map((a, i) => {
    const next = angles[(i + 1) % angles.length];
    let diff = next - a;
    if (diff < 0) diff += 2 * Math.PI;
    return diff;
  });
  
  // Check if evenly spaced
  const avgAngle = (2 * Math.PI) / positions.length;
  const maxDeviation = Math.max(...angularDiffs.map(d => Math.abs(d - avgAngle)));
  
  const satisfied = maxDeviation < 0.1; // About 5.7 degrees tolerance
  const exact = maxDeviation < epsilon;
  
  return {
    constraint,
    satisfied,
    margin: 0.1 - maxDeviation,
    exact,
    message: satisfied
      ? 'Agents evenly spaced'
      : `Angular spacing deviation: ${(maxDeviation * 180 / Math.PI).toFixed(1)}°`
  };
}

/**
 * Validate equilateral triangle formation.
 */
function validateEquilateral(
  constraint: Constraint,
  positions: HiddenDimensionPosition[],
  zones: Zone[],
  epsilon: number
): ConstraintValidationResult {
  if (positions.length !== 3) {
    return {
      constraint,
      satisfied: false,
      margin: 0,
      exact: false,
      message: 'Equilateral constraint requires exactly 3 agents'
    };
  }
  
  const isExact = isEquilateralTriangle(positions[0], positions[1], positions[2]);
  
  // Calculate side lengths for message
  const sides = [
    Math.sqrt(fromExactRational(exactDistance(positions[0], positions[1]))),
    Math.sqrt(fromExactRational(exactDistance(positions[1], positions[2]))),
    Math.sqrt(fromExactRational(exactDistance(positions[2], positions[0])))
  ];
  
  const avgSide = sides.reduce((a, b) => a + b, 0) / 3;
  const maxDeviation = Math.max(...sides.map(s => Math.abs(s - avgSide)));
  
  return {
    constraint,
    satisfied: isExact,
    margin: avgSide - maxDeviation,
    exact: isExact,
    message: isExact
      ? 'Perfect equilateral triangle'
      : `Side lengths: ${sides.map(s => s.toFixed(2)).join(', ')}`
  };
}

/**
 * Validate hexagonal pattern.
 */
function validateHexagonalPattern(
  constraint: Constraint,
  positions: HiddenDimensionPosition[],
  zones: Zone[],
  epsilon: number
): ConstraintValidationResult {
  // Hexagonal pattern requires 7 agents (center + 6 around)
  if (positions.length !== 7) {
    return {
      constraint,
      satisfied: false,
      margin: 0,
      exact: false,
      message: 'Hexagonal pattern requires exactly 7 agents'
    };
  }
  
  // Find center point (should be closest to centroid)
  const centerX = positions.reduce((sum, p) => sum + fromExactRational(p.visible.x), 0) / 7;
  const centerY = positions.reduce((sum, p) => sum + fromExactRational(p.visible.y), 0) / 7;
  
  // Find distances from center
  const distances = positions.map(p => {
    const x = fromExactRational(p.visible.x) - centerX;
    const y = fromExactRational(p.visible.y) - centerY;
    return Math.sqrt(x * x + y * y);
  });
  
  // One should be near center, six at similar distance
  distances.sort((a, b) => a - b);
  
  const centerDist = distances[0];
  const outerDists = distances.slice(1);
  const avgOuterDist = outerDists.reduce((a, b) => a + b, 0) / 6;
  const outerVariance = outerDists.reduce((sum, d) => sum + Math.pow(d - avgOuterDist, 2), 0) / 6;
  
  const validCenter = centerDist < avgOuterDist * 0.3;
  const uniformOuter = Math.sqrt(outerVariance) < avgOuterDist * 0.1;
  
  const satisfied = validCenter && uniformOuter;
  
  return {
    constraint,
    satisfied,
    margin: satisfied ? avgOuterDist * 0.1 - Math.sqrt(outerVariance) : 0,
    exact: satisfied && outerVariance < epsilon,
    message: satisfied
      ? 'Valid hexagonal pattern'
      : 'Positions do not form valid hexagonal pattern'
  };
}

/**
 * Validate specific side length for triangle.
 */
function validateSideLength(
  constraint: Constraint,
  positions: HiddenDimensionPosition[],
  zones: Zone[],
  epsilon: number
): ConstraintValidationResult {
  const requiredLength = constraint.value as number;
  
  if (positions.length !== 3) {
    return {
      constraint,
      satisfied: false,
      margin: 0,
      exact: false,
      message: 'Side length constraint requires 3 agents'
    };
  }
  
  const sides = [
    Math.sqrt(fromExactRational(exactDistance(positions[0], positions[1]))),
    Math.sqrt(fromExactRational(exactDistance(positions[1], positions[2]))),
    Math.sqrt(fromExactRational(exactDistance(positions[2], positions[0])))
  ];
  
  const avgSide = sides.reduce((a, b) => a + b, 0) / 3;
  const margin = requiredLength - avgSide;
  const satisfied = Math.abs(avgSide - requiredLength) < epsilon * 10;
  const exact = Math.abs(avgSide - requiredLength) < epsilon;
  
  return {
    constraint,
    satisfied,
    margin,
    exact,
    message: satisfied
      ? `Side length ${avgSide.toFixed(2)} matches required ${requiredLength}`
      : `Side length ${avgSide.toFixed(2)} doesn't match required ${requiredLength}`
  };
}

/**
 * Validate neighbor distance in grid.
 */
function validateNeighborDistance(
  constraint: Constraint,
  positions: HiddenDimensionPosition[],
  zones: Zone[],
  epsilon: number
): ConstraintValidationResult {
  const requiredDist = constraint.value as number;
  
  // Find all pairwise distances
  const distances: number[] = [];
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      distances.push(Math.sqrt(fromExactRational(exactDistance(positions[i], positions[j]))));
    }
  }
  
  // The smallest distances should match the required distance
  distances.sort((a, b) => a - b);
  
  // In a connected grid, each node has ~2-3 neighbors
  const expectedNeighborCount = positions.length * 2;
  const neighborDistances = distances.slice(0, expectedNeighborCount);
  
  const avgNeighborDist = neighborDistances.reduce((a, b) => a + b, 0) / neighborDistances.length;
  const maxDeviation = Math.max(...neighborDistances.map(d => Math.abs(d - requiredDist)));
  
  const satisfied = maxDeviation < requiredDist * 0.1;
  const exact = maxDeviation < epsilon;
  
  return {
    constraint,
    satisfied,
    margin: requiredDist * 0.1 - maxDeviation,
    exact,
    message: satisfied
      ? `Neighbor distance matches ${requiredDist}`
      : `Max deviation ${(maxDeviation).toFixed(2)} from required distance ${requiredDist}`
  };
}

/**
 * Validate maximum overlap.
 */
function validateMaxOverlap(
  constraint: Constraint,
  positions: HiddenDimensionPosition[],
  zones: Zone[],
  epsilon: number
): ConstraintValidationResult {
  const maxAllowed = constraint.value as number;
  const coverage = calculateCoverage(positions, zones, 50);
  
  // Calculate overlap ratio
  let totalOverlap = 0;
  for (const overlap of coverage.overlapAreas.values()) {
    totalOverlap += overlap;
  }
  
  const overlapRatio = coverage.totalArea > 0 ? totalOverlap / coverage.totalArea : 0;
  const satisfied = overlapRatio <= maxAllowed;
  
  return {
    constraint,
    satisfied,
    margin: maxAllowed - overlapRatio,
    exact: overlapRatio === 0,
    message: satisfied
      ? `Overlap ${(overlapRatio * 100).toFixed(1)}% within limit ${(maxAllowed * 100)}%`
      : `Overlap ${(overlapRatio * 100).toFixed(1)}% exceeds limit ${(maxAllowed * 100)}%`
  };
}

/**
 * Validate all zones are covered.
 */
function validateAllZonesCovered(
  constraint: Constraint,
  positions: HiddenDimensionPosition[],
  zones: Zone[],
  epsilon: number
): ConstraintValidationResult {
  const coverage = calculateCoverage(positions, zones, 50);
  
  return {
    constraint,
    satisfied: coverage.uncoveredZones.length === 0,
    margin: zones.length - coverage.uncoveredZones.length,
    exact: coverage.coverageRatio >= 1,
    message: coverage.uncoveredZones.length === 0
      ? 'All zones covered'
      : `Uncovered zones: ${coverage.uncoveredZones.join(', ')}`
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate coverage of zones by agents.
 */
export function calculateCoverage(
  positions: HiddenDimensionPosition[],
  zones: Zone[],
  agentRadius: number
): CoverageResult {
  const uncoveredZones: string[] = [];
  const overlapAreas = new Map<string, number>();
  
  let coveredArea = 0;
  let totalArea = 0;
  
  for (const zone of zones) {
    totalArea += Math.PI * zone.radius * zone.radius;
    
    // Check if any agent covers this zone center
    let isCovered = false;
    const coveringAgents: number[] = [];
    
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      const x = fromExactRational(pos.visible.x);
      const y = fromExactRational(pos.visible.y);
      
      const dx = x - zone.x;
      const dy = y - zone.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist <= agentRadius + zone.radius) {
        isCovered = true;
        coveringAgents.push(i);
      }
    }
    
    if (isCovered) {
      coveredArea += Math.PI * zone.radius * zone.radius;
    } else {
      uncoveredZones.push(zone.id);
    }
    
    // Calculate overlap if multiple agents cover
    if (coveringAgents.length > 1) {
      const overlapArea = calculateCircleOverlap(
        positions[coveringAgents[0]],
        positions[coveringAgents[1]],
        agentRadius
      );
      overlapAreas.set(zone.id, overlapArea);
    }
  }
  
  return {
    totalArea,
    coveredArea,
    coverageRatio: totalArea > 0 ? coveredArea / totalArea : 0,
    uncoveredZones,
    overlapAreas
  };
}

/**
 * Calculate overlap area between two agent coverage circles.
 */
function calculateCircleOverlap(
  pos1: HiddenDimensionPosition,
  pos2: HiddenDimensionPosition,
  radius: number
): number {
  const x1 = fromExactRational(pos1.visible.x);
  const y1 = fromExactRational(pos1.visible.y);
  const x2 = fromExactRational(pos2.visible.x);
  const y2 = fromExactRational(pos2.visible.y);
  
  const d = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  
  if (d >= 2 * radius) return 0;
  if (d === 0) return Math.PI * radius * radius;
  
  // Area of intersection of two circles
  const r2 = radius * radius;
  const d2 = d * d;
  
  const part1 = r2 * Math.acos((d2 + r2 - r2) / (2 * d * radius));
  const part2 = r2 * Math.acos((d2 + r2 - r2) / (2 * d * radius));
  const part3 = 0.5 * Math.sqrt((-d + 2 * radius) * (d) * (d + 2 * radius));
  
  return part1 + part2 - part3;
}

/**
 * Snap positions to Pythagorean lattice for exact constraint satisfaction.
 */
export function snapPositionsToLattice(
  positions: Position[],
  epsilon: number = 1e-10
): HiddenDimensionPosition[] {
  return positions.map(pos => {
    const snap = snapToLattice(pos.x, pos.y, defaultLattice, epsilon);
    return snap.position;
  });
}

// ============================================================================
// Main Validation Function
// ============================================================================

/**
 * Validate a complete spatial puzzle solution.
 */
export function validateSpatialSolution(
  puzzle: SpatialPuzzle,
  solution: SpatialSolution,
  epsilon: number = 1e-10
): PuzzleValidationResult {
  // Convert positions to hidden dimension positions
  const positions = snapPositionsToLattice(solution.positions, epsilon);
  
  // Validate all constraints
  const constraintResults = puzzle.constraints.map(constraint =>
    validateSpatialConstraint(constraint, positions, puzzle.initialState.zones, epsilon)
  );
  
  // Check holonomy consistency
  const holonomy = verifyHolonomy(positions);
  
  // Calculate overall validity
  const allSatisfied = constraintResults.every(r => r.satisfied);
  const allExact = constraintResults.every(r => r.exact);
  const holonomyConsistent = holonomy.isConsistent;
  
  const valid = allSatisfied && holonomyConsistent;
  const isPerfect = valid && allExact;
  
  // Calculate base score
  const satisfiedCount = constraintResults.filter(r => r.satisfied).length;
  const score = (satisfiedCount / constraintResults.length) * puzzle.rewards.experience;
  
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
  
  if (!holonomyConsistent) {
    errors.push('Holonomy check failed: constraint system is inconsistent');
  }
  
  return {
    valid,
    constraints: constraintResults,
    score,
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
  validateSpatialConstraint,
  validateSpatialSolution,
  calculateCoverage,
  snapPositionsToLattice,
  getScoringConstraintResults
};
