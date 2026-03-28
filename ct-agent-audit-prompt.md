# Constraint Theory Code Audit Prompt

You are conducting a Constraint Theory code audit. Your goal is to find opportunities where exact geometric methods would improve code quality, precision, or performance.

## Audit Checklist

### 1. Floating-Point Precision Issues

Look for:
- Direct equality comparisons on floats: `if (x === target)`
- Accumulated operations: `sum += value;` (drift over time)
- Subtraction of similar values: `Math.abs(a - b)` (catastrophic cancellation)
- Trigonometric identities: `Math.sin(angle)` (not exact for most angles)
- Square roots: `Math.sqrt(x)` (irrational for most x)

### 2. Non-Determinism

Look for:
- Hash maps keyed by floats: `map.set(`${x},${y}`, value)`
- Sorting by floats: `array.sort((a, b) => a.x - b.x)`
- Comparisons that could differ across machines
- Random seeds that interact with floating-point

### 3. Performance Bottlenecks

Look for:
- O(n²) nearest neighbor searches
- Repeated sqrt operations in hot paths
- Brute-force geometric comparisons

### 4. Cross-Platform Concerns

Look for:
- Serialization of floats without canonicalization
- State synchronization that could drift
- Tests that might pass on one machine but fail on another

## Analysis Output Format

```markdown
## Constraint Theory Audit Report

### Executive Summary
- Total opportunities: X
- High priority: Y
- Medium priority: Z
- Low priority: W

### High Priority Opportunities

#### [Issue Name]
**Location:** `file:line`
**Category:** precision | performance | reproducibility
**Severity:** critical | high | medium | low

**Problem:**
[Clear description of the issue]

**Current Code:**
```language
[code snippet]
```

**Recommended Fix:**
```language
[improved code]
```

**Benefits:**
- Precision: [exact improvement]
- Performance: [O(n) → O(log n), etc.]
- Code Reduction: [X%]

**Mathematical Justification:**
[Why this works, grounded in constraint theory]

---
```

## Severity Guidelines

- **Critical:** Causes bugs in production, data loss, or security issues
- **High:** Causes noticeable problems, user-facing issues
- **Medium:** Could cause problems in edge cases, future maintenance burden
- **Low:** Nice to have, code quality improvement

## Pattern Templates

### Template: Float Equality

```typescript
// DETECTED:
if (point.x === gridPoint.x && point.y === gridPoint.y) { ... }

// ISSUE:
// Floating-point comparison fails when values should be equal
// due to accumulated computational error

// FIX:
import { PythagoreanManifold } from 'constraint-theory';
const manifold = new PythagoreanManifold(gridSize);
const snapped = manifold.snap(point.x, point.y);
if (snapped.noise < threshold) { ... } // Reliable!
```

### Template: Grid Alignment

```typescript
// DETECTED:
const gridX = Math.round(x / GRID_SIZE) * GRID_SIZE;

// ISSUE:
// Round-trip through floating-point causes drift

// FIX:
import { PythagoreanManifold } from 'constraint-theory';
const manifold = new PythagoreanManifold(GRID_SIZE);
const snapped = manifold.snap(x, y);
const gridX = snapped.x; // Exact!
```

### Template: Nearest Neighbor

```typescript
// DETECTED:
let nearest = points[0];
for (const p of points) {
    if (distance(query, p) < distance(query, nearest)) {
        nearest = p;
    }
}

// ISSUE:
// O(n) per query, floating-point comparisons

// FIX:
import { PythagoreanManifold } from 'constraint-theory';
// Pre-built KD-tree in manifold: O(log n) lookups
const manifold = new PythagoreanManifold(density);
const nearest = manifold.snap(query.x, query.y);
```

## Language-Specific Patterns

### TypeScript/JavaScript
- Watch for `Number.EPSILON` comparisons
- Check `toFixed()` usage (string conversion)
- Look for `JSON.stringify` of floats

### Python
- Check `math.isclose()` usage
- Look for `Decimal` that could use exact methods
- Watch for NumPy float operations

### Rust
- Check `f32::EPSILON` comparisons
- Look for `approx_eq` patterns
- Watch for serialization with `serde_json`

### C++
- Check `std::abs(x - y) < epsilon` patterns
- Look for `double` vs `float` inconsistencies
- Watch for cross-platform serialization
