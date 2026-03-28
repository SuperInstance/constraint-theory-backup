'use client'

import { cn } from '@/lib/utils'
import { Constraint, ConstraintValidationResult } from '@/puzzles/types'
import { Check, X, AlertTriangle, Minus, Zap } from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

export interface ConstraintIndicatorProps {
  constraint: Constraint
  result?: ConstraintValidationResult
  compact?: boolean
  showDetails?: boolean
  className?: string
}

export interface ConstraintListProps {
  constraints: Constraint[]
  results?: ConstraintValidationResult[]
  showProgress?: boolean
  className?: string
}

// ============================================================================
// Constraint Type Icons and Colors
// ============================================================================

const constraintIcons: Record<string, string> = {
  // Spatial
  'max-distance': '📏',
  'min-coverage': '🎯',
  'agent-count': '#️⃣',
  'on-perimeter': '⭕',
  'even-spacing': '📐',
  'equilateral': '🔺',
  'hexagonal-pattern': '⬡',
  'side-length': '📏',
  'neighbor-distance': '↔️',
  'max-overlap': '🚫',
  'all-zones-covered': '✅',
  
  // Routing
  'max-capacity': '📊',
  'optimal-routing': '🛤️',
  'failover-ready': '🔄',
  'load-balanced': '⚖️',
  'min-throughput': '⬆️',
  
  // Breeding
  'trait-threshold': '📈',
  'trait-match': '🎯',
  'species': '🧬',
  'generations': '👨‍👩‍👧',
  'trait-expression': '🎭',
  'trait-exceeds-parents': '⬆️',
  'min-training-time': '⏱️',
  'trait-exceeds-genetic-max': '🌟',
  
  // Coordination
  'sync-required': '🔄',
  'leader-designated': '👑',
  'quorum-reached': '🗳️',
  'latency-bound': '⏱️',
  'fault-tolerant': '🛡️',
  
  // Advanced
  'ecosystem-balance': '⚖️',
  'hidden-dimension-consistency': '🔮',
  'cross-plane-alignment': '🧭',
  'holonomy-zero': '⭕'
}

const constraintLabels: Record<string, string> = {
  'max-distance': 'Max Distance',
  'min-coverage': 'Min Coverage',
  'agent-count': 'Agent Count',
  'on-perimeter': 'On Perimeter',
  'even-spacing': 'Even Spacing',
  'equilateral': 'Equilateral Triangle',
  'hexagonal-pattern': 'Hexagonal Pattern',
  'side-length': 'Side Length',
  'neighbor-distance': 'Neighbor Distance',
  'max-overlap': 'Max Overlap',
  'all-zones-covered': 'All Zones Covered',
  'max-capacity': 'Max Capacity',
  'optimal-routing': 'Optimal Routing',
  'failover-ready': 'Failover Ready',
  'load-balanced': 'Load Balanced',
  'min-throughput': 'Min Throughput',
  'trait-threshold': 'Trait Threshold',
  'trait-match': 'Trait Match',
  'species': 'Species',
  'generations': 'Generations',
  'trait-expression': 'Trait Expression',
  'trait-exceeds-parents': 'Exceeds Parents',
  'min-training-time': 'Training Time',
  'trait-exceeds-genetic-max': 'Exceeds Genetic Max',
  'sync-required': 'Sync Required',
  'leader-designated': 'Leader Set',
  'quorum-reached': 'Quorum',
  'latency-bound': 'Latency Bound',
  'fault-tolerant': 'Fault Tolerant',
  'ecosystem-balance': 'Ecosystem Balance',
  'hidden-dimension-consistency': 'Hidden Dims',
  'cross-plane-alignment': 'Cross-Plane',
  'holonomy-zero': 'Holonomy'
}

// ============================================================================
// Single Constraint Indicator
// ============================================================================

export function ConstraintIndicator({
  constraint,
  result,
  compact = false,
  showDetails = false,
  className
}: ConstraintIndicatorProps) {
  const icon = constraintIcons[constraint.type] || '📋'
  const label = constraintLabels[constraint.type] || constraint.type
  
  const satisfied = result?.satisfied ?? false
  const exact = result?.exact ?? false
  const margin = result?.margin ?? 0
  
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border transition-all duration-300',
        compact ? 'px-2 py-1 text-sm' : 'px-3 py-2',
        satisfied
          ? exact
            ? 'border-emerald-500/50 bg-emerald-500/10'
            : 'border-amber-500/50 bg-amber-500/10'
          : 'border-red-500/50 bg-red-500/10',
        className
      )}
    >
      {/* Icon */}
      <span className={cn('text-lg', compact && 'text-base')}>
        {icon}
      </span>
      
      {/* Label & Value */}
      {!compact && (
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-200 truncate">
              {label}
            </span>
            {exact && (
              <Zap className="w-3 h-3 text-emerald-400" />
            )}
          </div>
          
          {/* Value Display */}
          <div className="text-xs text-slate-400">
            {typeof constraint.value === 'number' 
              ? constraint.value.toLocaleString()
              : String(constraint.value)
            }
            {constraint.unit && ` ${constraint.unit}`}
          </div>
        </div>
      )}
      
      {/* Status Icon */}
      <div className={cn(
        'flex-shrink-0 rounded-full p-0.5',
        satisfied
          ? exact
            ? 'bg-emerald-500'
            : 'bg-amber-500'
          : 'bg-red-500'
      )}>
        {satisfied ? (
          exact ? (
            <Check className="w-3 h-3 text-white" />
          ) : (
            <Minus className="w-3 h-3 text-white" />
          )
        ) : (
          <X className="w-3 h-3 text-white" />
        )}
      </div>
      
      {/* Details */}
      {showDetails && result && (
        <div className="text-xs text-slate-400 ml-2">
          {result.message}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Constraint List Component
// ============================================================================

export function ConstraintList({
  constraints,
  results = [],
  showProgress = true,
  className
}: ConstraintListProps) {
  const satisfiedCount = results.filter(r => r.satisfied).length
  const exactCount = results.filter(r => r.exact).length
  const total = constraints.length
  const progress = total > 0 ? (satisfiedCount / total) * 100 : 0
  
  return (
    <div className={cn('space-y-3', className)}>
      {/* Progress Bar */}
      {showProgress && total > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Constraints</span>
            <span className="text-slate-300">
              {satisfiedCount}/{total} satisfied
              {exactCount > 0 && (
                <span className="text-emerald-400 ml-2">
                  ({exactCount} exact)
                </span>
              )}
            </span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Constraint Items */}
      <div className="grid gap-2">
        {constraints.map((constraint, i) => (
          <ConstraintIndicator
            key={constraint.type + i}
            constraint={constraint}
            result={results[i]}
          />
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Constraint Summary Component
// ============================================================================

export interface ConstraintSummaryProps {
  results: ConstraintValidationResult[]
  className?: string
}

export function ConstraintSummary({ results, className }: ConstraintSummaryProps) {
  const satisfied = results.filter(r => r.satisfied).length
  const exact = results.filter(r => r.exact).length
  const total = results.length
  
  if (total === 0) {
    return (
      <div className={cn('text-sm text-slate-400', className)}>
        No constraints to verify
      </div>
    )
  }
  
  return (
    <div className={cn('flex items-center gap-4', className)}>
      {/* Satisfied */}
      <div className="flex items-center gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
        <span className="text-sm text-slate-300">
          {satisfied} satisfied
        </span>
      </div>
      
      {/* Exact (Hidden Dimension) */}
      {exact > 0 && (
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-sm text-emerald-400">
            {exact} exact
          </span>
        </div>
      )}
      
      {/* Unsatisfied */}
      {satisfied < total && (
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="text-sm text-slate-300">
            {total - satisfied} failed
          </span>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Validation Status Badge
// ============================================================================

export interface ValidationBadgeProps {
  valid: boolean
  isPerfect: boolean
  className?: string
}

export function ValidationBadge({ valid, isPerfect, className }: ValidationBadgeProps) {
  if (isPerfect) {
    return (
      <div className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full',
        'bg-gradient-to-r from-emerald-500 to-violet-500 text-white font-medium',
        className
      )}>
        <Zap className="w-4 h-4" />
        Perfect Solution!
      </div>
    )
  }
  
  if (valid) {
    return (
      <div className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full',
        'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50',
        className
      )}>
        <Check className="w-4 h-4" />
        Valid
      </div>
    )
  }
  
  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full',
      'bg-red-500/20 text-red-400 border border-red-500/50',
      className
    )}>
      <X className="w-4 h-4" />
      Invalid
    </div>
  )
}

// ============================================================================
// Export
// ============================================================================

export default ConstraintIndicator
