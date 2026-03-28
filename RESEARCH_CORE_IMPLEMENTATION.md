# N-Dimensional Extension Architecture for constraint-theory-core

**Research Document**  
**Date:** March 2025  
**Status:** Implementation Design Complete

---

## Executive Summary

This document outlines a comprehensive architecture for extending `constraint-theory-core` from 2D to N-dimensions. The design prioritizes:

1. **Backward compatibility** - Existing 2D API remains unchanged
2. **Performance** - Sub-microsecond operations for 3D, efficient scaling to higher dimensions
3. **Type safety** - Leverage Rust's const generics and type system
4. **Ergonomics** - Natural API for both low and high dimensions

**Key Recommendation:** Use a hybrid approach combining const generics for dimensions 2-4 (with SIMD optimization) and runtime generics for arbitrary N.

---

## Table of Contents

1. [Current Architecture Analysis](#1-current-architecture-analysis)
2. [Type System Design](#2-type-system-design)
3. [Core Algorithms](#3-core-algorithms)
4. [Performance Architecture](#4-performance-architecture)
5. [API Design](#5-api-design)
6. [Implementation Roadmap](#6-implementation-roadmap)

---

## 1. Current Architecture Analysis

### 1.1 Existing 2D Implementation

The current `constraint-theory-core` provides:

```rust
// Core types (hardcoded to 2D)
pub struct PythagoreanManifold {
    valid_states: Vec<[f32; 2]>,  // Fixed 2D arrays
    kdtree: KDTree,               // 2D KD-tree
}

pub struct KDTree {
    root: KDNode,                 // depth % 2 for dimension cycling
    size: usize,
}

// Euclid's formula for Pythagorean triple generation
// a = m² - n², b = 2mn, c = m² + n²
// Normalized: (a/c, b/c) → points on unit circle
```

**Performance Characteristics:**
- Build: O(N log N) where N = ~1000 states at density 200
- Query: ~100ns per snap via KD-tree O(log N)
- Batch SIMD: ~74ns/op via AVX2

**Current Limitations:**
1. `KDTree` hardcoded to `[f32; 2]`
2. `PythagoreanManifold` only generates 2D triples
3. SIMD implementation specific to 2D (8 vectors × 2 components)

### 1.2 Mathematical Foundation for N-Dimensions

**Pythagorean n-tuples** generalize the concept:

```
2D: a² + b² = c²           → Points on unit circle (S¹)
3D: a² + b² + c² = d²      → Points on unit sphere (S²)
4D: a² + b² + c² + d² = e² → Points on 3-sphere (S³)
nD: Σᵢaᵢ² = aₙ₊₁²          → Points on Sⁿ⁻¹
```

**Density growth** (from research):
```
N₂(N) ~ N / (2π)     // 2D: ~O(N)
N₃(N) ~ N            // 3D: ~O(N)
N₄(N) ~ N²           // 4D: ~O(N²)
Nₙ(N) ~ Nⁿ⁻¹         // nD: ~O(Nⁿ⁻¹)
```

**Implication:** Higher dimensions have exponentially more states, requiring efficient spatial indexing.

---

## 2. Type System Design

### 2.1 Const Generics Approach

```rust
/// N-dimensional point with const generic dimension
#[derive(Clone, Debug)]
pub struct PointND<const N: usize> {
    coords: [f32; N],
}

/// N-dimensional Pythagorean manifold
pub struct PythagoreanManifoldND<const N: usize> {
    valid_states: Vec<PointND<N>>,
    kdtree: KDTreeND<N>,
    density: usize,
}

/// N-dimensional KD-tree with const generic
pub struct KDTreeND<const N: usize> {
    root: KDNodeND<N>,
    size: usize,
}

enum KDNodeND<const N: usize> {
    Internal {
        dimension: usize,
        split_value: f32,
        left: Box<KDTreeND<N>>,
        right: Box<KDTreeND<N>>,
    },
    Leaf {
        points: Vec<PointND<N>>,
        indices: Vec<usize>,
    },
}
```

**Advantages:**
- Compile-time dimension verification
- Zero-cost abstractions
- SIMD-friendly for small N

**Limitations:**
- Rust const generics don't support generic array initialization
- Requires nightly features for full functionality

### 2.2 Hybrid Type Design (Recommended)

```rust
// Core traits for dimensional abstraction
pub trait Dimension: Copy + Clone + Default {
    const DIM: usize;
    type Coords: AsRef<[f32]> + AsMut<[f32]> + Copy + Default;
    
    fn coords_default() -> Self::Coords;
    fn from_slice(slice: &[f32]) -> Self::Coords;
}

// Specialized implementations for common dimensions
#[derive(Copy, Clone, Default)]
pub struct Dim2;
impl Dimension for Dim2 {
    const DIM: usize = 2;
    type Coords = [f32; 2];
    fn coords_default() -> Self::Coords { [0.0; 2] }
    fn from_slice(slice: &[f32]) -> Self::Coords { [slice[0], slice[1]] }
}

#[derive(Copy, Clone, Default)]
pub struct Dim3;
impl Dimension for Dim3 {
    const DIM: usize = 3;
    type Coords = [f32; 3];
    fn coords_default() -> Self::Coords { [0.0; 3] }
    fn from_slice(slice: &[f32]) -> Self::Coords { [slice[0], slice[1], slice[2]] }
}

#[derive(Copy, Clone, Default)]
pub struct Dim4;
impl Dimension for Dim4 {
    const DIM: usize = 4;
    type Coords = [f32; 4];
    fn coords_default() -> Self::Coords { [0.0; 4] }
    fn from_slice(slice: &[f32]) -> Self::Coords { 
        [slice[0], slice[1], slice[2], slice[3]] 
    }
}

// Runtime dimension for arbitrary N
#[derive(Clone)]
pub struct DimN {
    dim: usize,
}

impl DimN {
    pub fn new(dim: usize) -> Self { Self { dim } }
}

// Generic manifold using dimension trait
pub struct PythagoreanManifold<D: Dimension> {
    valid_states: Vec<D::Coords>,
    kdtree: KDTree<D>,
    density: usize,
    _marker: std::marker::PhantomData<D>,
}

// Type aliases for common dimensions
pub type Manifold2D = PythagoreanManifold<Dim2>;
pub type Manifold3D = PythagoreanManifold<Dim3>;
pub type Manifold4D = PythagoreanManifold<Dim4>;
```

### 2.3 SIMD-Optimized Specializations

For dimensions 2, 3, 4, we provide SIMD-optimized implementations:

```rust
#[cfg(target_arch = "x86_64")]
mod simd {
    use std::arch::x86_64::*;
    
    // AVX2 optimized 2D (current implementation)
    #[target_feature(enable = "avx2")]
    pub unsafe fn snap_batch_2d_avx2(
        states: &[[f32; 2]],
        vectors: &[[f32; 2]],
        results: &mut [([f32; 2], f32)],
    );
    
    // AVX2 optimized 3D (5 vectors × 3 components + 1 padding)
    #[target_feature(enable = "avx2")]
    pub unsafe fn snap_batch_3d_avx2(
        states: &[[f32; 4]],  // 4-aligned for SIMD
        vectors: &[[f32; 4]],
        results: &mut [([f32; 4], f32)],
    );
    
    // AVX-512 optimized 4D (4 vectors × 4 components)
    #[target_feature(enable = "avx512f")]
    pub unsafe fn snap_batch_4d_avx512(
        states: &[[f32; 4]],
        vectors: &[[f32; 4]],
        results: &mut [([f32; 4], f32)],
    );
    
    // AVX-512 optimized for high dimensions (8-wide)
    #[target_feature(enable = "avx512f")]
    pub unsafe fn snap_batch_nd_avx512(
        states: &[&[f32]],
        vectors: &[&[f32]],
        results: &mut [(Vec<f32>, f32)],
        dim: usize,
    );
}
```

---

## 3. Core Algorithms

### 3.1 N-Dimensional KD-Tree

```rust
pub struct KDTree<D: Dimension> {
    root: KDNode<D>,
    size: usize,
    dimension: std::marker::PhantomData<D>,
}

enum KDNode<D: Dimension> {
    Internal {
        split_dim: usize,
        split_value: f32,
        left: Box<KDTree<D>>,
        right: Box<KDTree<D>>,
    },
    Leaf {
        points: Vec<D::Coords>,
        indices: Vec<usize>,
    },
}

impl<D: Dimension> KDTree<D> {
    pub fn build(points: &[D::Coords]) -> Self {
        let indices: Vec<usize> = (0..points.len()).collect();
        Self {
            root: Self::build_recursive(points, &indices, 0),
            size: points.len(),
            dimension: std::marker::PhantomData,
        }
    }
    
    fn build_recursive(
        points: &[D::Coords],
        indices: &[usize],
        depth: usize,
    ) -> KDNode<D> {
        if indices.len() <= MAX_LEAF_SIZE {
            return KDNode::Leaf {
                points: indices.iter().map(|&i| points[i]).collect(),
                indices: indices.to_vec(),
            };
        }
        
        // Cycle through dimensions
        let split_dim = depth % D::DIM;
        
        // Find median along split dimension
        let mut sorted_indices = indices.to_vec();
        sorted_indices.sort_by(|&a, &b| {
            points[a].as_ref()[split_dim]
                .partial_cmp(&points[b].as_ref()[split_dim])
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        
        let median_idx = sorted_indices.len() / 2;
        let split_value = points[sorted_indices[median_idx]].as_ref()[split_dim];
        
        // Partition and recurse
        let left_indices = &sorted_indices[..median_idx];
        let right_indices = &sorted_indices[median_idx + 1..];
        
        KDNode::Internal {
            split_dim,
            split_value,
            left: Box::new(Self {
                root: Self::build_recursive(points, left_indices, depth + 1),
                size: left_indices.len(),
                dimension: std::marker::PhantomData,
            }),
            right: Box::new(Self {
                root: Self::build_recursive(points, right_indices, depth + 1),
                size: right_indices.len(),
                dimension: std::marker::PhantomData,
            }),
        }
    }
    
    /// O(log N) nearest neighbor search
    pub fn nearest(&self, query: &D::Coords) -> Option<(D::Coords, usize, f32)> {
        let mut best_point = D::coords_default();
        let mut best_idx = 0;
        let mut best_dist_sq = f32::MAX;
        
        self.nearest_recursive(
            &self.root,
            query.as_ref(),
            &mut best_point,
            &mut best_idx,
            &mut best_dist_sq,
            0,
        );
        
        Some((best_point, best_idx, best_dist_sq))
    }
    
    fn nearest_recursive(
        &self,
        node: &KDNode<D>,
        query: &[f32],
        best_point: &mut D::Coords,
        best_idx: &mut usize,
        best_dist_sq: &mut f32,
        depth: usize,
    ) {
        match node {
            KDNode::Internal { split_dim, split_value, left, right } => {
                let query_val = query[*split_dim];
                let (first, second) = if query_val <= *split_value {
                    (left, right)
                } else {
                    (right, left)
                };
                
                // Search preferred side
                self.nearest_recursive(
                    &first.root,
                    query,
                    best_point,
                    best_idx,
                    best_dist_sq,
                    depth + 1,
                );
                
                // Check if other side could have closer point
                let dist_to_plane = query_val - *split_value;
                if dist_to_plane * dist_to_plane < *best_dist_sq {
                    self.nearest_recursive(
                        &second.root,
                        query,
                        best_point,
                        best_idx,
                        best_dist_sq,
                        depth + 1,
                    );
                }
            }
            KDNode::Leaf { points, indices } => {
                for (i, point) in points.iter().enumerate() {
                    let dist_sq: f32 = point.as_ref()
                        .iter()
                        .zip(query.iter())
                        .map(|(p, q)| (p - q).powi(2))
                        .sum();
                    
                    if dist_sq < *best_dist_sq || 
                       (dist_sq == *best_dist_sq && indices[i] < *best_idx) {
                        *best_dist_sq = dist_sq;
                        *best_point = *point;
                        *best_idx = indices[i];
                    }
                }
            }
        }
    }
}
```

**Complexity Analysis:**
- Build: O(N log N × D) where D is dimension
- Query: O(log N × D) average case
- Memory: O(N × D)

**Optimization for High Dimensions (D > 10):**

For dimensions where KD-tree performance degrades (curse of dimensionality), switch to:

```rust
pub enum SpatialIndex<D: Dimension> {
    KDTree(KDTree<D>),
    BallTree(BallTree<D>),      // Better for D > 10
    VPTree(VPTree<D>),          // Better for D > 20
    LSH(LSHIndex<D>),           // Approximate, for D > 50
}

impl<D: Dimension> SpatialIndex<D> {
    pub fn optimal_for(dim: usize, n_points: usize) -> Self {
        match (dim, n_points) {
            (d, n) if d <= 10 && n < 1_000_000 => {
                SpatialIndex::KDTree(KDTree::default())
            }
            (d, n) if d <= 20 && n < 100_000 => {
                SpatialIndex::BallTree(BallTree::default())
            }
            (d, n) if d <= 50 => {
                SpatialIndex::VPTree(VPTree::default())
            }
            _ => {
                SpatialIndex::LSH(LSHIndex::default())
            }
        }
    }
}
```

### 3.2 Pythagorean n-Tuple Generation

#### 3D Quadruples (Euler's Formula Generalization)

```rust
/// Generate 3D Pythagorean quadruples: a² + b² + c² = d²
pub fn generate_quadruples(max_d: usize) -> Vec<[i32; 4]> {
    let mut quadruples = Vec::new();
    
    // Parameterization using sums of two squares:
    // d = m² + n² + p² + q²
    // a = m² + n² - p² - q²
    // b = 2(mp + nq)
    // c = 2(mq - np)
    
    for d in 1..=max_d {
        // d must be expressible as sum of 4 squares
        // Use Lagrange's four-square theorem: every positive integer is 
        // expressible as sum of 4 squares
        
        for m in 0..=((d as f64).sqrt() as usize) {
            for n in 0..=((d - m*m) as f64).sqrt() as usize {
                for p in 0..=((d - m*m - n*n) as f64).sqrt() as usize {
                    let q_sq = d - m*m - n*n - p*p;
                    let q = (q_sq as f64).sqrt() as usize;
                    
                    if q*q == q_sq {
                        let a = (m*m + n*n - p*p - q*q) as i32;
                        let b = 2 * (m*p + n*q) as i32;
                        let c = 2 * (m*q - n*p) as i32;
                        let d_val = d as i32;
                        
                        // Ensure positivity and primitiveness
                        let (a, b, c) = (a.abs(), b.abs(), c.abs());
                        if a > 0 || b > 0 || c > 0 {
                            let g = gcd(gcd(a, b), gcd(c, d_val));
                            if g == 1 {
                                quadruples.push([a, b, c, d_val]);
                            }
                        }
                    }
                }
            }
        }
    }
    
    quadruples.sort_by_key(|q| q[3]);
    quadruples.dedup();
    quadruples
}

/// Alternative: Direct enumeration (more efficient for small max_d)
pub fn generate_quadruples_direct(max_d: usize) -> Vec<[i32; 4]> {
    let mut quadruples = Vec::new();
    
    for d in 1..=max_d {
        for a in 1..d {
            for b in a..d {
                let c_sq = d*d - a*a - b*b;
                if c_sq < 0 { continue; }
                
                let c = (c_sq as f64).sqrt() as i32;
                if c*c == c_sq && c >= b {
                    let g = gcd(gcd(a, b), gcd(c, d as i32));
                    if g == 1 {
                        quadruples.push([a, b, c, d as i32]);
                    }
                }
            }
        }
    }
    
    quadruples
}
```

#### N-Dimensional Tuple Generation

```rust
/// Generate N-dimensional Pythagorean tuples: Σᵢaᵢ² = aₙ₊₁²
pub trait TupleGenerator<const N: usize> {
    fn generate(max_hypotenuse: usize) -> Vec<[i32; N + 1]>;
}

impl TupleGenerator<2> for PythagoreanTriple {
    fn generate(max_c: usize) -> Vec<[i32; 3]> {
        // Use Euclid's formula (current implementation)
        let mut triples = Vec::new();
        let mut m = 2;
        
        while m * m + 1 <= max_c {
            for n in 1..m {
                if (m - n) % 2 == 1 && gcd(m, n) == 1 {
                    let a = (m * m - n * n) as i32;
                    let b = (2 * m * n) as i32;
                    let c = (m * m + n * n) as i32;
                    
                    if c <= max_c as i32 {
                        triples.push([a.min(b), a.max(b), c]);
                    }
                }
            }
            m += 1;
        }
        
        triples
    }
}

impl TupleGenerator<3> for PythagoreanQuadruple {
    fn generate(max_d: usize) -> Vec<[i32; 4]> {
        generate_quadruples_direct(max_d)
    }
}

// Recursive generation for higher dimensions
pub fn generate_nd_tuples<const N: usize>(max_hypotenuse: usize) -> Vec<[i32; N + 1]> 
where
    [(); N + 1]: Sized,
{
    // Use recursion: n-tuple from (n-1)-tuple
    // If (a₁,...,aₙ₋₁, aₙ) is an (n-1)-tuple with hypotenuse aₙ
    // Then for any b with aₙ² + b² = c², we get (a₁,...,aₙ₋₁, b, c)
    
    // This is O(N^max_hypotenuse) - exponential!
    // For N > 4, use specialized algorithms or accept approximation
    
    let mut tuples = Vec::new();
    
    if N == 4 {
        // 4D: a² + b² + c² + d² = e²
        for e in 1..=max_hypotenuse {
            for a in 1..e {
                for b in a..e {
                    for c in b..e {
                        let d_sq = e*e - a*a - b*b - c*c;
                        if d_sq < 0 { continue; }
                        
                        let d = (d_sq as f64).sqrt() as i32;
                        if d*d == d_sq && d >= c {
                            tuples.push([a, b, c, d, e as i32]);
                        }
                    }
                }
            }
        }
    }
    
    tuples
}
```

### 3.3 Lattice Point Enumeration

For very high dimensions where exhaustive tuple generation is infeasible:

```rust
/// Efficient lattice point enumeration on n-sphere
pub struct LatticeEnumerator<const N: usize> {
    max_radius: usize,
    points: Vec<[i32; N]>,
}

impl<const N: usize> LatticeEnumerator<N> {
    pub fn enumerate(max_radius: usize) -> Self {
        // Use sphere decoding algorithm
        // Enumerates points on/near sphere of given radius
        
        let mut points = Vec::new();
        
        // For efficiency, use the "Fibonacci sphere" approximation
        // for high dimensions, then filter for integer coordinates
        
        Self { max_radius, points }
    }
    
    /// Find nearest lattice point to given direction
    pub fn nearest_to_direction(&self, direction: &[f32; N]) -> Option<[i32; N]> {
        // Project direction onto sphere, find nearest integer point
        self.points.iter()
            .min_by(|a, b| {
                let dist_a: f32 = a.iter()
                    .zip(direction.iter())
                    .map(|(ai, di)| (*ai as f32 - di).powi(2))
                    .sum();
                let dist_b: f32 = b.iter()
                    .zip(direction.iter())
                    .map(|(bi, di)| (*bi as f32 - di).powi(2))
                    .sum();
                dist_a.partial_cmp(&dist_b).unwrap()
            })
            .copied()
    }
}
```

### 3.4 N-Dimensional Rigidity Percolation

```rust
/// N-dimensional rigidity computation using generalized pebble game
pub struct NDPercolation<const N: usize> {
    parent: Vec<usize>,
    rank: Vec<usize>,
    size: Vec<usize>,
}

impl<const N: usize> NDPercolation<N> {
    /// Maxwell count for N dimensions
    /// |E| = N|V| - N(N+1)/2
    pub fn maxwell_count(n_vertices: usize) -> usize {
        N * n_vertices - N * (N + 1) / 2
    }
    
    /// Compute rigidity for N-dimensional graph
    pub fn compute_rigidity(
        &mut self, 
        edges: &[(usize, usize)], 
        n_nodes: usize
    ) -> RigidityResult {
        // Union-find for connectivity
        for &(u, v) in edges {
            if u < n_nodes && v < n_nodes {
                self.union(u, v);
            }
        }
        
        let expected_edges = Self::maxwell_count(n_nodes);
        let n_edges = edges.len();
        
        // For N dimensions, need to check Laman-like conditions
        // This is an open problem for N > 2!
        
        let is_rigid = n_edges >= expected_edges && n_nodes >= N + 1;
        
        RigidityResult {
            is_rigid,
            rank: n_edges.min(expected_edges),
            deficiency: if n_edges >= expected_edges {
                n_edges - expected_edges
            } else {
                expected_edges - n_edges
            },
            n_clusters: self.count_clusters(),
            rigid_fraction: self.compute_rigid_fraction(n_nodes),
        }
    }
}
```

---

## 4. Performance Architecture

### 4.1 Memory Layout

**Array-of-Structs (AoS) - Current:**
```rust
struct Point {
    x: f32, y: f32  // Good for 2D
}
```

**Struct-of-Arrays (SoA) - Better for SIMD:**
```rust
struct Points {
    xs: Vec<f32>,  // All x components contiguous
    ys: Vec<f32>,  // All y components contiguous
    // For N-D:
    coords: [Vec<f32>; N],  // Each dimension contiguous
}
```

**Hybrid for N-D:**
```rust
pub struct PointBuffer<D: Dimension> {
    // For small N (2-4): Use AoS with SIMD padding
    points_aos: Vec<D::Coords>,
    
    // For large N: Use SoA for cache efficiency
    coords_soa: Vec<Vec<f32>>,
    layout: PointLayout,
}

enum PointLayout {
    AoS,
    SoA,
    Hybrid { chunk_size: usize },
}

impl<D: Dimension> PointBuffer<D> {
    pub fn optimal_layout(dim: usize, n_points: usize) -> Self {
        let layout = match (dim, n_points) {
            (d, n) if d <= 4 && n < 10_000 => PointLayout::AoS,
            (d, _) if d > 20 => PointLayout::SoA,
            _ => PointLayout::Hybrid { chunk_size: 64 },
        };
        
        Self { points_aos: Vec::new(), coords_soa: Vec::new(), layout }
    }
}
```

### 4.2 Cache-Efficient Traversal

```rust
impl<D: Dimension> KDTree<D> {
    /// Cache-oblivious nearest neighbor search
    pub fn nearest_cache_aware(&self, query: &D::Coords) -> Option<(D::Coords, usize, f32)> {
        // Use iterative traversal with explicit stack to avoid
        // deep recursion and improve cache locality
        
        const STACK_SIZE: usize = 64;  // log2(2^64)
        let mut stack: SmallVec<[SearchFrame; STACK_SIZE]> = SmallVec::new();
        
        let mut best = SearchResult::default();
        
        stack.push(SearchFrame {
            node: &self.root,
            depth: 0,
        });
        
        while let Some(frame) = stack.pop() {
            match frame.node {
                KDNode::Internal { split_dim, split_value, left, right } => {
                    // ... iterative traversal
                }
                KDNode::Leaf { points, indices } => {
                    // Process leaf with SIMD
                    self.process_leaf_simd(points, indices, query, &mut best);
                }
            }
        }
        
        best.into_option()
    }
    
    #[cfg(target_arch = "x86_64")]
    #[target_feature(enable = "avx2")]
    unsafe fn process_leaf_simd(
        &self,
        points: &[D::Coords],
        indices: &[usize],
        query: &D::Coords,
        best: &mut SearchResult<D>,
    ) {
        // SIMD-optimized leaf processing
        // Process 8 points at a time
    }
}
```

### 4.3 Parallelization with Rayon

```rust
use rayon::prelude::*;

impl<D: Dimension + Send + Sync> PythagoreanManifold<D> 
where
    D::Coords: Send + Sync,
{
    /// Parallel batch snapping
    pub fn snap_batch_parallel(
        &self,
        vectors: &[D::Coords],
    ) -> Vec<(D::Coords, f32)> {
        vectors.par_iter()
            .map(|v| self.snap(*v))
            .collect()
    }
    
    /// Parallel k-nearest neighbors
    pub fn nearest_k_parallel(
        &self,
        queries: &[D::Coords],
        k: usize,
    ) -> Vec<Vec<(D::Coords, usize, f32)>> {
        queries.par_iter()
            .map(|q| self.kdtree.nearest_k(q, k))
            .collect()
    }
}

// Build manifold in parallel
impl PythagoreanManifold<Dim3> {
    pub fn new_parallel(density: usize) -> Self {
        use rayon::iter::*;
        
        // Generate quadruples in parallel
        let states: Vec<[f32; 3]> = (1..=density)
            .into_par_iter()
            .flat_map(|d| {
                generate_quadruples_for_d(d)
                    .into_iter()
                    .map(|[a, b, c, d]| {
                        let d_f = d as f32;
                        [a as f32 / d_f, b as f32 / d_f, c as f32 / d_f]
                    })
                    .collect::<Vec<_>>()
            })
            .collect();
        
        let kdtree = KDTree::build(&states);
        
        Self { valid_states: states, kdtree, density }
    }
}
```

### 4.4 Performance Estimates

| Dimension | States (density=200) | Build Time | Query Time (scalar) | Query Time (SIMD) |
|-----------|---------------------|------------|---------------------|-------------------|
| 2D | ~1,000 | ~2.8 ms | ~100 ns | ~74 ns |
| 3D | ~10,000 | ~50 ms | ~150 ns | ~100 ns |
| 4D | ~100,000 | ~500 ms | ~300 ns | ~200 ns |
| 5D | ~1,000,000 | ~10 s | ~500 ns | ~400 ns |
| N-D (N>10) | ~N^(N-1) | exponential | ~O(N log N) | N/A |

**Note:** For N > 10, use approximate methods (LSH, Ball Tree).

---

## 5. API Design

### 5.1 Backward-Compatible 2D API

```rust
// Existing API unchanged
pub use manifold_2d::{PythagoreanManifold, snap, PythagoreanTriple};

// Internal implementation uses generic
type PythagoreanManifold = PythagoreanManifoldGeneric<Dim2>;
type PythagoreanTriple = PythagoreanTuple<2>;
```

### 5.2 New N-Dimensional API

```rust
// Core traits
pub trait Snap<D: Dimension> {
    fn snap(&self, vector: D::Coords) -> (D::Coords, f32);
    fn snap_batch(&self, vectors: &[D::Coords]) -> Vec<(D::Coords, f32)>;
    fn snap_batch_into(&self, vectors: &[D::Coords], results: &mut [(D::Coords, f32)]);
}

// Implementation for all dimensions
impl<D: Dimension> Snap<D> for PythagoreanManifoldGeneric<D> {
    fn snap(&self, vector: D::Coords) -> (D::Coords, f32) {
        // Normalize
        let norm: f32 = vector.as_ref().iter().map(|x| x * x).sum::<f32>().sqrt();
        if norm < 1e-10 {
            return (self.default_state(), 0.0);
        }
        
        let normalized = D::from_slice(&vector.as_ref().iter()
            .map(|x| x / norm)
            .collect::<Vec<_>>());
        
        // KD-tree lookup
        if let Some((nearest, _, dist_sq)) = self.kdtree.nearest(&normalized) {
            let resonance: f32 = nearest.as_ref().iter()
                .zip(normalized.as_ref().iter())
                .map(|(n, v)| n * v)
                .sum();
            let noise = 1.0 - resonance;
            (nearest, noise)
        } else {
            (self.default_state(), 1.0)
        }
    }
}

// Convenient constructors
impl PythagoreanManifoldGeneric<Dim2> {
    pub fn new_2d(density: usize) -> Self {
        Self::new::<Dim2TupleGenerator>(density)
    }
}

impl PythagoreanManifoldGeneric<Dim3> {
    pub fn new_3d(density: usize) -> Self {
        Self::new::<Dim3TupleGenerator>(density)
    }
}

// Generic builder pattern
pub struct ManifoldBuilder<D: Dimension> {
    density: usize,
    max_hypotenuse: Option<usize>,
    include_negatives: bool,
    _marker: std::marker::PhantomData<D>,
}

impl<D: Dimension> ManifoldBuilder<D> {
    pub fn new() -> Self {
        Self {
            density: 200,
            max_hypotenuse: None,
            include_negatives: true,
            _marker: std::marker::PhantomData,
        }
    }
    
    pub fn density(mut self, density: usize) -> Self {
        self.density = density;
        self
    }
    
    pub fn max_hypotenuse(mut self, max: usize) -> Self {
        self.max_hypotenuse = Some(max);
        self
    }
    
    pub fn build(self) -> PythagoreanManifoldGeneric<D> {
        PythagoreanManifoldGeneric::new_with_options(
            self.density,
            self.max_hypotenuse,
            self.include_negatives,
        )
    }
}

// Usage examples:
// let m2d = ManifoldBuilder::<Dim2>::new().density(200).build();
// let m3d = ManifoldBuilder::<Dim3>::new().max_hypotenuse(100).build();
```

### 5.3 Python Bindings (PyO3)

```rust
// In constraint-theory-python/src/lib.rs

use pyo3::prelude::*;

/// Generic Python wrapper for N-D manifold
#[pyclass(name = "PythagoreanManifoldND")]
pub struct PyManifoldND {
    inner: Box<dyn PyManifoldTrait>,
    dim: usize,
}

trait PyManifoldTrait: Send {
    fn snap(&self, coords: Vec<f32>) -> (Vec<f32>, f32);
    fn state_count(&self) -> usize;
    fn dimension(&self) -> usize;
}

// Specialized implementations
impl PyManifoldTrait for PythagoreanManifoldGeneric<Dim2> {
    fn snap(&self, coords: Vec<f32>) -> (Vec<f32>, f32) {
        let (snapped, noise) = self.snap([coords[0], coords[1]]);
        (vec![snapped[0], snapped[1]], noise)
    }
    
    fn state_count(&self) -> usize { self.valid_states.len() }
    fn dimension(&self) -> usize { 2 }
}

impl PyManifoldTrait for PythagoreanManifoldGeneric<Dim3> {
    fn snap(&self, coords: Vec<f32>) -> (Vec<f32>, f32) {
        let (snapped, noise) = self.snap([coords[0], coords[1], coords[2]]);
        (vec![snapped[0], snapped[1], snapped[2]], noise)
    }
    
    fn state_count(&self) -> usize { self.valid_states.len() }
    fn dimension(&self) -> usize { 3 }
}

#[pymethods]
impl PyManifoldND {
    #[new]
    pub fn new(dimension: usize, density: usize) -> Self {
        let inner: Box<dyn PyManifoldTrait> = match dimension {
            2 => Box::new(PythagoreanManifoldGeneric::<Dim2>::new_2d(density)),
            3 => Box::new(PythagoreanManifoldGeneric::<Dim3>::new_3d(density)),
            4 => Box::new(PythagoreanManifoldGeneric::<Dim4>::new_4d(density)),
            _ => panic!("Unsupported dimension: {}", dimension),
        };
        
        PyManifoldND { inner, dim: dimension }
    }
    
    /// Snap a vector to nearest Pythagorean tuple
    pub fn snap(&self, coords: Vec<f32>) -> PyResult<(Vec<f32>, f32)> {
        if coords.len() != self.dim {
            return Err(PyErr::new::<pyo3::exceptions::PyValueError, _>(
                format!("Expected {} coordinates, got {}", self.dim, coords.len())
            ));
        }
        Ok(self.inner.snap(coords))
    }
    
    #[getter]
    pub fn dimension(&self) -> usize { self.dim }
    
    #[getter]
    pub fn state_count(&self) -> usize { self.inner.state_count() }
    
    pub fn snap_batch(&self, py: Python<'_>, vectors: Vec<Vec<f32>>) -> Vec<(Vec<f32>, f32)> {
        py.allow_threads(|| {
            vectors.iter().map(|v| self.inner.snap(v.clone())).collect()
        })
    }
    
    fn __repr__(&self) -> String {
        format!("PythagoreanManifoldND(dim={}, states={})", 
                self.dim, self.inner.state_count())
    }
}

/// Convenience functions
#[pyfunction]
pub fn snap_2d(x: f32, y: f32, density: usize) -> (f32, f32, f32) {
    let m = PythagoreanManifoldGeneric::<Dim2>::new_2d(density);
    let (s, n) = m.snap([x, y]);
    (s[0], s[1], n)
}

#[pyfunction]
pub fn snap_3d(x: f32, y: f32, z: f32, density: usize) -> (f32, f32, f32, f32) {
    let m = PythagoreanManifoldGeneric::<Dim3>::new_3d(density);
    let (s, n) = m.snap([x, y, z]);
    (s[0], s[1], s[2], n)
}
```

### 5.4 Integration with Math Libraries

```rust
// Optional integration with nalgebra
#[cfg(feature = "nalgebra")]
pub mod nalgebra_integration {
    use nalgebra::{VectorN, U1, U2, U3, U4, DimName};
    
    impl<D: Dimension + DimName> From<VectorN<f32, D>> for D::Coords {
        fn from(v: VectorN<f32, D>) -> Self {
            let mut coords = D::coords_default();
            coords.as_mut().copy_from_slice(v.as_slice());
            coords
        }
    }
    
    impl<D: Dimension + DimName> Into<VectorN<f32, D>> for D::Coords {
        fn into(self) -> VectorN<f32, D> {
            VectorN::from_column_slice(self.as_ref())
        }
    }
}

// Optional integration with glam
#[cfg(feature = "glam")]
pub mod glam_integration {
    use glam::{Vec2, Vec3A, Vec4};
    
    impl From<Vec2> for [f32; 2] {
        fn from(v: Vec2) -> Self { v.to_array() }
    }
    
    impl From<[f32; 2]> for Vec2 {
        fn from(a: [f32; 2]) -> Self { Vec2::from_array(a) }
    }
    
    // Similar for Vec3A, Vec4
}
```

---

## 6. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

**Goal:** Establish core types and 3D support

1. **Core traits and types**
   - `Dimension` trait
   - `Dim2`, `Dim3`, `Dim4` structs
   - `PointND` wrapper
   - Refactor existing `KDTree` to generic `KDTree<D>`

2. **3D Pythagorean quadruples**
   - Implement `generate_quadruples()` function
   - Optimize for common cases
   - Add tests against known quadruples

3. **3D KD-tree**
   - Implement `KDTree<Dim3>`
   - Verify O(log N) performance

**Deliverables:**
```rust
// New types available
pub type Manifold3D = PythagoreanManifoldGeneric<Dim3>;
pub type KDTree3D = KDTree<Dim3>;

// Usage
let m3d = Manifold3D::new_3d(100);
let (snapped, noise) = m3d.snap([0.577, 0.577, 0.577]);
```

**Tests:** 20 new tests for 3D functionality

---

### Phase 2: Optimization (Week 3-4)

**Goal:** Achieve performance parity with 2D

1. **SIMD for 3D**
   - Implement AVX2 batch snapping for 3D
   - Handle alignment (4-wide for natural SIMD)
   - Fallback to scalar for non-AVX2

2. **Parallel processing**
   - Add `rayon` dependency (optional)
   - Implement parallel manifold building
   - Implement parallel batch snapping

3. **Cache optimization**
   - Profile cache misses
   - Implement cache-oblivious traversal
   - Consider SoA layout for high dimensions

**Deliverables:**
- 3D SIMD batch snapping ~100ns/op
- Parallel build ~5x speedup
- Benchmark suite

---

### Phase 3: Higher Dimensions (Week 5-6)

**Goal:** Support 4D and arbitrary N

1. **4D implementation**
   - `Dim4` type
   - 4D Pythagorean quintuple generation
   - 4D KD-tree
   - AVX-512 optimization (if available)

2. **Arbitrary N**
   - `DimN` runtime dimension type
   - Dynamic allocation
   - Ball Tree for N > 10

3. **Memory management**
   - SoA layout for large N
   - Memory-mapped files for huge manifolds
   - Streaming generation

**Deliverables:**
```rust
// 4D support
let m4d = Manifold4D::new_4d(50);
let (snapped, noise) = m4d.snap([0.5, 0.5, 0.5, 0.5]);

// Arbitrary N
let mnd = ManifoldND::new(6, 20);  // 6D, density 20
let (snapped, noise) = mnd.snap(&[0.5, 0.5, 0.5, 0.5, 0.5, 0.5]);
```

---

### Phase 4: Bindings and Integration (Week 7-8)

**Goal:** Complete Python support and ecosystem integration

1. **Python bindings**
   - Update `constraint-theory-python`
   - Support N-D in Python API
   - NumPy integration

2. **Math library integrations**
   - `nalgebra` feature
   - `glam` feature
   - `ndarray` feature

3. **Documentation**
   - API documentation
   - Examples for each dimension
   - Performance guide

**Deliverables:**
```python
# Python 3D support
import constraint_theory as ct

m3d = ct.PythagoreanManifoldND(3, 100)
snapped, noise = m3d.snap([0.577, 0.577, 0.577])
```

---

### Phase 5: Advanced Features (Week 9-10)

**Goal:** Production-ready features

1. **Rigidity analysis**
   - N-D pebble game
   - Rigidity computation
   - Cluster detection

2. **Holonomy transport**
   - N-D holonomy matrices
   - SO(N) parallel transport
   - Consistency checking

3. **Approximate methods**
   - LSH for high dimensions
   - Ball Tree for medium dimensions
   - Hybrid index selection

**Deliverables:**
- Complete N-D constraint theory implementation
- Performance benchmarks for all dimensions
- Integration tests

---

## Key Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Type system** | Hybrid (const generics + runtime) | Compile-time safety for common dims, flexibility for arbitrary N |
| **KD-tree** | Generic `KDTree<D: Dimension>` | Code reuse, type safety |
| **Memory layout** | AoS for N ≤ 4, SoA for N > 4 | SIMD efficiency vs cache locality |
| **SIMD** | Specialized for 2, 3, 4 dimensions | Maximum performance for common cases |
| **High-D indexing** | Ball Tree / LSH fallback | Handle curse of dimensionality |
| **Parallelism** | Rayon (optional feature) | Zero overhead if not used |
| **Python bindings** | Trait objects for flexibility | Support arbitrary dimensions |

---

## Open Research Questions

1. **Optimal tuple generation for N > 4**  
   Current O(N^max_hypotenuse) is prohibitive. Need efficient parameterization.

2. **Rigidity characterization for N > 2**  
   Laman's theorem not fully proved for 3D+. May need alternative approaches.

3. **Approximate snapping quality bounds**  
   For LSH-based high-D snapping, what are the theoretical guarantees?

4. **GPU acceleration**  
   Can we achieve further speedups with CUDA/WebGPU for batch operations?

---

## Appendix A: Benchmark Projections

```
# Expected performance (approximate)

## 2D (current)
snap_2d/nearest_neighbor    time:   [98 ns 100 ns 102 ns]
snap_2d/batch_simd_1000     time:   [72 ns 74 ns 76 ns] per op
manifold_build_200          time:   [2.7 ms 2.8 ms 3.0 ms]

## 3D (projected)
snap_3d/nearest_neighbor    time:   [140 ns 150 ns 160 ns]
snap_3d/batch_simd_1000     time:   [95 ns 100 ns 105 ns] per op
manifold_build_100          time:   [45 ms 50 ms 55 ms]

## 4D (projected)
snap_4d/nearest_neighbor    time:   [280 ns 300 ns 320 ns]
snap_4d/batch_simd_1000     time:   [180 ns 200 ns 220 ns] per op
manifold_build_50           time:   [450 ms 500 ms 550 ms]

## 10D (projected, using Ball Tree)
snap_10d/nearest_neighbor   time:   [2.0 µs 2.5 µs 3.0 µs]
manifold_build_20           time:   [30 s 35 s 40 s]
```

---

## Appendix B: File Structure

```
constraint-theory-core/
├── src/
│   ├── lib.rs              # Main entry, re-exports
│   ├── dimension.rs        # Dimension traits and types
│   ├── point.rs            # Point types and operations
│   ├── manifold.rs         # Generic manifold (existing, refactored)
│   ├── manifold_nd.rs      # N-D manifold implementation
│   ├── kdtree.rs           # Generic KD-tree (existing, refactored)
│   ├── kdtree_nd.rs        # N-D KD-tree specific code
│   ├── balltree.rs         # Ball tree for high dimensions
│   ├── lsh.rs              # LSH for approximate NN
│   ├── tuple_gen.rs        # Pythagorean tuple generation
│   ├── tuple_gen_2d.rs     # 2D triple generation (existing)
│   ├── tuple_gen_3d.rs     # 3D quadruple generation
│   ├── tuple_gen_nd.rs     # N-D tuple generation
│   ├── simd.rs             # SIMD implementations (existing)
│   ├── simd_3d.rs          # 3D SIMD
│   ├── simd_4d.rs          # 4D SIMD
│   ├── simd_nd.rs          # N-D SIMD (if applicable)
│   ├── parallel.rs         # Rayon-based parallel ops
│   ├── rigidity.rs         # N-D rigidity (existing, extended)
│   ├── curvature.rs        # Ricci flow (existing)
│   ├── gauge.rs            # Gauge connections (existing)
│   ├── cohomology.rs       # Sheaf cohomology (existing)
│   └── tile.rs             # Tile structure (existing)
├── benches/
│   ├── bench_2d.rs
│   ├── bench_3d.rs
│   └── bench_nd.rs
├── examples/
│   ├── basic.rs            # 2D example (existing)
│   ├── basic_3d.rs         # 3D example
│   ├── robotics_3d.rs      # 3D robotics
│   └── ml_embeddings.rs    # High-D ML example
└── tests/
    ├── test_2d.rs
    ├── test_3d.rs
    └── test_nd.rs
```

---

**Document Status:** Complete  
**Next Action:** Begin Phase 1 implementation  
**Estimated Timeline:** 10 weeks for full N-D support
