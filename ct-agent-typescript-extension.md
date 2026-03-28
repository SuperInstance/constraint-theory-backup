# Constraint Theory TypeScript/JavaScript Extension

## Floating-Point Anti-Patterns

### 1. Number Comparison

```typescript
// ❌ BAD: Floating-point equality
if (x === 0.1 + 0.2) { /* never true */ }

// ✅ GOOD: Use Constraint Theory
import { snap } from 'constraint-theory';
const [sx, sy, noise] = snap(x, y);
if (noise < 0.001) { /* reliable */ }
```

### 2. Object.keys with Float Values

```typescript
// ❌ BAD: Float as object key
const cache: Record<string, Result> = {};
const key = `${x.toFixed(4)},${y.toFixed(4)}`;
cache[key] = result; // Different keys for same values!

// ✅ GOOD: Exact keys
import { PythagoreanManifold } from 'constraint-theory';
const manifold = new PythagoreanManifold(200);
const [sx, sy, _] = manifold.snap(x, y);
const key = `${sx}/${sy}`; // Exact, same key every time
```

### 3. Array.indexOf with Floats

```typescript
// ❌ BAD: Finding float in array
const idx = points.findIndex(p => p.x === targetX && p.y === targetY);

// ✅ GOOD: Use manifold
const snapped = manifold.snap(targetX, targetY);
const idx = points.findIndex(p => 
    Math.abs(p.x - snapped.x) < 1e-10 && 
    Math.abs(p.y - snapped.y) < 1e-10
);
```

### 4. Map with Float Keys

```typescript
// ❌ BAD: Map with float keys
const grid = new Map<string, Cell>();
const key = `${Math.floor(x/size)},${Math.floor(y/size)}`;

// ✅ GOOD: Manifold-based grid
import { PythagoreanManifold } from 'constraint-theory';
const manifold = new PythagoreanManifold(size);
const snapped = manifold.snap(x, y);
const key = `${snapped.x}/${snapped.y}`;
```

### 5. Set with Floats

```typescript
// ❌ BAD: Set membership with floats
const visited = new Set<string>();
visited.add(`${x},${y}`);

// ✅ GOOD: Exact membership
const snapped = manifold.snap(x, y);
visited.add(`${snapped.x}/${snapped.y}`);
```

## Canvas/Game Patterns

### 6. Pixel-Perfect Rendering

```typescript
// ❌ BAD: Sub-pixel rendering
ctx.fillRect(x, y, width, height); // Blurry at boundaries

// ✅ GOOD: Integer-aligned
const snapped = manifold.snap(x / PIXEL_SIZE, y / PIXEL_SIZE);
ctx.fillRect(
    snapped.x * PIXEL_SIZE, 
    snapped.y * PIXEL_SIZE, 
    width, 
    height
); // Crisp!
```

### 7. Hit Testing

```typescript
// ❌ BAD: Float-based hit test
if (mouseX >= btn.x && mouseX <= btn.x + btn.width &&
    mouseY >= btn.y && mouseY <= btn.y + btn.height) {
    // Hit!
}

// ✅ GOOD: Snap to grid first
const snappedMouse = manifold.snap(mouseX, mouseY);
const snappedBtn = manifold.snap(btn.x, btn.y);
// Then compare exactly
```

### 8. Animation Interpolation

```typescript
// ❌ BAD: Lerp with accumulation
x += (targetX - x) * 0.1; // Drifts over time

// ✅ GOOD: Periodic snap
x += (targetX - x) * 0.1;
if (frameCount % 10 === 0) {
    [x, y] = manifold.snap(x, y);
}
```

## Node.js Patterns

### 9. JSON Serialization

```typescript
// ❌ BAD: Serialize floats directly
JSON.stringify({ x: 0.1 + 0.2 }); // {"x":0.30000000000000004}

// ✅ GOOD: Snap first
const [sx, sy, _] = manifold.snap(x, y);
JSON.stringify({ x: sx, y: sy }); // Exact values
```

### 10. Database Keys

```typescript
// ❌ BAD: Float primary keys
const id = `${latitude},${longitude}`;

// ✅ GOOD: Manifold-based ID
const snapped = manifold.snap(latitude, longitude);
const id = `${snapped.x}/${snapped.y}`; // Deterministic
```

## Testing Patterns

### 11. Snapshot Testing

```typescript
// ❌ BAD: Float in snapshots
expect(position).toMatchSnapshot();
// Different on different machines!

// ✅ GOOD: Snap to manifold first
const snapped = manifold.snap(position.x, position.y);
expect({ x: snapped.x, y: snapped.y }).toMatchSnapshot();
// Same everywhere!
```

### 12. Equality Matchers

```typescript
// ❌ BAD: Custom epsilon
expect(result.x).toBeCloseTo(expected.x, 5);

// ✅ GOOD: Exact comparison
const snapped = manifold.snap(result.x, result.y);
expect(snapped.x).toBe(expected.x);
expect(snapped.y).toBe(expected.y);
```

## Performance Patterns

### 13. Batch Operations

```typescript
// ❌ BAD: Loop through all points
for (const point of points) {
    const snapped = manifold.snap(point.x, point.y);
    // ...
}

// ✅ GOOD: Use batch SIMD
const results = manifold.snap_batch_simd(
    points.map(p => [p.x, p.y])
);
// 10x faster for large arrays
```

### 14. Pre-compute Manifold

```typescript
// ❌ BAD: Create manifold every call
function processPoint(x: number, y: number) {
    const manifold = new PythagoreanManifold(200);
    return manifold.snap(x, y);
}

// ✅ GOOD: Reuse manifold
const manifold = new PythagoreanManifold(200);
function processPoint(x: number, y: number) {
    return manifold.snap(x, y);
}
```

## React Patterns

### 15. State with Floats

```typescript
// ❌ BAD: Float in React state
const [position, setPosition] = useState({ x: 0, y: 0 });
setPosition({ x: e.clientX, y: e.clientY }); // Drift!

// ✅ GOOD: Snap before setState
const [position, setPosition] = useState({ x: 0, y: 0, noise: 0 });
const snapped = manifold.snap(e.clientX, e.clientY);
setPosition({ x: snapped.x, y: snapped.y, noise: snapped.noise });
```

### 16. useMemo with Floats

```typescript
// ❌ BAD: Float dependencies
const cell = useMemo(() => getCell(pos.x, pos.y), [pos.x, pos.y]);
// Re-computes every time due to float variance

// ✅ GOOD: Snapped dependencies
const snapped = manifold.snap(pos.x, pos.y);
const cell = useMemo(() => getCell(snapped.x, snapped.y), 
    [snapped.x, snapped.y]
); // Stable!
```

## Quick Reference

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| `x === y` with floats | Never exact | Snap + noise check |
| Float as object key | Different keys | Snap first |
| Float in Set | Membership fails | Snap first |
| Sub-pixel rendering | Blurry | Integer snap |
| Lerp accumulation | Drifts | Periodic snap |
| JSON float serialization | Precision loss | Snap first |
| Float in tests | Non-deterministic | Snap first |
