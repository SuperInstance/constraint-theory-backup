/**
 * Level Generator for Constraint Ranch
 * 
 * Level progression, unlock system, and achievement generation.
 * 
 * @module levelGenerator
 */

import { PuzzleType, ConstraintPuzzle } from '@/puzzles/types'
import { getTotalXPForLevel, getTitleForLevel, Achievement } from '@/puzzles/scoring'
import { generatePuzzle, PuzzleGenerationConfig } from './puzzleGenerator'

// ============================================================================
// Types
// ============================================================================

export interface Level {
  id: number
  name: string
  description: string
  requiredXP: number
  unlocks: Unlock[]
  puzzles: LevelPuzzle[]
  achievements: Achievement[]
  tutorial?: TutorialStep[]
}

export interface LevelPuzzle {
  id: string
  puzzleId: string
  required: boolean
  rewardXP: number
  unlocked: boolean
  completed: boolean
  bestScore?: number
}

export interface Unlock {
  id: string
  type: 'puzzle-type' | 'agent-species' | 'feature' | 'cosmetic'
  name: string
  description: string
  icon: string
}

export interface TutorialStep {
  id: string
  title: string
  content: string
  highlight?: string
  action?: string
}

export interface PlayerProgress {
  level: number
  xp: number
  completedPuzzles: Set<string>
  achievements: Set<string>
  unlocks: Set<string>
  streak: number
  lastPlayed: Date | null
}

export interface LevelProgression {
  levels: Level[]
  currentLevel: number
  totalXP: number
  nextLevelXP: number
}

// ============================================================================
// Level Definitions
// ============================================================================

const LEVEL_CONFIGS: Array<{
  name: string
  description: string
  puzzleTypes: PuzzleType[]
  puzzleCount: number
  difficulty: { min: number; max: number }
  unlocks: Array<Omit<Unlock, 'id'>>
}> = [
  {
    name: 'Welcome to the Ranch',
    description: 'Learn the basics of constraint satisfaction',
    puzzleTypes: ['spatial'],
    puzzleCount: 3,
    difficulty: { min: 1, max: 1 },
    unlocks: [
      { type: 'puzzle-type', name: 'Spatial Puzzles', description: 'Position-based challenges', icon: '📍' },
      { type: 'agent-species', name: 'Moo Master', description: 'Your first agent species', icon: '🐄' }
    ]
  },
  {
    name: 'Getting Cozy',
    description: 'Master basic positioning and coverage',
    puzzleTypes: ['spatial'],
    puzzleCount: 4,
    difficulty: { min: 1, max: 2 },
    unlocks: [
      { type: 'agent-species', name: 'Cluck Commander', description: 'Speed-focused agent', icon: '🐔' },
      { type: 'feature', name: 'Night School', description: 'Train traits beyond genetic limits', icon: '🏫' }
    ]
  },
  {
    name: 'The Breeding Begins',
    description: 'Learn genetic inheritance',
    puzzleTypes: ['spatial', 'breeding'],
    puzzleCount: 5,
    difficulty: { min: 1, max: 2 },
    unlocks: [
      { type: 'puzzle-type', name: 'Breeding Puzzles', description: 'Genetic challenges', icon: '🧬' },
      { type: 'agent-species', name: 'Oink Oracle', description: 'Truffle specialist', icon: '🐷' }
    ]
  },
  {
    name: 'Routing Roads',
    description: 'Distribute tasks efficiently',
    puzzleTypes: ['routing', 'spatial'],
    puzzleCount: 5,
    difficulty: { min: 2, max: 3 },
    unlocks: [
      { type: 'puzzle-type', name: 'Routing Puzzles', description: 'Task distribution', icon: '🔀' },
      { type: 'agent-species', name: 'Wool Wizard', description: 'Wool producer', icon: '🐑' }
    ]
  },
  {
    name: 'Team Tactics',
    description: 'Coordinate multiple agents',
    puzzleTypes: ['coordination', 'routing'],
    puzzleCount: 5,
    difficulty: { min: 2, max: 3 },
    unlocks: [
      { type: 'puzzle-type', name: 'Coordination Puzzles', description: 'Team synchronization', icon: '🤝' },
      { type: 'agent-species', name: 'Gallop Guru', description: 'Transport specialist', icon: '🐴' }
    ]
  },
  {
    name: 'Hidden Depths',
    description: 'Discover hidden dimensions',
    puzzleTypes: ['spatial', 'advanced'],
    puzzleCount: 6,
    difficulty: { min: 3, max: 4 },
    unlocks: [
      { type: 'feature', name: 'Hidden Dimensions', description: 'See the precision encoding', icon: '🔮' },
      { type: 'cosmetic', name: 'Cosmic Trail', description: 'Special effect for agents', icon: '✨' }
    ]
  },
  {
    name: 'Ecosystem Manager',
    description: 'Balance complex systems',
    puzzleTypes: ['advanced', 'coordination'],
    puzzleCount: 6,
    difficulty: { min: 3, max: 4 },
    unlocks: [
      { type: 'puzzle-type', name: 'Advanced Puzzles', description: 'Multi-system challenges', icon: '🎯' },
      { type: 'agent-species', name: 'Hop Hero', description: 'Speed demon', icon: '🐰' }
    ]
  },
  {
    name: 'Master Breeder',
    description: 'Perfect genetic combinations',
    puzzleTypes: ['breeding', 'advanced'],
    puzzleCount: 7,
    difficulty: { min: 3, max: 5 },
    unlocks: [
      { type: 'feature', name: 'Trait Fusion', description: 'Combine traits in new ways', icon: '⚡' },
      { type: 'agent-species', name: 'Climb Champion', description: 'Terrain master', icon: '🐐' }
    ]
  },
  {
    name: 'Network Architect',
    description: 'Design optimal routing systems',
    puzzleTypes: ['routing', 'coordination'],
    puzzleCount: 7,
    difficulty: { min: 4, max: 5 },
    unlocks: [
      { type: 'feature', name: 'Auto-Optimize', description: 'AI-assisted routing', icon: '🤖' },
      { type: 'agent-species', name: 'Quack Quest', description: 'Water specialist', icon: '🦆' }
    ]
  },
  {
    name: 'Constraint Sage',
    description: 'Master all puzzle types',
    puzzleTypes: ['spatial', 'breeding', 'routing', 'coordination', 'advanced'],
    puzzleCount: 10,
    difficulty: { min: 4, max: 5 },
    unlocks: [
      { type: 'cosmetic', name: 'Golden Ranch', description: 'Premium theme', icon: '🏆' },
      { type: 'feature', name: 'Puzzle Creator', description: 'Create custom puzzles', icon: '🎨' }
    ]
  }
]

// ============================================================================
// Achievement Definitions
// ============================================================================

const ACHIEVEMENT_TEMPLATES: Array<{
  id: string
  name: string
  description: string
  category: Achievement['category']
  tier: Achievement['tier']
  icon: string
  condition: (progress: PlayerProgress) => boolean
}> = [
  // Progression achievements
  {
    id: 'first-puzzle',
    name: 'First Steps',
    description: 'Complete your first puzzle',
    category: 'progression',
    tier: 'bronze',
    icon: '🧩',
    condition: (p) => p.completedPuzzles.size >= 1
  },
  {
    id: 'ten-puzzles',
    name: 'Puzzle Enthusiast',
    description: 'Complete 10 puzzles',
    category: 'progression',
    tier: 'bronze',
    icon: '🎯',
    condition: (p) => p.completedPuzzles.size >= 10
  },
  {
    id: 'fifty-puzzles',
    name: 'Puzzle Master',
    description: 'Complete 50 puzzles',
    category: 'progression',
    tier: 'silver',
    icon: '🏆',
    condition: (p) => p.completedPuzzles.size >= 50
  },
  {
    id: 'hundred-puzzles',
    name: 'Puzzle Legend',
    description: 'Complete 100 puzzles',
    category: 'progression',
    tier: 'gold',
    icon: '👑',
    condition: (p) => p.completedPuzzles.size >= 100
  },
  
  // Streak achievements
  {
    id: 'streak-3',
    name: 'On a Roll',
    description: '3 day streak',
    category: 'progression',
    tier: 'bronze',
    icon: '🔥',
    condition: (p) => p.streak >= 3
  },
  {
    id: 'streak-7',
    name: 'Dedicated Rancher',
    description: '7 day streak',
    category: 'progression',
    tier: 'silver',
    icon: '📅',
    condition: (p) => p.streak >= 7
  },
  {
    id: 'streak-30',
    name: 'Ranch Lifer',
    description: '30 day streak',
    category: 'progression',
    tier: 'gold',
    icon: '💎',
    condition: (p) => p.streak >= 30
  },
  
  // Level achievements
  {
    id: 'level-5',
    name: 'Apprentice',
    description: 'Reach level 5',
    category: 'progression',
    tier: 'bronze',
    icon: '⭐',
    condition: (p) => p.level >= 5
  },
  {
    id: 'level-10',
    name: 'Expert',
    description: 'Reach level 10',
    category: 'progression',
    tier: 'silver',
    icon: '🌟',
    condition: (p) => p.level >= 10
  },
  {
    id: 'level-20',
    name: 'Master',
    description: 'Reach level 20',
    category: 'progression',
    tier: 'gold',
    icon: '💫',
    condition: (p) => p.level >= 20
  },
  
  // Puzzle type achievements
  {
    id: 'spatial-master',
    name: 'Spatial Master',
    description: 'Complete 20 spatial puzzles',
    category: 'puzzle',
    tier: 'silver',
    icon: '📍',
    condition: (p) => Array.from(p.completedPuzzles).filter(id => id.startsWith('spatial')).length >= 20
  },
  {
    id: 'breeding-master',
    name: 'Breeding Master',
    description: 'Complete 20 breeding puzzles',
    category: 'breeding',
    tier: 'silver',
    icon: '🧬',
    condition: (p) => Array.from(p.completedPuzzles).filter(id => id.startsWith('breeding')).length >= 20
  },
  {
    id: 'routing-master',
    name: 'Routing Master',
    description: 'Complete 20 routing puzzles',
    category: 'puzzle',
    tier: 'silver',
    icon: '🔀',
    condition: (p) => Array.from(p.completedPuzzles).filter(id => id.startsWith('routing')).length >= 20
  },
  {
    id: 'coordination-master',
    name: 'Coordination Master',
    description: 'Complete 20 coordination puzzles',
    category: 'coordination',
    tier: 'silver',
    icon: '🤝',
    condition: (p) => Array.from(p.completedPuzzles).filter(id => id.startsWith('coordination')).length >= 20
  },
  {
    id: 'advanced-master',
    name: 'Advanced Master',
    description: 'Complete 10 advanced puzzles',
    category: 'puzzle',
    tier: 'gold',
    icon: '🎯',
    condition: (p) => Array.from(p.completedPuzzles).filter(id => id.startsWith('advanced')).length >= 10
  }
]

// ============================================================================
// Level Generation
// ============================================================================

export function generateLevel(levelNum: number, seed?: number): Level {
  const config = LEVEL_CONFIGS[Math.min(levelNum - 1, LEVEL_CONFIGS.length - 1)]
  const xpRequired = getTotalXPForLevel(levelNum + 1) - getTotalXPForLevel(levelNum)
  
  // Generate puzzles for this level
  const puzzles: LevelPuzzle[] = []
  const puzzleSeed = seed || Date.now()
  
  for (let i = 0; i < config.puzzleCount; i++) {
    const type = config.puzzleTypes[i % config.puzzleTypes.length]
    const difficulty = config.difficulty.min + 
      Math.floor((config.difficulty.max - config.difficulty.min) * (i / config.puzzleCount))
    
    puzzles.push({
      id: `level-${levelNum}-puzzle-${i}`,
      puzzleId: `${type}-${puzzleSeed + i}`,
      required: i < Math.ceil(config.puzzleCount * 0.6),
      rewardXP: 30 * difficulty * difficulty,
      unlocked: i === 0,
      completed: false
    })
  }
  
  // Generate unlocks
  const unlocks: Unlock[] = config.unlocks.map((u, i) => ({
    ...u,
    id: `unlock-${levelNum}-${i}`
  }))
  
  // Generate achievements for this level
  const achievements = ACHIEVEMENT_TEMPLATES
    .filter(t => t.id.includes(`level-${levelNum}`) || (levelNum === 1 && t.id === 'first-puzzle'))
    .map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      tier: t.tier,
      icon: t.icon,
      hidden: false,
      experience: t.tier === 'gold' ? 150 : t.tier === 'silver' ? 100 : 50,
      credits: t.tier === 'gold' ? 75 : t.tier === 'silver' ? 50 : 25
    }))
  
  // Tutorial for first level
  const tutorial = levelNum === 1 ? [
    {
      id: 'welcome',
      title: 'Welcome!',
      content: 'Drag agents onto the board to position them.',
      highlight: 'game-board'
    },
    {
      id: 'constraints',
      title: 'Meet Your Goals',
      content: 'Check the constraint panel to see what you need to achieve.',
      highlight: 'constraint-panel'
    },
    {
      id: 'submit',
      title: 'Submit Your Solution',
      content: 'Click submit when you think you\'ve solved the puzzle!',
      highlight: 'submit-button'
    }
  ] : undefined
  
  return {
    id: levelNum,
    name: config.name,
    description: config.description,
    requiredXP: xpRequired,
    unlocks,
    puzzles,
    achievements,
    tutorial
  }
}

// ============================================================================
// Full Level Progression
// ============================================================================

export function generateLevelProgression(
  currentXP: number,
  currentLevel: number,
  maxLevel: number = 10
): LevelProgression {
  const levels: Level[] = []
  
  for (let i = 1; i <= maxLevel; i++) {
    levels.push(generateLevel(i))
  }
  
  return {
    levels,
    currentLevel,
    totalXP: currentXP,
    nextLevelXP: getTotalXPForLevel(currentLevel + 1)
  }
}

// ============================================================================
// Unlock System
// ============================================================================

export function checkUnlocks(
  level: number,
  completedPuzzles: Set<string>,
  existingUnlocks: Set<string>
): Unlock[] {
  const levelData = generateLevel(level)
  const newUnlocks: Unlock[] = []
  
  // Check level-based unlocks
  for (const unlock of levelData.unlocks) {
    if (!existingUnlocks.has(unlock.id)) {
      newUnlocks.push(unlock)
    }
  }
  
  return newUnlocks
}

export function isUnlocked(
  unlockId: string,
  playerProgress: PlayerProgress
): boolean {
  // Check if player has this unlock
  return playerProgress.unlocks.has(unlockId)
}

export function isPuzzleUnlocked(
  puzzleId: string,
  levelPuzzles: LevelPuzzle[],
  completedPuzzles: Set<string>
): boolean {
  const puzzleIndex = levelPuzzles.findIndex(p => p.puzzleId === puzzleId)
  
  // First puzzle is always unlocked
  if (puzzleIndex === 0) return true
  
  // Previous puzzle must be completed
  const previousPuzzle = levelPuzzles[puzzleIndex - 1]
  return previousPuzzle ? completedPuzzles.has(previousPuzzle.puzzleId) : false
}

// ============================================================================
// Achievement System
// ============================================================================

export function checkAchievements(progress: PlayerProgress): Achievement[] {
  const newlyUnlocked: Achievement[] = []
  
  for (const template of ACHIEVEMENT_TEMPLATES) {
    if (!progress.achievements.has(template.id) && template.condition(progress)) {
      newlyUnlocked.push({
        id: template.id,
        name: template.name,
        description: template.description,
        category: template.category,
        tier: template.tier,
        icon: template.icon,
        hidden: false,
        experience: template.tier === 'gold' ? 150 : template.tier === 'silver' ? 100 : 50,
        credits: template.tier === 'gold' ? 75 : template.tier === 'silver' ? 50 : 25
      })
    }
  }
  
  return newlyUnlocked
}

export function getAllAchievements(): Achievement[] {
  return ACHIEVEMENT_TEMPLATES.map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    category: t.category,
    tier: t.tier,
    icon: t.icon,
    hidden: false,
    experience: t.tier === 'gold' ? 150 : t.tier === 'silver' ? 100 : 50,
    credits: t.tier === 'gold' ? 75 : t.tier === 'silver' ? 50 : 25
  }))
}

// ============================================================================
// Daily Challenges
// ============================================================================

export interface DailyChallenge {
  id: string
  date: string
  puzzle: ConstraintPuzzle
  reward: {
    experience: number
    credits: number
    bonus?: string
  }
  completed: boolean
  bestScore?: number
}

export function generateDailyChallenge(date: Date = new Date()): DailyChallenge {
  const dateStr = date.toISOString().split('T')[0]
  const seed = hashCode(dateStr)
  
  // Rotate through puzzle types based on day of week
  const types: PuzzleType[] = ['spatial', 'breeding', 'routing', 'coordination', 'advanced']
  const dayOfWeek = date.getDay()
  const puzzleType = types[dayOfWeek % types.length]
  
  // Difficulty based on day of month
  const difficulty = Math.min(5, Math.ceil(date.getDate() / 6))
  
  const result = generatePuzzle(puzzleType, difficulty, { seed })
  
  return {
    id: `daily-${dateStr}`,
    date: dateStr,
    puzzle: result.puzzle,
    reward: {
      experience: 100 * difficulty,
      credits: 50 * difficulty,
      bonus: difficulty >= 4 ? 'Rare Cosmetic' : undefined
    },
    completed: false
  }
}

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

// ============================================================================
// Export
// ============================================================================

export default {
  generateLevel,
  generateLevelProgression,
  checkUnlocks,
  isUnlocked,
  isPuzzleUnlocked,
  checkAchievements,
  getAllAchievements,
  generateDailyChallenge
}
