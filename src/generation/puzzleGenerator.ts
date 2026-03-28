/**
 * Puzzle Generator for Constraint Ranch
 * 
 * Procedural puzzle generation with:
 * - Difficulty scaling
 * - Constraint selection
 * - Solvability verification
 * - Hidden dimension integration
 * 
 * @module puzzleGenerator
 */

import {
  ConstraintPuzzle,
  SpatialPuzzle,
  RoutingPuzzle,
  BreedingPuzzle,
  CoordinationPuzzle,
  AdvancedPuzzle,
  Constraint,
  Position,
  Zone,
  Trait,
  PuzzleType
} from '@/puzzles/types'

import {
  calculateHiddenDimensions,
  generatePythagoreanTriples,
  toExactRational,
  fromExactRational,
  snapToLattice,
  defaultLattice
} from '@/puzzles/hidden-dimensions'

import { validateSpatialSolution } from '@/puzzles/spatial'
import { validateBreedingSolution } from '@/puzzles/breeding'
import { validateRoutingSolution } from '@/puzzles/routing'
import { validateCoordinationSolution } from '@/puzzles/coordination'

// ============================================================================
// Types
// ============================================================================

export interface PuzzleGenerationConfig {
  difficulty: number // 1-5
  type: PuzzleType
  seed?: number
  ensureSolvable: boolean
  maxAttempts: number
  constraintsPerPuzzle: { min: number; max: number }
  hiddenDimensionPrecision: number
}

export interface GeneratedPuzzleResult {
  puzzle: ConstraintPuzzle
  solution: unknown
  metadata: {
    generatedAt: Date
    seed: number
    difficulty: number
    solvabilityAttempts: number
    hiddenDimensions: number
    constraintCount: number
  }
}

// ============================================================================
// Seeded Random Number Generator
// ============================================================================

class SeededRandom {
  private seed: number
  
  constructor(seed: number) {
    this.seed = seed
  }
  
  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff
    return this.seed / 0x7fffffff
  }
  
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }
  
  pick<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)]
  }
  
  shuffle<T>(array: T[]): T[] {
    const result = [...array]
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i)
      ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result
  }
}

// ============================================================================
// Spatial Puzzle Generator
// ============================================================================

const SPATIAL_CONSTRAINT_TYPES = [
  'max-distance',
  'min-coverage', 
  'agent-count',
  'on-perimeter',
  'even-spacing',
  'equilateral',
  'hexagonal-pattern',
  'neighbor-distance'
]

export function generateSpatialPuzzle(
  config: PuzzleGenerationConfig,
  seed: number = Date.now()
): GeneratedPuzzleResult {
  const rng = new SeededRandom(seed)
  const attempts: number[] = []
  
  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    const attemptSeed = seed + attempt
    const rng = new SeededRandom(attemptSeed)
    
    // Generate map size based on difficulty
    const baseSize = 400 + config.difficulty * 100
    const width = baseSize + rng.nextInt(-50, 50)
    const height = baseSize + rng.nextInt(-50, 50)
    
    // Generate zones
    const zoneCount = Math.max(2, config.difficulty + 1)
    const zones: Zone[] = []
    
    for (let i = 0; i < zoneCount; i++) {
      zones.push({
        id: `zone-${i}`,
        x: rng.nextInt(50, width - 50),
        y: rng.nextInt(50, height - 50),
        radius: rng.nextInt(30, 60)
      })
    }
    
    // Determine agent count
    const agentCount = 2 + Math.floor(config.difficulty * 1.5)
    
    // Generate constraints based on difficulty
    const constraintCount = rng.nextInt(
      config.constraintsPerPuzzle.min,
      config.constraintsPerPuzzle.max
    )
    
    const constraints: Constraint[] = []
    const availableTypes = [...SPATIAL_CONSTRAINT_TYPES]
    
    // Always include agent-count constraint
    constraints.push({
      type: 'agent-count',
      value: agentCount
    })
    
    // Add more constraints
    const shuffledTypes = rng.shuffle(availableTypes.filter(t => t !== 'agent-count'))
    for (let i = 0; i < Math.min(constraintCount - 1, shuffledTypes.length); i++) {
      const type = shuffledTypes[i]
      constraints.push(generateSpatialConstraint(type, config.difficulty, rng, zones, agentCount))
    }
    
    // Create puzzle
    const puzzle: SpatialPuzzle = {
      id: `spatial-${seed}-${attempt}`,
      name: generatePuzzleName('spatial', rng),
      type: 'spatial',
      difficulty: config.difficulty,
      description: generatePuzzleDescription('spatial', constraints, rng),
      constraints,
      hints: generateHints('spatial', constraints, rng),
      rewards: generateRewards(config.difficulty),
      initialState: {
        mapSize: { width, height },
        zones
      },
      goalState: constraints
    }
    
    // Generate a valid solution
    const solution = generateSpatialSolution(puzzle, rng)
    
    // Verify solvability
    if (config.ensureSolvable) {
      const validation = validateSpatialSolution(puzzle, solution)
      if (validation.valid) {
        return {
          puzzle,
          solution,
          metadata: {
            generatedAt: new Date(),
            seed: attemptSeed,
            difficulty: config.difficulty,
            solvabilityAttempts: attempt + 1,
            hiddenDimensions: calculateHiddenDimensions(config.hiddenDimensionPrecision),
            constraintCount: constraints.length
          }
        }
      }
      attempts.push(attempt + 1)
    } else {
      return {
        puzzle,
        solution,
        metadata: {
          generatedAt: new Date(),
          seed: attemptSeed,
          difficulty: config.difficulty,
          solvabilityAttempts: attempt + 1,
          hiddenDimensions: calculateHiddenDimensions(config.hiddenDimensionPrecision),
          constraintCount: constraints.length
        }
      }
    }
  }
  
  throw new Error(`Failed to generate solvable puzzle after ${config.maxAttempts} attempts`)
}

function generateSpatialConstraint(
  type: string,
  difficulty: number,
  rng: SeededRandom,
  zones: Zone[],
  agentCount: number
): Constraint {
  switch (type) {
    case 'max-distance':
      return {
        type: 'max-distance',
        value: 150 + difficulty * 50,
        unit: 'px'
      }
    
    case 'min-coverage':
      return {
        type: 'min-coverage',
        value: 0.5 + difficulty * 0.1,
        unit: '%'
      }
    
    case 'on-perimeter':
      return {
        type: 'on-perimeter',
        value: zones[0]?.id || 'zone-0'
      }
    
    case 'even-spacing':
      return {
        type: 'even-spacing',
        value: true
      }
    
    case 'equilateral':
      return {
        type: 'equilateral',
        value: agentCount === 3
      }
    
    case 'hexagonal-pattern':
      return {
        type: 'hexagonal-pattern',
        value: agentCount === 7
      }
    
    case 'neighbor-distance':
      return {
        type: 'neighbor-distance',
        value: 50 + difficulty * 20,
        unit: 'px'
      }
    
    default:
      return {
        type: 'agent-count',
        value: agentCount
      }
  }
}

function generateSpatialSolution(
  puzzle: SpatialPuzzle,
  rng: SeededRandom
): { positions: Position[] } {
  const { width, height } = puzzle.initialState.mapSize
  const agentCount = puzzle.constraints.find(c => c.type === 'agent-count')?.value as number || 3
  
  // Try to place agents at Pythagorean lattice points
  const positions: Position[] = []
  const triples = generatePythagoreanTriples(100)
  
  for (let i = 0; i < agentCount; i++) {
    let x: number, y: number
    
    // Use Pythagorean triple for positioning
    if (triples.length > 0 && rng.next() > 0.3) {
      const triple = rng.pick(triples)
      const scale = Math.min(width, height) / (triple[2] * 2)
      x = width / 2 + (triple[0] / triple[2]) * scale * (rng.next() > 0.5 ? 1 : -1)
      y = height / 2 + (triple[1] / triple[2]) * scale * (rng.next() > 0.5 ? 1 : -1)
    } else {
      x = rng.nextInt(50, width - 50)
      y = rng.nextInt(50, height - 50)
    }
    
    // Snap to lattice for exact positioning
    const snapped = snapToLattice(x, y, defaultLattice)
    positions.push({
      x: fromExactRational(snapped.position.visible.x),
      y: fromExactRational(snapped.position.visible.y)
    })
  }
  
  return { positions }
}

// ============================================================================
// Breeding Puzzle Generator
// ============================================================================

const TRAIT_NAMES = ['speed', 'intelligence', 'strength', 'endurance', 'agility', 'luck']

const BREEDING_CONSTRAINT_TYPES = [
  'trait-threshold',
  'trait-match',
  'trait-expression',
  'trait-exceeds-parents'
]

export function generateBreedingPuzzle(
  config: PuzzleGenerationConfig,
  seed: number = Date.now()
): GeneratedPuzzleResult {
  const rng = new SeededRandom(seed)
  
  // Generate parents
  const traitCount = 3 + config.difficulty
  const traits = rng.shuffle(TRAIT_NAMES).slice(0, traitCount)
  
  const parentA: Trait[] = traits.map(name => ({
    name,
    value: rng.next() * 0.6 + 0.2 // 0.2 - 0.8
  }))
  
  const parentB: Trait[] = traits.map(name => ({
    name,
    value: rng.next() * 0.6 + 0.2
  }))
  
  // Generate target traits
  const targetTraits: Trait[] = traits.map((name, i) => {
    const maxParent = Math.max(parentA[i].value, parentB[i].value)
    return {
      name,
      value: Math.min(1, maxParent + rng.next() * 0.3) // Target slightly above parents
    }
  })
  
  // Generate constraints
  const constraintCount = rng.nextInt(
    config.constraintsPerPuzzle.min,
    config.constraintsPerPuzzle.max
  )
  
  const constraints: Constraint[] = []
  const shuffledTypes = rng.shuffle(BREEDING_CONSTRAINT_TYPES)
  
  for (let i = 0; i < Math.min(constraintCount, shuffledTypes.length); i++) {
    const type = shuffledTypes[i]
    const trait = rng.pick(traits)
    
    if (type === 'trait-threshold') {
      constraints.push({
        type: 'trait-threshold',
        trait,
        value: 0.5 + config.difficulty * 0.1
      })
    } else if (type === 'trait-match') {
      const target = targetTraits.find(t => t.name === trait)
      constraints.push({
        type: 'trait-match',
        trait,
        value: target?.value || 0.7,
        tolerance: 0.1
      })
    }
  }
  
  const puzzle: BreedingPuzzle = {
    id: `breeding-${seed}`,
    name: generatePuzzleName('breeding', rng),
    type: 'breeding',
    difficulty: config.difficulty,
    description: `Breed an offspring with specific traits from two parents`,
    constraints,
    hints: generateHints('breeding', constraints, rng),
    rewards: generateRewards(config.difficulty),
    initialState: {
      parentA,
      parentB,
      genePool: traits
    },
    goalState: {
      targetTraits
    }
  }
  
  // Generate solution
  const solution = {
    weights: Object.fromEntries(traits.map(t => [t, 0.5])),
    nightSchoolTraining: targetTraits
      .filter(t => {
        const maxParent = Math.max(
          parentA.find(p => p.name === t.name)?.value || 0,
          parentB.find(p => p.name === t.name)?.value || 0
        )
        return t.value > maxParent
      })
      .map(t => ({
        trait: t.name,
        hours: 6
      }))
  }
  
  return {
    puzzle,
    solution,
    metadata: {
      generatedAt: new Date(),
      seed,
      difficulty: config.difficulty,
      solvabilityAttempts: 1,
      hiddenDimensions: calculateHiddenDimensions(config.hiddenDimensionPrecision),
      constraintCount: constraints.length
    }
  }
}

// ============================================================================
// Routing Puzzle Generator
// ============================================================================

export function generateRoutingPuzzle(
  config: PuzzleGenerationConfig,
  seed: number = Date.now()
): GeneratedPuzzleResult {
  const rng = new SeededRandom(seed)
  
  // Generate task types
  const taskTypes = ['delivery', 'processing', 'maintenance', 'collection']
    .slice(0, 2 + config.difficulty)
    .map(type => ({
      type,
      rate: rng.nextInt(5, 20)
    }))
  
  // Generate available agents
  const agentSpecies = ['cow', 'chicken', 'pig', 'sheep', 'horse']
    .slice(0, 2 + Math.floor(config.difficulty / 2))
  
  const availableAgents = agentSpecies.map(species => ({
    species,
    capacity: rng.nextInt(10, 30)
  }))
  
  // Generate constraints
  const constraints: Constraint[] = [
    { type: 'max-capacity', value: 100 },
    { type: 'load-balanced', value: 0.8 }
  ]
  
  if (config.difficulty >= 3) {
    constraints.push({ type: 'failover-ready', value: true })
  }
  
  const puzzle: RoutingPuzzle = {
    id: `routing-${seed}`,
    name: generatePuzzleName('routing', rng),
    type: 'routing',
    difficulty: config.difficulty,
    description: `Route tasks to agents efficiently while balancing load`,
    constraints,
    hints: generateHints('routing', constraints, rng),
    rewards: generateRewards(config.difficulty),
    initialState: {
      taskTypes,
      availableAgents
    },
    goalState: constraints
  }
  
  // Generate solution
  const solution = {
    assignments: taskTypes.flatMap((task, i) => ({
      taskType: task.type,
      agentIndex: i % availableAgents.length,
      rate: task.rate
    }))
  }
  
  return {
    puzzle,
    solution,
    metadata: {
      generatedAt: new Date(),
      seed,
      difficulty: config.difficulty,
      solvabilityAttempts: 1,
      hiddenDimensions: calculateHiddenDimensions(config.hiddenDimensionPrecision),
      constraintCount: constraints.length
    }
  }
}

// ============================================================================
// Coordination Puzzle Generator
// ============================================================================

export function generateCoordinationPuzzle(
  config: PuzzleGenerationConfig,
  seed: number = Date.now()
): GeneratedPuzzleResult {
  const rng = new SeededRandom(seed)
  
  // Generate agents
  const agentCount = 3 + config.difficulty
  const agents = Array.from({ length: agentCount }, (_, i) => ({
    id: `agent-${i}`,
    species: rng.pick(['cow', 'chicken', 'pig', 'sheep', 'horse']),
    position: { x: rng.nextInt(50, 350), y: rng.nextInt(50, 350) }
  }))
  
  // Generate tasks
  const taskCount = 2 + Math.floor(config.difficulty / 2)
  const tasks = Array.from({ length: taskCount }, (_, i) => ({
    id: `task-${i}`,
    requiredAgents: rng.nextInt(2, Math.min(4, agentCount)),
    location: { x: rng.nextInt(50, 350), y: rng.nextInt(50, 350) }
  }))
  
  // Generate constraints
  const constraints: Constraint[] = [
    { type: 'sync-required', value: true },
    { type: 'quorum-reached', value: taskCount }
  ]
  
  if (config.difficulty >= 3) {
    constraints.push({ type: 'leader-designated', value: agents[0].id })
  }
  
  const puzzle: CoordinationPuzzle = {
    id: `coordination-${seed}`,
    name: generatePuzzleName('coordination', rng),
    type: 'coordination',
    difficulty: config.difficulty,
    description: `Coordinate agents to complete tasks together`,
    constraints,
    hints: generateHints('coordination', constraints, rng),
    rewards: generateRewards(config.difficulty),
    initialState: {
      agents,
      tasks
    },
    goalState: constraints
  }
  
  // Generate solution
  const solution = {
    schedules: agents.map(agent => ({
      agentId: agent.id,
      taskAssignments: tasks.slice(0, 1).map((task, i) => ({
        taskId: task.id,
        startTime: i * 10,
        endTime: (i + 1) * 10
      }))
    }))
  }
  
  return {
    puzzle,
    solution,
    metadata: {
      generatedAt: new Date(),
      seed,
      difficulty: config.difficulty,
      solvabilityAttempts: 1,
      hiddenDimensions: calculateHiddenDimensions(config.hiddenDimensionPrecision),
      constraintCount: constraints.length
    }
  }
}

// ============================================================================
// Advanced Puzzle Generator
// ============================================================================

export function generateAdvancedPuzzle(
  config: PuzzleGenerationConfig,
  seed: number = Date.now()
): GeneratedPuzzleResult {
  // Advanced puzzles combine multiple puzzle types
  const rng = new SeededRandom(seed)
  
  // Generate sub-puzzles
  const subPuzzleCount = Math.min(2, 1 + Math.floor(config.difficulty / 3))
  const subPuzzles: AdvancedPuzzle['subPuzzles'] = []
  
  const types: PuzzleType[] = ['spatial', 'breeding', 'routing', 'coordination']
  const selectedTypes = rng.shuffle(types).slice(0, subPuzzleCount)
  
  for (const type of selectedTypes) {
    const subConfig = { ...config, difficulty: Math.max(1, config.difficulty - 1) }
    let subResult: GeneratedPuzzleResult
    
    switch (type) {
      case 'spatial':
        subResult = generateSpatialPuzzle(subConfig, seed + 1)
        break
      case 'breeding':
        subResult = generateBreedingPuzzle(subConfig, seed + 2)
        break
      case 'routing':
        subResult = generateRoutingPuzzle(subConfig, seed + 3)
        break
      case 'coordination':
        subResult = generateCoordinationPuzzle(subConfig, seed + 4)
        break
      default:
        subResult = generateSpatialPuzzle(subConfig, seed + 5)
    }
    
    subPuzzles.push({
      type,
      puzzle: subResult.puzzle,
      dependencies: subPuzzles.length > 0 ? [subPuzzles[subPuzzles.length - 1].puzzle.id] : []
    })
  }
  
  // Generate global constraints including hidden dimensions
  const constraints: Constraint[] = [
    { type: 'ecosystem-balance', value: 0.8 },
    { type: 'hidden-dimension-consistency', value: config.hiddenDimensionPrecision }
  ]
  
  const puzzle: AdvancedPuzzle = {
    id: `advanced-${seed}`,
    name: generatePuzzleName('advanced', rng),
    type: 'advanced',
    difficulty: config.difficulty,
    description: `Complete multiple puzzles while maintaining ecosystem balance`,
    constraints,
    hints: generateHints('advanced', constraints, rng),
    rewards: generateRewards(config.difficulty + 1),
    subPuzzles,
    initialState: {
      agents: [],
      resources: { energy: 100, time: 300 },
      globalConstraints: constraints
    },
    goalState: constraints
  }
  
  return {
    puzzle,
    solution: { subSolutions: new Map(), resourceAllocation: { energy: 50, time: 150 } },
    metadata: {
      generatedAt: new Date(),
      seed,
      difficulty: config.difficulty,
      solvabilityAttempts: 1,
      hiddenDimensions: calculateHiddenDimensions(config.hiddenDimensionPrecision),
      constraintCount: constraints.length
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function generatePuzzleName(type: PuzzleType, rng: SeededRandom): string {
  const prefixes = {
    spatial: ['Grid', 'Map', 'Zone', 'Field', 'Area'],
    routing: ['Flow', 'Path', 'Route', 'Channel', 'Stream'],
    breeding: ['Gene', 'Trait', 'Lineage', 'Blood', 'Heritage'],
    coordination: ['Sync', 'Team', 'Swarm', 'Flock', 'Herd'],
    advanced: ['Complex', 'Multi', 'Layered', 'Nested', 'Deep']
  }
  
  const suffixes = ['Master', 'Challenge', 'Quest', 'Trial', 'Puzzle']
  
  const prefix = rng.pick(prefixes[type] || prefixes.spatial)
  const suffix = rng.pick(suffixes)
  
  return `${prefix} ${suffix}`
}

function generatePuzzleDescription(type: PuzzleType, constraints: Constraint[], rng: SeededRandom): string {
  const templates = {
    spatial: [
      'Position agents optimally across the map',
      'Place agents to cover all zones efficiently',
      'Arrange agents in the specified pattern'
    ],
    routing: [
      'Distribute tasks to agents efficiently',
      'Balance the workload across your team',
      'Route tasks to maximize throughput'
    ],
    breeding: [
      'Breed an offspring with target traits',
      'Create the perfect combination of traits',
      'Train and breed for optimal results'
    ],
    coordination: [
      'Coordinate agents to complete tasks together',
      'Synchronize your team for maximum efficiency',
      'Lead your agents through complex tasks'
    ],
    advanced: [
      'Complete multiple challenges while maintaining balance',
      'Solve interconnected puzzles with global constraints',
      'Master multiple disciplines in harmony'
    ]
  }
  
  return rng.pick(templates[type] || templates.spatial)
}

function generateHints(type: PuzzleType, constraints: Constraint[], rng: SeededRandom): Array<{ level: number; text: string }> {
  const hints: Array<{ level: number; text: string }> = []
  
  // Level 1 hint: General strategy
  hints.push({
    level: 1,
    text: getGeneralHint(type)
  })
  
  // Level 2 hint: Specific constraint
  if (constraints.length > 0) {
    const constraint = rng.pick(constraints)
    hints.push({
      level: 2,
      text: `Focus on the ${constraint.type} constraint. Value: ${constraint.value}`
    })
  }
  
  // Level 3 hint: Solution approach
  hints.push({
    level: 3,
    text: getSolutionHint(type)
  })
  
  return hints
}

function getGeneralHint(type: PuzzleType): string {
  const hints: Record<PuzzleType, string> = {
    spatial: 'Try placing agents at Pythagorean coordinate points for exact positioning.',
    routing: 'Balance the load by distributing tasks evenly across available agents.',
    breeding: 'Combine parent traits strategically and use Night School for improvements.',
    coordination: 'Ensure agents can reach their assigned tasks within the time limit.',
    advanced: 'Solve sub-puzzles in order while watching your resource consumption.'
  }
  return hints[type]
}

function getSolutionHint(type: PuzzleType): string {
  const hints: Record<PuzzleType, string> = {
    spatial: 'Use the snap-to-lattice feature to find exact Pythagorean coordinates.',
    routing: 'Consider each agent\'s capacity and match it to task rates.',
    breeding: 'Night School can improve traits up to 15% beyond genetic limits.',
    coordination: 'Group agents by proximity to tasks for efficient scheduling.',
    advanced: 'Hidden dimensions encode precision - check consistency between sub-puzzles.'
  }
  return hints[type]
}

function generateRewards(difficulty: number): { experience: number; unlocks?: string[]; achievements?: string[] } {
  return {
    experience: 50 * difficulty * difficulty,
    unlocks: difficulty >= 3 ? ['advanced-features'] : undefined,
    achievements: difficulty >= 4 ? ['master-solver'] : undefined
  }
}

// ============================================================================
// Main Generator Function
// ============================================================================

export function generatePuzzle(
  type: PuzzleType,
  difficulty: number,
  options: Partial<PuzzleGenerationConfig> = {}
): GeneratedPuzzleResult {
  const config: PuzzleGenerationConfig = {
    difficulty,
    type,
    seed: options.seed || Date.now(),
    ensureSolvable: options.ensureSolvable ?? true,
    maxAttempts: options.maxAttempts || 10,
    constraintsPerPuzzle: options.constraintsPerPuzzle || { min: 2, max: 4 },
    hiddenDimensionPrecision: options.hiddenDimensionPrecision || 1e-10
  }
  
  switch (type) {
    case 'spatial':
      return generateSpatialPuzzle(config, config.seed)
    case 'breeding':
      return generateBreedingPuzzle(config, config.seed)
    case 'routing':
      return generateRoutingPuzzle(config, config.seed)
    case 'coordination':
      return generateCoordinationPuzzle(config, config.seed)
    case 'advanced':
      return generateAdvancedPuzzle(config, config.seed)
    default:
      return generateSpatialPuzzle(config, config.seed)
  }
}

// ============================================================================
// Batch Generation
// ============================================================================

export function generatePuzzleBatch(
  count: number,
  type: PuzzleType,
  difficultyRange: { min: number; max: number } = { min: 1, max: 5 },
  options: Partial<PuzzleGenerationConfig> = {}
): GeneratedPuzzleResult[] {
  const results: GeneratedPuzzleResult[] = []
  
  for (let i = 0; i < count; i++) {
    const difficulty = Math.floor(
      Math.random() * (difficultyRange.max - difficultyRange.min + 1) + difficultyRange.min
    )
    
    results.push(generatePuzzle(type, difficulty, { ...options, seed: Date.now() + i }))
  }
  
  return results
}

// ============================================================================
// Export
// ============================================================================

export default {
  generatePuzzle,
  generateSpatialPuzzle,
  generateBreedingPuzzle,
  generateRoutingPuzzle,
  generateCoordinationPuzzle,
  generateAdvancedPuzzle,
  generatePuzzleBatch
}
