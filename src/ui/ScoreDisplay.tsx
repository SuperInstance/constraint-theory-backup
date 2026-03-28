'use client'

import { cn } from '@/lib/utils'
import { ScoreBreakdown, ScoreGrade, getTitleForLevel } from '@/puzzles/scoring'
import { Trophy, Star, Clock, Zap, Target, TrendingUp, Award, Flame } from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

export interface ScoreDisplayProps {
  score: ScoreBreakdown
  showBreakdown?: boolean
  animate?: boolean
  className?: string
}

export interface ScoreGradeBadgeProps {
  grade: ScoreGrade
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export interface XPBarProps {
  currentXP: number
  level: number
  showLevel?: boolean
  className?: string
}

export interface StreakCounterProps {
  streak: number
  className?: string
}

// ============================================================================
// Score Grade Badge
// ============================================================================

const gradeColors: Record<ScoreGrade, { bg: string; text: string; border: string }> = {
  S: { bg: 'bg-gradient-to-br from-amber-400 to-yellow-600', text: 'text-white', border: 'border-amber-300' },
  A: { bg: 'bg-gradient-to-br from-emerald-400 to-green-600', text: 'text-white', border: 'border-emerald-300' },
  B: { bg: 'bg-gradient-to-br from-blue-400 to-blue-600', text: 'text-white', border: 'border-blue-300' },
  C: { bg: 'bg-gradient-to-br from-violet-400 to-purple-600', text: 'text-white', border: 'border-violet-300' },
  D: { bg: 'bg-gradient-to-br from-slate-400 to-slate-600', text: 'text-white', border: 'border-slate-300' },
  F: { bg: 'bg-gradient-to-br from-red-400 to-red-600', text: 'text-white', border: 'border-red-300' }
}

const gradeSize = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-12 h-12 text-xl',
  lg: 'w-16 h-16 text-3xl'
}

export function ScoreGradeBadge({ grade, size = 'md', className }: ScoreGradeBadgeProps) {
  const colors = gradeColors[grade]
  
  return (
    <div
      className={cn(
        'rounded-lg flex items-center justify-center font-bold shadow-lg',
        colors.bg,
        colors.text,
        'border-2',
        colors.border,
        gradeSize[size],
        className
      )}
    >
      {grade}
    </div>
  )
}

// ============================================================================
// Main Score Display
// ============================================================================

export function ScoreDisplay({ 
  score, 
  showBreakdown = false, 
  animate = true,
  className 
}: ScoreDisplayProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Main Score Card */}
      <div className={cn(
        'relative overflow-hidden rounded-xl border border-slate-700 bg-slate-900/80 p-6',
        animate && 'animate-fade-in'
      )}>
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '24px 24px'
          }} />
        </div>
        
        {/* Content */}
        <div className="relative flex items-center gap-6">
          {/* Grade Badge */}
          <ScoreGradeBadge grade={score.grade} size="lg" />
          
          {/* Score Details */}
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className={cn(
                'text-4xl font-bold',
                score.isPerfect ? 'text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-violet-400' : 'text-white'
              )}>
                {score.total.toLocaleString()}
              </span>
              <span className="text-slate-400 text-sm">points</span>
            </div>
            
            {score.isPerfect && (
              <div className="flex items-center gap-1.5 mt-1">
                <Star className="w-4 h-4 text-amber-400" />
                <span className="text-amber-400 text-sm font-medium">Perfect Solution!</span>
              </div>
            )}
            
            {/* Subtotal */}
            <div className="text-xs text-slate-500 mt-1">
              Base: {Math.round(score.subtotal)} × {score.difficultyMultiplier.toFixed(2)} × {score.streakMultiplier.toFixed(2)}
            </div>
          </div>
          
          {/* Perfect Indicator */}
          {score.isPerfect && (
            <div className="absolute top-2 right-2">
              <Trophy className="w-6 h-6 text-amber-400 animate-bounce" />
            </div>
          )}
        </div>
      </div>
      
      {/* Breakdown */}
      {showBreakdown && (
        <div className="grid grid-cols-2 gap-3">
          {/* Base Score */}
          <ScoreItem
            icon={<Target className="w-4 h-4" />}
            label="Constraints"
            value={score.constraintsScore}
            color="violet"
          />
          
          {/* Time Bonus */}
          <ScoreItem
            icon={<Clock className="w-4 h-4" />}
            label="Time Bonus"
            value={score.timeBonus}
            positive={score.timeBonus > 0}
            color="blue"
          />
          
          {/* Elegance Bonus */}
          <ScoreItem
            icon={<Zap className="w-4 h-4" />}
            label="Elegance"
            value={score.eleganceBonus}
            positive={score.eleganceBonus > 0}
            color="emerald"
          />
          
          {/* Perfect Bonus */}
          {score.perfectSolutionBonus > 0 && (
            <ScoreItem
              icon={<Star className="w-4 h-4" />}
              label="Perfect"
              value={score.perfectSolutionBonus}
              positive
              color="amber"
            />
          )}
          
          {/* First Attempt */}
          {score.firstAttemptBonus > 0 && (
            <ScoreItem
              icon={<TrendingUp className="w-4 h-4" />}
              label="First Try"
              value={score.firstAttemptBonus}
              positive
              color="pink"
            />
          )}
          
          {/* No Hints */}
          {score.noHintsBonus > 0 && (
            <ScoreItem
              icon={<Award className="w-4 h-4" />}
              label="No Hints"
              value={score.noHintsBonus}
              positive
              color="cyan"
            />
          )}
          
          {/* Penalties */}
          {score.hintPenalty > 0 && (
            <ScoreItem
              icon={<Star className="w-4 h-4" />}
              label="Hint Penalty"
              value={-score.hintPenalty}
              negative
              color="red"
            />
          )}
          
          {score.timePenalty > 0 && (
            <ScoreItem
              icon={<Clock className="w-4 h-4" />}
              label="Time Penalty"
              value={-score.timePenalty}
              negative
              color="red"
            />
          )}
        </div>
      )}
      
      {/* Multipliers */}
      {showBreakdown && (
        <div className="flex flex-wrap gap-3 text-xs">
          {score.difficultyMultiplier > 1 && (
            <MultiplierBadge label="Difficulty" value={score.difficultyMultiplier} />
          )}
          {score.streakMultiplier > 1 && (
            <MultiplierBadge label="Streak" value={score.streakMultiplier} />
          )}
          {score.levelMultiplier > 1 && (
            <MultiplierBadge label="Level" value={score.levelMultiplier} />
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Score Item Component
// ============================================================================

interface ScoreItemProps {
  icon: React.ReactNode
  label: string
  value: number
  positive?: boolean
  negative?: boolean
  color?: string
}

function ScoreItem({ icon, label, value, positive, negative, color = 'slate' }: ScoreItemProps) {
  const colorClasses: Record<string, string> = {
    violet: 'text-violet-400 bg-violet-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
    emerald: 'text-emerald-400 bg-emerald-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
    pink: 'text-pink-400 bg-pink-500/10',
    cyan: 'text-cyan-400 bg-cyan-500/10',
    red: 'text-red-400 bg-red-500/10',
    slate: 'text-slate-400 bg-slate-500/10'
  }
  
  return (
    <div className={cn(
      'flex items-center gap-2 p-2 rounded-lg',
      colorClasses[color]
    )}>
      {icon}
      <div className="flex-1">
        <div className="text-xs text-slate-400">{label}</div>
        <div className={cn(
          'font-semibold',
          positive && 'text-emerald-400',
          negative && 'text-red-400'
        )}>
          {value >= 0 ? '+' : ''}{Math.round(value)}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Multiplier Badge
// ============================================================================

interface MultiplierBadgeProps {
  label: string
  value: number
}

function MultiplierBadge({ label, value }: MultiplierBadgeProps) {
  return (
    <div className="px-2 py-1 rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/30">
      {label}: ×{value.toFixed(2)}
    </div>
  )
}

// ============================================================================
// XP Bar Component
// ============================================================================

export function XPBar({ currentXP, level, showLevel = true, className }: XPBarProps) {
  // Calculate XP for current and next level
  const currentLevelXP = getXPForLevel(level)
  const nextLevelXP = getXPForLevel(level + 1)
  const progress = ((currentXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100
  
  const title = getTitleForLevel(level)
  
  return (
    <div className={cn('space-y-2', className)}>
      {showLevel && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-violet-400 font-bold">Lv.{level}</span>
            <span className="text-slate-400 text-sm">{title}</span>
          </div>
          <span className="text-xs text-slate-500">
            {currentXP.toLocaleString()} XP
          </span>
        </div>
      )}
      
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  )
}

// Calculate XP for a specific level
function getXPForLevel(level: number): number {
  // Using exponential formula from scoring.ts
  let total = 0
  for (let l = 2; l <= level; l++) {
    total += Math.floor(100 * Math.pow(l, 1.5))
  }
  return total
}

// ============================================================================
// Streak Counter
// ============================================================================

export function StreakCounter({ streak, className }: StreakCounterProps) {
  if (streak === 0) return null
  
  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
      'bg-orange-500/20 text-orange-400 border border-orange-500/30',
      className
    )}>
      <Flame className="w-4 h-4 animate-pulse" />
      <span className="font-bold">{streak}</span>
      <span className="text-sm">streak</span>
    </div>
  )
}

// ============================================================================
// Quick Score Summary
// ============================================================================

export interface QuickScoreProps {
  score: number
  grade: ScoreGrade
  isPerfect: boolean
  className?: string
}

export function QuickScore({ score, grade, isPerfect, className }: QuickScoreProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <ScoreGradeBadge grade={grade} size="sm" />
      <span className={cn(
        'text-lg font-bold',
        isPerfect ? 'text-emerald-400' : 'text-white'
      )}>
        {score.toLocaleString()}
      </span>
      {isPerfect && <Star className="w-4 h-4 text-amber-400" />}
    </div>
  )
}

// ============================================================================
// Export
// ============================================================================

export default ScoreDisplay
