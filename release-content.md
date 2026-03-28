TITLE: v0.1.0 — First Release: Exact Geometry for Python

BODY:
Python bindings for **Constraint Theory** — snap vectors to exact Pythagorean coordinates with zero floating-point drift, powered by Rust.

## Quick Example

```python
from constraint_theory import PythagoreanManifold

# Create manifold with ~1000 valid states
manifold = PythagoreanManifold(density=200)

# Snap any direction to nearest exact Pythagorean triple
x, y, noise = manifold.snap(0.577, 0.816)
# Result: (0.6, 0.8) — exact 3/5, 4/5 ratio
```

## Key Features

- **Zero Drift** — Vectors snap to exact Pythagorean triples (3/5, 4/5, etc.), eliminating floating-point accumulation errors
- **Blazing Fast** — Rust-powered KD-tree lookups in ~100ns via PyO3 bindings
- **Batch Processing** — SIMD-accelerated batch operations for thousands of vectors
- **Cross-Platform Determinism** — Same results on any machine, any architecture
- **Simple API** — Just `snap()` and `snap_batch()` — no configuration needed

## Installation

```bash
pip install constraint-theory
```

Or with NumPy support:

```bash
pip install constraint-theory[numpy]
```

## Core Crate

This package provides Python bindings for the Rust implementation:
**[constraint-theory-core](https://github.com/SuperInstance/constraint-theory-core)**

## What's Next

- Higher-dimensional generalizations (3D Pythagorean quadruples)
- GPU implementations (CUDA, WebGPU)
- More language bindings

See the [README](https://github.com/SuperInstance/constraint-theory-python#readme) for full documentation and examples.
