'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { 
  SpatialPuzzle, 
  Position, 
  Zone, 
  ConstraintPuzzle,
  PuzzleValidationResult
} from '@/puzzles/types'
import { 
  validateSpatialSolution,
  snapPositionsToLattice
} from '@/puzzles/spatial'
import { 
  calculateHiddenDimensions,
  fromExactRational
} from '@/puzzles/hidden-dimensions'
import { AgentAvatar, AgentGroup, AGENT_SPECIES } from './AgentAvatar'
import { ConstraintList, ConstraintSummary, ValidationBadge } from './ConstraintIndicator'
import { 
  Grid3X3, Circle, Move, ZoomIn, ZoomOut, RotateCcw,
  Eye, EyeOff, Sparkles, Magnet
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

export interface GameBoardProps {
  puzzle: SpatialPuzzle
  solution: Position[]
  onSolutionChange: (positions: Position[]) => void
  onSubmit?: () => void
  showHiddenDimensions?: boolean
  className?: string
}

export interface AgentPlacement {
  id: string
  position: Position
  species: string
  selected: boolean
}

export interface ViewState {
  offset: Position
  zoom: number
  showGrid: boolean
  showZones: boolean
  showHiddenDims: boolean
  snapToLattice: boolean
}

// ============================================================================
// Game Board Component
// ============================================================================

export function GameBoard({
  puzzle,
  solution,
  onSolutionChange,
  onSubmit,
  showHiddenDimensions = false,
  className
}: GameBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // View state
  const [view, setView] = useState<ViewState>({
    offset: { x: 0, y: 0 },
    zoom: 1,
    showGrid: true,
    showZones: true,
    showHiddenDims: showHiddenDimensions,
    snapToLattice: true
  })
  
  // Interaction state
  const [dragging, setDragging] = useState<string | null>(null)
  const [hovering, setHovering] = useState<string | null>(null)
  
  // Validation state
  const [validation, setValidation] = useState<PuzzleValidationResult | null>(null)
  
  // Map dimensions
  const mapSize = puzzle.initialState.mapSize
  const zones = puzzle.initialState.zones
  const obstacles = puzzle.initialState.obstacles || []
  
  // Convert solution to placements
  const placements: AgentPlacement[] = useMemo(() => {
    return solution.map((pos, i) => ({
      id: `agent-${i}`,
      position: pos,
      species: Object.keys(AGENT_SPECIES)[i % Object.keys(AGENT_SPECIES).length],
      selected: false
    }))
  }, [solution])
  
  // Validate solution on change
  useEffect(() => {
    if (solution.length > 0) {
      const result = validateSpatialSolution(puzzle, { positions: solution })
      setValidation(result)
    }
  }, [solution, puzzle])
  
  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const render = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * window.devicePixelRatio
      canvas.height = rect.height * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
      
      const w = rect.width
      const h = rect.height
      
      // Clear
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(0, 0, w, h)
      
      // Transform for pan/zoom
      ctx.save()
      ctx.translate(w / 2 + view.offset.x, h / 2 + view.offset.y)
      ctx.scale(view.zoom, view.zoom)
      ctx.translate(-mapSize.width / 2, -mapSize.height / 2)
      
      // Grid
      if (view.showGrid) {
        renderGrid(ctx, mapSize, puzzle.difficulty)
      }
      
      // Zones
      if (view.showZones) {
        renderZones(ctx, zones, validation)
      }
      
      // Obstacles
      renderObstacles(ctx, obstacles)
      
      // Hidden dimension visualization
      if (view.showHiddenDims && solution.length > 0) {
        renderHiddenDimensions(ctx, solution)
      }
      
      // Lattice points (Pythagorean)
      if (view.snapToLattice) {
        renderLatticePoints(ctx, mapSize)
      }
      
      // Agent positions
      renderAgents(ctx, placements, hovering)
      
      ctx.restore()
    }
    
    render()
  }, [view, placements, zones, obstacles, mapSize, puzzle.difficulty, solution, validation, hovering])
  
  // Mouse event handlers
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left - rect.width / 2 - view.offset.x) / view.zoom + mapSize.width / 2
    const y = (e.clientY - rect.top - rect.height / 2 - view.offset.y) / view.zoom + mapSize.height / 2
    
    if (dragging) {
      // Update agent position
      const newPositions = [...solution]
      const agentIndex = parseInt(dragging.split('-')[1])
      if (!isNaN(agentIndex) && agentIndex < newPositions.length) {
        let newX = x
        let newY = y
        
        // Snap to lattice if enabled
        if (view.snapToLattice) {
          const snapped = snapPositionsToLattice([{ x: newX, y: newY }])[0]
          newX = fromExactRational(snapped.visible.x)
          newY = fromExactRational(snapped.visible.y)
        }
        
        // Clamp to bounds
        newX = Math.max(0, Math.min(mapSize.width, newX))
        newY = Math.max(0, Math.min(mapSize.height, newY))
        
        newPositions[agentIndex] = { x: newX, y: newY }
        onSolutionChange(newPositions)
      }
    } else {
      // Check hover
      const hoveredAgent = findAgentAtPosition(placements, x, y)
      setHovering(hoveredAgent)
    }
  }, [dragging, solution, view, mapSize, onSolutionChange, placements])
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left - rect.width / 2 - view.offset.x) / view.zoom + mapSize.width / 2
    const y = (e.clientY - rect.top - rect.height / 2 - view.offset.y) / view.zoom + mapSize.height / 2
    
    const clickedAgent = findAgentAtPosition(placements, x, y)
    if (clickedAgent) {
      setDragging(clickedAgent)
    }
  }, [placements, view, mapSize])
  
  const handleMouseUp = useCallback(() => {
    setDragging(null)
  }, [])
  
  // Zoom controls
  const handleZoomIn = () => setView(v => ({ ...v, zoom: Math.min(3, v.zoom * 1.2) }))
  const handleZoomOut = () => setView(v => ({ ...v, zoom: Math.max(0.3, v.zoom / 1.2) }))
  const handleResetView = () => setView(v => ({ ...v, offset: { x: 0, y: 0 }, zoom: 1 }))
  
  return (
    <div className={cn('relative flex flex-col h-full', className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-t-lg border-b border-slate-700">
        <Button variant="ghost" size="icon" onClick={() => setView(v => ({ ...v, showGrid: !v.showGrid }))}>
          <Grid3X3 className={cn('w-4 h-4', view.showGrid ? 'text-violet-400' : 'text-slate-500')} />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setView(v => ({ ...v, showZones: !v.showZones }))}>
          <Circle className={cn('w-4 h-4', view.showZones ? 'text-violet-400' : 'text-slate-500')} />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setView(v => ({ ...v, showHiddenDims: !v.showHiddenDims }))}>
          <Sparkles className={cn('w-4 h-4', view.showHiddenDims ? 'text-violet-400' : 'text-slate-500')} />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setView(v => ({ ...v, snapToLattice: !v.snapToLattice }))}>
          <Magnet className={cn('w-4 h-4', view.snapToLattice ? 'text-violet-400' : 'text-slate-500')} />
        </Button>
        
        <div className="flex-1" />
        
        <Button variant="ghost" size="icon" onClick={handleZoomOut}>
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="text-xs text-slate-400 w-12 text-center">{Math.round(view.zoom * 100)}%</span>
        <Button variant="ghost" size="icon" onClick={handleZoomIn}>
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleResetView}>
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Canvas */}
      <div ref={containerRef} className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-grab active:cursor-grabbing"
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
        
        {/* Validation Status Overlay */}
        {validation && (
          <div className="absolute top-4 right-4">
            <ValidationBadge valid={validation.valid} isPerfect={validation.isPerfect} />
          </div>
        )}
        
        {/* Hidden Dimension Info */}
        {view.showHiddenDims && (
          <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-sm rounded-lg p-3">
            <div className="text-xs text-slate-400">Hidden Dimensions</div>
            <div className="text-lg font-bold text-violet-400">
              k = {calculateHiddenDimensions(1e-10)}
            </div>
            <div className="text-xs text-slate-500">
              ε = 10⁻¹⁰ precision
            </div>
          </div>
        )}
      </div>
      
      {/* Constraints Panel */}
      <div className="p-3 bg-slate-800/50 rounded-b-lg border-t border-slate-700">
        <ConstraintList 
          constraints={puzzle.constraints}
          results={validation?.constraints}
          showProgress={true}
        />
      </div>
    </div>
  )
}

// ============================================================================
// Rendering Functions
// ============================================================================

function renderGrid(ctx: CanvasRenderingContext2D, mapSize: { width: number; height: number }, difficulty: number) {
  const gridSize = Math.max(20, 50 - difficulty * 5)
  
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)'
  ctx.lineWidth = 1
  
  // Vertical lines
  for (let x = 0; x <= mapSize.width; x += gridSize) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, mapSize.height)
    ctx.stroke()
  }
  
  // Horizontal lines
  for (let y = 0; y <= mapSize.height; y += gridSize) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(mapSize.width, y)
    ctx.stroke()
  }
}

function renderZones(ctx: CanvasRenderingContext2D, zones: Zone[], validation: PuzzleValidationResult | null) {
  for (const zone of zones) {
    const isCovered = validation?.constraints.some(c => 
      c.satisfied && c.constraint.type === 'all-zones-covered'
    ) ?? false
    
    // Zone fill
    ctx.beginPath()
    ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2)
    ctx.fillStyle = isCovered 
      ? 'rgba(16, 185, 129, 0.15)' 
      : 'rgba(139, 92, 246, 0.15)'
    ctx.fill()
    
    // Zone border
    ctx.strokeStyle = isCovered 
      ? 'rgba(16, 185, 129, 0.5)' 
      : 'rgba(139, 92, 246, 0.5)'
    ctx.lineWidth = 2
    ctx.stroke()
    
    // Zone center marker
    ctx.beginPath()
    ctx.arc(zone.x, zone.y, 4, 0, Math.PI * 2)
    ctx.fillStyle = isCovered ? '#10b981' : '#8b5cf6'
    ctx.fill()
    
    // Zone label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(zone.id, zone.x, zone.y + zone.radius + 12)
  }
}

function renderObstacles(ctx: CanvasRenderingContext2D, obstacles: Position[]) {
  ctx.fillStyle = 'rgba(71, 85, 105, 0.8)'
  
  for (const obs of obstacles) {
    ctx.beginPath()
    ctx.arc(obs.x, obs.y, 15, 0, Math.PI * 2)
    ctx.fill()
    
    // Cross pattern
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(obs.x - 8, obs.y - 8)
    ctx.lineTo(obs.x + 8, obs.y + 8)
    ctx.moveTo(obs.x + 8, obs.y - 8)
    ctx.lineTo(obs.x - 8, obs.y + 8)
    ctx.stroke()
  }
}

function renderHiddenDimensions(ctx: CanvasRenderingContext2D, positions: Position[]) {
  const snappedPositions = snapPositionsToLattice(positions)
  
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)'
  ctx.lineWidth = 1
  
  for (let i = 0; i < snappedPositions.length; i++) {
    const pos = snappedPositions[i]
    const original = positions[i]
    
    const snappedX = fromExactRational(pos.visible.x)
    const snappedY = fromExactRational(pos.visible.y)
    
    // Draw line from original to snapped position
    ctx.beginPath()
    ctx.moveTo(original.x, original.y)
    ctx.lineTo(snappedX, snappedY)
    ctx.stroke()
    
    // Draw snapped position (larger, translucent)
    ctx.beginPath()
    ctx.arc(snappedX, snappedY, 8, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(16, 185, 129, 0.3)'
    ctx.fill()
    
    // Draw precision rings
    for (let h = 0; h < Math.min(3, pos.hidden.length); h++) {
      ctx.beginPath()
      ctx.arc(snappedX, snappedY, 12 + h * 6, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(139, 92, 246, ${0.3 - h * 0.1})`
      ctx.stroke()
    }
  }
}

function renderLatticePoints(ctx: CanvasRenderingContext2D, mapSize: { width: number; height: number }) {
  // Render a sparse set of Pythagorean lattice points
  ctx.fillStyle = 'rgba(139, 92, 246, 0.2)'
  
  const triples = [
    [3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25],
    [20, 21, 29], [9, 40, 41], [12, 35, 37], [11, 60, 61]
  ]
  
  for (const [a, b, c] of triples) {
    for (let ox = -2; ox <= 2; ox++) {
      for (let oy = -2; oy <= 2; oy++) {
        const x = mapSize.width / 2 + (a / c) * 100 * ox
        const y = mapSize.height / 2 + (b / c) * 100 * oy
        
        if (x >= 0 && x <= mapSize.width && y >= 0 && y <= mapSize.height) {
          ctx.beginPath()
          ctx.arc(x, y, 2, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
  }
}

function renderAgents(ctx: CanvasRenderingContext2D, placements: AgentPlacement[], hovering: string | null) {
  for (const placement of placements) {
    const isHovered = hovering === placement.id
    
    // Agent circle
    ctx.beginPath()
    ctx.arc(placement.position.x, placement.position.y, isHovered ? 20 : 15, 0, Math.PI * 2)
    
    // Gradient fill
    const gradient = ctx.createRadialGradient(
      placement.position.x, placement.position.y, 0,
      placement.position.x, placement.position.y, isHovered ? 20 : 15
    )
    gradient.addColorStop(0, 'rgba(139, 92, 246, 0.8)')
    gradient.addColorStop(1, 'rgba(139, 92, 246, 0.3)')
    ctx.fillStyle = gradient
    ctx.fill()
    
    // Border
    ctx.strokeStyle = isHovered ? '#fff' : 'rgba(255, 255, 255, 0.5)'
    ctx.lineWidth = isHovered ? 3 : 2
    ctx.stroke()
    
    // Emoji
    const species = AGENT_SPECIES[placement.species]
    ctx.font = '16px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(species?.emoji || '🐄', placement.position.x, placement.position.y)
    
    // Coordinates
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    ctx.font = '9px monospace'
    ctx.fillText(
      `${Math.round(placement.position.x)},${Math.round(placement.position.y)}`,
      placement.position.x,
      placement.position.y + 25
    )
  }
}

function findAgentAtPosition(placements: AgentPlacement[], x: number, y: number): string | null {
  for (const placement of placements) {
    const dx = placement.position.x - x
    const dy = placement.position.y - y
    if (dx * dx + dy * dy < 400) { // 20px radius
      return placement.id
    }
  }
  return null
}

// ============================================================================
// Export
// ============================================================================

export default GameBoard
