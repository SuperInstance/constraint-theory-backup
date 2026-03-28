'use client'

import { cn } from '@/lib/utils'
import { AgentSpecies } from '@/puzzles/types'

// ============================================================================
// Agent Species Definitions
// ============================================================================

export const AGENT_SPECIES: Record<string, AgentSpecies> = {
  cow: {
    id: 'cow',
    name: 'Moo Master',
    emoji: '🐄',
    size: 'large',
    specialty: 'Production',
    traits: {
      milk: [0.6, 1.0],
      speed: [0.3, 0.6],
      intelligence: [0.4, 0.7]
    }
  },
  chicken: {
    id: 'chicken',
    name: 'Cluck Commander',
    emoji: '🐔',
    size: 'small',
    specialty: 'Efficiency',
    traits: {
      eggs: [0.5, 1.0],
      speed: [0.6, 0.9],
      intelligence: [0.3, 0.5]
    }
  },
  pig: {
    id: 'pig',
    name: 'Oink Oracle',
    emoji: '🐷',
    size: 'medium',
    specialty: 'Truffles',
    traits: {
      truffles: [0.7, 1.0],
      speed: [0.2, 0.5],
      intelligence: [0.5, 0.8]
    }
  },
  sheep: {
    id: 'sheep',
    name: 'Wool Wizard',
    emoji: '🐑',
    size: 'medium',
    specialty: 'Wool',
    traits: {
      wool: [0.6, 1.0],
      speed: [0.4, 0.7],
      intelligence: [0.4, 0.6]
    }
  },
  horse: {
    id: 'horse',
    name: 'Gallop Guru',
    emoji: '🐴',
    size: 'large',
    specialty: 'Transport',
    traits: {
      speed: [0.8, 1.0],
      endurance: [0.7, 1.0],
      intelligence: [0.5, 0.7]
    }
  },
  rabbit: {
    id: 'rabbit',
    name: 'Hop Hero',
    emoji: '🐰',
    size: 'small',
    specialty: 'Speed',
    traits: {
      speed: [0.9, 1.0],
      agility: [0.8, 1.0],
      intelligence: [0.3, 0.5]
    }
  },
  goat: {
    id: 'goat',
    name: 'Climb Champion',
    emoji: '🐐',
    size: 'medium',
    specialty: 'Terrain',
    traits: {
      climbing: [0.9, 1.0],
      endurance: [0.6, 0.8],
      intelligence: [0.5, 0.7]
    }
  },
  duck: {
    id: 'duck',
    name: 'Quack Quest',
    emoji: '🦆',
    size: 'small',
    specialty: 'Water',
    traits: {
      swimming: [0.9, 1.0],
      eggs: [0.4, 0.7],
      intelligence: [0.4, 0.6]
    }
  }
}

// ============================================================================
// Agent Avatar Component
// ============================================================================

export interface AgentAvatarProps {
  species: string
  level?: number
  status?: 'idle' | 'working' | 'training' | 'breeding'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  traits?: Record<string, number>
  showTraits?: boolean
  selected?: boolean
  onClick?: () => void
  className?: string
}

const sizeClasses = {
  sm: 'w-10 h-10 text-2xl',
  md: 'w-14 h-14 text-3xl',
  lg: 'w-20 h-20 text-4xl',
  xl: 'w-28 h-28 text-5xl'
}

const statusColors = {
  idle: 'bg-slate-700',
  working: 'bg-amber-600/20 border-amber-500',
  training: 'bg-blue-600/20 border-blue-500',
  breeding: 'bg-pink-600/20 border-pink-500'
}

const statusAnimations = {
  idle: '',
  working: 'animate-pulse',
  training: 'animate-spin-slow',
  breeding: 'animate-bounce'
}

export function AgentAvatar({
  species,
  level = 1,
  status = 'idle',
  size = 'md',
  traits,
  showTraits = false,
  selected = false,
  onClick,
  className
}: AgentAvatarProps) {
  const agentSpecies = AGENT_SPECIES[species] || AGENT_SPECIES.cow
  
  return (
    <div className={cn('relative inline-flex flex-col items-center', className)}>
      {/* Main Avatar */}
      <button
        onClick={onClick}
        className={cn(
          'relative rounded-xl flex items-center justify-center transition-all duration-200',
          sizeClasses[size],
          statusColors[status],
          statusAnimations[status],
          selected && 'ring-2 ring-violet-500 ring-offset-2 ring-offset-slate-900',
          onClick && 'cursor-pointer hover:scale-110',
          !onClick && 'cursor-default'
        )}
      >
        <span className="drop-shadow-lg">{agentSpecies.emoji}</span>
        
        {/* Level Badge */}
        {level > 1 && (
          <span className="absolute -top-1 -right-1 bg-violet-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
            {level}
          </span>
        )}
        
        {/* Status Indicator */}
        {status !== 'idle' && (
          <span className={cn(
            'absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-900',
            status === 'working' && 'bg-amber-500',
            status === 'training' && 'bg-blue-500',
            status === 'breeding' && 'bg-pink-500'
          )} />
        )}
      </button>
      
      {/* Name & Species */}
      {size !== 'sm' && (
        <span className="mt-1 text-xs text-slate-400 font-medium">
          {agentSpecies.name}
        </span>
      )}
      
      {/* Traits Display */}
      {showTraits && traits && (
        <div className="mt-2 flex flex-col gap-1 w-full max-w-[100px]">
          {Object.entries(traits).slice(0, 3).map(([trait, value]) => (
            <div key={trait} className="flex items-center gap-1">
              <span className="text-[10px] text-slate-500 capitalize truncate flex-1">
                {trait}
              </span>
              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-violet-500 to-emerald-500 rounded-full"
                  style={{ width: `${value * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400 w-6 text-right">
                {Math.round(value * 100)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Agent Group Component
// ============================================================================

export interface AgentGroupProps {
  agents: Array<{
    species: string
    level?: number
    status?: 'idle' | 'working' | 'training' | 'breeding'
    traits?: Record<string, number>
  }>
  maxVisible?: number
  size?: 'sm' | 'md' | 'lg'
  onAgentClick?: (index: number) => void
  className?: string
}

export function AgentGroup({
  agents,
  maxVisible = 5,
  size = 'md',
  onAgentClick,
  className
}: AgentGroupProps) {
  const visibleAgents = agents.slice(0, maxVisible)
  const hiddenCount = agents.length - maxVisible
  
  return (
    <div className={cn('flex items-center -space-x-2', className)}>
      {visibleAgents.map((agent, i) => (
        <AgentAvatar
          key={i}
          species={agent.species}
          level={agent.level}
          status={agent.status}
          traits={agent.traits}
          size={size}
          onClick={() => onAgentClick?.(i)}
        />
      ))}
      
      {hiddenCount > 0 && (
        <div className={cn(
          'rounded-full bg-slate-700 flex items-center justify-center',
          sizeClasses[size],
          'text-sm text-slate-300 font-medium'
        )}>
          +{hiddenCount}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Species Selector Component
// ============================================================================

export interface SpeciesSelectorProps {
  selectedSpecies: string
  onSelect: (species: string) => void
  availableSpecies?: string[]
  className?: string
}

export function SpeciesSelector({
  selectedSpecies,
  onSelect,
  availableSpecies = Object.keys(AGENT_SPECIES),
  className
}: SpeciesSelectorProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {availableSpecies.map((speciesId) => {
        const species = AGENT_SPECIES[speciesId]
        if (!species) return null
        
        return (
          <button
            key={speciesId}
            onClick={() => onSelect(speciesId)}
            className={cn(
              'p-3 rounded-lg border-2 transition-all duration-200',
              'hover:scale-105 active:scale-95',
              selectedSpecies === speciesId
                ? 'border-violet-500 bg-violet-500/20'
                : 'border-slate-700 bg-slate-800 hover:border-slate-600'
            )}
          >
            <div className="text-3xl mb-1">{species.emoji}</div>
            <div className="text-xs text-slate-400">{species.name}</div>
            <div className="text-[10px] text-violet-400">{species.specialty}</div>
          </button>
        )
      })}
    </div>
  )
}

// ============================================================================
// Export
// ============================================================================

export default AgentAvatar
