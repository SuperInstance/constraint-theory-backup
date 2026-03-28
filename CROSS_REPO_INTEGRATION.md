# Cross-Repository Integration Guide

**Version:** 1.0
**Date:** 2025-03-16
**Status:** Production-Ready

---

## Ecosystem Overview

The Constraint Theory ecosystem consists of 6 interconnected repositories:

```
                    ┌─────────────────────────────────────────┐
                    │         constraint-theory-core          │
                    │            (Rust Foundation)            │
                    │                                         │
                    │  • PythagoreanManifold                  │
                    │  • Hidden Dimensions (k = ⌈log₂(1/ε)⌉) │
                    │  • PythagoreanQuantizer                 │
                    │  • Holonomy Verification                │
                    │  • SIMD Batch Processing                │
                    └─────────────────┬───────────────────────┘
                                      │
            ┌─────────────────────────┼─────────────────────────┐
            │                         │                         │
            ▼                         ▼                         ▼
┌───────────────────┐    ┌───────────────────┐    ┌───────────────────┐
│ constraint-theory │    │ constraint-theory │    │ constraint-       │
│     -python       │    │      -web         │    │   research        │
│                   │    │                   │    │                   │
│ • PyO3 Bindings   │    │ • 52 Demos        │    │ • 6 arXiv Papers  │
│ • NumPy Integration│   │ • WASM Module     │    │ • Validation      │
│ • ML Integration  │    │ • Visualizations  │    │ • Benchmarks      │
│ • Financial Apps  │    │ • Tutorials       │    │ • Whitepapers     │
└─────────┬─────────┘    └─────────┬─────────┘    └───────────────────┘
          │                        │
          │              ┌─────────┴─────────┐
          │              │                   │
          ▼              ▼                   ▼
┌───────────────────┐    ┌───────────────────┐
│  constraint-flow  │    │  constraint-ranch │
│                   │    │                   │
│ • Workflow DAG    │    │ • Puzzle Engine   │
│ • Exact Arithmetic│    │ • 5 Puzzle Types  │
│ • Connectors      │    │ • Agent Species   │
│ • Templates       │    │ • Multiplayer     │
└───────────────────┘    └───────────────────┘
```

---

## API Compatibility Matrix

### Core Types (Defined in constraint-theory-core)

| Type | Rust | Python | TypeScript | WASM |
|------|------|--------|------------|------|
| `PythagoreanManifold` | ✅ | ✅ | ✅ | ✅ |
| `PythagoreanQuantizer` | ✅ | ✅ | 🔄 | 🔄 |
| `QuantizationMode` | ✅ | ✅ | ✅ | ✅ |
| `HiddenDimensionConfig` | ✅ | ✅ | ✅ | ✅ |
| `HolonomyResult` | ✅ | ✅ | 🔄 | 🔄 |
| `Rational` | ✅ | ✅ | ✅ | ✅ |

Legend: ✅ Implemented | 🔄 Planned | ❌ Not Applicable

### Function Signatures

#### Hidden Dimensions

```rust
// Rust
pub fn hidden_dim_count(epsilon: f64) -> usize;
pub fn lift_to_hidden(point: &[f64], k: usize) -> Vec<f64>;
pub fn project_visible(lifted: &[f64], n: usize) -> Vec<f64>;
pub fn holographic_accuracy(k: usize, n: usize) -> f64;
```

```python
# Python
def compute_hidden_dim_count(epsilon: float) -> int: ...
def lift_to_hidden(point: List[float], k: int) -> List[float]: ...
def project_visible(lifted: List[float], n: int) -> List[float]: ...
def holographic_accuracy(k: int, n: int) -> float: ...
```

```typescript
// TypeScript
function hiddenDimCount(epsilon: number): number;
function liftToHidden(point: number[], k: number): number[];
function projectVisible(lifted: number[], n: number): number[];
function holographicAccuracy(k: number, n: number): number;
```

#### Quantization

```rust
// Rust
pub struct PythagoreanQuantizer {
    mode: QuantizationMode,
    bits: u8,
}

impl PythagoreanQuantizer {
    pub fn for_llm() -> Self;        // Ternary mode
    pub fn for_embeddings() -> Self;  // Polar mode
    pub fn for_vector_db() -> Self;   // Turbo mode
    pub fn hybrid() -> Self;          // Auto-select
    
    pub fn quantize(&self, data: &[f64]) -> QuantizationResult;
}
```

```python
# Python
class PythagoreanQuantizer:
    @classmethod
    def for_llm(cls) -> 'PythagoreanQuantizer': ...
    @classmethod
    def for_embeddings(cls) -> 'PythagoreanQuantizer': ...
    @classmethod
    def for_vector_db(cls) -> 'PythagoreanQuantizer': ...
    @classmethod
    def hybrid(cls) -> 'PythagoreanQuantizer': ...
    
    def quantize(self, data: np.ndarray) -> QuantizationResult: ...
```

```typescript
// TypeScript
class PythagoreanQuantizer {
    static forLLM(): PythagoreanQuantizer;
    static forEmbeddings(): PythagoreanQuantizer;
    static forVectorDB(): PythagoreanQuantizer;
    static hybrid(): PythagoreanQuantizer;
    
    quantize(data: number[][]): QuantizationResult;
}
```

---

## Integration Examples

### 1. Core to Python Integration

```python
# Using Rust backend with Python
from constraint_theory import (
    PythagoreanManifold,
    PythagoreanQuantizer,
    compute_hidden_dim_count,
    HAS_RUST_BACKEND
)

print(f"Rust backend available: {HAS_RUST_BACKEND}")

# Create manifold
manifold = PythagoreanManifold(density=200)

# Snap vectors
import numpy as np
vectors = np.random.randn(1000, 2)
vectors = vectors / np.linalg.norm(vectors, axis=1, keepdims=True)

# Batch snap with SIMD (if Rust backend available)
snapped, noises = manifold.snap_batch(vectors)

# Quantize for ML
quantizer = PythagoreanQuantizer.for_embeddings()
result = quantizer.quantize(snapped)
print(f"Unit norm preserved: {result.check_unit_norm()}")
```

### 2. Core to Web Integration

```javascript
// Using WASM module in browser
import init, { 
    PythagoreanManifold, 
    PythagoreanQuantizer,
    hiddenDimCount 
} from './wasm/constraint_theory.js';

async function main() {
    await init();
    
    // Create manifold
    const manifold = new PythagoreanManifold(200);
    
    // Snap a point
    const [x, y, noise] = manifold.snap(0.577, 0.816);
    console.log(`Snapped: (${x.toFixed(4)}, ${y.toFixed(4)}), noise: ${noise.toFixed(6)}`);
    
    // Compute hidden dimensions
    const k = hiddenDimCount(1e-10);
    console.log(`Hidden dimensions for 1e-10 precision: ${k}`); // 34
}
```

### 3. Python to Flow Integration

```python
# Using constraint-theory in constraint-flow
from constraint_theory import ExactMoney, PortfolioOptimizer
from constraint_flow import Workflow, Step, ExactNumber

# Create financial workflow
workflow = Workflow("portfolio_rebalance")

# Define exact arithmetic steps
workflow.add_step(Step(
    id="calculate_positions",
    handler=lambda ctx: {
        "positions": [
            {"symbol": "AAPL", "value": ExactMoney.from_float(10000.50)},
            {"symbol": "GOOGL", "value": ExactMoney.from_float(25000.75)},
        ]
    }
))

# Use constraint-theory for exact snapping
workflow.add_step(Step(
    id="snap_to_pythagorean",
    handler=lambda ctx: {
        "snapped": [
            {"symbol": p["symbol"], "snapped_value": p["value"].snap_to_cents()}
            for p in ctx["positions"]
        ]
    }
))
```

### 4. Ranch Game Integration

```typescript
// Using constraint-theory in constraint-ranch
import { 
    PythagoreanManifold, 
    hiddenDimCount,
    snapToLattice 
} from '@superinstance/constraint-theory-wasm';

import { 
    SpatialPuzzle, 
    Constraint, 
    Game 
} from 'constraint-ranch';

// Create puzzle with exact snapping
const puzzle = new SpatialPuzzle({
    id: 'spatial-hidden-dims',
    name: 'Hidden Dimensions Explorer',
    
    grid: { width: 10, height: 10 },
    
    // Agents must be positioned on Pythagorean lattice
    agents: [
        { species: 'chicken', count: 3 },
    ],
    
    constraints: [
        // Positions must snap to exact Pythagorean triples
        Constraint.pythagoreanSnapping(),
        
        // Hidden dimensions for precision
        Constraint.hiddenDimensionPrecision(1e-6),
        
        // Holonomy verification
        Constraint.holonomyConsistent(),
    ],
});

// Solve with exact arithmetic
const solution = await game.solve(puzzle);
console.log(`Precision achieved: ${solution.precision}`);
console.log(`Hidden dimensions used: ${hiddenDimCount(solution.precision)}`);
```

---

## Testing Integration

### Cross-Repo Test Suite

Each repository should have integration tests that verify cross-repo compatibility:

#### constraint-theory-core

```rust
// tests/cross_repo_integration.rs

#[test]
fn test_python_api_compatibility() {
    // Verify function signatures match Python API
    let k = hidden_dim_count(1e-10);
    assert_eq!(k, 34);
    
    let point = vec![0.6, 0.8];
    let lifted = lift_to_hidden(&point, k);
    assert_eq!(lifted.len(), 36);
    
    let projected = project_visible(&lifted, 2);
    assert_eq!(projected.len(), 2);
}

#[test]
fn test_wasm_api_compatibility() {
    // Verify types are WASM-compatible
    let manifold = PythagoreanManifold::new(200);
    let (snapped, noise) = manifold.snap([0.577, 0.816]);
    
    // WASM uses f32 for compatibility
    assert!(snapped[0].is_finite());
    assert!(noise.is_finite());
}
```

#### constraint-theory-python

```python
# tests/test_cross_repo.py

import pytest
import numpy as np
from constraint_theory import (
    PythagoreanManifold,
    compute_hidden_dim_count,
    HAS_RUST_BACKEND
)

class TestCoreCompatibility:
    """Tests to verify compatibility with constraint-theory-core"""
    
    def test_hidden_dim_formula(self):
        """Verify k = ceil(log2(1/ε)) matches Rust implementation"""
        test_cases = [
            (0.1, 4),
            (0.01, 7),
            (0.001, 10),
            (1e-10, 34),
        ]
        
        for epsilon, expected_k in test_cases:
            k = compute_hidden_dim_count(epsilon)
            assert k == expected_k, f"Failed for ε={epsilon}"
    
    def test_snap_determinism(self):
        """Verify snap results match Rust implementation"""
        manifold = PythagoreanManifold(density=200)
        
        # 3-4-5 triangle
        x, y, noise = manifold.snap(0.6, 0.8)
        assert abs(x - 0.6) < 0.01
        assert abs(y - 0.8) < 0.01
        assert noise < 0.001
    
    @pytest.mark.skipif(not HAS_RUST_BACKEND, reason="Rust backend required")
    def test_rust_backend_matches_python(self):
        """Verify Rust backend produces same results as Python fallback"""
        from constraint_theory.manifold import PythagoreanManifold as PyManifold
        
        # Test with both backends
        rust_manifold = PythagoreanManifold(density=200)
        py_manifold = PyManifold(density=200, use_rust=False)
        
        test_points = [(0.6, 0.8), (0.577, 0.816), (0.1, 0.995)]
        
        for x, y in test_points:
            r_x, r_y, r_noise = rust_manifold.snap(x, y)
            p_x, p_y, p_noise = py_manifold.snap(x, y)
            
            assert abs(r_x - p_x) < 0.001
            assert abs(r_y - p_y) < 0.001
            assert abs(r_noise - p_noise) < 0.001
```

#### constraint-theory-web

```javascript
// tests/cross_repo_integration.test.js

import { describe, test, expect } from 'vitest';
import init, { 
    PythagoreanManifold, 
    hiddenDimCount 
} from '../wasm/constraint_theory.js';

describe('Core Compatibility', () => {
    beforeAll(async () => {
        await init();
    });
    
    test('hidden dimension formula matches core', () => {
        const testCases = [
            [0.1, 4],
            [0.01, 7],
            [0.001, 10],
            [1e-10, 34],
        ];
        
        for (const [epsilon, expected] of testCases) {
            expect(hiddenDimCount(epsilon)).toBe(expected);
        }
    });
    
    test('snap produces exact results', () => {
        const manifold = new PythagoreanManifold(200);
        const [x, y, noise] = manifold.snap(0.6, 0.8);
        
        expect(Math.abs(x - 0.6)).toBeLessThan(0.01);
        expect(Math.abs(y - 0.8)).toBeLessThan(0.01);
        expect(noise).toBeLessThan(0.001);
    });
});
```

---

## Version Compatibility

| Core Version | Python Version | Web Version | Flow Version | Ranch Version | Research Version |
|--------------|----------------|-------------|--------------|---------------|------------------|
| 1.0.x | 0.3.x | 1.0.x | 0.2.x | 0.2.x | 1.0.x |
| 1.1.x | 0.4.x | 1.1.x | 0.3.x | 0.3.x | 1.1.x |

### Semantic Versioning

- **Core (Rust)**: Major version changes indicate breaking API changes
- **Python**: Follows core version with minor version offset
- **Web**: Independent versioning, WASM follows core
- **Flow/Ranch**: Independent versioning, compatible with any core 1.x
- **Research**: Independent versioning, papers versioned separately

---

## Continuous Integration

### Cross-Repo Test Matrix

```yaml
# .github/workflows/cross-repo-tests.yml
name: Cross-Repository Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test-matrix:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        repo: [core, python, web, flow, ranch]
    
    steps:
      - uses: actions/checkout@v3
        with:
          repository: SuperInstance/constraint-theory-${{ matrix.repo }}
      
      - name: Run integration tests
        run: |
          case ${{ matrix.repo }} in
            core) cargo test --all-features ;;
            python) pytest tests/test_cross_repo.py ;;
            web) npm test ;;
            flow) npm run test:integration ;;
            ranch) npm run test:puzzles ;;
          esac
```

---

## Deployment Checklist

### Before Release

- [ ] All repos pass their test suites
- [ ] Cross-repo integration tests pass
- [ ] API signatures are synchronized
- [ ] Documentation is updated
- [ ] CHANGELOG.md is updated
- [ ] Version numbers are bumped correctly

### After Release

- [ ] PyPI package published (Python)
- [ ] crates.io package published (Rust)
- [ ] npm package published (TypeScript/WASM)
- [ ] GitHub release created with notes
- [ ] Documentation site updated

---

## Quick Links

| Repository | URL |
|------------|-----|
| constraint-theory-core | https://github.com/SuperInstance/constraint-theory-core |
| constraint-theory-python | https://github.com/SuperInstance/constraint-theory-python |
| constraint-theory-web | https://github.com/SuperInstance/constraint-theory-web |
| constraint-flow | https://github.com/SuperInstance/constraint-flow |
| constraint-ranch | https://github.com/SuperInstance/constraint-ranch |
| constraint-theory-research | https://github.com/SuperInstance/constraint-theory-research |

---

*"The constraint manifold is the substrate of reality."* - GUCT, Theorem U5
