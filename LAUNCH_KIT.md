# Constraint Theory Launch Kit

## Quick Reference

### URLs After Setup
| Resource | URL |
|----------|-----|
| Interactive Demo | https://constraint-theory.superinstance.ai |
| Rust Crate | https://crates.io/crates/constraint-theory-core |
| Python Package | https://pypi.org/project/constraint-theory/ |
| GitHub Org | https://github.com/SuperInstance |

---

## Hacker News Launch

### Recommended Title
```
Show HN: Constraint Theory – Snap vectors to exact Pythagorean coordinates via KD-tree (Rust)
```

### First Comment (Post Immediately)
```
Hey HN — I'm a developer who got into programming through spatial coordination problems. This library came out of wanting deterministic answers to geometric queries — when you're coordinating positions, you can't afford floating-point drift.

What it does: You give it a 2D vector, it snaps to the nearest exact Pythagorean triple (integer-ratio point on the unit circle) via KD-tree lookup in ~100ns. The output is always a valid geometric state by construction — there's no validation step because invalid states aren't in the search space.

What's interesting technically: The manifold is the set of all primitive Pythagorean triples up to a density parameter, normalized to unit vectors. By restricting computation to this discrete lattice, you get exact rational arithmetic for free. The KD-tree gives you O(log n) lookup.

Honest limitations:
- 2D only right now
- ~1000 states at default density
- Research-grade (tests pass, but not battle-tested in production)

Try the interactive demo at constraint-theory.superinstance.ai — drag points around and watch them snap.
```

### Timing
- **Best days**: Tuesday, Wednesday, Thursday
- **Best time**: 9-11 AM PST
- **Avoid**: Weekends, Monday mornings, Friday afternoons

---

## Twitter/X Launch

### Tweet Thread

**Tweet 1:**
```
After years of research, I'm open-sourcing Constraint Theory — a library for exact geometry with zero floating-point drift.

Snap any 2D vector to an exact Pythagorean triple in ~100ns.

78% less code. Forever exact. 🧵
```

**Tweet 2:**
```
The problem: 0.1 + 0.2 = 0.30000000000000004

With Constraint Theory: 0.6 + 0.8 = 1.0 — EXACT. ALWAYS.

How? Pythagorean triples (3/5, 4/5) are exact rational numbers. No epsilon comparisons needed.
```

**Tweet 3:**
```
Code comparison 👇

Standard approach: 287 chars, O(n²), floating-point drift
Constraint Theory: 62 chars, O(log n), exact forever

Sometimes the right abstraction is 5x simpler.
```

**Tweet 4:**
```
Try the interactive demo: constraint-theory.superinstance.ai

36+ simulations showing fractals, physics, geometry, and AI/ML concepts — all rendered with exact arithmetic.

GitHub: github.com/SuperInstance/constraint-theory-core
```

---

## Reddit Posts

### r/rust
**Title:** `Constraint Theory - exact geometric snapping with O(log n) KD-tree lookup`

**Body:**
```
Hi r/rust,

I've been working on a library that snaps 2D vectors to exact Pythagorean coordinates via KD-tree lookup. The core idea: restrict your state space to valid geometric configurations from the start.

Key features:
- ~100ns snap operation
- Zero dependencies
- SIMD batch processing
- 2D only (higher dimensions are open research)

[GitHub](https://github.com/SuperInstance/constraint-theory-core) | [Demo](https://constraint-theory.superinstance.ai)

Would love feedback on whether this abstraction is useful for game dev, scientific computing, or other domains.
```

### r/programming
**Title:** `Show r/programming: A different approach to floating-point issues — don't fix the drift, avoid it entirely`

**Body:**
```
The standard approach to floating-point issues is tolerance thresholds: "if abs(a - b) < epsilon, they're equal".

This library takes a different approach: restrict computations to a discrete lattice of valid states (Pythagorean triples). You can't drift if your state space doesn't include invalid configurations.

78% code reduction in practice because you skip the validation step entirely.

Demo: constraint-theory.superinstance.ai
```

---

## FAQ (Be Ready)

**Q: Why only 2D?**
A: Higher dimensions have more complex constraint structures. 3D Pythagorean quadruples exist but the density properties differ. It's open research.

**Q: What about performance?**
A: Single snap: ~100ns. Batch SIMD: ~74ns/op. The KD-tree is O(log n) where n is manifold density (~1000 states at default).

**Q: Is this production-ready?**
A: Tests pass and benchmarks are validated. But it's research-grade — I'd appreciate battle-testing feedback.

**Q: How does this compare to rational arithmetic libraries?**
A: Those give you exact arithmetic but don't constrain your state space. This does both: exact arithmetic + only valid geometric states.

**Q: Can this help with AI determinism?**
A: For geometric subproblems, yes. The "deterministic" guarantee is narrow — it's about exact coordinates, not general AI safety.

---

## Media Assets

### Screenshots to Capture
1. Mandelbrot simulation with zoom
2. Pythagorean manifold snapping demo
3. Code comparison side-by-side
4. Neural network visualization

### Tags for Discovery
`#rustlang` `#geometry` `#math` `#programming` `#opensource` `#gamedev` `#scientificcomputing`

---

*Good luck with the launch! 🚀*
