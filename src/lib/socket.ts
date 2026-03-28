/**
 * WebSocket Socket Handler for Constraint Ranch
 * 
 * Real-time communication for multiplayer games.
 * Uses Socket.IO for reliable WebSocket connections.
 * 
 * @module socket
 */

import { Server as HTTPServer } from 'http'
import { NextApiRequest } from 'next'
import { NextApiResponse } from 'next'
import type { Socket } from 'net'

// ============================================================================
// Types
// ============================================================================

export interface GameRoom {
  id: string
  name: string
  host: string
  players: Map<string, Player>
  puzzleId: string
  state: GameState
  createdAt: Date
  settings: RoomSettings
}

export interface Player {
  id: string
  name: string
  avatar: string
  score: number
  ready: boolean
  connected: boolean
  solution?: unknown
  completedAt?: Date
}

export interface GameState {
  status: 'waiting' | 'countdown' | 'playing' | 'completed'
  startTime?: Date
  endTime?: Date
  countdown?: number
  winner?: string
}

export interface RoomSettings {
  maxPlayers: number
  timeLimit: number // seconds
  difficulty: number
  puzzleType: string
  isPrivate: boolean
  allowHints: boolean
}

export interface SocketMessage {
  type: string
  payload: unknown
  timestamp: number
}

export interface RoomEvent {
  room: string
  event: string
  data: unknown
}

// ============================================================================
// In-Memory Room Storage
// ============================================================================

class RoomManager {
  private rooms: Map<string, GameRoom> = new Map()
  private playerRooms: Map<string, string> = new Map()
  
  createRoom(
    id: string,
    name: string,
    hostId: string,
    puzzleId: string,
    settings: Partial<RoomSettings> = {}
  ): GameRoom {
    const room: GameRoom = {
      id,
      name,
      host: hostId,
      players: new Map(),
      puzzleId,
      state: { status: 'waiting' },
      createdAt: new Date(),
      settings: {
        maxPlayers: 4,
        timeLimit: 300,
        difficulty: 2,
        puzzleType: 'spatial',
        isPrivate: false,
        allowHints: true,
        ...settings
      }
    }
    
    this.rooms.set(id, room)
    return room
  }
  
  getRoom(id: string): GameRoom | undefined {
    return this.rooms.get(id)
  }
  
  joinRoom(roomId: string, player: Player): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false
    if (room.players.size >= room.settings.maxPlayers) return false
    if (room.state.status !== 'waiting') return false
    
    room.players.set(player.id, player)
    this.playerRooms.set(player.id, roomId)
    return true
  }
  
  leaveRoom(playerId: string): void {
    const roomId = this.playerRooms.get(playerId)
    if (!roomId) return
    
    const room = this.rooms.get(roomId)
    if (!room) return
    
    room.players.delete(playerId)
    this.playerRooms.delete(playerId)
    
    // If room is empty or host left, close it
    if (room.players.size === 0 || room.host === playerId) {
      this.rooms.delete(roomId)
    }
  }
  
  getPublicRooms(): GameRoom[] {
    return Array.from(this.rooms.values())
      .filter(r => !r.settings.isPrivate && r.state.status === 'waiting')
  }
  
  getPlayerRoom(playerId: string): GameRoom | undefined {
    const roomId = this.playerRooms.get(playerId)
    return roomId ? this.rooms.get(roomId) : undefined
  }
  
  updatePlayer(roomId: string, playerId: string, updates: Partial<Player>): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false
    
    const player = room.players.get(playerId)
    if (!player) return false
    
    Object.assign(player, updates)
    return true
  }
  
  updateGameState(roomId: string, state: Partial<GameState>): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false
    
    Object.assign(room.state, state)
    return true
  }
}

// ============================================================================
// Global Room Manager Instance
// ============================================================================

export const roomManager = new RoomManager()

// ============================================================================
// Socket Event Types
// ============================================================================

export const SOCKET_EVENTS = {
  // Room events
  ROOM_CREATE: 'room:create',
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_UPDATE: 'room:update',
  ROOM_LIST: 'room:list',
  ROOM_ERROR: 'room:error',
  
  // Player events
  PLAYER_JOIN: 'player:join',
  PLAYER_LEAVE: 'player:leave',
  PLAYER_UPDATE: 'player:update',
  PLAYER_READY: 'player:ready',
  PLAYER_SOLUTION: 'player:solution',
  
  // Game events
  GAME_START: 'game:start',
  GAME_COUNTDOWN: 'game:countdown',
  GAME_UPDATE: 'game:update',
  GAME_END: 'game:end',
  GAME_SYNC: 'game:sync',
  
  // Chat events
  CHAT_MESSAGE: 'chat:message',
  CHAT_SYSTEM: 'chat:system',
  
  // Leaderboard events
  LEADERBOARD_UPDATE: 'leaderboard:update',
  
  // Challenge events
  CHALLENGE_INVITE: 'challenge:invite',
  CHALLENGE_ACCEPT: 'challenge:accept',
  CHALLENGE_DECLINE: 'challenge:decline'
} as const

// ============================================================================
// Message Creators
// ============================================================================

export function createMessage(type: string, payload: unknown): SocketMessage {
  return {
    type,
    payload,
    timestamp: Date.now()
  }
}

// ============================================================================
// Socket Handler for API Routes
// ============================================================================

// Note: In Next.js App Router, WebSockets are typically handled through
// custom server or API routes with special handling.
// This provides a compatibility layer for the socket events.

export interface SocketHandlerContext {
  emit: (event: string, data: unknown) => void
  broadcast: (room: string, event: string, data: unknown) => void
  join: (room: string) => void
  leave: (room: string) => void
  playerId: string
  rooms: Set<string>
}

export function handleSocketEvent(
  event: string,
  data: unknown,
  ctx: SocketHandlerContext
): void {
  switch (event) {
    case SOCKET_EVENTS.ROOM_CREATE:
      handleRoomCreate(data as { name: string; puzzleId: string; settings?: Partial<RoomSettings> }, ctx)
      break
    
    case SOCKET_EVENTS.ROOM_JOIN:
      handleRoomJoin(data as { roomId: string; player: Player }, ctx)
      break
    
    case SOCKET_EVENTS.ROOM_LEAVE:
      handleRoomLeave(ctx)
      break
    
    case SOCKET_EVENTS.PLAYER_READY:
      handlePlayerReady(ctx)
      break
    
    case SOCKET_EVENTS.PLAYER_SOLUTION:
      handlePlayerSolution(data as { solution: unknown }, ctx)
      break
    
    case SOCKET_EVENTS.GAME_START:
      handleGameStart(ctx)
      break
    
    default:
      console.warn(`Unknown socket event: ${event}`)
  }
}

// ============================================================================
// Event Handlers
// ============================================================================

function handleRoomCreate(
  data: { name: string; puzzleId: string; settings?: Partial<RoomSettings> },
  ctx: SocketHandlerContext
): void {
  const roomId = `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  const room = roomManager.createRoom(
    roomId,
    data.name,
    ctx.playerId,
    data.puzzleId,
    data.settings
  )
  
  ctx.join(roomId)
  
  ctx.emit(SOCKET_EVENTS.ROOM_CREATE, {
    room: serializeRoom(room)
  })
}

function handleRoomJoin(
  data: { roomId: string; player: Player },
  ctx: SocketHandlerContext
): void {
  const success = roomManager.joinRoom(data.roomId, {
    ...data.player,
    id: ctx.playerId,
    connected: true
  })
  
  if (success) {
    ctx.join(data.roomId)
    const room = roomManager.getRoom(data.roomId)
    
    ctx.broadcast(data.roomId, SOCKET_EVENTS.PLAYER_JOIN, {
      player: data.player
    })
    
    ctx.emit(SOCKET_EVENTS.ROOM_JOIN, {
      room: room ? serializeRoom(room) : null
    })
  } else {
    ctx.emit(SOCKET_EVENTS.ROOM_ERROR, {
      message: 'Failed to join room'
    })
  }
}

function handleRoomLeave(ctx: SocketHandlerContext): void {
  const room = roomManager.getPlayerRoom(ctx.playerId)
  
  if (room) {
    ctx.broadcast(room.id, SOCKET_EVENTS.PLAYER_LEAVE, {
      playerId: ctx.playerId
    })
    
    ctx.leave(room.id)
    roomManager.leaveRoom(ctx.playerId)
  }
}

function handlePlayerReady(ctx: SocketHandlerContext): void {
  const room = roomManager.getPlayerRoom(ctx.playerId)
  
  if (room) {
    roomManager.updatePlayer(room.id, ctx.playerId, { ready: true })
    
    ctx.broadcast(room.id, SOCKET_EVENTS.PLAYER_UPDATE, {
      playerId: ctx.playerId,
      ready: true
    })
    
    // Check if all players are ready
    const allReady = Array.from(room.players.values()).every(p => p.ready)
    
    if (allReady && room.players.size >= 1) {
      // Start countdown
      roomManager.updateGameState(room.id, { 
        status: 'countdown',
        countdown: 5
      })
      
      ctx.broadcast(room.id, SOCKET_EVENTS.GAME_COUNTDOWN, {
        countdown: 5
      })
    }
  }
}

function handlePlayerSolution(data: { solution: unknown }, ctx: SocketHandlerContext): void {
  const room = roomManager.getPlayerRoom(ctx.playerId)
  
  if (room && room.state.status === 'playing') {
    roomManager.updatePlayer(room.id, ctx.playerId, {
      solution: data.solution,
      completedAt: new Date()
    })
    
    ctx.broadcast(room.id, SOCKET_EVENTS.PLAYER_SOLUTION, {
      playerId: ctx.playerId,
      completed: true
    })
    
    // Check if all players have submitted
    const allCompleted = Array.from(room.players.values())
      .every(p => p.solution !== undefined)
    
    if (allCompleted) {
      endGame(room.id, ctx)
    }
  }
}

function handleGameStart(ctx: SocketHandlerContext): void {
  const room = roomManager.getPlayerRoom(ctx.playerId)
  
  if (room && room.host === ctx.playerId && room.state.status === 'countdown') {
    roomManager.updateGameState(room.id, {
      status: 'playing',
      startTime: new Date()
    })
    
    ctx.broadcast(room.id, SOCKET_EVENTS.GAME_START, {
      startTime: Date.now(),
      timeLimit: room.settings.timeLimit
    })
  }
}

function endGame(roomId: string, ctx: SocketHandlerContext): void {
  const room = roomManager.getRoom(roomId)
  
  if (!room) return
  
  // Determine winner (first to complete with highest score)
  const players = Array.from(room.players.values())
    .filter(p => p.completedAt)
    .sort((a, b) => {
      if (!a.completedAt || !b.completedAt) return 0
      return a.completedAt.getTime() - b.completedAt.getTime()
    })
  
  const winner = players[0]?.id
  
  roomManager.updateGameState(roomId, {
    status: 'completed',
    endTime: new Date(),
    winner
  })
  
  ctx.broadcast(roomId, SOCKET_EVENTS.GAME_END, {
    winner,
    players: players.map(p => ({
      id: p.id,
      name: p.name,
      score: p.score,
      completedAt: p.completedAt
    }))
  })
}

// ============================================================================
// Serialization
// ============================================================================

function serializeRoom(room: GameRoom): object {
  return {
    id: room.id,
    name: room.name,
    host: room.host,
    players: Array.from(room.players.entries()).map(([id, p]) => ({ id, ...p })),
    puzzleId: room.puzzleId,
    state: room.state,
    createdAt: room.createdAt,
    settings: room.settings
  }
}

// ============================================================================
// Utility for Client-Side Socket Connection
// ============================================================================

export function getSocketUrl(): string {
  if (typeof window === 'undefined') return ''
  
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/api/socket`
}

// ============================================================================
// Export
// ============================================================================

export default {
  roomManager,
  SOCKET_EVENTS,
  createMessage,
  handleSocketEvent,
  getSocketUrl
}
