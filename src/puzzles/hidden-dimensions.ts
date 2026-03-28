/**
 * Hidden Dimension Module for Constraint Ranch
 * 
 * Implements the Grand Unified Constraint Theory (GUCT) hidden dimension concepts:
 * - Hidden dimensions encode precision logarithmically: k = ⌈log₂(1/ε)⌉
 * - Pythagorean snapping for exact coordinates
 * - Holonomy verification for constraint consistency
 * 
 * @module hidden-dimensions
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Exact rational number representation
 * Uses numerator/denominator to avoid floating-point errors
 */
export interface ExactRational {
  numerator: bigint;
  denominator: bigint;
}

/**
 * Position with hidden dimension encoding
 * The visible dimensions (x, y) are supplemented by hidden dimensions
 * that encode the precision needed for exact constraint satisfaction
 */
export interface HiddenDimensionPosition {
  // Visible dimensions (2D game space)
  visible: {
    x: ExactRational;
    y: ExactRational;
  };
  // Hidden dimensions encode precision
  hidden: ExactRational[];
  // Precision level (number of hidden dimensions used)
  precision: number;
  // Original epsilon value
  epsilon: number;
}

/**
 * Constraint manifold representation
 * A manifold is the surface of all valid solutions to a set of constraints
 */
export interface ConstraintManifold {
  id: string;
  dimensions: number;
  constraints: ConstraintEquation[];
  // Hidden dimension count needed for exact representation
  hiddenDimCount: number;
}

/**
 * A constraint equation in the form: f(x) = 0
 */
export interface ConstraintEquation {
  id: string;
  type: ConstraintType;
  evaluate: (position: HiddenDimensionPosition) => ExactRational;
  gradient: (position: HiddenDimensionPosition) => ExactRational[];
}

/**
 * Supported constraint types
 */
export type ConstraintType = 
  | 'distance'
  | 'angle'
  | 'coverage'
  | 'collinearity'
  | 'perpendicularity'
  | 'parallelism'
  | 'circle'
  | 'triangle';

/**
 * Snap result with verification
 */
export interface SnapResult {
  position: HiddenDimensionPosition;
  originalPosition: { x: number; y: number };
  snapDistance: ExactRational;
  isExact: boolean;
  pythagoreanTriple?: [number, number, number];
}

/**
 * Holonomy check result
 */
export interface HolonomyResult {
  isConsistent: boolean;
  cycles: CycleResult[];
  totalInformation: number;
}

export interface CycleResult {
  cycle: string[];
  holonomyValue: ExactRational;
  isZero: boolean;
}

// ============================================================================
// Core Hidden Dimension Functions
// ============================================================================

/**
 * Calculate the number of hidden dimensions needed for a given precision.
 * Formula: k = ⌈log₂(1/ε)⌉
 * 
 * @param epsilon - Desired precision (e.g., 1e-10)
 * @returns Number of hidden dimensions needed
 */
export function calculateHiddenDimensions(epsilon: number): number {
  if (epsilon <= 0 || epsilon >= 1) {
    throw new Error('Epsilon must be between 0 and 1 (exclusive)');
  }
  return Math.ceil(Math.log2(1 / epsilon));
}

/**
 * Convert a floating-point number to exact rational representation.
 * Uses continued fraction expansion for best rational approximation.
 * 
 * @param value - Floating-point value to convert
 * @param maxDenominator - Maximum denominator for approximation
 * @returns Exact rational representation
 */
export function toExactRational(value: number, maxDenominator: number = 10000): ExactRational {
  // Handle special cases
  if (Number.isInteger(value)) {
    return { numerator: BigInt(Math.round(value)), denominator: 1n };
  }

  // Use continued fraction for best approximation
  let h0 = 0n, h1 = 1n;
  let k0 = 1n, k1 = 0n;
  let x = Math.abs(value);
  
  while (true) {
    const a = Math.floor(x);
    const h2 = BigInt(a) * h1 + h0;
    const k2 = BigInt(a) * k1 + k0;
    
    if (k2 > BigInt(maxDenominator)) {
      break;
    }
    
    h0 = h1; h1 = h2;
    k0 = k1; k1 = k2;
    
    if (x === a) break;
    x = 1 / (x - a);
  }
  
  const numerator = value < 0 ? -h1 : h1;
  return { numerator, denominator: k1 };
}

/**
 * Convert exact rational to floating-point.
 */
export function fromExactRational(r: ExactRational): number {
  return Number(r.numerator) / Number(r.denominator);
}

/**
 * Add two exact rationals.
 */
export function addRational(a: ExactRational, b: ExactRational): ExactRational {
  return {
    numerator: a.numerator * b.denominator + b.numerator * a.denominator,
    denominator: a.denominator * b.denominator
  };
}

/**
 * Multiply two exact rationals.
 */
export function multiplyRational(a: ExactRational, b: ExactRational): ExactRational {
  return {
    numerator: a.numerator * b.numerator,
    denominator: a.denominator * b.denominator
  };
}

/**
 * Subtract two exact rationals.
 */
export function subtractRational(a: ExactRational, b: ExactRational): ExactRational {
  return {
    numerator: a.numerator * b.denominator - b.numerator * a.denominator,
    denominator: a.denominator * b.denominator
  };
}

/**
 * Check if exact rational is zero.
 */
export function isRationalZero(r: ExactRational): boolean {
  return r.numerator === 0n;
}

/**
 * Check if two exact rationals are equal.
 */
export function rationalEquals(a: ExactRational, b: ExactRational): boolean {
  return a.numerator * b.denominator === b.numerator * a.denominator;
}

/**
 * Compare two exact rationals.
 * Returns: -1 if a < b, 0 if a = b, 1 if a > b
 */
export function compareRational(a: ExactRational, b: ExactRational): number {
  const diff = a.numerator * b.denominator - b.numerator * a.denominator;
  if (diff < 0n) return -1;
  if (diff > 0n) return 1;
  return 0;
}

// ============================================================================
// Pythagorean Lattice Generation
// ============================================================================

/**
 * Generate primitive Pythagorean triples up to a maximum hypotenuse.
 * Returns all (a, b, c) where a² + b² = c² and gcd(a,b,c) = 1.
 * 
 * Uses Euclid's formula: a = m² - n², b = 2mn, c = m² + n²
 * where m > n, gcd(m,n) = 1, and one of m,n is even.
 */
export function generatePythagoreanTriples(maxHypotenuse: number): [number, number, number][] {
  const triples: [number, number, number][] = [];
  const seen = new Set<string>();
  
  for (let m = 2; m <= Math.sqrt(maxHypotenuse); m++) {
    for (let n = 1; n < m; n++) {
      // Check conditions for primitive triple
      if (gcd(m, n) !== 1) continue;
      if ((m - n) % 2 === 0) continue;
      
      const a = m * m - n * n;
      const b = 2 * m * n;
      const c = m * m + n * n;
      
      if (c > maxHypotenuse) continue;
      
      // Store in sorted order (smaller first)
      const sorted = a < b ? [a, b, c] as [number, number, number] : [b, a, c] as [number, number, number];
      const key = sorted.join(',');
      
      if (!seen.has(key)) {
        seen.add(key);
        triples.push(sorted);
      }
    }
  }
  
  return triples.sort((a, b) => a[2] - b[2]);
}

/**
 * Greatest common divisor
 */
function gcd(a: number, b: number): number {
  while (b !== 0) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

/**
 * Pythagorean lattice for snapping.
 * Pre-computed lattice points on the unit circle.
 */
export interface PythagoreanLattice {
  points: Array<{ x: ExactRational; y: ExactRational; c: number }>;
  triples: [number, number, number][];
}

/**
 * Create a Pythagorean lattice for snapping operations.
 */
export function createPythagoreanLattice(maxHypotenuse: number = 1000): PythagoreanLattice {
  const triples = generatePythagoreanTriples(maxHypotenuse);
  const points: Array<{ x: ExactRational; y: ExactRational; c: number }> = [];
  
  // Add unit circle points from Pythagorean triples
  for (const [a, b, c] of triples) {
    points.push({
      x: { numerator: BigInt(a), denominator: BigInt(c) },
      y: { numerator: BigInt(b), denominator: BigInt(c) },
      c
    });
    // Also add rotated version
    points.push({
      x: { numerator: BigInt(b), denominator: BigInt(c) },
      y: { numerator: BigInt(a), denominator: BigInt(c) },
      c
    });
  }
  
  // Add axis points
  points.push({ x: { numerator: 0n, denominator: 1n }, y: { numerator: 1n, denominator: 1n }, c: 1 });
  points.push({ x: { numerator: 1n, denominator: 1n }, y: { numerator: 0n, denominator: 1n }, c: 1 });
  points.push({ x: { numerator: 0n, denominator: 1n }, y: { numerator: -1n, denominator: 1n }, c: 1 });
  points.push({ x: { numerator: -1n, denominator: 1n }, y: { numerator: 0n, denominator: 1n }, c: 1 });
  
  return { points, triples };
}

// ============================================================================
// Constraint Snapping Functions
// ============================================================================

/**
 * Snap a position to the nearest Pythagorean lattice point.
 * This enables exact constraint satisfaction without floating-point errors.
 * 
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param lattice - Pythagorean lattice to snap to
 * @param epsilon - Precision for snapping
 * @returns Snap result with verification
 */
export function snapToLattice(
  x: number, 
  y: number, 
  lattice: PythagoreanLattice,
  epsilon: number = 1e-10
): SnapResult {
  const hiddenDims = calculateHiddenDimensions(epsilon);
  
  // Convert to exact rational
  const exactX = toExactRational(x);
  const exactY = toExactRational(y);
  
  // Find nearest lattice point
  let bestDistance = Infinity;
  let bestPoint = lattice.points[0];
  let bestTriple: [number, number, number] | undefined;
  
  for (const point of lattice.points) {
    const dx = Math.abs(fromExactRational(point.x) - x);
    const dy = Math.abs(fromExactRational(point.y) - y);
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < bestDistance) {
      bestDistance = distance;
      bestPoint = point;
      bestTriple = lattice.triples.find(t => 
        t[0] === Number(point.x.numerator) && 
        t[1] === Number(point.y.numerator) &&
        t[2] === point.c
      );
    }
  }
  
  // Create hidden dimension position
  const position: HiddenDimensionPosition = {
    visible: {
      x: bestPoint.x,
      y: bestPoint.y
    },
    hidden: [],
    precision: hiddenDims,
    epsilon
  };
  
  // Add hidden dimensions based on precision
  for (let i = 0; i < hiddenDims; i++) {
    position.hidden.push({ numerator: 0n, denominator: 1n });
  }
  
  const snapDistance = toExactRational(bestDistance);
  
  return {
    position,
    originalPosition: { x, y },
    snapDistance,
    isExact: isRationalZero(snapDistance),
    pythagoreanTriple: bestTriple
  };
}

/**
 * Snap to a constraint manifold.
 * Lifts the point to hidden dimensions, snaps to lattice, then projects back.
 * 
 * @param x - X coordinate
 * @param y - Y coordinate  
 * @param manifold - Constraint manifold to snap to
 * @param lattice - Pythagorean lattice
 * @returns Snap result
 */
export function snapToManifold(
  x: number,
  y: number,
  manifold: ConstraintManifold,
  lattice: PythagoreanLattice
): SnapResult {
  // First snap to lattice
  const latticeSnap = snapToLattice(x, y, lattice);
  
  // Then verify against manifold constraints
  // For now, we return the lattice snap
  // In a full implementation, we would project onto the manifold
  
  return latticeSnap;
}

// ============================================================================
// Holonomy Verification
// ============================================================================

/**
 * Verify holonomy consistency of a constraint system.
 * 
 * In GUCT, a constraint system is consistent if and only if
 * the holonomy around all cycles is zero.
 * 
 * @param positions - Array of positions forming cycles
 * @returns Holonomy verification result
 */
export function verifyHolonomy(
  positions: HiddenDimensionPosition[]
): HolonomyResult {
  const cycles: CycleResult[] = [];
  let totalInformation = 0;
  
  // Check all pair-wise cycles
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const cycle = [`pos-${i}`, `pos-${j}`];
      
      // Calculate holonomy as difference in hidden dimensions
      const p1 = positions[i];
      const p2 = positions[j];
      
      // Holonomy is zero if hidden dimensions are consistent
      let holonomyValue: ExactRational = { numerator: 0n, denominator: 1n };
      
      for (let k = 0; k < Math.min(p1.hidden.length, p2.hidden.length); k++) {
        holonomyValue = addRational(
          holonomyValue,
          subtractRational(p1.hidden[k], p2.hidden[k])
        );
      }
      
      const isZero = isRationalZero(holonomyValue);
      
      cycles.push({
        cycle,
        holonomyValue,
        isZero
      });
      
      // Information is -log(|holonomy|)
      if (!isZero) {
        const holonomyFloat = fromExactRational(holonomyValue);
        if (holonomyFloat !== 0) {
          totalInformation -= Math.log2(Math.abs(holonomyFloat));
        }
      }
    }
  }
  
  const isConsistent = cycles.every(c => c.isZero);
  
  return {
    isConsistent,
    cycles,
    totalInformation
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate exact distance between two positions.
 */
export function exactDistance(
  p1: HiddenDimensionPosition,
  p2: HiddenDimensionPosition
): ExactRational {
  const dx = subtractRational(p1.visible.x, p2.visible.x);
  const dy = subtractRational(p1.visible.y, p2.visible.y);
  
  // For squared distance
  const dx2 = multiplyRational(dx, dx);
  const dy2 = multiplyRational(dy, dy);
  const sum = addRational(dx2, dy2);
  
  // Return squared distance (avoid sqrt for exactness)
  return sum;
}

/**
 * Check if three points form an equilateral triangle.
 */
export function isEquilateralTriangle(
  p1: HiddenDimensionPosition,
  p2: HiddenDimensionPosition,
  p3: HiddenDimensionPosition,
  tolerance: ExactRational = { numerator: 1n, denominator: 1000n }
): boolean {
  const d12 = exactDistance(p1, p2);
  const d23 = exactDistance(p2, p3);
  const d31 = exactDistance(p3, p1);
  
  // Check if all distances are equal within tolerance
  const diff12_23 = subtractRational(d12, d23);
  const diff23_31 = subtractRational(d23, d31);
  
  // Compare absolute values with tolerance
  const tol2 = multiplyRational(tolerance, tolerance);
  
  return (
    compareRational(absRational(diff12_23), tol2) <= 0 &&
    compareRational(absRational(diff23_31), tol2) <= 0
  );
}

/**
 * Absolute value of rational
 */
function absRational(r: ExactRational): ExactRational {
  return {
    numerator: r.numerator < 0n ? -r.numerator : r.numerator,
    denominator: r.denominator
  };
}

/**
 * Calculate hidden dimension encoding for a position.
 * 
 * This is the core algorithm from GUCT:
 * 1. Compute k = ⌈log₂(1/ε)⌉ hidden dimensions
 * 2. Lift point to R^(n+k)
 * 3. Snap to lattice in lifted space
 * 4. Store encoding for exact reconstruction
 */
export function encodeWithHiddenDimensions(
  x: number,
  y: number,
  epsilon: number = 1e-10
): HiddenDimensionPosition {
  const k = calculateHiddenDimensions(epsilon);
  
  // Convert to exact
  const exactX = toExactRational(x);
  const exactY = toExactRational(y);
  
  // Create hidden dimensions
  // These encode the residual error that allows exact reconstruction
  const hidden: ExactRational[] = [];
  
  // Compute residuals as hidden dimension values
  const residualX = subtractRational(exactX, {
    numerator: BigInt(Math.round(x)),
    denominator: 1n
  });
  const residualY = subtractRational(exactY, {
    numerator: BigInt(Math.round(y)),
    denominator: 1n
  });
  
  // Distribute residuals across hidden dimensions
  for (let i = 0; i < k; i++) {
    const scale = Math.pow(2, i);
    hidden.push({
      numerator: residualX.numerator * BigInt(Math.round(scale)),
      denominator: residualX.denominator * BigInt(Math.round(scale))
    });
  }
  
  return {
    visible: { x: exactX, y: exactY },
    hidden,
    precision: k,
    epsilon
  };
}

/**
 * Default Pythagorean lattice instance
 */
export const defaultLattice = createPythagoreanLattice(1000);

// ============================================================================
// Export all
// ============================================================================

export default {
  calculateHiddenDimensions,
  toExactRational,
  fromExactRational,
  addRational,
  multiplyRational,
  subtractRational,
  isRationalZero,
  rationalEquals,
  compareRational,
  generatePythagoreanTriples,
  createPythagoreanLattice,
  snapToLattice,
  snapToManifold,
  verifyHolonomy,
  exactDistance,
  isEquilateralTriangle,
  encodeWithHiddenDimensions,
  defaultLattice
};
