# Constraint Theory Implementation Agent 🤖

> **The killer app that makes Constraint Theory actionable. Audits your code, finds where exact methods win, refactors with expert explanations.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub](https://img.shields.io/badge/GitHub-SuperInstance%2Fconstraint--theory--agent-blue)](https://github.com/SuperInstance/constraint-theory-agent)

🌐 **Live Agent:** [constraint-theory.superinstance.ai/agent](https://constraint-theory.superinstance.ai/agent)

---

## What Is This?

A **specialized AI coding agent** that:
1. **Audits your codebase** - Finds floating-point drift, non-deterministic behavior, precision issues
2. **Identifies opportunities** - Where Constraint Theory's exact methods are superior
3. **Refactors your code** - Implements improvements with full explanations
4. **Educates your team** - Articulates why changes matter, with math backing

This is your **Constraint Theory Implementation Artist** - making complex ideas actionable.

---

## The Ah-Ha Moment

**Without this agent:**
```
Developer: "I heard about Constraint Theory but it seems complex. 
Where do I even start? How do I know if it applies to my codebase?"

Result: Great ideas remain unused. Floating-point bugs persist.
```

**With this agent:**
```
You: "Audit my physics engine"

Agent: "I found 23 opportunities for exact methods:
       1. collision-detection.ts:143 - Floating-point comparison 
          causes missed collisions at boundaries
          Fix: Use Pythagorean snapping for grid alignment
          Code reduction: 78%
          Explanation: [detailed math + practical example]
       
       2. particle-system.ts:89 - Accumulated position error 
          causes simulation drift over time
          Fix: Snap to manifold at each timestep
          Precision gain: From ε-machine-dependent to exact
       
       ... 21 more opportunities identified"

You: "Implement fixes 1, 2, and 5"

Agent: [Generates PR with refactored code, tests, and explanations]
```

---

## Quick Start (30 Seconds)

### Option 1: CLI Agent (Recommended)

```bash
# Install the agent
npm install -g @constraint-theory/agent

# Audit a project
ct-agent audit ./my-project

# Interactive mode
ct-agent chat
```

### Option 2: Use in Your Code

```typescript
import { ConstraintTheoryAgent } from '@constraint-theory/agent';

const agent = new ConstraintTheoryAgent();

// Audit code
const report = await agent.audit('./src');
console.log(report.opportunities);

// Get refactoring suggestions
const suggestions = await agent.suggest('collision-detection.ts');

// Apply fix
await agent.refactor('collision-detection.ts', { opportunity: 1 });
```

### Option 3: Human-Facing Chat

```bash
# Start interactive session
ct-agent chat --mode=expert

# Ask questions
> Why should I care about floating-point drift?

The agent explains in plain English with code examples.

> Audit my physics engine for precision issues

The agent finds issues and proposes fixes.
```

---

## What It Detects

### 1. Floating-Point Drift Patterns

```typescript
// ❌ Agent detects this
function normalize(v: number[]): number[] {
    const mag = Math.sqrt(v[0]**2 + v[1]**2);
    return [v[0] / mag, v[1] / mag]; // Drift accumulates
}

// ✅ Agent refactors to
import { snap } from 'constraint-theory';
function normalize(v: number[]): [number, number, number] {
    return snap(v[0], v[1]); // Exact. Forever.
}
```

### 2. Non-Deterministic Comparisons

```typescript
// ❌ Agent detects this
if (point.x === gridPoint.x && point.y === gridPoint.y) {
    // Missed due to floating-point!
}

// ✅ Agent refactors to
import { PythagoreanManifold } from 'constraint-theory';
const manifold = new PythagoreanManifold(200);
const snapped = manifold.snap(point.x, point.y);
if (snapped.noise < 0.001) { // Exact comparison
    // Always works!
}
```

### 3. Cross-Platform Reproducibility Issues

```typescript
// ❌ Agent detects this
const hash = position.toString(); // Different on different machines

// ✅ Agent refactors to
import { generate_triples } from 'constraint-theory';
const state = manifold.snap(position.x, position.y);
const hash = `${state.x}/${state.y}`; // Exact, reproducible
```

### 4. Performance Bottlenecks

```typescript
// ❌ Agent detects O(n²) geometry operations
function findNearest(point: Point, points: Point[]): Point {
    return points.reduce((best, p) => 
        distance(point, p) < distance(point, best) ? p : best
    ); // O(n) per query
}

// ✅ Agent refactors to O(log n)
import { PythagoreanManifold } from 'constraint-theory';
const manifold = new PythagoreanManifold(500);
// Pre-built KD-tree: O(log n) lookups
```

---

## Agent Modes

### Human-Facing Primary Agent

For **developers** who want explanations:

```bash
ct-agent chat --mode=expert
```

- Asks clarifying questions
- Provides step-by-step explanations
- Shows before/after code with reasoning
- Includes math background when helpful
- Suggests optimal solutions with trade-offs

### Agent-Facing Subagent

For **other AI systems** to call:

```typescript
// REST API
POST /api/audit
{
    "codebase": "./src",
    "focus": ["precision", "performance", "reproducibility"],
    "depth": "thorough"
}

// Response
{
    "opportunities": [...],
    "priority": "sorted by impact",
    "implementations": "ready-to-apply patches"
}
```

---

## Integration Points

| Use Case | What Agent Does |
|----------|-----------------|
| **Game Dev** | Finds non-deterministic physics, proposes exact alternatives |
| **CAD/Engineering** | Identifies precision issues in geometric operations |
| **Scientific Computing** | Finds reproducibility problems, proposes exact methods |
| **Robotics** | Detects sensor fusion drift, proposes constraint-based filtering |
| **Finance** | Finds monetary precision issues, proposes exact arithmetic |

---

## Example Session

```
You: Audit my collision detection system

Agent: I'll analyze your collision detection code...

Found 3 high-impact opportunities:

## 1. Grid Alignment Drift
**File:** `src/physics/collision.ts:143`
**Issue:** Floating-point grid alignment causes objects to 
vibrate at boundaries (30% of collision checks fail at edges)

**Current code:**
```typescript
const gridX = Math.round(position.x / GRID_SIZE) * GRID_SIZE;
const gridY = Math.round(position.y / GRID_SIZE) * GRID_SIZE;
if (Math.abs(position.x - gridX) < 0.001) { // Unreliable
    snapToGrid(gridX, gridY);
}
```

**Proposed fix:**
```typescript
import { PythagoreanManifold } from 'constraint-theory';

const manifold = new PythagoreanManifold(GRID_SIZE);
const snapped = manifold.snap(position.x, position.y);

if (snapped.noise < 0.01) { // Reliable, exact comparison
    snapToGrid(snapped.x, snapped.y);
}
```

**Impact:**
- Precision: From machine-dependent ε to exact
- Reliability: 100% grid alignment detection
- Performance: Same O(log n) lookup
- Code: 15% reduction

**Mathematical basis:**
The Pythagorean manifold maps continuous coordinates to 
exact integer-ratio points. The `noise` parameter measures 
geodesic distance from input to nearest valid state.

Should I implement this fix?

You: Yes, and also the second opportunity

Agent: Creating PR with both fixes...
[Generates complete PR with tests, documentation, and explanations]
```

---

## Technical Architecture

```
constraint-theory-agent/
├── packages/
│   ├── core/           # Core agent logic
│   ├── analyzer/       # Code analysis engine
│   ├── refactorer/     # Code transformation engine
│   ├── explainer/      # Human-readable explanations
│   └── cli/            # Command-line interface
├── prompts/
│   ├── audit.md        # Code audit prompt
│   ├── refactor.md     # Refactoring prompt
│   └── explain.md      # Explanation prompt
├── extensions/
│   ├── typescript/     # TypeScript-specific patterns
│   ├── python/         # Python-specific patterns
│   ├── rust/           # Rust-specific patterns
│   └── cpp/            # C++-specific patterns
└── templates/
    ├── game-dev/       # Game dev refactoring templates
    ├── scientific/     # Scientific computing templates
    └── cad/            # CAD/engineering templates
```

---

## Why This Is The Killer App

1. **Democratizes Complex Math** - Developers don't need to understand cohomology or manifolds to benefit
2. **Justifies Changes** - Every refactoring comes with clear explanations and math backing
3. **Automates Best Practices** - Turns "should I use exact methods?" into "here's exactly where to use them"
4. **Builds Trust** - Shows before/after, explains impact, lets developers decide

**Constraint Theory becomes accessible. Complex ideas become actionable improvements.**

---

## Ecosystem

| Repo | What It Does |
|------|--------------|
| **[constraint-theory-core](https://github.com/SuperInstance/constraint-theory-core)** | Rust crate - exact arithmetic |
| **[constraint-theory-python](https://github.com/SuperInstance/constraint-theory-python)** | Python bindings |
| **[constraint-theory-agent](https://github.com/SuperInstance/constraint-theory-agent)** | This repo - Implementation agent |
| **[constraint-ranch](https://github.com/SuperInstance/constraint-ranch)** | Gamified learning |
| **[constraint-flow](https://github.com/SuperInstance/constraint-flow)** | Business automation |

---

## License

MIT — see [LICENSE](LICENSE).
