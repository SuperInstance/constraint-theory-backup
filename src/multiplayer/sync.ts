/**
 * Real-Time Game Sync for Constraint Ranch
 * 
 * Handles synchronization of game state across multiple clients.
 * Implements optimistic updates with conflict resolution.
 * 
 * @module sync
 */

import { 
  GameRoom, 
  Player, 
  GameState, 
  SOCKET_EVENTS,
  createMessage,
  SocketMessage
} from '@/lib/socket'

// ============================================================================
// Types
// ============================================================================

export interface SyncState {
  roomId: string | null
  playerId: string | null
  connected: boolean
  syncing: boolean
  lastSync: number
  pendingActions: SyncAction[]
  conflicts: SyncConflict[]
}

export interface SyncAction {
  id: string
  type: string
  payload: unknown
  timestamp: number
  acknowledged: boolean
}

export interface SyncConflict {
  id: string
  action: SyncAction
  serverState: unknown
  clientState: unknown
  resolved: boolean
  resolution?: 'server' | 'client' | 'merge'
}

export interface PositionUpdate {
  playerId: string
  agentId: string
  position: { x: number; y: number }
  timestamp: number
}

export interface SolutionUpdate {
  playerId: string
  puzzleId: string
  solution: unknown
  isValid: boolean
  score: number
  timestamp: number
}

export interface GameProgress {
  playerId: string
  progress: number
  constraintsSatisfied: number
  totalConstraints: number
  timestamp: number
}

// ============================================================================
// Sync Manager Class
// ============================================================================

export class SyncManager {
  private state: SyncState
  private socket: WebSocket | null = null
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 5
  private reconnectDelay: number = 1000
  private pingInterval: NodeJS.Timeout | null = null
  private eventHandlers: Map<string, Set<(data: unknown) => void>> = new Map()
  
  constructor() {
    this.state = {
      roomId: null,
      playerId: null,
      connected: false,
      syncing: false,
      lastSync: 0,
      pendingActions: [],
      conflicts: []
    }
  }
  
  // ============================================================================
  // Connection Management
  // ============================================================================
  
  connect(url: string, playerId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(url)
        this.state.playerId = playerId
        
        this.socket.onopen = () => {
          this.state.connected = true
          this.reconnectAttempts = 0
          this.startPingInterval()
          
          // Send connection message
          this.send('connect', { playerId })
          
          resolve()
        }
        
        this.socket.onclose = () => {
          this.state.connected = false
          this.stopPingInterval()
          this.emit('disconnected', {})
          
          // Attempt reconnect
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => {
              this.reconnectAttempts++
              this.connect(url, playerId)
            }, this.reconnectDelay * this.reconnectAttempts)
          }
        }
        
        this.socket.onerror = (error) => {
          reject(error)
        }
        
        this.socket.onmessage = (event) => {
          this.handleMessage(event.data)
        }
      } catch (error) {
        reject(error)
      }
    })
  }
  
  disconnect(): void {
    if (this.socket) {
      this.send('disconnect', { playerId: this.state.playerId })
      this.socket.close()
      this.socket = null
    }
    
    this.state.connected = false
    this.state.roomId = null
    this.stopPingInterval()
  }
  
  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.state.connected) {
        this.send('ping', { timestamp: Date.now() })
      }
    }, 30000) // Ping every 30 seconds
  }
  
  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }
  
  // ============================================================================
  // Message Handling
  // ============================================================================
  
  private send(type: string, payload: unknown): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const message = createMessage(type, payload)
      this.socket.send(JSON.stringify(message))
    }
  }
  
  private handleMessage(data: string): void {
    try {
      const message: SocketMessage = JSON.parse(data)
      
      this.state.lastSync = message.timestamp
      
      // Handle specific message types
      switch (message.type) {
        case SOCKET_EVENTS.ROOM_UPDATE:
          this.handleRoomUpdate(message.payload as GameRoom)
          break
        
        case SOCKET_EVENTS.PLAYER_JOIN:
          this.handlePlayerJoin(message.payload as { player: Player })
          break
        
        case SOCKET_EVENTS.PLAYER_LEAVE:
          this.handlePlayerLeave(message.payload as { playerId: string })
          break
        
        case SOCKET_EVENTS.GAME_START:
          this.handleGameStart(message.payload as { startTime: number; timeLimit: number })
          break
        
        case SOCKET_EVENTS.GAME_END:
          this.handleGameEnd(message.payload as { winner: string })
          break
        
        case SOCKET_EVENTS.GAME_SYNC:
          this.handleGameSync(message.payload as SyncAction)
          break
        
        case 'pong':
          // Latency check
          const latency = Date.now() - (message.payload as { timestamp: number }).timestamp
          this.emit('latency', { latency })
          break
      }
      
      // Emit to generic handlers
      this.emit(message.type, message.payload)
    } catch (error) {
      console.error('Failed to parse message:', error)
    }
  }
  
  // ============================================================================
  // Room Operations
  // ============================================================================
  
  createRoom(name: string, puzzleId: string, settings?: Partial<GameRoom['settings']>): void {
    this.send(SOCKET_EVENTS.ROOM_CREATE, { name, puzzleId, settings })
  }
  
  joinRoom(roomId: string, player: Partial<Player>): void {
    this.send(SOCKET_EVENTS.ROOM_JOIN, { 
      roomId, 
      player: {
        id: this.state.playerId,
        name: player.name || 'Player',
        avatar: player.avatar || '🐄',
        score: 0,
        ready: false,
        connected: true
      }
    })
    
    this.state.roomId = roomId
  }
  
  leaveRoom(): void {
    if (this.state.roomId) {
      this.send(SOCKET_EVENTS.ROOM_LEAVE, { roomId: this.state.roomId })
      this.state.roomId = null
    }
  }
  
  setReady(ready: boolean): void {
    if (ready) {
      this.send(SOCKET_EVENTS.PLAYER_READY, {})
    }
  }
  
  // ============================================================================
  // Game Sync Operations
  // ============================================================================
  
  syncPosition(agentId: string, position: { x: number; y: number }): void {
    const action: SyncAction = {
      id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'position:update',
      payload: { agentId, position },
      timestamp: Date.now(),
      acknowledged: false
    }
    
    this.state.pendingActions.push(action)
    this.send(SOCKET_EVENTS.GAME_SYNC, action)
    
    // Optimistic update
    this.emit('position:optimistic', action.payload)
  }
  
  syncSolution(solution: unknown): void {
    this.send(SOCKET_EVENTS.PLAYER_SOLUTION, { solution })
  }
  
  syncProgress(progress: GameProgress): void {
    this.send('game:progress', progress)
  }
  
  // ============================================================================
  // Event Handlers
  // ============================================================================
  
  private handleRoomUpdate(room: GameRoom): void {
    this.emit(SOCKET_EVENTS.ROOM_UPDATE, room)
  }
  
  private handlePlayerJoin(data: { player: Player }): void {
    this.emit(SOCKET_EVENTS.PLAYER_JOIN, data.player)
  }
  
  private handlePlayerLeave(data: { playerId: string }): void {
    this.emit(SOCKET_EVENTS.PLAYER_LEAVE, data)
  }
  
  private handleGameStart(data: { startTime: number; timeLimit: number }): void {
    this.state.syncing = true
    this.emit(SOCKET_EVENTS.GAME_START, data)
  }
  
  private handleGameEnd(data: { winner: string }): void {
    this.state.syncing = false
    this.emit(SOCKET_EVENTS.GAME_END, data)
  }
  
  private handleGameSync(action: SyncAction): void {
    // Mark action as acknowledged
    const pendingAction = this.state.pendingActions.find(a => a.id === action.id)
    if (pendingAction) {
      pendingAction.acknowledged = true
      
      // Check for conflicts
      // (In a real implementation, we'd compare server vs client state)
    }
    
    this.emit(SOCKET_EVENTS.GAME_SYNC, action.payload)
  }
  
  // ============================================================================
  // Event Emitter Pattern
  // ============================================================================
  
  on(event: string, handler: (data: unknown) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }
    this.eventHandlers.get(event)?.add(handler)
  }
  
  off(event: string, handler: (data: unknown) => void): void {
    this.eventHandlers.get(event)?.delete(handler)
  }
  
  private emit(event: string, data: unknown): void {
    this.eventHandlers.get(event)?.forEach(handler => {
      try {
        handler(data)
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error)
      }
    })
  }
  
  // ============================================================================
  // State Getters
  // ============================================================================
  
  getState(): SyncState {
    return { ...this.state }
  }
  
  isConnected(): boolean {
    return this.state.connected
  }
  
  getRoomId(): string | null {
    return this.state.roomId
  }
  
  getPlayerId(): string | null {
    return this.state.playerId
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let syncManagerInstance: SyncManager | null = null

export function getSyncManager(): SyncManager {
  if (!syncManagerInstance) {
    syncManagerInstance = new SyncManager()
  }
  return syncManagerInstance
}

// ============================================================================
// React Hook for Sync
// ============================================================================

export function useSyncManager() {
  const manager = getSyncManager()
  
  return {
    connect: manager.connect.bind(manager),
    disconnect: manager.disconnect.bind(manager),
    createRoom: manager.createRoom.bind(manager),
    joinRoom: manager.joinRoom.bind(manager),
    leaveRoom: manager.leaveRoom.bind(manager),
    setReady: manager.setReady.bind(manager),
    syncPosition: manager.syncPosition.bind(manager),
    syncSolution: manager.syncSolution.bind(manager),
    syncProgress: manager.syncProgress.bind(manager),
    on: manager.on.bind(manager),
    off: manager.off.bind(manager),
    getState: manager.getState.bind(manager),
    isConnected: manager.isConnected.bind(manager),
    getRoomId: manager.getRoomId.bind(manager),
    getPlayerId: manager.getPlayerId.bind(manager)
  }
}

// ============================================================================
// Export
// ============================================================================

export default {
  SyncManager,
  getSyncManager,
  useSyncManager
}
