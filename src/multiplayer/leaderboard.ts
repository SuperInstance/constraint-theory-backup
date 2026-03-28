/**
 * Leaderboard System for Constraint Ranch
 * 
 * Global scores, rankings, and player statistics.
 * 
 * @module leaderboard
 */

import { ScoreGrade } from '@/puzzles/scoring'
import { PuzzleType } from '@/puzzles/types'

// ============================================================================
// Types
// ============================================================================

export interface LeaderboardEntry {
  rank: number
  playerId: string
  playerName: string
  avatar: string
  score: number
  grade: ScoreGrade
  time: number // seconds
  puzzleId: string
  puzzleType: PuzzleType
  timestamp: Date
  isExact: boolean // Used hidden dimensions
}

export interface LeaderboardCategory {
  id: string
  name: string
  description: string
  type: 'global' | 'daily' | 'weekly' | 'puzzle-type' | 'friends'
  entries: LeaderboardEntry[]
  updatedAt: Date
}

export interface PlayerStats {
  playerId: string
  playerName: string
  avatar: string
  level: number
  totalXP: number
  puzzlesCompleted: number
  perfectSolutions: number
  averageScore: number
  averageTime: number
  bestGrade: ScoreGrade
  streak: number
  longestStreak: number
  achievementsUnlocked: number
  joinedAt: Date
  lastActiveAt: Date
}

export interface LeaderboardFilter {
  puzzleType?: PuzzleType
  difficulty?: number
  timeRange?: 'all' | 'day' | 'week' | 'month'
  friends?: boolean
}

// ============================================================================
// In-Memory Leaderboard Storage (Would be database in production)
// ============================================================================

class LeaderboardStore {
  private entries: Map<string, LeaderboardEntry[]> = new Map()
  private playerStats: Map<string, PlayerStats> = new Map()
  
  constructor() {
    // Initialize with some demo data
    this.initializeDemoData()
  }
  
  private initializeDemoData(): void {
    const demoPlayers = [
      { id: 'demo-1', name: 'Constraint Master', avatar: '🐴' },
      { id: 'demo-2', name: 'Puzzle Sage', avatar: '🦉' },
      { id: 'demo-3', name: 'Logic Lord', avatar: '🧠' },
      { id: 'demo-4', name: 'Math Wizard', avatar: '🧙' },
      { id: 'demo-5', name: 'Pythagorean Pro', avatar: '📐' }
    ]
    
    const puzzleTypes: PuzzleType[] = ['spatial', 'breeding', 'routing', 'coordination', 'advanced']
    const grades: ScoreGrade[] = ['S', 'A', 'B', 'C']
    
    // Add demo entries for each puzzle type
    for (const type of puzzleTypes) {
      const entries: LeaderboardEntry[] = []
      
      for (let i = 0; i < demoPlayers.length; i++) {
        const player = demoPlayers[i]
        const baseScore = 1000 - i * 100
        const variation = Math.floor(Math.random() * 50)
        
        entries.push({
          rank: i + 1,
          playerId: player.id,
          playerName: player.name,
          avatar: player.avatar,
          score: baseScore + variation,
          grade: grades[Math.min(i, grades.length - 1)],
          time: 60 + i * 15 + Math.floor(Math.random() * 30),
          puzzleId: `${type}-demo`,
          puzzleType: type,
          timestamp: new Date(Date.now() - i * 3600000),
          isExact: i < 2
        })
      }
      
      this.entries.set(type, entries)
    }
    
    // Add demo player stats
    for (const player of demoPlayers) {
      this.playerStats.set(player.id, {
        playerId: player.id,
        playerName: player.name,
        avatar: player.avatar,
        level: Math.floor(Math.random() * 20) + 5,
        totalXP: Math.floor(Math.random() * 5000) + 1000,
        puzzlesCompleted: Math.floor(Math.random() * 100) + 20,
        perfectSolutions: Math.floor(Math.random() * 10),
        averageScore: 700 + Math.floor(Math.random() * 200),
        averageTime: 90 + Math.floor(Math.random() * 60),
        bestGrade: 'S',
        streak: Math.floor(Math.random() * 10),
        longestStreak: Math.floor(Math.random() * 30) + 5,
        achievementsUnlocked: Math.floor(Math.random() * 20),
        joinedAt: new Date(Date.now() - Math.random() * 30 * 24 * 3600000),
        lastActiveAt: new Date()
      })
    }
  }
  
  addEntry(entry: Omit<LeaderboardEntry, 'rank'>): void {
    const key = entry.puzzleType
    const entries = this.entries.get(key) || []
    
    // Add entry
    entries.push(entry as LeaderboardEntry)
    
    // Sort by score (descending), then by time (ascending)
    entries.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.time - b.time
    })
    
    // Update ranks
    entries.forEach((e, i) => {
      e.rank = i + 1
    })
    
    // Keep only top 100
    this.entries.set(key, entries.slice(0, 100))
  }
  
  getLeaderboard(
    puzzleType: PuzzleType, 
    limit: number = 10,
    offset: number = 0
  ): LeaderboardEntry[] {
    const entries = this.entries.get(puzzleType) || []
    return entries.slice(offset, offset + limit)
  }
  
  getPlayerRank(playerId: string, puzzleType: PuzzleType): number | null {
    const entries = this.entries.get(puzzleType) || []
    const entry = entries.find(e => e.playerId === playerId)
    return entry?.rank || null
  }
  
  updatePlayerStats(playerId: string, updates: Partial<PlayerStats>): void {
    const existing = this.playerStats.get(playerId)
    if (existing) {
      this.playerStats.set(playerId, { ...existing, ...updates })
    }
  }
  
  getPlayerStats(playerId: string): PlayerStats | null {
    return this.playerStats.get(playerId) || null
  }
  
  getTopPlayers(limit: number = 10): PlayerStats[] {
    return Array.from(this.playerStats.values())
      .sort((a, b) => b.totalXP - a.totalXP)
      .slice(0, limit)
  }
  
  searchPlayers(query: string): PlayerStats[] {
    const lowerQuery = query.toLowerCase()
    return Array.from(this.playerStats.values())
      .filter(p => p.playerName.toLowerCase().includes(lowerQuery))
  }
}

// ============================================================================
// Global Store Instance
// ============================================================================

export const leaderboardStore = new LeaderboardStore()

// ============================================================================
// Leaderboard API Functions
// ============================================================================

export function getLeaderboard(
  puzzleType: PuzzleType,
  options: {
    limit?: number
    offset?: number
    filter?: LeaderboardFilter
  } = {}
): LeaderboardCategory {
  const { limit = 10, offset = 0 } = options
  const entries = leaderboardStore.getLeaderboard(puzzleType, limit, offset)
  
  return {
    id: puzzleType,
    name: getPuzzleTypeName(puzzleType),
    description: `Top scores for ${getPuzzleTypeName(puzzleType).toLowerCase()}`,
    type: 'puzzle-type',
    entries,
    updatedAt: new Date()
  }
}

export function getGlobalLeaderboard(limit: number = 10): LeaderboardCategory {
  const allEntries: LeaderboardEntry[] = []
  
  // Combine all puzzle types
  const types: PuzzleType[] = ['spatial', 'breeding', 'routing', 'coordination', 'advanced']
  for (const type of types) {
    const entries = leaderboardStore.getLeaderboard(type, 100)
    allEntries.push(...entries)
  }
  
  // Sort by score and take top entries
  allEntries.sort((a, b) => b.score - a.score)
  const topEntries = allEntries.slice(0, limit)
  
  // Update ranks
  topEntries.forEach((e, i) => {
    e.rank = i + 1
  })
  
  return {
    id: 'global',
    name: 'Global Leaderboard',
    description: 'Top players across all puzzle types',
    type: 'global',
    entries: topEntries,
    updatedAt: new Date()
  }
}

export function getDailyLeaderboard(): LeaderboardCategory {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const allEntries: LeaderboardEntry[] = []
  const types: PuzzleType[] = ['spatial', 'breeding', 'routing', 'coordination', 'advanced']
  
  for (const type of types) {
    const entries = leaderboardStore.getLeaderboard(type, 100)
    const todayEntries = entries.filter(e => {
      const entryDate = new Date(e.timestamp)
      entryDate.setHours(0, 0, 0, 0)
      return entryDate.getTime() === today.getTime()
    })
    allEntries.push(...todayEntries)
  }
  
  allEntries.sort((a, b) => b.score - a.score)
  
  return {
    id: 'daily',
    name: 'Today\'s Best',
    description: 'Top scores achieved today',
    type: 'daily',
    entries: allEntries.slice(0, 10),
    updatedAt: new Date()
  }
}

export function submitScore(
  playerId: string,
  playerName: string,
  avatar: string,
  puzzleId: string,
  puzzleType: PuzzleType,
  score: number,
  grade: ScoreGrade,
  time: number,
  isExact: boolean
): LeaderboardEntry | null {
  // Create entry
  const entry: Omit<LeaderboardEntry, 'rank'> = {
    playerId,
    playerName,
    avatar,
    score,
    grade,
    time,
    puzzleId,
    puzzleType,
    timestamp: new Date(),
    isExact
  }
  
  // Add to leaderboard
  leaderboardStore.addEntry(entry)
  
  // Get the rank
  const rank = leaderboardStore.getPlayerRank(playerId, puzzleType)
  
  if (rank !== null) {
    // Update player stats
    const stats = leaderboardStore.getPlayerStats(playerId)
    if (stats) {
      leaderboardStore.updatePlayerStats(playerId, {
        puzzlesCompleted: stats.puzzlesCompleted + 1,
        totalXP: stats.totalXP + score,
        perfectSolutions: stats.perfectSolutions + (grade === 'S' ? 1 : 0),
        lastActiveAt: new Date()
      })
    }
    
    return { ...entry, rank }
  }
  
  return null
}

export function getPlayerRank(playerId: string, puzzleType: PuzzleType): number | null {
  return leaderboardStore.getPlayerRank(playerId, puzzleType)
}

export function getPlayerStats(playerId: string): PlayerStats | null {
  return leaderboardStore.getPlayerStats(playerId)
}

export function getTopPlayers(limit: number = 10): PlayerStats[] {
  return leaderboardStore.getTopPlayers(limit)
}

export function searchPlayers(query: string): PlayerStats[] {
  return leaderboardStore.searchPlayers(query)
}

// ============================================================================
// Helper Functions
// ============================================================================

function getPuzzleTypeName(type: PuzzleType): string {
  const names: Record<PuzzleType, string> = {
    spatial: 'Spatial Puzzles',
    routing: 'Routing Puzzles',
    breeding: 'Breeding Puzzles',
    coordination: 'Coordination Puzzles',
    advanced: 'Advanced Puzzles'
  }
  return names[type]
}

// ============================================================================
// Export
// ============================================================================

export default {
  getLeaderboard,
  getGlobalLeaderboard,
  getDailyLeaderboard,
  submitScore,
  getPlayerRank,
  getPlayerStats,
  getTopPlayers,
  searchPlayers,
  leaderboardStore
}
