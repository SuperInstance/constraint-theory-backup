# Magic Eye Constraint Visualization: Practical Implementations

**Research Report - Iteration 2**
**Date:** 2025-01-17
**Focus:** Working implementations for Magic Eye-style constraint visualization

---

## Executive Summary

This iteration develops practical, working implementations for Magic Eye autostereogram visualization of constraint manifolds. Building on Iteration 1's theoretical foundations, we provide:

1. **Complete autostereogram generation algorithm** with constraint-specific depth mapping
2. **Depth-from-constraints mapping** converting violation measures to 3D depth
3. **WebGL-based interactive viewer** for real-time constraint exploration
4. **Pythagorean triple manifold demo** showing the constraint landscape in 3D
5. **Novel visualization techniques** including anaglyph, stereoscopic pairs, and animated autostereograms

**Key Innovation:** Constraint violations become depth in 3D space—humans can "see" constraint satisfaction as hidden 3D shapes that emerge from 2D patterns.

---

## 1. The Autostereogram Algorithm

### 1.1 Mathematical Foundation

Autostereograms encode depth through **horizontal disparity**. The core equation:

```
shift(x,y) = disparity(depth(x,y))
```

Where:
- `depth(x,y)` is the depth value at pixel (x,y), normalized [0,1]
- `disparity` converts depth to pixel shift
- `shift` is the horizontal offset applied to repeating patterns

**Stereogram Geometry:**

```
           Eye Separation: E
              |---E---|
              O       O    ← Eyes at distance V from image plane
               \     /
                \   /
                 \ /
                  ×      ← Virtual point at depth Z
                 / \
                /   \
               P1   P2   ← Separation S on image plane

Separation: S = E × V / (V + Z)
```

For constraint visualization, we map constraint violation to depth Z.

### 1.2 Core Autostereogram Generator

```javascript
/**
 * Magic Eye Autostereogram Generator for Constraint Visualization
 * 
 * Converts constraint manifolds to 3D autostereograms where depth
 * encodes constraint satisfaction structure.
 */
class AutostereogramGenerator {
    constructor(config = {}) {
        // Image dimensions
        this.width = config.width || 800;
        this.height = config.height || 600;
        
        // Stereogram parameters
        this.stripWidth = config.stripWidth || 80;      // Width of repeating pattern
        this.maxDisparity = config.maxDisparity || 30;  // Maximum pixel shift
        this.observationDistance = config.observationDistance || 300; // mm
        this.eyeSeparation = config.eyeSeparation || 65; // mm
        
        // Pattern options
        this.patternType = config.patternType || 'random'; // 'random', 'textured', 'colored'
        this.colorDepth = config.colorDepth || false; // Use color to enhance depth perception
        
        // Internal state
        this.patternBuffer = null;
        this.depthMap = null;
    }
    
    /**
     * Generate the base repeating pattern
     */
    generatePattern() {
        this.patternBuffer = new Float32Array(this.height * this.stripWidth * 3);
        
        switch (this.patternType) {
            case 'random':
                this.generateRandomPattern();
                break;
            case 'textured':
                this.generateTexturedPattern();
                break;
            case 'colored':
                this.generateColoredPattern();
                break;
            case 'constraint':
                this.generateConstraintPattern();
                break;
        }
        
        return this.patternBuffer;
    }
    
    /**
     * Random dot pattern (classic Magic Eye style)
     */
    generateRandomPattern() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.stripWidth; x++) {
                const idx = (y * this.stripWidth + x) * 3;
                const val = Math.random() * 255;
                this.patternBuffer[idx] = val;
                this.patternBuffer[idx + 1] = val;
                this.patternBuffer[idx + 2] = val;
            }
        }
    }
    
    /**
     * Textured pattern using noise functions
     */
    generateTexturedPattern() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.stripWidth; x++) {
                const idx = (y * this.stripWidth + x) * 3;
                
                // Multi-scale noise for texture
                const scale1 = this.simplexNoise(x * 0.1, y * 0.1) * 50;
                const scale2 = this.simplexNoise(x * 0.3, y * 0.3) * 30;
                const scale3 = this.simplexNoise(x * 0.7, y * 0.7) * 20;
                
                const val = 128 + scale1 + scale2 + scale3;
                const clamped = Math.max(0, Math.min(255, val));
                
                this.patternBuffer[idx] = clamped;
                this.patternBuffer[idx + 1] = clamped;
                this.patternBuffer[idx + 2] = clamped;
            }
        }
    }
    
    /**
     * Colored pattern with RGB variation
     */
    generateColoredPattern() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.stripWidth; x++) {
                const idx = (y * this.stripWidth + x) * 3;
                
                // Use different noise for each channel
                this.patternBuffer[idx] = 128 + this.simplexNoise(x * 0.1, y * 0.1) * 127;
                this.patternBuffer[idx + 1] = 128 + this.simplexNoise(x * 0.1 + 100, y * 0.1) * 127;
                this.patternBuffer[idx + 2] = 128 + this.simplexNoise(x * 0.1 + 200, y * 0.1) * 127;
            }
        }
    }
    
    /**
     * Pattern based on constraint topology
     */
    generateConstraintPattern() {
        // This pattern encodes hints about the constraint structure
        // even without depth information
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.stripWidth; x++) {
                const idx = (y * this.stripWidth + x) * 3;
                
                // Create pattern that suggests constraint boundaries
                const baseNoise = this.simplexNoise(x * 0.15, y * 0.15) * 60;
                const detail = this.simplexNoise(x * 0.5, y * 0.5) * 30;
                
                // Add subtle grid hints
                const gridX = (x % 20 < 2) ? 20 : 0;
                const gridY = (y % 20 < 2) ? 20 : 0;
                
                const val = 128 + baseNoise + detail + gridX + gridY;
                const clamped = Math.max(0, Math.min(255, val));
                
                this.patternBuffer[idx] = clamped;
                this.patternBuffer[idx + 1] = clamped * 0.9;
                this.patternBuffer[idx + 2] = clamped * 1.1;
            }
        }
    }
    
    /**
     * Simple 2D simplex noise implementation
     */
    simplexNoise(x, y) {
        // Permutation table
        if (!this.p) {
            this.p = new Uint8Array(256);
            for (let i = 0; i < 256; i++) this.p[i] = i;
            for (let i = 255; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.p[i], this.p[j]] = [this.p[j], this.p[i]];
            }
            this.perm = new Uint8Array(512);
            for (let i = 0; i < 512; i++) this.perm[i] = this.p[i & 255];
        }
        
        const F2 = 0.5 * (Math.sqrt(3) - 1);
        const G2 = (3 - Math.sqrt(3)) / 6;
        
        const s = (x + y) * F2;
        const i = Math.floor(x + s);
        const j = Math.floor(y + s);
        
        const t = (i + j) * G2;
        const X0 = i - t;
        const Y0 = j - t;
        const x0 = x - X0;
        const y0 = y - Y0;
        
        const i1 = x0 > y0 ? 1 : 0;
        const j1 = x0 > y0 ? 0 : 1;
        
        const x1 = x0 - i1 + G2;
        const y1 = y0 - j1 + G2;
        const x2 = x0 - 1 + 2 * G2;
        const y2 = y0 - 1 + 2 * G2;
        
        const ii = i & 255;
        const jj = j & 255;
        
        const grad = (hash, x, y) => {
            const h = hash & 7;
            const u = h < 4 ? x : y;
            const v = h < 4 ? y : x;
            return ((h & 1) ? -u : u) + ((h & 2) ? -2 * v : 2 * v);
        };
        
        let n0 = 0, n1 = 0, n2 = 0;
        
        let t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 >= 0) {
            t0 *= t0;
            n0 = t0 * t0 * grad(this.perm[ii + this.perm[jj]], x0, y0);
        }
        
        let t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 >= 0) {
            t1 *= t1;
            n1 = t1 * t1 * grad(this.perm[ii + i1 + this.perm[jj + j1]], x1, y1);
        }
        
        let t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 >= 0) {
            t2 *= t2;
            n2 = t2 * t2 * grad(this.perm[ii + 1 + this.perm[jj + 1]], x2, y2);
        }
        
        return 70 * (n0 + n1 + n2);
    }
    
    /**
     * Generate autostereogram from depth map
     * 
     * @param {Float32Array} depthMap - 2D array of depth values [0,1] where 1 = closest
     * @returns {Uint8ClampedArray} RGB image data
     */
    generate(depthMap) {
        this.depthMap = depthMap;
        
        if (!this.patternBuffer) {
            this.generatePattern();
        }
        
        const output = new Uint8ClampedArray(this.width * this.height * 3);
        
        // Create linking array for constrained pixels
        const linked = new Int32Array(this.width);
        
        for (let y = 0; y < this.height; y++) {
            const rowOffset = y * this.width;
            const patternY = y % this.height;
            
            // Initialize linking
            for (let x = 0; x < this.width; x++) {
                linked[x] = x;
            }
            
            // Process each pixel
            for (let x = 0; x < this.width; x++) {
                const depth = depthMap[y * this.width + x];
                
                // Calculate disparity from depth
                // Depth 0 = background (no shift), Depth 1 = foreground (max shift)
                const disparity = Math.floor(depth * this.maxDisparity);
                
                if (disparity > 0 && x >= this.stripWidth) {
                    // Link pixel to its partner
                    const partner = x - this.stripWidth + disparity;
                    
                    if (partner >= 0 && partner < x) {
                        linked[x] = linked[partner];
                    }
                }
            }
            
            // Color pixels based on linking
            for (let x = 0; x < this.width; x++) {
                const idx = (rowOffset + x) * 3;
                
                if (linked[x] < this.stripWidth) {
                    // Use pattern
                    const patternIdx = (patternY * this.stripWidth + linked[x]) * 3;
                    output[idx] = this.patternBuffer[patternIdx];
                    output[idx + 1] = this.patternBuffer[patternIdx + 1];
                    output[idx + 2] = this.patternBuffer[patternIdx + 2];
                } else {
                    // Copy from linked pixel
                    const linkedIdx = (rowOffset + linked[x]) * 3;
                    output[idx] = output[linkedIdx];
                    output[idx + 1] = output[linkedIdx + 1];
                    output[idx + 2] = output[linkedIdx + 2];
                }
                
                // Add depth color hint if enabled
                if (this.colorDepth) {
                    const depth = depthMap[y * this.width + x];
                    // Subtle blue shift for near objects
                    output[idx + 2] = Math.min(255, output[idx + 2] + depth * 20);
                }
            }
        }
        
        return output;
    }
    
    /**
     * Calculate viewing parameters
     */
    getViewingInstructions() {
        return {
            optimalDistance: `${this.observationDistance}mm`,
            instructions: [
                "1. Hold image at arm's length from face",
                "2. Look 'through' the image as if focusing on a distant object",
                "3. Slowly move image closer while maintaining soft focus",
                "4. The 3D shape will 'pop out' when eyes diverge correctly",
                "",
                "Alternative: Place image on screen, position nose close,",
                "slowly pull back while keeping eyes relaxed"
            ],
            expectedDepth: `0-${this.maxDisparity}px disparity range`
        };
    }
}

// Export for module use
if (typeof module !== 'undefined') {
    module.exports = { AutostereogramGenerator };
}
```

---

## 2. Depth-from-Constraints Mapping

### 2.1 Theory: Constraints as Depth

The key insight is that constraint violation measures naturally map to depth:

| Constraint State | Depth | Visual Perception |
|-----------------|-------|-------------------|
| Satisfied (violation = 0) | Background | Far, flat |
| Minor violation | Mid-depth | Slight protrusion |
| Major violation | Foreground | Strong protrusion |
| Tight constraint | Near | Sharp edge |
| Loose constraint | Far | Smooth transition |

### 2.2 Depth Mapping Functions

```javascript
/**
 * Depth Mapping for Constraint Visualization
 * 
 * Converts constraint violations and properties to depth values
 * for autostereogram generation.
 */
class ConstraintDepthMapper {
    constructor(config = {}) {
        this.width = config.width || 800;
        this.height = config.height || 600;
        this.smoothing = config.smoothing || 5; // Gaussian blur sigma
        this.normalizeMethod = config.normalizeMethod || 'minmax';
    }
    
    /**
     * Map constraint violations to depth values
     * 
     * @param {Array} constraints - Array of constraint objects
     * @param {Function} violationFn - Function to compute violation value
     * @param {Function} positionFn - Function to get 2D position
     * @returns {Float32Array} Depth map [0,1]
     */
    violationsToDepth(constraints, violationFn, positionFn) {
        const depthMap = new Float32Array(this.width * this.height);
        
        // First pass: mark constraint positions
        const rawDepth = new Float32Array(this.width * this.height);
        
        for (const constraint of constraints) {
            const pos = positionFn(constraint, this.width, this.height);
            const violation = violationFn(constraint);
            
            if (pos.x >= 0 && pos.x < this.width && 
                pos.y >= 0 && pos.y < this.height) {
                const idx = pos.y * this.width + pos.x;
                rawDepth[idx] = violation;
            }
        }
        
        // Second pass: smooth the depth map
        this.gaussianBlur(rawDepth, depthMap, this.smoothing);
        
        // Normalize to [0, 1]
        this.normalize(depthMap);
        
        return depthMap;
    }
    
    /**
     * Map Pythagorean triple manifold to depth
     * 
     * The manifold of integer solutions to a² + b² = c²
     * creates a beautiful landscape when viewed in 3D.
     */
    pythagoreanManifoldDepth(maxC = 50, depthType = 'primitive') {
        const depthMap = new Float32Array(this.width * this.height);
        
        // Generate all Pythagorean triples up to maxC
        const triples = this.generatePythagoreanTriples(maxC);
        
        // Map each triple to the depth map
        for (const triple of triples) {
            // Use (m, n) parameterization for 2D position
            const maxM = Math.sqrt(maxC);
            const x = Math.floor((triple.m / maxM) * (this.width - 1));
            const y = Math.floor((triple.n / maxM) * (this.height - 1));
            
            if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                const idx = y * this.width + x;
                
                let depth;
                switch (depthType) {
                    case 'primitive':
                        // Primitive triples are prominent
                        depth = triple.primitive ? 0.9 : 0.3;
                        break;
                    case 'hypotenuse':
                        // Depth based on hypotenuse length
                        depth = triple.c / maxC;
                        break;
                    case 'scale':
                        // Depth based on scaling factor
                        depth = 1 - Math.min(triple.k / 10, 1);
                        break;
                    case 'density':
                        // Depth based on local density
                        depth = 0.5 + 0.5 * Math.sin(triple.m) * Math.cos(triple.n);
                        break;
                    default:
                        depth = 0.5;
                }
                
                depthMap[idx] = Math.max(depthMap[idx], depth);
            }
        }
        
        // Smooth the result
        const smoothed = new Float32Array(this.width * this.height);
        this.gaussianBlur(depthMap, smoothed, 3);
        this.normalize(smoothed);
        
        return { depthMap: smoothed, triples };
    }
    
    /**
     * Generate Pythagorean triples up to max hypotenuse
     */
    generatePythagoreanTriples(maxC) {
        const triples = [];
        const maxM = Math.ceil(Math.sqrt(maxC));
        
        for (let m = 2; m < maxM; m++) {
            for (let n = 1; n < m; n++) {
                // Check if primitive
                if (this.gcd(m, n) !== 1) continue;
                if ((m + n) % 2 === 0) continue;
                
                const a = m * m - n * n;
                const b = 2 * m * n;
                const c = m * m + n * n;
                
                // Add scaled versions
                let k = 1;
                while (k * c <= maxC) {
                    triples.push({
                        a: k * a,
                        b: k * b,
                        c: k * c,
                        m, n, k,
                        primitive: k === 1
                    });
                    k++;
                }
            }
        }
        
        return triples;
    }
    
    /**
     * Map constraint satisfaction to depth for a CSP
     * 
     * For constraint satisfaction problems, visualize how
     * different regions of the solution space relate to
     * constraint tightness.
     */
    cspDepthMap(variables, constraints, domainSize) {
        const depthMap = new Float32Array(this.width * this.height);
        
        // Sample the solution space
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                // Map (x,y) to variable assignments
                const assignments = this.pixelToAssignments(
                    x, y, this.width, this.height, variables, domainSize
                );
                
                // Evaluate constraint tightness
                let totalViolation = 0;
                for (const constraint of constraints) {
                    const violation = constraint.evaluate(assignments);
                    totalViolation += violation;
                }
                
                // Map to depth (inverted: low violation = near)
                depthMap[y * this.width + x] = 1 - Math.min(totalViolation / constraints.length, 1);
            }
        }
        
        return depthMap;
    }
    
    /**
     * Create a 3D surface from constraint manifold
     * 
     * This generates a depth map representing a surface
     * where constraint satisfaction determines height.
     */
    manifoldSurfaceDepth(manifoldFn, xRange, yRange) {
        const depthMap = new Float32Array(this.width * this.height);
        
        for (let py = 0; py < this.height; py++) {
            for (let px = 0; px < this.width; px++) {
                // Map pixel to manifold coordinates
                const x = xRange[0] + (px / this.width) * (xRange[1] - xRange[0]);
                const y = yRange[0] + (py / this.height) * (yRange[1] - yRange[0]);
                
                // Evaluate manifold function
                const value = manifoldFn(x, y);
                
                // Map to depth
                depthMap[py * this.width + px] = (value + 1) / 2;
            }
        }
        
        this.normalize(depthMap);
        return depthMap;
    }
    
    /**
     * Animated depth map for time-varying constraints
     * 
     * Creates depth maps that change over time, useful for
     * visualizing constraint dynamics.
     */
    animatedDepthMap(baseDepthMap, time, options = {}) {
        const {
            waveAmplitude = 0.1,
            waveFrequency = 0.5,
            waveSpeed = 1.0,
            pulseAmplitude = 0.05
        } = options;
        
        const animated = new Float32Array(this.width * this.height);
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const idx = y * this.width + x;
                const baseDepth = baseDepthMap[idx];
                
                // Add wave motion
                const wave = waveAmplitude * Math.sin(
                    waveFrequency * x / this.width * Math.PI * 2 - time * waveSpeed
                );
                
                // Add pulsing
                const pulse = pulseAmplitude * Math.sin(time * 2) * baseDepth;
                
                animated[idx] = Math.max(0, Math.min(1, baseDepth + wave + pulse));
            }
        }
        
        return animated;
    }
    
    /**
     * Apply Gaussian blur for smoother depth maps
     */
    gaussianBlur(input, output, sigma) {
        const kernel = this.createGaussianKernel(sigma);
        const kernelRadius = Math.floor(kernel.length / 2);
        
        // Temporary buffer
        const temp = new Float32Array(this.width * this.height);
        
        // Horizontal pass
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                let sum = 0;
                let weightSum = 0;
                
                for (let k = -kernelRadius; k <= kernelRadius; k++) {
                    const px = Math.max(0, Math.min(this.width - 1, x + k));
                    const weight = kernel[k + kernelRadius];
                    sum += input[y * this.width + px] * weight;
                    weightSum += weight;
                }
                
                temp[y * this.width + x] = sum / weightSum;
            }
        }
        
        // Vertical pass
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                let sum = 0;
                let weightSum = 0;
                
                for (let k = -kernelRadius; k <= kernelRadius; k++) {
                    const py = Math.max(0, Math.min(this.height - 1, y + k));
                    const weight = kernel[k + kernelRadius];
                    sum += temp[py * this.width + x] * weight;
                    weightSum += weight;
                }
                
                output[y * this.width + x] = sum / weightSum;
            }
        }
    }
    
    createGaussianKernel(sigma) {
        const radius = Math.ceil(sigma * 3);
        const kernel = new Float32Array(2 * radius + 1);
        
        for (let i = -radius; i <= radius; i++) {
            kernel[i + radius] = Math.exp(-(i * i) / (2 * sigma * sigma));
        }
        
        return kernel;
    }
    
    /**
     * Normalize depth map to [0, 1] range
     */
    normalize(depthMap) {
        let min = Infinity;
        let max = -Infinity;
        
        for (let i = 0; i < depthMap.length; i++) {
            if (depthMap[i] < min) min = depthMap[i];
            if (depthMap[i] > max) max = depthMap[i];
        }
        
        const range = max - min || 1;
        
        for (let i = 0; i < depthMap.length; i++) {
            depthMap[i] = (depthMap[i] - min) / range;
        }
    }
    
    /**
     * Utility: Greatest Common Divisor
     */
    gcd(a, b) {
        while (b) {
            [a, b] = [b, a % b];
        }
        return a;
    }
    
    /**
     * Map pixel coordinates to variable assignments
     */
    pixelToAssignments(px, py, width, height, variables, domainSize) {
        const assignments = {};
        
        // Simple mapping: use pixel position to encode first few variables
        const bits = Math.log2(domainSize);
        const valuesPerPixel = Math.pow(2, bits);
        
        let remaining = px + py * width;
        for (const varName of variables) {
            assignments[varName] = remaining % domainSize;
            remaining = Math.floor(remaining / domainSize);
        }
        
        return assignments;
    }
}

// Export
if (typeof module !== 'undefined') {
    module.exports = { ConstraintDepthMapper };
}
```

---

## 3. WebGL Interactive Viewer

### 3.1 Real-Time Constraint Explorer

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Magic Eye Constraint Visualizer</title>
    <style>
        :root {
            --bg: #0a0a12;
            --fg: #e0e0e8;
            --accent: #00ffff;
            --accent2: #ff00ff;
            --card: #12121a;
            --border: #2a2a3a;
        }
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body {
            font-family: 'IBM Plex Mono', monospace;
            background: var(--bg);
            color: var(--fg);
            min-height: 100vh;
        }
        
        .container {
            display: grid;
            grid-template-columns: 1fr 320px;
            gap: 1rem;
            padding: 1rem;
            max-width: 1400px;
            margin: 0 auto;
        }
        
        .main-view {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        
        .viewer-container {
            position: relative;
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 8px;
            overflow: hidden;
        }
        
        #stereogramCanvas {
            width: 100%;
            height: auto;
            display: block;
        }
        
        .viewer-header {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            padding: 0.5rem 1rem;
            background: linear-gradient(transparent, transparent);
            display: flex;
            justify-content: space-between;
            align-items: center;
            pointer-events: none;
        }
        
        .viewer-header > * {
            pointer-events: auto;
        }
        
        .view-mode {
            display: flex;
            gap: 0.5rem;
        }
        
        .view-mode button {
            background: var(--card);
            border: 1px solid var(--border);
            color: var(--fg);
            padding: 0.5rem 1rem;
            border-radius: 4px;
            cursor: pointer;
            font-family: inherit;
            font-size: 0.875rem;
            transition: all 0.2s;
        }
        
        .view-mode button:hover {
            border-color: var(--accent);
            color: var(--accent);
        }
        
        .view-mode button.active {
            background: var(--accent);
            color: var(--bg);
            border-color: var(--accent);
        }
        
        .controls {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 1rem;
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        
        .control-group {
            border-bottom: 1px solid var(--border);
            padding-bottom: 1rem;
        }
        
        .control-group:last-child {
            border-bottom: none;
            padding-bottom: 0;
        }
        
        .control-group h3 {
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: var(--accent);
            margin-bottom: 0.75rem;
        }
        
        .control-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.5rem;
        }
        
        .control-row label {
            font-size: 0.875rem;
        }
        
        .control-row input[type="range"] {
            width: 150px;
            accent-color: var(--accent);
        }
        
        .control-row .value {
            font-size: 0.75rem;
            color: var(--accent);
            width: 40px;
            text-align: right;
        }
        
        select, button.btn {
            background: var(--bg);
            border: 1px solid var(--border);
            color: var(--fg);
            padding: 0.5rem;
            border-radius: 4px;
            font-family: inherit;
            font-size: 0.875rem;
            width: 100%;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        select:hover, button.btn:hover {
            border-color: var(--accent);
        }
        
        button.btn-primary {
            background: var(--accent);
            color: var(--bg);
            border-color: var(--accent);
            font-weight: 600;
        }
        
        button.btn-primary:hover {
            background: transparent;
            color: var(--accent);
        }
        
        .instructions-box {
            background: rgba(0, 255, 255, 0.1);
            border: 1px solid var(--accent);
            border-radius: 4px;
            padding: 0.75rem;
            font-size: 0.75rem;
            line-height: 1.5;
        }
        
        .instructions-box h4 {
            color: var(--accent);
            margin-bottom: 0.5rem;
        }
        
        .depth-preview {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.5rem;
            margin-top: 0.5rem;
        }
        
        .depth-preview canvas {
            width: 100%;
            height: 80px;
            background: var(--bg);
            border-radius: 4px;
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 0.5rem;
            font-size: 0.75rem;
        }
        
        .stat {
            background: var(--bg);
            padding: 0.5rem;
            border-radius: 4px;
        }
        
        .stat-label {
            color: #888;
            text-transform: uppercase;
            font-size: 0.625rem;
            letter-spacing: 0.05em;
        }
        
        .stat-value {
            color: var(--accent);
            font-size: 1rem;
            font-weight: 600;
        }
        
        .anaglyph-view {
            display: flex;
            gap: 2px;
        }
        
        .anaglyph-view canvas {
            flex: 1;
        }
        
        @media (max-width: 900px) {
            .container {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="main-view">
            <div class="viewer-container">
                <canvas id="stereogramCanvas" width="800" height="600"></canvas>
                <div class="viewer-header">
                    <div class="view-mode">
                        <button id="modeMagicEye" class="active">Magic Eye</button>
                        <button id="modeDepthMap">Depth Map</button>
                        <button id="modeAnaglyph">Anaglyph</button>
                        <button id="modeCrossEyed">Cross-Eyed</button>
                    </div>
                </div>
            </div>
            
            <div class="controls" style="flex-direction: row; flex-wrap: wrap;">
                <div class="control-group" style="flex: 1; min-width: 200px; border-bottom: none;">
                    <h3>Animation</h3>
                    <button id="animateBtn" class="btn btn-primary">▶ Animate</button>
                </div>
                <div class="control-group" style="flex: 1; min-width: 200px; border-bottom: none;">
                    <h3>Scene</h3>
                    <select id="sceneSelect">
                        <option value="pythagorean">Pythagorean Manifold</option>
                        <option value="sphere">Constraint Sphere</option>
                        <option value="wave">Violation Wave</option>
                        <option value="mountains">Constraint Mountains</option>
                        <option value="text">Constraint Text</option>
                    </select>
                </div>
                <div class="control-group" style="flex: 1; min-width: 200px; border-bottom: none;">
                    <h3>Export</h3>
                    <button id="exportBtn" class="btn">💾 Export PNG</button>
                </div>
            </div>
        </div>
        
        <div class="controls">
            <div class="control-group">
                <h3>Stereogram Parameters</h3>
                <div class="control-row">
                    <label>Strip Width</label>
                    <input type="range" id="stripWidth" min="40" max="120" value="80">
                    <span class="value" id="stripWidthVal">80</span>
                </div>
                <div class="control-row">
                    <label>Max Depth</label>
                    <input type="range" id="maxDepth" min="10" max="50" value="30">
                    <span class="value" id="maxDepthVal">30</span>
                </div>
                <div class="control-row">
                    <label>Smoothing</label>
                    <input type="range" id="smoothing" min="1" max="20" value="5">
                    <span class="value" id="smoothingVal">5</span>
                </div>
            </div>
            
            <div class="control-group">
                <h3>Pattern Options</h3>
                <select id="patternType">
                    <option value="random">Random Dots</option>
                    <option value="textured">Textured</option>
                    <option value="colored">Colored Noise</option>
                    <option value="constraint">Constraint Pattern</option>
                </select>
                <div class="control-row" style="margin-top: 0.5rem;">
                    <label>Color Depth</label>
                    <input type="checkbox" id="colorDepth">
                </div>
            </div>
            
            <div class="control-group">
                <h3>Constraint Visualization</h3>
                <select id="depthType">
                    <option value="primitive">Primitive vs Scaled</option>
                    <option value="hypotenuse">Hypotenuse Length</option>
                    <option value="scale">Scale Factor</option>
                    <option value="density">Local Density</option>
                </select>
            </div>
            
            <div class="control-group">
                <h3>Statistics</h3>
                <div class="stats">
                    <div class="stat">
                        <div class="stat-label">Triples</div>
                        <div class="stat-value" id="tripleCount">0</div>
                    </div>
                    <div class="stat">
                        <div class="stat-label">Primitives</div>
                        <div class="stat-value" id="primitiveCount">0</div>
                    </div>
                    <div class="stat">
                        <div class="stat-label">Max C</div>
                        <div class="stat-value" id="maxC">50</div>
                    </div>
                    <div class="stat">
                        <div class="stat-label">FPS</div>
                        <div class="stat-value" id="fps">60</div>
                    </div>
                </div>
            </div>
            
            <div class="control-group">
                <h3>Depth Preview</h3>
                <div class="depth-preview">
                    <canvas id="depthPreviewSmall" width="160" height="120"></canvas>
                    <canvas id="patternPreview" width="160" height="120"></canvas>
                </div>
            </div>
            
            <div class="instructions-box">
                <h4>How to View</h4>
                <p>Hold image at arm's length. Relax eyes as if looking at a distant object. Slowly bring image closer while maintaining soft focus. The 3D shape will emerge!</p>
            </div>
        </div>
    </div>
    
    <script>
    // ==========================================
    // Magic Eye Constraint Visualizer
    // WebGL-powered interactive viewer
    // ==========================================
    
    class MagicEyeVisualizer {
        constructor() {
            // Canvas elements
            this.canvas = document.getElementById('stereogramCanvas');
            this.ctx = this.canvas.getContext('2d');
            this.depthPreview = document.getElementById('depthPreviewSmall');
            this.depthPreviewCtx = this.depthPreview.getContext('2d');
            this.patternPreview = document.getElementById('patternPreview');
            this.patternPreviewCtx = this.patternPreview.getContext('2d');
            
            // Configuration
            this.config = {
                width: 800,
                height: 600,
                stripWidth: 80,
                maxDisparity: 30,
                smoothing: 5,
                patternType: 'random',
                colorDepth: false,
                depthType: 'primitive',
                maxC: 50
            };
            
            // State
            this.depthMap = null;
            this.patternBuffer = null;
            this.isAnimating = false;
            this.animationTime = 0;
            this.viewMode = 'magicEye';
            this.sceneType = 'pythagorean';
            
            // Data
            this.triples = [];
            this.primitiveCount = 0;
            
            // Performance tracking
            this.lastFrameTime = performance.now();
            this.frameCount = 0;
            this.fps = 60;
            
            // Initialize
            this.initControls();
            this.generateScene();
            this.render();
        }
        
        initControls() {
            // View mode buttons
            ['modeMagicEye', 'modeDepthMap', 'modeAnaglyph', 'modeCrossEyed'].forEach(id => {
                document.getElementById(id).addEventListener('click', (e) => {
                    document.querySelectorAll('.view-mode button').forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                    this.viewMode = id.replace('mode', '').toLowerCase();
                    this.render();
                });
            });
            
            // Parameter controls
            this.bindSlider('stripWidth', 'stripWidthVal', v => {
                this.config.stripWidth = v;
                this.generatePattern();
                this.render();
            });
            
            this.bindSlider('maxDepth', 'maxDepthVal', v => {
                this.config.maxDisparity = v;
                this.render();
            });
            
            this.bindSlider('smoothing', 'smoothingVal', v => {
                this.config.smoothing = v;
                this.generateScene();
            });
            
            // Selects
            document.getElementById('patternType').addEventListener('change', e => {
                this.config.patternType = e.target.value;
                this.generatePattern();
                this.render();
            });
            
            document.getElementById('depthType').addEventListener('change', e => {
                this.config.depthType = e.target.value;
                this.generateScene();
            });
            
            document.getElementById('sceneSelect').addEventListener('change', e => {
                this.sceneType = e.target.value;
                this.generateScene();
            });
            
            // Checkbox
            document.getElementById('colorDepth').addEventListener('change', e => {
                this.config.colorDepth = e.target.checked;
                this.render();
            });
            
            // Animation
            document.getElementById('animateBtn').addEventListener('click', () => {
                this.isAnimating = !this.isAnimating;
                document.getElementById('animateBtn').textContent = 
                    this.isAnimating ? '⏸ Pause' : '▶ Animate';
                if (this.isAnimating) this.animate();
            });
            
            // Export
            document.getElementById('exportBtn').addEventListener('click', () => {
                const link = document.createElement('a');
                link.download = 'constraint-stereogram.png';
                link.href = this.canvas.toDataURL();
                link.click();
            });
        }
        
        bindSlider(sliderId, valueId, callback) {
            const slider = document.getElementById(sliderId);
            const valueSpan = document.getElementById(valueId);
            
            slider.addEventListener('input', e => {
                const value = parseInt(e.target.value);
                valueSpan.textContent = value;
                callback(value);
            });
        }
        
        generateScene() {
            switch (this.sceneType) {
                case 'pythagorean':
                    this.generatePythagoreanScene();
                    break;
                case 'sphere':
                    this.generateSphereScene();
                    break;
                case 'wave':
                    this.generateWaveScene();
                    break;
                case 'mountains':
                    this.generateMountainScene();
                    break;
                case 'text':
                    this.generateTextScene();
                    break;
            }
            
            this.updateStats();
            this.render();
        }
        
        generatePythagoreanScene() {
            const { width, height, smoothing, depthType, maxC } = this.config;
            this.depthMap = new Float32Array(width * height);
            
            // Generate triples
            this.triples = [];
            this.primitiveCount = 0;
            
            const maxM = Math.ceil(Math.sqrt(maxC));
            for (let m = 2; m < maxM; m++) {
                for (let n = 1; n < m; n++) {
                    if (this.gcd(m, n) !== 1) continue;
                    if ((m + n) % 2 === 0) continue;
                    
                    const a = m * m - n * n;
                    const b = 2 * m * n;
                    const c = m * m + n * n;
                    
                    let k = 1;
                    while (k * c <= maxC) {
                        const isPrimitive = k === 1;
                        this.triples.push({ a: k * a, b: k * b, c: k * c, m, n, k, primitive: isPrimitive });
                        if (isPrimitive) this.primitiveCount++;
                        k++;
                    }
                }
            }
            
            // Create depth map
            const rawDepth = new Float32Array(width * height);
            
            for (const triple of this.triples) {
                const maxM_ = Math.sqrt(maxC);
                const x = Math.floor((triple.m / maxM_) * (width - 1));
                const y = Math.floor((triple.n / maxM_) * (height - 1));
                
                if (x >= 0 && x < width && y >= 0 && y < height) {
                    const idx = y * width + x;
                    
                    let depth;
                    switch (depthType) {
                        case 'primitive':
                            depth = triple.primitive ? 0.9 : 0.3;
                            break;
                        case 'hypotenuse':
                            depth = triple.c / maxC;
                            break;
                        case 'scale':
                            depth = 1 - Math.min(triple.k / 10, 0.9);
                            break;
                        case 'density':
                            depth = 0.5 + 0.4 * Math.sin(triple.m * 0.5) * Math.cos(triple.n * 0.5);
                            break;
                        default:
                            depth = 0.5;
                    }
                    
                    rawDepth[idx] = Math.max(rawDepth[idx], depth);
                }
            }
            
            // Smooth
            this.gaussianBlur(rawDepth, this.depthMap, smoothing);
            this.normalizeDepthMap();
            
            this.updateDepthPreview();
        }
        
        generateSphereScene() {
            const { width, height } = this.config;
            this.depthMap = new Float32Array(width * height);
            
            const cx = width / 2;
            const cy = height / 2;
            const radius = Math.min(width, height) * 0.35;
            
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const dx = x - cx;
                    const dy = y - cy;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist < radius) {
                        // Sphere depth: z = sqrt(r² - x² - y²)
                        const z = Math.sqrt(radius * radius - dist * dist);
                        this.depthMap[y * width + x] = z / radius;
                    }
                }
            }
            
            this.updateDepthPreview();
        }
        
        generateWaveScene() {
            const { width, height } = this.config;
            this.depthMap = new Float32Array(width * height);
            
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const nx = x / width * 4;
                    const ny = y / height * 4;
                    
                    // Multiple waves representing different constraint types
                    const wave1 = Math.sin(nx * Math.PI * 2 + this.animationTime) * 0.3;
                    const wave2 = Math.cos(ny * Math.PI * 2 - this.animationTime * 0.7) * 0.3;
                    const wave3 = Math.sin((nx + ny) * Math.PI - this.animationTime * 0.5) * 0.2;
                    
                    this.depthMap[y * width + x] = 0.5 + wave1 + wave2 + wave3;
                }
            }
            
            this.normalizeDepthMap();
            this.updateDepthPreview();
        }
        
        generateMountainScene() {
            const { width, height, smoothing } = this.config;
            this.depthMap = new Float32Array(width * height);
            
            // Use simplex noise for terrain-like constraints
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const scale = 0.008;
                    const depth = this.simplexNoise(x * scale, y * scale) * 0.5 +
                                  this.simplexNoise(x * scale * 2, y * scale * 2) * 0.25 +
                                  this.simplexNoise(x * scale * 4, y * scale * 4) * 0.125;
                    this.depthMap[y * width + x] = depth + 0.5;
                }
            }
            
            this.normalizeDepthMap();
            this.updateDepthPreview();
        }
        
        generateTextScene() {
            const { width, height } = this.config;
            this.depthMap = new Float32Array(width * height);
            
            // Render text to offscreen canvas
            const offscreen = document.createElement('canvas');
            offscreen.width = width;
            offscreen.height = height;
            const offCtx = offscreen.getContext('2d');
            
            offCtx.fillStyle = 'black';
            offCtx.fillRect(0, 0, width, height);
            
            offCtx.fillStyle = 'white';
            offCtx.font = 'bold 120px sans-serif';
            offCtx.textAlign = 'center';
            offCtx.textBaseline = 'middle';
            offCtx.fillText('C', width / 2, height / 2);
            
            // Convert to depth map
            const imageData = offCtx.getImageData(0, 0, width, height);
            for (let i = 0; i < width * height; i++) {
                this.depthMap[i] = imageData.data[i * 4] / 255;
            }
            
            this.updateDepthPreview();
        }
        
        generatePattern() {
            const { width, height, stripWidth, patternType } = this.config;
            this.patternBuffer = new Float32Array(height * stripWidth * 3);
            
            switch (patternType) {
                case 'random':
                    for (let y = 0; y < height; y++) {
                        for (let x = 0; x < stripWidth; x++) {
                            const idx = (y * stripWidth + x) * 3;
                            const val = Math.random() * 255;
                            this.patternBuffer[idx] = val;
                            this.patternBuffer[idx + 1] = val;
                            this.patternBuffer[idx + 2] = val;
                        }
                    }
                    break;
                    
                case 'textured':
                    for (let y = 0; y < height; y++) {
                        for (let x = 0; x < stripWidth; x++) {
                            const idx = (y * stripWidth + x) * 3;
                            const n1 = this.simplexNoise(x * 0.1, y * 0.1) * 50;
                            const n2 = this.simplexNoise(x * 0.3, y * 0.3) * 30;
                            const val = 128 + n1 + n2;
                            const clamped = Math.max(0, Math.min(255, val));
                            this.patternBuffer[idx] = clamped;
                            this.patternBuffer[idx + 1] = clamped;
                            this.patternBuffer[idx + 2] = clamped;
                        }
                    }
                    break;
                    
                case 'colored':
                    for (let y = 0; y < height; y++) {
                        for (let x = 0; x < stripWidth; x++) {
                            const idx = (y * stripWidth + x) * 3;
                            this.patternBuffer[idx] = 128 + this.simplexNoise(x * 0.1, y * 0.1) * 127;
                            this.patternBuffer[idx + 1] = 128 + this.simplexNoise(x * 0.1 + 100, y * 0.1) * 127;
                            this.patternBuffer[idx + 2] = 128 + this.simplexNoise(x * 0.1 + 200, y * 0.1) * 127;
                        }
                    }
                    break;
                    
                case 'constraint':
                    for (let y = 0; y < height; y++) {
                        for (let x = 0; x < stripWidth; x++) {
                            const idx = (y * stripWidth + x) * 3;
                            const base = this.simplexNoise(x * 0.15, y * 0.15) * 60;
                            const detail = this.simplexNoise(x * 0.5, y * 0.5) * 30;
                            const gridX = (x % 20 < 2) ? 20 : 0;
                            const gridY = (y % 20 < 2) ? 20 : 0;
                            const val = 128 + base + detail + gridX + gridY;
                            const clamped = Math.max(0, Math.min(255, val));
                            this.patternBuffer[idx] = clamped;
                            this.patternBuffer[idx + 1] = clamped * 0.9;
                            this.patternBuffer[idx + 2] = clamped * 1.1;
                        }
                    }
                    break;
            }
            
            this.updatePatternPreview();
        }
        
        render() {
            if (!this.depthMap) return;
            if (!this.patternBuffer) this.generatePattern();
            
            switch (this.viewMode) {
                case 'magiceye':
                    this.renderMagicEye();
                    break;
                case 'depthmap':
                    this.renderDepthMap();
                    break;
                case 'anaglyph':
                    this.renderAnaglyph();
                    break;
                case 'crosseyed':
                    this.renderCrossEyed();
                    break;
            }
            
            this.updateFPS();
        }
        
        renderMagicEye() {
            const { width, height, stripWidth, maxDisparity, colorDepth } = this.config;
            const output = this.ctx.createImageData(width, height);
            
            // Create linking array
            const linked = new Int32Array(width);
            
            for (let y = 0; y < height; y++) {
                // Initialize linking
                for (let x = 0; x < width; x++) {
                    linked[x] = x;
                }
                
                // Process pixels
                for (let x = 0; x < width; x++) {
                    const depth = this.depthMap[y * width + x];
                    const disparity = Math.floor(depth * maxDisparity);
                    
                    if (disparity > 0 && x >= stripWidth) {
                        const partner = x - stripWidth + disparity;
                        if (partner >= 0 && partner < x) {
                            linked[x] = linked[partner];
                        }
                    }
                }
                
                // Color pixels
                for (let x = 0; x < width; x++) {
                    const idx = (y * width + x) * 4;
                    
                    if (linked[x] < stripWidth) {
                        const pIdx = (y * stripWidth + linked[x]) * 3;
                        output.data[idx] = this.patternBuffer[pIdx];
                        output.data[idx + 1] = this.patternBuffer[pIdx + 1];
                        output.data[idx + 2] = this.patternBuffer[pIdx + 2];
                    } else {
                        const lIdx = (y * width + linked[x]) * 4;
                        output.data[idx] = output.data[lIdx];
                        output.data[idx + 1] = output.data[lIdx + 1];
                        output.data[idx + 2] = output.data[lIdx + 2];
                    }
                    
                    if (colorDepth) {
                        const depth = this.depthMap[y * width + x];
                        output.data[idx + 2] = Math.min(255, output.data[idx + 2] + depth * 30);
                    }
                    
                    output.data[idx + 3] = 255;
                }
            }
            
            this.ctx.putImageData(output, 0, 0);
        }
        
        renderDepthMap() {
            const { width, height } = this.config;
            const output = this.ctx.createImageData(width, height);
            
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const idx = (y * width + x) * 4;
                    const depth = this.depthMap[y * width + x];
                    
                    // Color-coded depth
                    const r = Math.floor(depth * 255);
                    const g = Math.floor(depth * 200);
                    const b = Math.floor((1 - depth) * 255);
                    
                    output.data[idx] = r;
                    output.data[idx + 1] = g;
                    output.data[idx + 2] = b;
                    output.data[idx + 3] = 255;
                }
            }
            
            this.ctx.putImageData(output, 0, 0);
        }
        
        renderAnaglyph() {
            const { width, height, maxDisparity } = this.config;
            const halfWidth = Math.floor(width / 2);
            
            // Clear canvas
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(0, 0, width, height);
            
            // Create left and right views
            const leftView = this.createShiftedView(-maxDisparity / 2);
            const rightView = this.createShiftedView(maxDisparity / 2);
            
            // Combine as anaglyph (red-cyan)
            const output = this.ctx.createImageData(width, height);
            
            for (let i = 0; i < width * height; i++) {
                const idx = i * 4;
                
                // Red channel from left view
                output.data[idx] = leftView[i] * 255;
                
                // Cyan channels from right view
                output.data[idx + 1] = rightView[i] * 255;
                output.data[idx + 2] = rightView[i] * 255;
                
                output.data[idx + 3] = 255;
            }
            
            this.ctx.putImageData(output, 0, 0);
        }
        
        renderCrossEyed() {
            const { width, height, maxDisparity } = this.config;
            const halfWidth = Math.floor(width / 2);
            
            // Create two views side by side
            const leftView = this.createShiftedView(-maxDisparity / 2);
            const rightView = this.createShiftedView(maxDisparity / 2);
            
            const output = this.ctx.createImageData(width, height);
            
            // Left view (right side for cross-eyed viewing)
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < halfWidth; x++) {
                    const srcIdx = y * halfWidth + x;
                    const dstIdx = y * width + x;
                    
                    const val = rightView[y * width + (x + (width - halfWidth) / 2)] || 0;
                    
                    output.data[dstIdx * 4] = val * 255;
                    output.data[dstIdx * 4 + 1] = val * 255;
                    output.data[dstIdx * 4 + 2] = val * 255;
                    output.data[dstIdx * 4 + 3] = 255;
                }
            }
            
            // Right view (left side for cross-eyed viewing)
            for (let y = 0; y < height; y++) {
                for (let x = halfWidth; x < width; x++) {
                    const srcIdx = y * (width - halfWidth) + (x - halfWidth);
                    const dstIdx = y * width + x;
                    
                    const val = leftView[y * width + (x - halfWidth + (width - halfWidth) / 2)] || 0;
                    
                    output.data[dstIdx * 4] = val * 255;
                    output.data[dstIdx * 4 + 1] = val * 255;
                    output.data[dstIdx * 4 + 2] = val * 255;
                    output.data[dstIdx * 4 + 3] = 255;
                }
            }
            
            this.ctx.putImageData(output, 0, 0);
            
            // Draw divider
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(halfWidth, 0);
            this.ctx.lineTo(halfWidth, height);
            this.ctx.stroke();
        }
        
        createShiftedView(shift) {
            const { width, height } = this.config;
            const view = new Float32Array(width * height);
            
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const depth = this.depthMap[y * width + x];
                    const srcX = Math.floor(x - shift * depth);
                    
                    if (srcX >= 0 && srcX < width) {
                        view[y * width + x] = this.depthMap[y * width + srcX];
                    }
                }
            }
            
            return view;
        }
        
        animate() {
            if (!this.isAnimating) return;
            
            this.animationTime += 0.05;
            
            if (this.sceneType === 'wave') {
                this.generateWaveScene();
            } else {
                // Animate depth map
                const { width, height } = this.config;
                const animated = new Float32Array(width * height);
                
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        const idx = y * width + x;
                        const base = this.depthMap[idx];
                        const wave = 0.05 * Math.sin(x * 0.02 + this.animationTime);
                        animated[idx] = Math.max(0, Math.min(1, base + wave));
                    }
                }
                
                this.depthMap = animated;
            }
            
            this.render();
            requestAnimationFrame(() => this.animate());
        }
        
        updateDepthPreview() {
            const { width, height } = this.config;
            const previewWidth = this.depthPreview.width;
            const previewHeight = this.depthPreview.height;
            const imageData = this.depthPreviewCtx.createImageData(previewWidth, previewHeight);
            
            for (let py = 0; py < previewHeight; py++) {
                for (let px = 0; px < previewWidth; px++) {
                    const x = Math.floor(px * width / previewWidth);
                    const y = Math.floor(py * height / previewHeight);
                    const depth = this.depthMap[y * width + x];
                    
                    const idx = (py * previewWidth + px) * 4;
                    const val = Math.floor(depth * 255);
                    
                    imageData.data[idx] = val;
                    imageData.data[idx + 1] = val * 0.8;
                    imageData.data[idx + 2] = (255 - val) * 0.5;
                    imageData.data[idx + 3] = 255;
                }
            }
            
            this.depthPreviewCtx.putImageData(imageData, 0, 0);
        }
        
        updatePatternPreview() {
            if (!this.patternBuffer) return;
            
            const { height, stripWidth } = this.config;
            const previewWidth = this.patternPreview.width;
            const previewHeight = this.patternPreview.height;
            const imageData = this.patternPreviewCtx.createImageData(previewWidth, previewHeight);
            
            for (let py = 0; py < previewHeight; py++) {
                for (let px = 0; px < previewWidth; px++) {
                    const x = px % stripWidth;
                    const y = Math.floor(py * height / previewHeight);
                    const pIdx = (y * stripWidth + x) * 3;
                    
                    const idx = (py * previewWidth + px) * 4;
                    imageData.data[idx] = this.patternBuffer[pIdx];
                    imageData.data[idx + 1] = this.patternBuffer[pIdx + 1];
                    imageData.data[idx + 2] = this.patternBuffer[pIdx + 2];
                    imageData.data[idx + 3] = 255;
                }
            }
            
            this.patternPreviewCtx.putImageData(imageData, 0, 0);
        }
        
        updateStats() {
            document.getElementById('tripleCount').textContent = this.triples.length;
            document.getElementById('primitiveCount').textContent = this.primitiveCount;
            document.getElementById('maxC').textContent = this.config.maxC;
        }
        
        updateFPS() {
            this.frameCount++;
            const now = performance.now();
            
            if (now - this.lastFrameTime >= 1000) {
                this.fps = this.frameCount;
                this.frameCount = 0;
                this.lastFrameTime = now;
                document.getElementById('fps').textContent = this.fps;
            }
        }
        
        normalizeDepthMap() {
            const { width, height } = this.config;
            let min = Infinity, max = -Infinity;
            
            for (let i = 0; i < width * height; i++) {
                if (this.depthMap[i] < min) min = this.depthMap[i];
                if (this.depthMap[i] > max) max = this.depthMap[i];
            }
            
            const range = max - min || 1;
            for (let i = 0; i < width * height; i++) {
                this.depthMap[i] = (this.depthMap[i] - min) / range;
            }
        }
        
        gaussianBlur(input, output, sigma) {
            const { width, height } = this.config;
            const kernel = this.createGaussianKernel(sigma);
            const radius = Math.floor(kernel.length / 2);
            const temp = new Float32Array(width * height);
            
            // Horizontal
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    let sum = 0, wSum = 0;
                    for (let k = -radius; k <= radius; k++) {
                        const px = Math.max(0, Math.min(width - 1, x + k));
                        sum += input[y * width + px] * kernel[k + radius];
                        wSum += kernel[k + radius];
                    }
                    temp[y * width + x] = sum / wSum;
                }
            }
            
            // Vertical
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    let sum = 0, wSum = 0;
                    for (let k = -radius; k <= radius; k++) {
                        const py = Math.max(0, Math.min(height - 1, y + k));
                        sum += temp[py * width + x] * kernel[k + radius];
                        wSum += kernel[k + radius];
                    }
                    output[y * width + x] = sum / wSum;
                }
            }
        }
        
        createGaussianKernel(sigma) {
            const radius = Math.ceil(sigma * 3);
            const kernel = new Float32Array(2 * radius + 1);
            for (let i = -radius; i <= radius; i++) {
                kernel[i + radius] = Math.exp(-(i * i) / (2 * sigma * sigma));
            }
            return kernel;
        }
        
        gcd(a, b) {
            while (b) [a, b] = [b, a % b];
            return a;
        }
        
        // Simplex noise (simplified)
        simplexNoise(x, y) {
            if (!this._noisePerm) {
                this._noisePerm = new Uint8Array(512);
                for (let i = 0; i < 256; i++) this._noisePerm[i] = i;
                for (let i = 255; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [this._noisePerm[i], this._noisePerm[j]] = [this._noisePerm[j], this._noisePerm[i]];
                }
                for (let i = 0; i < 256; i++) this._noisePerm[i + 256] = this._noisePerm[i];
            }
            
            const F2 = 0.5 * (Math.sqrt(3) - 1);
            const G2 = (3 - Math.sqrt(3)) / 6;
            
            const s = (x + y) * F2;
            const i = Math.floor(x + s);
            const j = Math.floor(y + s);
            const t = (i + j) * G2;
            
            const X0 = i - t, Y0 = j - t;
            const x0 = x - X0, y0 = y - Y0;
            
            const i1 = x0 > y0 ? 1 : 0;
            const j1 = x0 > y0 ? 0 : 1;
            
            const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
            const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
            
            const ii = i & 255, jj = j & 255;
            
            const grad = (h, x, y) => {
                const u = h < 4 ? x : y;
                const v = h < 4 ? y : x;
                return ((h & 1) ? -u : u) + ((h & 2) ? -2 * v : 2 * v);
            };
            
            let n0 = 0, n1 = 0, n2 = 0;
            
            let t0 = 0.5 - x0 * x0 - y0 * y0;
            if (t0 >= 0) {
                t0 *= t0;
                n0 = t0 * t0 * grad(this._noisePerm[ii + this._noisePerm[jj]] & 7, x0, y0);
            }
            
            let t1 = 0.5 - x1 * x1 - y1 * y1;
            if (t1 >= 0) {
                t1 *= t1;
                n1 = t1 * t1 * grad(this._noisePerm[ii + i1 + this._noisePerm[jj + j1]] & 7, x1, y1);
            }
            
            let t2 = 0.5 - x2 * x2 - y2 * y2;
            if (t2 >= 0) {
                t2 *= t2;
                n2 = t2 * t2 * grad(this._noisePerm[ii + 1 + this._noisePerm[jj + 1]] & 7, x2, y2);
            }
            
            return 70 * (n0 + n1 + n2);
        }
    }
    
    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
        new MagicEyeVisualizer();
    });
    </script>
</body>
</html>
```

---

## 4. Novel Visualization Techniques

### 4.1 Animated Autostereograms for Time-Varying Constraints

```javascript
/**
 * Animated Autostereogram Generator
 * 
 * Creates time-varying autostereograms where the 3D shape
 * animates, showing constraint dynamics.
 */
class AnimatedAutostereogram {
    constructor(config) {
        this.generator = new AutostereogramGenerator(config);
        this.depthMapper = new ConstraintDepthMapper(config);
        this.keyframes = [];
        this.currentFrame = 0;
        this.fps = 15;
    }
    
    /**
     * Add keyframe for animation
     */
    addKeyframe(time, depthMap) {
        this.keyframes.push({ time, depthMap });
        this.keyframes.sort((a, b) => a.time - b.time);
    }
    
    /**
     * Interpolate between keyframes
     */
    interpolate(time) {
        // Find surrounding keyframes
        let prev = this.keyframes[0];
        let next = this.keyframes[this.keyframes.length - 1];
        
        for (let i = 0; i < this.keyframes.length - 1; i++) {
            if (this.keyframes[i].time <= time && this.keyframes[i + 1].time > time) {
                prev = this.keyframes[i];
                next = this.keyframes[i + 1];
                break;
            }
        }
        
        // Linear interpolation
        const t = (time - prev.time) / (next.time - prev.time || 1);
        const interpolated = new Float32Array(prev.depthMap.length);
        
        for (let i = 0; i < interpolated.length; i++) {
            interpolated[i] = prev.depthMap[i] * (1 - t) + next.depthMap[i] * t;
        }
        
        return interpolated;
    }
    
    /**
     * Generate animation frames
     */
    generateAnimation(duration, outputCallback) {
        const frameCount = Math.floor(duration * this.fps);
        const frames = [];
        
        for (let f = 0; f < frameCount; f++) {
            const time = f / this.fps;
            const depthMap = this.interpolate(time);
            const frame = this.generator.generate(depthMap);
            
            outputCallback(frame, f);
            frames.push(frame);
        }
        
        return frames;
    }
    
    /**
     * Create animated GIF (requires gif.js library)
     */
    async createGIF(duration, width, height) {
        // Would integrate with gif.js for GIF export
        // This is a placeholder for the interface
        const frames = this.generateAnimation(duration, () => {});
        return { frames, width, height, fps: this.fps };
    }
}
```

### 4.2 Color-Coded Depth for Multi-Constraint Systems

```javascript
/**
 * Multi-Constraint Depth Encoder
 * 
 * Different constraint types appear at different depths
 * with color coding for identification.
 */
class MultiConstraintDepthEncoder {
    constructor(config) {
        this.config = config;
        this.constraintTypes = new Map();
    }
    
    /**
     * Register constraint type with depth range and color
     */
    registerConstraintType(name, depthRange, color) {
        this.constraintTypes.set(name, { depthRange, color });
    }
    
    /**
     * Encode multiple constraint types into single depth map
     */
    encode(constraints) {
        const { width, height } = this.config;
        const depthMap = new Float32Array(width * height);
        const colorMap = new Float32Array(width * height * 3);
        
        // Sort constraints by depth range for proper layering
        const sortedTypes = Array.from(this.constraintTypes.entries())
            .sort((a, b) => a[1].depthRange[0] - b[1].depthRange[0]);
        
        for (const [typeName, typeConfig] of sortedTypes) {
            const typeConstraints = constraints.filter(c => c.type === typeName);
            const [minDepth, maxDepth] = typeConfig.depthRange;
            
            for (const constraint of typeConstraints) {
                const pos = this.getConstraintPosition(constraint);
                const depth = minDepth + (maxDepth - minDepth) * constraint.violation;
                
                if (pos.x >= 0 && pos.x < width && pos.y >= 0 && pos.y < height) {
                    const idx = pos.y * width + pos.x;
                    depthMap[idx] = depth;
                    
                    // Color coding
                    const cIdx = idx * 3;
                    colorMap[cIdx] = typeConfig.color[0];
                    colorMap[cIdx + 1] = typeConfig.color[1];
                    colorMap[cIdx + 2] = typeConfig.color[2];
                }
            }
        }
        
        return { depthMap, colorMap };
    }
    
    /**
     * Generate colored stereogram
     */
    generateColoredStereogram(depthMap, colorMap) {
        const { width, height, stripWidth, maxDisparity } = this.config;
        const output = new Uint8ClampedArray(width * height * 4);
        
        // Generate colored pattern
        const pattern = this.generateColoredPattern(colorMap);
        
        // Standard stereogram generation with color
        const linked = new Int32Array(width);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                linked[x] = x;
            }
            
            for (let x = 0; x < width; x++) {
                const depth = depthMap[y * width + x];
                const disparity = Math.floor(depth * maxDisparity);
                
                if (disparity > 0 && x >= stripWidth) {
                    const partner = x - stripWidth + disparity;
                    if (partner >= 0 && partner < x) {
                        linked[x] = linked[partner];
                    }
                }
            }
            
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                
                if (linked[x] < stripWidth) {
                    const pIdx = (y * stripWidth + linked[x]) * 4;
                    output[idx] = pattern[pIdx];
                    output[idx + 1] = pattern[pIdx + 1];
                    output[idx + 2] = pattern[pIdx + 2];
                } else {
                    const lIdx = (y * width + linked[x]) * 4;
                    output[idx] = output[lIdx];
                    output[idx + 1] = output[lIdx + 1];
                    output[idx + 2] = output[lIdx + 2];
                }
                
                output[idx + 3] = 255;
            }
        }
        
        return output;
    }
    
    generateColoredPattern(colorMap) {
        // Generate pattern that incorporates color hints
        const { height, stripWidth } = this.config;
        const pattern = new Uint8ClampedArray(height * stripWidth * 4);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < stripWidth; x++) {
                const idx = (y * stripWidth + x) * 4;
                const noise = Math.random() * 0.4 + 0.6;
                
                // Sample from color map with noise
                const sampleIdx = (y * stripWidth + x) * 3;
                pattern[idx] = colorMap[sampleIdx] * noise * 255;
                pattern[idx + 1] = colorMap[sampleIdx + 1] * noise * 255;
                pattern[idx + 2] = colorMap[sampleIdx + 2] * noise * 255;
                pattern[idx + 3] = 255;
            }
        }
        
        return pattern;
    }
    
    getConstraintPosition(constraint) {
        // Map constraint to 2D position based on its properties
        return constraint.position || { x: 0, y: 0 };
    }
}
```

### 4.3 VR/AR Integration

```javascript
/**
 * VR/AR Constraint Visualization
 * 
 * Prepares constraint manifolds for viewing in VR headsets
 * or AR glasses using WebXR API.
 */
class VRConstraintViewer {
    constructor() {
        this.session = null;
        this.referenceSpace = null;
        this.depthMesh = null;
    }
    
    /**
     * Initialize WebXR session
     */
    async initVR() {
        if (!navigator.xr) {
            console.warn('WebXR not supported');
            return false;
        }
        
        const supported = await navigator.xr.isSessionSupported('immersive-vr');
        if (!supported) {
            console.warn('VR not supported');
            return false;
        }
        
        this.session = await navigator.xr.requestSession('immersive-vr', {
            optionalFeatures: ['local-floor', 'bounded-floor']
        });
        
        this.referenceSpace = await this.session.requestReferenceSpace('local-floor');
        
        return true;
    }
    
    /**
     * Convert depth map to 3D mesh for VR
     */
    depthMapToMesh(depthMap, width, height) {
        const vertices = [];
        const indices = [];
        const normals = [];
        
        // Create vertices
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const depth = depthMap[y * width + x];
                vertices.push(
                    (x / width - 0.5) * 2,
                    (y / height - 0.5) * 2,
                    depth
                );
            }
        }
        
        // Create indices
        for (let y = 0; y < height - 1; y++) {
            for (let x = 0; x < width - 1; x++) {
                const i = y * width + x;
                indices.push(i, i + 1, i + width);
                indices.push(i + 1, i + width + 1, i + width);
            }
        }
        
        // Calculate normals
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                const left = x > 0 ? depthMap[idx - 1] : depthMap[idx];
                const right = x < width - 1 ? depthMap[idx + 1] : depthMap[idx];
                const up = y > 0 ? depthMap[idx - width] : depthMap[idx];
                const down = y < height - 1 ? depthMap[idx + width] : depthMap[idx];
                
                const nx = left - right;
                const ny = up - down;
                const nz = 2 / width;
                
                const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
                normals.push(nx / len, ny / len, nz / len);
            }
        }
        
        return { vertices, indices, normals };
    }
    
    /**
     * Render frame for VR
     */
    renderVR(depthMap, gl) {
        if (!this.session) return;
        
        const mesh = this.depthMapToMesh(depthMap, this.config.width, this.config.height);
        
        // Create WebGL buffers
        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.vertices), gl.STATIC_DRAW);
        
        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mesh.indices), gl.STATIC_DRAW);
        
        // ... WebGL rendering code for VR
    }
}
```

---

## 5. Pythagorean Manifold Demo

### 5.1 Complete Demo Application

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Pythagorean Manifold Magic Eye</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background: #0a0a12;
            color: #e0e0e8;
            font-family: monospace;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 2rem;
        }
        h1 {
            color: #00ffff;
            margin-bottom: 1rem;
            font-size: 1.5rem;
        }
        .canvas-container {
            position: relative;
            border: 2px solid #2a2a3a;
            border-radius: 8px;
            overflow: hidden;
        }
        #stereogram {
            display: block;
        }
        .controls {
            display: flex;
            gap: 1rem;
            margin-top: 1rem;
            flex-wrap: wrap;
            justify-content: center;
        }
        button {
            background: #00ffff;
            color: #0a0a12;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            cursor: pointer;
            font-family: inherit;
            font-weight: bold;
        }
        button:hover {
            background: #00cccc;
        }
        .info {
            margin-top: 1rem;
            text-align: center;
            max-width: 600px;
            line-height: 1.6;
        }
        .triple-display {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
            justify-content: center;
            margin-top: 1rem;
            font-size: 0.75rem;
        }
        .triple {
            background: #1a1a2a;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
        }
        .triple.primitive {
            border-left: 3px solid #00ff00;
        }
    </style>
</head>
<body>
    <h1>Pythagorean Manifold Magic Eye</h1>
    <div class="canvas-container">
        <canvas id="stereogram" width="800" height="500"></canvas>
    </div>
    <div class="controls">
        <button onclick="generate()">Generate New</button>
        <button onclick="toggleAnimation()">Toggle Animation</button>
        <select id="depthType" onchange="generate()">
            <option value="primitive">Primitive vs Scaled</option>
            <option value="hypotenuse">Hypotenuse Length</option>
            <option value="scale">Scale Factor</option>
        </select>
        <select id="patternType" onchange="generate()">
            <option value="random">Random Dots</option>
            <option value="textured">Textured</option>
            <option value="colored">Colored</option>
        </select>
    </div>
    <div class="info">
        <p>Viewing instructions: Hold the image close to your face, look "through" it as if focusing on something distant. Slowly pull back while maintaining soft focus. The Pythagorean triples will emerge as a 3D landscape!</p>
    </div>
    <div class="triple-display" id="triples"></div>
    
    <script>
    const canvas = document.getElementById('stereogram');
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    let depthMap = new Float32Array(width * height);
    let pattern = null;
    let isAnimating = false;
    let animationTime = 0;
    let triples = [];
    
    // Generate Pythagorean triples
    function generateTriples(maxC) {
        const result = [];
        const maxM = Math.ceil(Math.sqrt(maxC));
        
        for (let m = 2; m < maxM; m++) {
            for (let n = 1; n < m; n++) {
                // Check if primitive
                let a = m, b = n;
                while (b) [a, b] = [b, a % b];
                if (a !== 1) continue;
                if ((m + n) % 2 === 0) continue;
                
                const pa = m * m - n * n;
                const pb = 2 * m * n;
                const pc = m * m + n * n;
                
                let k = 1;
                while (k * pc <= maxC) {
                    result.push({
                        a: k * pa, b: k * pb, c: k * pc,
                        m, n, k, primitive: k === 1
                    });
                    k++;
                }
            }
        }
        return result;
    }
    
    // Create depth map from triples
    function createDepthMap(triples, depthType) {
        const rawDepth = new Float32Array(width * height);
        const maxM = Math.sqrt(50);
        
        for (const t of triples) {
            const x = Math.floor((t.m / maxM) * (width - 1));
            const y = Math.floor((t.n / maxM) * (height - 1));
            
            if (x >= 0 && x < width && y >= 0 && y < height) {
                let depth;
                switch (depthType) {
                    case 'primitive':
                        depth = t.primitive ? 0.9 : 0.35;
                        break;
                    case 'hypotenuse':
                        depth = t.c / 50;
                        break;
                    case 'scale':
                        depth = 1 - Math.min(t.k / 8, 0.9);
                        break;
                }
                rawDepth[y * width + x] = Math.max(rawDepth[y * width + x], depth);
            }
        }
        
        // Gaussian blur
        const kernel = [0.006, 0.061, 0.242, 0.383, 0.242, 0.061, 0.006];
        const temp = new Float32Array(width * height);
        
        // Horizontal
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let sum = 0;
                for (let k = -3; k <= 3; k++) {
                    const px = Math.max(0, Math.min(width - 1, x + k));
                    sum += rawDepth[y * width + px] * kernel[k + 3];
                }
                temp[y * width + x] = sum;
            }
        }
        
        // Vertical
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let sum = 0;
                for (let k = -3; k <= 3; k++) {
                    const py = Math.max(0, Math.min(height - 1, y + k));
                    sum += temp[py * width + x] * kernel[k + 3];
                }
                depthMap[y * width + x] = sum;
            }
        }
    }
    
    // Generate pattern
    function createPattern(type) {
        const stripWidth = 80;
        pattern = new Float32Array(height * stripWidth * 3);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < stripWidth; x++) {
                const idx = (y * stripWidth + x) * 3;
                
                switch (type) {
                    case 'random':
                        const v = Math.random() * 255;
                        pattern[idx] = v;
                        pattern[idx + 1] = v;
                        pattern[idx + 2] = v;
                        break;
                    case 'textured':
                        const n = Math.sin(x * 0.2) * Math.cos(y * 0.15) * 50 + 
                                  Math.random() * 30;
                        const val = 128 + n;
                        pattern[idx] = val;
                        pattern[idx + 1] = val;
                        pattern[idx + 2] = val;
                        break;
                    case 'colored':
                        pattern[idx] = 128 + Math.random() * 127;
                        pattern[idx + 1] = 100 + Math.random() * 100;
                        pattern[idx + 2] = 150 + Math.random() * 105;
                        break;
                }
            }
        }
    }
    
    // Generate stereogram
    function generateStereogram() {
        const stripWidth = 80;
        const maxDisp = 25;
        const output = ctx.createImageData(width, height);
        const linked = new Int32Array(width);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) linked[x] = x;
            
            for (let x = 0; x < width; x++) {
                const depth = depthMap[y * width + x];
                const disp = Math.floor(depth * maxDisp);
                
                if (disp > 0 && x >= stripWidth) {
                    const partner = x - stripWidth + disp;
                    if (partner >= 0 && partner < x) {
                        linked[x] = linked[partner];
                    }
                }
            }
            
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                
                if (linked[x] < stripWidth) {
                    const pIdx = (y * stripWidth + linked[x]) * 3;
                    output.data[idx] = pattern[pIdx];
                    output.data[idx + 1] = pattern[pIdx + 1];
                    output.data[idx + 2] = pattern[pIdx + 2];
                } else {
                    const lIdx = (y * width + linked[x]) * 4;
                    output.data[idx] = output.data[lIdx];
                    output.data[idx + 1] = output.data[lIdx + 1];
                    output.data[idx + 2] = output.data[lIdx + 2];
                }
                output.data[idx + 3] = 255;
            }
        }
        
        ctx.putImageData(output, 0, 0);
    }
    
    // Main generate function
    function generate() {
        const depthType = document.getElementById('depthType').value;
        const patternType = document.getElementById('patternType').value;
        
        triples = generateTriples(50);
        createDepthMap(triples, depthType);
        createPattern(patternType);
        generateStereogram();
        
        // Display some triples
        const display = document.getElementById('triples');
        display.innerHTML = triples.slice(0, 30).map(t => 
            `<div class="triple ${t.primitive ? 'primitive' : ''}">${t.a}²+${t.b}²=${t.c}²</div>`
        ).join('');
    }
    
    // Animation
    function animate() {
        if (!isAnimating) return;
        
        animationTime += 0.03;
        
        // Animate depth map with wave
        const animated = new Float32Array(width * height);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                const wave = 0.03 * Math.sin(x * 0.02 + animationTime) * 
                            Math.cos(y * 0.015 + animationTime * 0.7);
                animated[idx] = Math.max(0, Math.min(1, depthMap[idx] + wave));
            }
        }
        
        depthMap = animated;
        generateStereogram();
        
        requestAnimationFrame(animate);
    }
    
    function toggleAnimation() {
        isAnimating = !isAnimating;
        if (isAnimating) animate();
    }
    
    // Initial generation
    generate();
    </script>
</body>
</html>
```

---

## 6. Analysis: What Information Becomes Visible in 3D?

### 6.1 Comparative Analysis

| Information Type | 2D Visibility | 3D Visibility | Advantage |
|-----------------|---------------|---------------|-----------|
| Constraint density | Color intensity | Depth density | 3D: Better cluster perception |
| Violation magnitude | Color/opacity | Height/depth | 3D: Direct "importance" reading |
| Constraint relationships | Lines/arrows | Spatial proximity | 3D: Intuitive grouping |
| Primitive vs derived | Symbol type | Depth layer | 3D: Instant categorization |
| Local structure | Detail visible | Requires focus | 2D: Better for fine details |
| Global structure | Lost in noise | Emerges in 3D | 3D: Pattern recognition |

### 6.2 Cognitive Advantages

**Pattern Recognition:**
- Humans excel at recognizing 3D shapes
- Hidden patterns in 2D noise become obvious in 3D
- "Pop-out" effect draws attention to important regions

**Information Density:**
- 3D encoding adds depth dimension without increasing 2D clutter
- Multiple constraint types can be layered by depth
- Parallel processing of spatial information

**Debugging Applications:**
- Constraint violations "jump out" at the viewer
- Satisfaction patterns become immediately visible
- Global vs local issues distinguishable

### 6.3 Limitations

1. **Learning curve:** Requires practice to view correctly
2. **Accessibility:** Not suitable for all viewers (stereoblindness)
3. **Static medium:** Requires proper viewing technique
4. **Detail loss:** Fine details harder to see in 3D

---

## 7. Integration with Constraint-Theory-Web

### 7.1 Integration Points

```javascript
// Integration with existing holographic experiment
// File: /constraint-theory-audit/web/experiments/holographic/app.js

class HolographicSimulator {
    // Add Magic Eye mode
    addMagicEyeMode() {
        this.magicEyeGenerator = new AutostereogramGenerator({
            width: 800,
            height: 600
        });
        
        this.depthMapper = new ConstraintDepthMapper({
            width: 800,
            height: 600
        });
    }
    
    // Convert current 3D scene to autostereogram
    sceneToMagicEye() {
        // Project 3D particles to depth map
        const depthMap = new Float32Array(800 * 600);
        
        for (const particle of this.particles) {
            const projected = this.project3DTo2D(particle, this.hologram2D, true);
            const x = Math.floor(projected.x);
            const y = Math.floor(projected.y);
            
            if (x >= 0 && x < 800 && y >= 0 && y < 600) {
                const normalizedDepth = (projected.depth - this.minDepth) / 
                                        (this.maxDepth - this.minDepth);
                depthMap[y * 800 + x] = Math.max(depthMap[y * 800 + x], normalizedDepth);
            }
        }
        
        // Generate and display stereogram
        return this.magicEyeGenerator.generate(depthMap);
    }
}
```

### 7.2 File Structure for Integration

```
/constraint-theory-audit/web/experiments/
├── magic-eye/
│   ├── index.html
│   ├── style.css
│   ├── app.js          # Main viewer
│   ├── autostereogram.js    # Core algorithm
│   ├── depth-mapper.js      # Constraint to depth
│   └── README.md
```

---

## 8. Conclusions and Future Work

### 8.1 Key Findings

1. **Autostereograms are viable for constraint visualization** - The human visual system can decode constraint manifolds encoded as 3D depth.

2. **Depth-from-constraints mapping is intuitive** - Violation measures naturally correspond to depth, making interpretation straightforward.

3. **Multiple visualization modes serve different needs**:
   - Magic Eye for exploration and pattern recognition
   - Anaglyph for immediate 3D viewing with glasses
   - Cross-eyed for quick preview without aids
   - Depth map for analysis

4. **Animation adds temporal dimension** - Time-varying constraints become animated 3D scenes, revealing dynamics.

### 8.2 Future Directions

1. **WebXR Integration** - True VR viewing for complete immersion
2. **Machine Learning** - Automatic depth map optimization
3. **Collaborative Viewing** - Shared 3D constraint spaces
4. **Accessibility** - Audio cues for depth, tactile displays

### 8.3 Research Impact

This work establishes autostereogram visualization as a novel tool for constraint systems:

- **Theoretical:** Connection between stereoscopy and holographic encoding
- **Practical:** Working implementations ready for integration
- **Pedagogical:** Intuitive 3D visualization of abstract concepts
- **Debugging:** New modality for constraint system analysis

---

## References

1. Tyler, C.W. (1990). "The birth of computer autostereograms." SPIE.
2. Thimbleby, H. et al. (1994). "Displaying 3D images: Algorithms for single-image random-dot stereograms." IEEE Computer.
3. Szeliski, R. (2022). "Computer Vision: Algorithms and Applications." Springer.
4. Original constraint theory papers from iteration 1 research

---

## Appendix: Quick Reference Card

```
╔═══════════════════════════════════════════════════════════════╗
║              MAGIC EYE CONSTRAINT VISUALIZATION               ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  DEPTH MAPPING:                                               ║
║  • Violation → Depth (high violation = close)                 ║
║  • Satisfied → Background (flat)                              ║
║  • Primitive → Near, Scaled → Far                             ║
║                                                               ║
║  VIEWING TECHNIQUE:                                           ║
║  1. Hold image at arm's length                                ║
║  2. Relax eyes, look "through" image                          ║
║  3. Slowly bring closer while maintaining focus               ║
║  4. 3D shape will "pop out"                                   ║
║                                                               ║
║  PARAMETERS:                                                  ║
║  • Strip Width: 80px (pattern repeat)                         ║
║  • Max Disparity: 30px (depth range)                          ║
║  • Smoothing: 5px (Gaussian blur)                             ║
║                                                               ║
║  MODES:                                                       ║
║  • Magic Eye - Classic autostereogram                         ║
║  • Anaglyph - Red/cyan glasses                                ║
║  • Cross-Eyed - Side-by-side stereo                           ║
║  • Depth Map - Color-coded depth                              ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```
