'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ConstraintPuzzle, PuzzleType, Hint } from '@/puzzles/types'
import { ConstraintList, ConstraintSummary, ValidationBadge } from './ConstraintIndicator'
import { QuickScore, ScoreGradeBadge } from './ScoreDisplay'
import { ScoreBreakdown, ScoreGrade } from '@/puzzles/scoring'
import { 
  Play, RotateCcw, Lightbulb, Clock, Star, 
  ChevronDown, ChevronUp, Check, Lock,
  Target, Zap, Award, LockKeyhole
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

export interface PuzzleCardProps {
  puzzle: ConstraintPuzzle
  status?: 'locked' | 'available' | 'in-progress' | 'completed'
  bestScore?: number
  bestGrade?: ScoreGrade
  isSelected?: boolean
  onSelect?: () => void
  onPlay?: () => void
  className?: string
}

export interface ActivePuzzleCardProps {
  puzzle: ConstraintPuzzle
  timeElapsed: number
  hintsUsed: number[]
  onHintRequest?: (level: number) => void
  onReset?: () => void
  onSubmit?: () => void
  className?: string
}

export interface CompletedPuzzleCardProps {
  puzzle: ConstraintPuzzle
  score: ScoreBreakdown
  timeElapsed: number
  hintsUsed: number
  isNewBest?: boolean
  onRetry?: () => void
  onNext?: () => void
  className?: string
}

// ============================================================================
// Puzzle Type Badges
// ============================================================================

const puzzleTypeConfig: Record<PuzzleType, { icon: string; color: string; label: string }> = {
  spatial: { icon: '📍', color: 'bg-blue-500/20 text-blue-400 border-blue-500/50', label: 'Spatial' },
  routing: { icon: '🔀', color: 'bg-purple-500/20 text-purple-400 border-purple-500/50', label: 'Routing' },
  breeding: { icon: '🧬', color: 'bg-pink-500/20 text-pink-400 border-pink-500/50', label: 'Breeding' },
  coordination: { icon: '🤝', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50', label: 'Coordination' },
  advanced: { icon: '🔮', color: 'bg-amber-500/20 text-amber-400 border-amber-500/50', label: 'Advanced' }
}

// ============================================================================
// Difficulty Indicator
// ============================================================================

function DifficultyIndicator({ difficulty }: { difficulty: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'w-1.5 h-4 rounded-full',
            i < difficulty ? 'bg-violet-500' : 'bg-slate-700'
          )}
        />
      ))}
    </div>
  )
}

// ============================================================================
// Base Puzzle Card
// ============================================================================

export function PuzzleCard({
  puzzle,
  status = 'available',
  bestScore,
  bestGrade,
  isSelected,
  onSelect,
  onPlay,
  className
}: PuzzleCardProps) {
  const typeConfig = puzzleTypeConfig[puzzle.type]
  const isLocked = status === 'locked'
  
  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-200',
        'bg-slate-900/80 border-slate-700',
        isSelected && 'ring-2 ring-violet-500 border-violet-500',
        isLocked && 'opacity-60',
        !isLocked && 'hover:border-slate-600 cursor-pointer',
        className
      )}
      onClick={!isLocked ? onSelect : undefined}
    >
      {/* Type Badge */}
      <div className="absolute top-3 right-3">
        <Badge className={cn('gap-1', typeConfig.color)}>
          <span>{typeConfig.icon}</span>
          {typeConfig.label}
        </Badge>
      </div>
      
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3 pr-20">
          <div className="flex-1">
            <CardTitle className="text-lg text-slate-100">{puzzle.name}</CardTitle>
            <CardDescription className="text-slate-400 line-clamp-2 mt-1">
              {puzzle.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pb-3">
        {/* Difficulty */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs text-slate-500">Difficulty</span>
          <DifficultyIndicator difficulty={puzzle.difficulty} />
        </div>
        
        {/* Constraints Preview */}
        <div className="flex flex-wrap gap-1.5">
          {puzzle.constraints.slice(0, 3).map((c, i) => (
            <Badge key={i} variant="outline" className="text-xs bg-slate-800">
              {c.type}
            </Badge>
          ))}
          {puzzle.constraints.length > 3 && (
            <Badge variant="outline" className="text-xs bg-slate-800">
              +{puzzle.constraints.length - 3} more
            </Badge>
          )}
        </div>
        
        {/* Rewards */}
        <div className="flex items-center gap-4 mt-3 text-xs">
          <div className="flex items-center gap-1 text-amber-400">
            <Star className="w-3.5 h-3.5" />
            <span>{puzzle.rewards.experience} XP</span>
          </div>
          {puzzle.rewards.achievements && puzzle.rewards.achievements.length > 0 && (
            <div className="flex items-center gap-1 text-violet-400">
              <Award className="w-3.5 h-3.5" />
              <span>Achievement</span>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="pt-0 flex items-center justify-between">
        {/* Best Score */}
        {status === 'completed' && bestScore !== undefined && bestGrade && (
          <div className="flex items-center gap-2">
            <ScoreGradeBadge grade={bestGrade} size="sm" />
            <span className="text-sm text-slate-300">{bestScore.toLocaleString()}</span>
          </div>
        )}
        
        {status === 'in-progress' && (
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50">
            In Progress
          </Badge>
        )}
        
        {/* Lock or Play Button */}
        {isLocked ? (
          <div className="flex items-center gap-1 text-slate-500">
            <LockKeyhole className="w-4 h-4" />
            <span className="text-sm">Locked</span>
          </div>
        ) : (
          <Button 
            size="sm" 
            className="bg-violet-600 hover:bg-violet-500"
            onClick={(e) => {
              e.stopPropagation()
              onPlay?.()
            }}
          >
            <Play className="w-4 h-4 mr-1" />
            {status === 'in-progress' ? 'Continue' : 'Play'}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

// ============================================================================
// Active Puzzle Card (During Gameplay)
// ============================================================================

export function ActivePuzzleCard({
  puzzle,
  timeElapsed,
  hintsUsed,
  onHintRequest,
  onReset,
  onSubmit,
  className
}: ActivePuzzleCardProps) {
  const [showHints, setShowHints] = useState(false)
  const typeConfig = puzzleTypeConfig[puzzle.type]
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  const availableHints = puzzle.hints.filter(h => !hintsUsed.includes(h.level))
  const usedHints = puzzle.hints.filter(h => hintsUsed.includes(h.level))
  
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="bg-slate-800/50 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className={typeConfig.color}>
              <span className="mr-1">{typeConfig.icon}</span>
              {typeConfig.label}
            </Badge>
            <CardTitle className="text-lg">{puzzle.name}</CardTitle>
          </div>
          
          {/* Timer */}
          <div className="flex items-center gap-1.5 text-slate-400">
            <Clock className="w-4 h-4" />
            <span className="font-mono">{formatTime(timeElapsed)}</span>
          </div>
        </div>
        
        <CardDescription>{puzzle.description}</CardDescription>
      </CardHeader>
      
      <CardContent className="pt-4 space-y-4">
        {/* Constraints */}
        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-2">Objectives</h4>
          <ConstraintList constraints={puzzle.constraints} showProgress={false} />
        </div>
        
        {/* Hints Section */}
        <div>
          <button
            onClick={() => setShowHints(!showHints)}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300 w-full"
          >
            <Lightbulb className="w-4 h-4" />
            <span>
              {availableHints.length > 0 
                ? `${availableHints.length} hints available`
                : 'No hints remaining'
              }
            </span>
            {showHints ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
          </button>
          
          {showHints && (
            <div className="mt-2 space-y-2">
              {usedHints.map((hint, i) => (
                <div key={i} className="p-2 bg-slate-800/50 rounded-lg text-sm text-slate-300">
                  <Badge variant="outline" className="text-xs mb-1">Hint {hint.level}</Badge>
                  <p>{hint.text}</p>
                </div>
              ))}
              
              {availableHints.map((hint, i) => (
                <button
                  key={i}
                  onClick={() => onHintRequest?.(hint.level)}
                  className="w-full p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm text-amber-400 hover:bg-amber-500/20 transition-colors text-left"
                >
                  <div className="flex items-center justify-between">
                    <span>Request Hint (Level {hint.level})</span>
                    <span className="text-xs">-{hint.level * 10}% score</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="bg-slate-800/30 flex gap-2">
        <Button variant="outline" onClick={onReset} className="flex-1">
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset
        </Button>
        <Button onClick={onSubmit} className="flex-1 bg-emerald-600 hover:bg-emerald-500">
          <Check className="w-4 h-4 mr-2" />
          Submit
        </Button>
      </CardFooter>
    </Card>
  )
}

// ============================================================================
// Completed Puzzle Card
// ============================================================================

export function CompletedPuzzleCard({
  puzzle,
  score,
  timeElapsed,
  hintsUsed,
  isNewBest,
  onRetry,
  onNext,
  className
}: CompletedPuzzleCardProps) {
  const typeConfig = puzzleTypeConfig[puzzle.type]
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  return (
    <Card className={cn('overflow-hidden', className)}>
      {/* Header with celebration for perfect/new best */}
      {(score.isPerfect || isNewBest) && (
        <div className="h-1 bg-gradient-to-r from-violet-500 via-amber-500 to-emerald-500" />
      )}
      
      <CardHeader className="bg-slate-800/50 pb-3 text-center">
        <div className="flex justify-center mb-3">
          <ScoreGradeBadge grade={score.grade} size="lg" />
        </div>
        
        <CardTitle className="text-2xl font-bold">
          {score.total.toLocaleString()} points
        </CardTitle>
        
        {score.isPerfect && (
          <div className="flex items-center justify-center gap-1 text-amber-400 mt-1">
            <Zap className="w-4 h-4" />
            <span className="font-medium">Perfect Solution!</span>
          </div>
        )}
        
        {isNewBest && !score.isPerfect && (
          <div className="flex items-center justify-center gap-1 text-emerald-400 mt-1">
            <Target className="w-4 h-4" />
            <span className="font-medium">New Best Score!</span>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="pt-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-2 bg-slate-800/50 rounded-lg">
            <div className="text-xs text-slate-400">Time</div>
            <div className="font-mono text-lg text-slate-200">{formatTime(timeElapsed)}</div>
          </div>
          <div className="p-2 bg-slate-800/50 rounded-lg">
            <div className="text-xs text-slate-400">Hints</div>
            <div className="text-lg text-slate-200">{hintsUsed}</div>
          </div>
          <div className="p-2 bg-slate-800/50 rounded-lg">
            <div className="text-xs text-slate-400">XP Gained</div>
            <div className="text-lg text-violet-400">+{puzzle.rewards.experience}</div>
          </div>
        </div>
        
        {/* Multiplier Breakdown */}
        {score.difficultyMultiplier > 1 || score.streakMultiplier > 1 ? (
          <div className="flex flex-wrap gap-2 justify-center">
            {score.difficultyMultiplier > 1 && (
              <Badge variant="outline" className="text-violet-400 border-violet-500/50">
                Difficulty ×{score.difficultyMultiplier.toFixed(1)}
              </Badge>
            )}
            {score.streakMultiplier > 1 && (
              <Badge variant="outline" className="text-amber-400 border-amber-500/50">
                Streak ×{score.streakMultiplier.toFixed(1)}
              </Badge>
            )}
          </div>
        ) : null}
      </CardContent>
      
      <CardFooter className="bg-slate-800/30 flex gap-2">
        <Button variant="outline" onClick={onRetry} className="flex-1">
          <RotateCcw className="w-4 h-4 mr-2" />
          Retry
        </Button>
        <Button onClick={onNext} className="flex-1 bg-violet-600 hover:bg-violet-500">
          Next Puzzle
          <ChevronDown className="w-4 h-4 ml-2 rotate-[-90deg]" />
        </Button>
      </CardFooter>
    </Card>
  )
}

// ============================================================================
// Export
// ============================================================================

export default PuzzleCard
