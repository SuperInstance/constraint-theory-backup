# Agent Onboarding Prompts for Constraint Theory Repositories

This document contains ready-to-use prompts for onboarding AI agents to work on each Constraint Theory repository.

---

## constraint-theory-core (Rust)

```
You are now working on constraint-theory-core, the Rust implementation of Constraint Theory.

## Repository Overview
- **Language:** Rust
- **Purpose:** Core library for exact constraint satisfaction using Pythagorean manifolds
- **Key Innovation:** Snap noisy floats to exact rational coordinates with O(log n) KD-tree lookups

## Quick Start
1. Read: `/home/z/my-project/repo-split/constraint-theory-core/ONBOARDING.md`
2. Build: `cd /home/z/my-project/repo-split/constraint-theory-core && cargo build --release`
3. Test: `cargo test`
4. Run examples: `cargo run --example basic`

## Key Concepts
- **Hidden Dimensions:** k = ⌈log₂(1/ε)⌉ - encodes precision logarithmically
- **Pythagorean Manifold:** Snap to exact rational coordinates (a/c, b/c) where a² + b² = c²
- **KD-Tree:** O(log n) spatial queries for nearest lattice points
- **SIMD:** 4-8x speedup for batch operations

## Key Files
- `src/lib.rs` - Main library entry point
- `src/manifold.rs` - PythagoreanManifold implementation
- `src/kdtree.rs` - KD-tree for spatial indexing
- `docs/MASTER_SCHEMA.md` - Complete API schema

## Current Tasks
- Review ONBOARDING.md for full documentation
- Check docs/INTEGRATION.md for Python/WASM integration
- See docs/RESEARCH_FOUNDATIONS.md for mathematical proofs

## Commands
- Build: `cargo build --release`
- Test: `cargo test`
- Bench: `cargo bench`
- Doc: `cargo doc --open`
- Format: `cargo fmt`
- Lint: `cargo clippy`
```

---

## constraint-theory-python

```
You are now working on constraint-theory-python, the Python bindings for Constraint Theory.

## Repository Overview
- **Language:** Python with PyO3 bindings to Rust
- **Purpose:** Python API for constraint satisfaction with NumPy/PyTorch integration
- **Key Innovation:** Same exact snapping as Rust with Python ease of use

## Quick Start
1. Read: `/home/z/my-project/repo-split/constraint-theory-python/ONBOARDING.md`
2. Install: `pip install constraint-theory`
3. Verify:
   ```python
   from constraint_theory import PythagoreanManifold
   m = PythagoreanManifold(density=200)
   result = m.snap(0.7, 0.7)
   print(result)  # (0.6, 0.8) - exact 3-4-5 triangle!
   ```

## Key Concepts
- **PythagoreanManifold(density=200)** - Create manifold with 200 points
- **snap(x, y)** - Snap single point to nearest lattice
- **snap_batch(points)** - Efficient batch snapping with SIMD
- **density parameter** - Higher = more precision, slower generation

## Key Files
- `constraint_theory/__init__.py` - Main module
- `src/lib.rs` - PyO3 bindings
- `docs/API.md` - Full API reference
- `examples/` - Working code examples

## Integration Patterns
- NumPy: `manifold.snap_batch(points)` returns ndarray
- PyTorch: Works with tensor conversions
- Jupyter: See docs/JUPYTER_INTEGRATION.md

## Commands
- Develop: `maturin develop --release`
- Test: `pytest tests/ -v`
- Format: `black . && isort .`
- Type check: `mypy constraint_theory/`
```

---

## constraint-theory-web

```
You are now working on constraint-theory-web, the interactive visualization platform.

## Repository Overview
- **Language:** TypeScript, HTML, CSS, JavaScript + WASM
- **Purpose:** 50+ interactive experiments demonstrating constraint theory
- **Key Features:** Zero dependencies, mobile-friendly, educational focus

## Quick Start
1. Read: `/home/z/my-project/repo-split/constraint-theory-web/ONBOARDING.md`
2. Run locally: Open `index.html` in browser OR use dev server
3. Explore experiments: `/experiments/stereographic/`, `/simulators/pythagorean/`

## Key Experiments
- `experiments/stereographic/` - Pythagorean manifold visualization
- `experiments/holographic/` - Holographic encoding demo
- `experiments/quaternion/` - 3D rotation snapping
- `simulators/pythagorean/` - Interactive snapping demo

## Key Files
- `index.html` - Main gallery page
- `experiments/*/app.js` - Experiment implementations
- `css/design-system.css` - Design tokens
- `docs/WASM_INTEGRATION.md` - WASM build instructions

## Creating New Experiments
1. Copy `experiments/_template/` (or any existing experiment)
2. Modify `app.js` with your visualization
3. Add entry to `index.html` experiments gallery
4. Follow accessibility guidelines in ONBOARDING.md

## Commands
- Dev: `npx serve .` or `python -m http.server`
- Build WASM: `wasm-pack build --target web`
- Validate: `npm run validate`
```

---

## constraint-flow

```
You are now working on constraint-flow, the business automation platform.

## Repository Overview
- **Language:** TypeScript
- **Purpose:** Workflow automation with constraint-based validation and exact arithmetic
- **Key Features:** Deterministic workflows, multi-agent coordination, enterprise compliance

## Quick Start
1. Read: `/home/z/my-project/repo-split/constraint-flow/ONBOARDING.md`
2. Install: `npm install`
3. Create workflow:
   ```typescript
   import { Workflow, Constraint } from 'constraint-flow';
   
   const workflow = new Workflow({
     name: 'Invoice Approval',
     constraints: [
       Constraint.amountLimit(10000),
       Constraint.timeLimit(3600000),
     ],
   });
   ```

## Key Concepts
- **Workflows:** DAG of steps with constraints
- **Constraints:** Temporal, Value, Approval, Geometric types
- **Exact Arithmetic:** No floating-point errors in financial calculations
- **Connectors:** Slack, GitHub, Jira integrations

## Key Files
- `src/types/workflow.ts` - Workflow type definitions
- `docs/SCHEMA.md` - Complete workflow schema
- `docs/ENTERPRISE.md` - SSO, compliance, disaster recovery
- `docs/SECURITY.md` - Security audit documentation

## Workflow Templates
- Incident Response: `templates/incident-response.ts`
- Invoice Approval: `templates/invoice-approval.ts`
- Content Review: `templates/content-review.ts`

## Commands
- Build: `npm run build`
- Test: `npm test`
- Lint: `npm run lint`
```

---

## constraint-ranch

```
You are now working on constraint-ranch, the gamified constraint learning platform.

## Repository Overview
- **Language:** TypeScript
- **Purpose:** Learn constraint theory through puzzles and agent breeding
- **Key Features:** 5 puzzle types, 8 agent species, 40 levels

## Quick Start
1. Read: `/home/z/my-project/repo-split/constraint-ranch/ONBOARDING.md`
2. Install: `npm install`
3. Run: `npm run dev`

## Key Concepts
- **Agent Species:** Chicken, Duck, Goat, Cattle, Sheep, Horse, Hog, Falcon
- **Puzzle Types:** Spatial, Breeding, Routing, Coordination, Advanced
- **Scoring:** Bonuses for speed, elegance; penalties for hints
- **Breeding:** Combine agent traits to create optimal offspring

## Key Files
- `puzzles/types.ts` - Puzzle type definitions
- `docs/GAME_LOGIC.md` - Complete game mechanics
- `docs/EDUCATION.md` - Learning objectives and curriculum
- `docs/SCHEMA.md` - JSON schemas

## Agent Species (Tiers)
- Starter: Chicken (monitoring), Duck (network)
- Network: Falcon (sync), Hog (hardware)
- Heavy: Cattle (reasoning), Horse (pipelines)
- Specialty: Goat (debug), Sheep (consensus)

## Commands
- Dev: `npm run dev`
- Build: `npm run build`
- Test: `npm test`
```

---

## constraint-theory-research

```
You are now working on constraint-theory-research, the academic papers repository.

## Repository Overview
- **Language:** LaTeX, Markdown
- **Purpose:** Peer-review-ready papers and research documentation
- **Key Papers:** Mathematical Foundations, Theoretical Guarantees, Applications

## Quick Start
1. Read: `/home/z/my-project/repo-split/constraint-theory-research/ONBOARDING.md`
2. Browse papers: `papers/` directory
3. Check index: `RESEARCH_INDEX.md` or `UNIFIED_RESEARCH_INDEX.md`

## Key Documents
- `papers/` - Academic papers (LaTeX)
- `MATHEMATICAL_FOUNDATIONS_DEEP_DIVE.md` - Core proofs
- `THEORETICAL_GUARANTEES.md` - Performance guarantees
- `papers/REFERENCES.bib` - Master bibliography

## Key Formulas
```
Hidden Dimensions:     k = ⌈log₂(1/ε)⌉
Holographic Accuracy:  accuracy(k,n) = k/n + O(1/log n)
Snap Density:          |S_ε| = O(ε⁻ᵐ)
```

## Paper Status
| Paper | arXiv | Status |
|-------|-------|--------|
| Mathematical Foundations | arXiv:2503.15847 | Ready |
| Theoretical Guarantees | In progress | Draft |
| Applications | Planned | Outline |

## Commands
- Build paper: `pdflatex paper.tex`
- Check citations: Check papers/REFERENCES.bib
- Validate: See papers/PUBLICATION_READINESS.md
```

---

## General Onboarding Template

For any repo, start with:

```
You are working on a Constraint Theory repository.

## Step 1: Read Onboarding
Read the ONBOARDING.md file in the repository root for complete documentation.

## Step 2: Understand Ecosystem
Read docs/ECOSYSTEM.md to understand how this repo fits with others.

## Step 3: Quick Reference
Use docs/QUICK_REFERENCE.md or docs/API.md for fast lookups.

## Step 4: Cross-Reference
Link to related repos:
- constraint-theory-core: Rust implementation
- constraint-theory-python: Python bindings
- constraint-theory-web: Visualizations
- constraint-flow: Business automation
- constraint-ranch: Gamification
- constraint-theory-research: Academic papers

## Key Formula (Universal)
Hidden dimensions: k = ⌈log₂(1/ε)⌉

This formula determines how many extra dimensions are needed to achieve precision ε.
```

---

## Task-Specific Prompts

### For Adding New Features:
```
Before adding features:
1. Check docs/MASTER_SCHEMA.md for API patterns
2. Review similar implementations in other repos
3. Ensure cross-repo compatibility
4. Add tests following existing patterns
5. Update ONBOARDING.md with new examples
```

### For Bug Fixes:
```
Before fixing bugs:
1. Check if bug exists in constraint-theory-core (root cause)
2. Verify fix doesn't break cross-repo compatibility
3. Add regression test
4. Update CHANGELOG.md
```

### For Documentation:
```
When updating docs:
1. Keep consistency with other repos' documentation
2. Cross-reference related repos
3. Update docs/README.md index
4. Follow the established documentation schema
```
