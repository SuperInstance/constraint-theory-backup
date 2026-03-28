/**
 * Workflow DAG Visualization
 * 
 * Comprehensive visualization components for workflows:
 * - DAG visualization with node positioning
 * - Execution trace rendering
 * - Real-time status updates
 * - Interactive exploration
 * - Export to various formats (SVG, Mermaid, GraphViz)
 * 
 * @module dashboard/visualizer
 * @version 1.0.0
 */

import type { Workflow, WorkflowStep, WorkflowResult, StepResult } from '../types/workflow';
import type { WorkflowDAG, DAGNode, DAGEdge } from '../workflow/dag';
import type { WorkflowMetrics } from './metrics';
import { hiddenDimensions } from '../workflow/arithmetic';

// ============================================
// Types
// ============================================

/**
 * Position for a node in 2D space
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Visualization node
 */
export interface VizNode {
  /** Node ID */
  id: string;
  /** Display label */
  label: string;
  /** Position in canvas */
  position: Position;
  /** Node size */
  size: { width: number; height: number };
  /** Node type */
  type: 'start' | 'end' | 'action' | 'condition' | 'parallel' | 'wait' | 'connector';
  /** Current status */
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  /** Visual style */
  style: NodeStyle;
  /** Metadata */
  metadata: Record<string, unknown>;
  /** Connection points */
  ports: Port[];
}

/**
 * Visualization edge
 */
export interface VizEdge {
  /** Edge ID */
  id: string;
  /** Source node ID */
  source: string;
  /** Target node ID */
  target: string;
  /** Edge type */
  type: 'dependency' | 'condition' | 'fallback';
  /** Control points for curved edges */
  controlPoints?: Position[];
  /** Edge label */
  label?: string;
  /** Visual style */
  style: EdgeStyle;
}

/**
 * Node style
 */
export interface NodeStyle {
  /** Fill color */
  fill: string;
  /** Stroke color */
  stroke: string;
  /** Stroke width */
  strokeWidth: number;
  /** Text color */
  textColor: string;
  /** Border radius */
  borderRadius: number;
  /** Shadow */
  shadow?: {
    color: string;
    blur: number;
    offset: Position;
  };
  /** Icon */
  icon?: string;
}

/**
 * Edge style
 */
export interface EdgeStyle {
  /** Line color */
  stroke: string;
  /** Line width */
  strokeWidth: number;
  /** Line style */
  lineStyle: 'solid' | 'dashed' | 'dotted';
  /** Arrow configuration */
  arrow?: {
    type: 'arrow' | 'circle' | 'none';
    size: number;
  };
  /** Animation */
  animated?: boolean;
}

/**
 * Port for connections
 */
export interface Port {
  /** Port ID */
  id: string;
  /** Port type */
  type: 'input' | 'output';
  /** Position relative to node */
  position: Position;
  /** Connection direction */
  direction: 'top' | 'right' | 'bottom' | 'left';
}

/**
 * Complete visualization graph
 */
export interface VizGraph {
  /** All nodes */
  nodes: VizNode[];
  /** All edges */
  edges: VizEdge[];
  /** Canvas dimensions */
  dimensions: { width: number; height: number };
  /** Layout algorithm used */
  layout: string;
  /** Zoom level */
  zoom: number;
  /** Pan offset */
  pan: Position;
}

/**
 * Execution trace entry
 */
export interface TraceEntry {
  /** Timestamp */
  timestamp: string;
  /** Step ID */
  stepId: string;
  /** Step name */
  stepName?: string;
  /** Status change */
  status: 'started' | 'completed' | 'failed' | 'skipped';
  /** Duration (for completed steps) */
  duration?: number;
  /** Error message (for failed steps) */
  error?: string;
  /** Additional data */
  data?: Record<string, unknown>;
}

/**
 * Visualization configuration
 */
export interface VizConfig {
  /** Node dimensions */
  nodeSize: { width: number; height: number };
  /** Horizontal spacing between nodes */
  horizontalSpacing: number;
  /** Vertical spacing between levels */
  verticalSpacing: number;
  /** Enable auto-layout */
  autoLayout: boolean;
  /** Layout algorithm */
  layoutAlgorithm: 'dagre' | 'layered' | 'force' | 'tree';
  /** Show labels */
  showLabels: boolean;
  /** Show status icons */
  showIcons: boolean;
  /** Animation duration (ms) */
  animationDuration: number;
  /** Theme */
  theme: 'light' | 'dark';
}

// ============================================
// DAG Visualizer Class
// ============================================

/**
 * Main DAG visualization engine
 */
export class DAGVisualizer {
  private config: VizConfig;
  private graph: VizGraph | null = null;
  private trace: TraceEntry[] = [];
  private nodeStatus: Map<string, 'pending' | 'running' | 'success' | 'failed' | 'skipped'> = new Map();

  constructor(config: Partial<VizConfig> = {}) {
    this.config = {
      nodeSize: { width: 160, height: 60 },
      horizontalSpacing: 80,
      verticalSpacing: 100,
      autoLayout: true,
      layoutAlgorithm: 'layered',
      showLabels: true,
      showIcons: true,
      animationDuration: 300,
      theme: 'light',
      ...config
    };
  }

  // ========================================
  // Graph Generation
  // ========================================

  /**
   * Generate visualization from workflow
   */
  fromWorkflow(workflow: Workflow): VizGraph {
    const nodes: VizNode[] = [];
    const edges: VizEdge[] = [];

    // Create nodes from steps
    for (const step of workflow.steps) {
      const node = this.createNodeFromStep(step);
      nodes.push(node);
      this.nodeStatus.set(node.id, 'pending');
    }

    // Create edges from dependencies
    for (const step of workflow.steps) {
      if (step.dependsOn) {
        for (const depId of step.dependsOn) {
          edges.push(this.createEdge(depId, step.id, 'dependency'));
        }
      }
    }

    // Apply layout
    if (this.config.autoLayout) {
      this.applyLayout(nodes, edges);
    }

    // Calculate dimensions
    const dimensions = this.calculateDimensions(nodes);

    this.graph = { nodes, edges, dimensions, layout: this.config.layoutAlgorithm, zoom: 1, pan: { x: 0, y: 0 } };
    return this.graph;
  }

  /**
   * Generate visualization from DAG
   */
  fromDAG(dag: WorkflowDAG): VizGraph {
    const nodes: VizNode[] = [];
    const edges: VizEdge[] = [];

    // Create nodes
    for (const [id, dagNode] of dag.nodes) {
      const node = this.createNodeFromDAGNode(dagNode);
      nodes.push(node);
      this.nodeStatus.set(id, 'pending');
    }

    // Create edges
    for (const edge of dag.edges) {
      edges.push(this.createEdge(edge.from, edge.to, edge.type));
    }

    // Apply layout using DAG levels
    this.applyDAGLayout(nodes, dag);

    // Calculate dimensions
    const dimensions = this.calculateDimensions(nodes);

    this.graph = { nodes, edges, dimensions, layout: this.config.layoutAlgorithm, zoom: 1, pan: { x: 0, y: 0 } };
    return this.graph;
  }

  /**
   * Create visualization node from workflow step
   */
  private createNodeFromStep(step: WorkflowStep): VizNode {
    const type = this.determineNodeType(step);
    const style = this.getNodeStyle(type, 'pending');

    return {
      id: step.id,
      label: step.name || step.id,
      position: { x: 0, y: 0 },
      size: this.config.nodeSize,
      type,
      status: 'pending',
      style,
      metadata: {
        action: step.action,
        connector: step.connector,
        hasCondition: !!step.condition,
        timeout: step.timeout
      },
      ports: this.createPorts(step.id)
    };
  }

  /**
   * Create visualization node from DAG node
   */
  private createNodeFromDAGNode(dagNode: DAGNode): VizNode {
    const type = this.determineNodeType(dagNode.step);
    const style = this.getNodeStyle(type, 'pending');

    return {
      id: dagNode.id,
      label: dagNode.step.name || dagNode.id,
      position: { x: 0, y: 0 },
      size: this.config.nodeSize,
      type,
      status: 'pending',
      style,
      metadata: {
        level: dagNode.level,
        parallelizable: dagNode.parallelizable,
        dependencyCount: dagNode.dependencies.size,
        dependentCount: dagNode.dependents.size
      },
      ports: this.createPorts(dagNode.id)
    };
  }

  /**
   * Determine node type from step
   */
  private determineNodeType(step: WorkflowStep): VizNode['type'] {
    if (step.condition) return 'condition';
    if (step.waitFor) return 'wait';
    if (step.connector) return 'connector';
    if (step.action) return 'action';
    return 'action';
  }

  /**
   * Create edge between nodes
   */
  private createEdge(source: string, target: string, type: VizEdge['type']): VizEdge {
    return {
      id: `${source}-${target}`,
      source,
      target,
      type,
      style: this.getEdgeStyle(type)
    };
  }

  /**
   * Create ports for a node
   */
  private createPorts(nodeId: string): Port[] {
    return [
      { id: `${nodeId}-in`, type: 'input', position: { x: 0, y: 0.5 }, direction: 'left' },
      { id: `${nodeId}-out`, type: 'output', position: { x: 1, y: 0.5 }, direction: 'right' }
    ];
  }

  // ========================================
  // Layout Algorithms
  // ========================================

  /**
   * Apply layout algorithm to nodes
   */
  private applyLayout(nodes: VizNode[], edges: VizEdge[]): void {
    switch (this.config.layoutAlgorithm) {
      case 'layered':
        this.applyLayeredLayout(nodes, edges);
        break;
      case 'tree':
        this.applyTreeLayout(nodes, edges);
        break;
      case 'force':
        this.applyForceLayout(nodes, edges);
        break;
      default:
        this.applyLayeredLayout(nodes, edges);
    }
  }

  /**
   * Apply layered layout (left-to-right)
   */
  private applyLayeredLayout(nodes: VizNode[], edges: VizEdge[]): void {
    // Calculate levels using topological sort
    const levels = this.calculateLevels(nodes, edges);
    
    // Group nodes by level
    const nodesByLevel = new Map<number, VizNode[]>();
    for (const node of nodes) {
      const level = levels.get(node.id) || 0;
      if (!nodesByLevel.has(level)) {
        nodesByLevel.set(level, []);
      }
      nodesByLevel.get(level)!.push(node);
    }

    // Position nodes
    const maxWidth = Math.max(...nodesByLevel.values(), (arr) => arr.length);
    
    for (const [level, levelNodes] of nodesByLevel) {
      const totalHeight = levelNodes.length * this.config.nodeSize.height + 
                          (levelNodes.length - 1) * this.config.horizontalSpacing;
      let startY = -totalHeight / 2;

      for (let i = 0; i < levelNodes.length; i++) {
        const node = levelNodes[i];
        node.position = {
          x: level * (this.config.nodeSize.width + this.config.verticalSpacing),
          y: startY + i * (this.config.nodeSize.height + this.config.horizontalSpacing)
        };
      }
    }
  }

  /**
   * Apply DAG-based layout
   */
  private applyDAGLayout(nodes: VizNode[], dag: WorkflowDAG): void {
    // Use levels from DAG
    for (const node of nodes) {
      const dagNode = dag.nodes.get(node.id);
      if (dagNode) {
        const level = dagNode.level;
        const levelNodes = dag.levels.get(level);
        const indexInLevel = levelNodes ? [...levelNodes].indexOf(node.id) : 0;
        const levelSize = levelNodes?.size || 1;

        // Center vertically within level
        const totalHeight = levelSize * this.config.nodeSize.height + 
                            (levelSize - 1) * this.config.horizontalSpacing;
        const startY = -totalHeight / 2;

        node.position = {
          x: level * (this.config.nodeSize.width + this.config.verticalSpacing),
          y: startY + indexInLevel * (this.config.nodeSize.height + this.config.horizontalSpacing)
        };
      }
    }
  }

  /**
   * Apply tree layout (top-to-bottom)
   */
  private applyTreeLayout(nodes: VizNode[], edges: VizEdge[]): void {
    const levels = this.calculateLevels(nodes, edges);
    
    // Group by level
    const nodesByLevel = new Map<number, VizNode[]>();
    for (const node of nodes) {
      const level = levels.get(node.id) || 0;
      if (!nodesByLevel.has(level)) {
        nodesByLevel.set(level, []);
      }
      nodesByLevel.get(level)!.push(node);
    }

    // Position vertically
    for (const [level, levelNodes] of nodesByLevel) {
      const totalWidth = levelNodes.length * this.config.nodeSize.width + 
                         (levelNodes.length - 1) * this.config.horizontalSpacing;
      let startX = -totalWidth / 2;

      for (let i = 0; i < levelNodes.length; i++) {
        const node = levelNodes[i];
        node.position = {
          x: startX + i * (this.config.nodeSize.width + this.config.horizontalSpacing),
          y: level * (this.config.nodeSize.height + this.config.verticalSpacing)
        };
      }
    }
  }

  /**
   * Apply force-directed layout
   */
  private applyForceLayout(nodes: VizNode[], edges: VizEdge[]): void {
    // Simple force-directed layout
    // Initialize with random positions
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].position = {
        x: (Math.random() - 0.5) * 500,
        y: (Math.random() - 0.5) * 500
      };
    }

    // Apply forces
    const iterations = 100;
    const repulsion = 5000;
    const attraction = 0.1;

    for (let iter = 0; iter < iterations; iter++) {
      // Repulsion between all nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].position.x - nodes[i].position.x;
          const dy = nodes[j].position.y - nodes[i].position.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = repulsion / (dist * dist);

          nodes[i].position.x -= (dx / dist) * force;
          nodes[i].position.y -= (dy / dist) * force;
          nodes[j].position.x += (dx / dist) * force;
          nodes[j].position.y += (dy / dist) * force;
        }
      }

      // Attraction along edges
      for (const edge of edges) {
        const source = nodes.find(n => n.id === edge.source);
        const target = nodes.find(n => n.id === edge.target);
        
        if (source && target) {
          const dx = target.position.x - source.position.x;
          const dy = target.position.y - source.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;

          source.position.x += dx * attraction;
          source.position.y += dy * attraction;
          target.position.x -= dx * attraction;
          target.position.y -= dy * attraction;
        }
      }
    }
  }

  /**
   * Calculate node levels
   */
  private calculateLevels(nodes: VizNode[], edges: VizEdge[]): Map<string, number> {
    const levels = new Map<string, number>();
    const visited = new Set<string>();
    
    // Build adjacency list
    const inEdges = new Map<string, string[]>();
    for (const node of nodes) {
      inEdges.set(node.id, []);
    }
    for (const edge of edges) {
      inEdges.get(edge.target)?.push(edge.source);
    }

    // BFS from entry nodes
    const queue: Array<{ id: string; level: number }> = [];
    
    // Find entry nodes (no incoming edges)
    for (const node of nodes) {
      if (inEdges.get(node.id)?.length === 0) {
        queue.push({ id: node.id, level: 0 });
      }
    }

    while (queue.length > 0) {
      const { id, level } = queue.shift()!;
      
      if (visited.has(id)) continue;
      visited.add(id);
      levels.set(id, level);

      // Process outgoing edges
      for (const edge of edges) {
        if (edge.source === id) {
          queue.push({ id: edge.target, level: level + 1 });
        }
      }
    }

    return levels;
  }

  /**
   * Calculate total dimensions
   */
  private calculateDimensions(nodes: VizNode[]): { width: number; height: number } {
    if (nodes.length === 0) {
      return { width: 800, height: 600 };
    }

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const node of nodes) {
      minX = Math.min(minX, node.position.x);
      maxX = Math.max(maxX, node.position.x + node.size.width);
      minY = Math.min(minY, node.position.y);
      maxY = Math.max(maxY, node.position.y + node.size.height);
    }

    const padding = 50;
    return {
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2
    };
  }

  // ========================================
  // Status Updates
  // ========================================

  /**
   * Update node status
   */
  updateNodeStatus(nodeId: string, status: VizNode['status']): void {
    if (!this.graph) return;

    const node = this.graph.nodes.find(n => n.id === nodeId);
    if (node) {
      node.status = status;
      node.style = this.getNodeStyle(node.type, status);
      this.nodeStatus.set(nodeId, status);
    }
  }

  /**
   * Update from execution result
   */
  updateFromResult(result: WorkflowResult): void {
    if (!this.graph) return;

    for (const stepResult of result.steps) {
      const status: VizNode['status'] = stepResult.success ? 'success' : 'failed';
      this.updateNodeStatus(stepResult.id, status);
      
      // Add trace entry
      this.trace.push({
        timestamp: new Date().toISOString(),
        stepId: stepResult.id,
        stepName: stepResult.name,
        status: stepResult.success ? 'completed' : 'failed',
        duration: stepResult.duration,
        error: stepResult.error?.message
      });
    }
  }

  // ========================================
  // Export Formats
  // ========================================

  /**
   * Export to Mermaid diagram
   */
  toMermaid(): string {
    if (!this.graph) return '';

    const lines: string[] = ['graph LR'];
    
    // Add nodes
    for (const node of this.graph.nodes) {
      const statusClass = this.getMermaidStatusClass(node.status);
      const label = node.label.replace(/"/g, "'");
      lines.push(`    ${node.id}["${label}"]${statusClass}`);
    }

    // Add edges
    for (const edge of this.graph.edges) {
      const label = edge.label ? `|${edge.label}|` : '';
      lines.push(`    ${edge.source} -->${label} ${edge.target}`);
    }

    // Add styles
    lines.push('');
    for (const node of this.graph.nodes) {
      const fill = node.style.fill;
      const stroke = node.style.stroke;
      lines.push(`    style ${node.id} fill:${fill},stroke:${stroke}`);
    }

    return lines.join('\n');
  }

  /**
   * Get Mermaid status class
   */
  private getMermaidStatusClass(status: VizNode['status']): string {
    switch (status) {
      case 'success': return ':::success';
      case 'failed': return ':::failed';
      case 'running': return ':::running';
      case 'skipped': return ':::skipped';
      default: return '';
    }
  }

  /**
   * Export to GraphViz DOT
   */
  toGraphViz(): string {
    if (!this.graph) return '';

    const lines: string[] = [
      'digraph Workflow {',
      '    rankdir=LR;',
      '    node [shape=box, style="rounded,filled"];',
      ''
    ];

    // Add nodes
    for (const node of this.graph.nodes) {
      const label = node.label.replace(/"/g, "'");
      const fill = node.style.fill;
      const stroke = node.style.stroke;
      lines.push(`    "${node.id}" [label="${label}", fillcolor="${fill}", color="${stroke}"];`);
    }

    lines.push('');

    // Add edges
    for (const edge of this.graph.edges) {
      const style = edge.style.lineStyle === 'dashed' ? ' [style=dashed]' : '';
      lines.push(`    "${edge.source}" -> "${edge.target}"${style};`);
    }

    lines.push('}');
    return lines.join('\n');
  }

  /**
   * Export to SVG (returns SVG string)
   */
  toSVG(): string {
    if (!this.graph) return '';

    const { nodes, edges, dimensions } = this.graph;
    const padding = 50;

    // Calculate offset to make all coordinates positive
    let minX = Infinity, minY = Infinity;
    for (const node of nodes) {
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
    }
    const offsetX = -minX + padding;
    const offsetY = -minY + padding;

    const lines: string[] = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${dimensions.width}" height="${dimensions.height}" viewBox="0 0 ${dimensions.width} ${dimensions.height}">`,
      '  <defs>',
      '    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">',
      '      <polygon points="0 0, 10 3.5, 0 7" fill="#666"/>',
      '    </marker>',
      '  </defs>'
    ];

    // Draw edges
    for (const edge of edges) {
      const source = nodes.find(n => n.id === edge.source);
      const target = nodes.find(n => n.id === edge.target);
      
      if (source && target) {
        const x1 = source.position.x + offsetX + source.size.width;
        const y1 = source.position.y + offsetY + source.size.height / 2;
        const x2 = target.position.x + offsetX;
        const y2 = target.position.y + offsetY + target.size.height / 2;

        const dashArray = edge.style.lineStyle === 'dashed' ? ' stroke-dasharray="5,5"' : '';
        const color = edge.style.stroke;

        lines.push(`  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${edge.style.strokeWidth}"${dashArray} marker-end="url(#arrowhead)"/>`);
      }
    }

    // Draw nodes
    for (const node of nodes) {
      const x = node.position.x + offsetX;
      const y = node.position.y + offsetY;
      const { width, height } = node.size;
      const rx = node.style.borderRadius;

      // Node rectangle
      lines.push(`  <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${rx}" fill="${node.style.fill}" stroke="${node.style.stroke}" stroke-width="${node.style.strokeWidth}"/>`);
      
      // Node label
      const textX = x + width / 2;
      const textY = y + height / 2;
      lines.push(`  <text x="${textX}" y="${textY}" text-anchor="middle" dominant-baseline="middle" fill="${node.style.textColor}" font-family="sans-serif" font-size="12">${this.escapeXml(node.label)}</text>`);
    }

    lines.push('</svg>');
    return lines.join('\n');
  }

  /**
   * Export to JSON
   */
  toJSON(): string {
    return JSON.stringify(this.graph, null, 2);
  }

  // ========================================
  // Execution Trace
  // ========================================

  /**
   * Get execution trace
   */
  getTrace(): TraceEntry[] {
    return [...this.trace];
  }

  /**
   * Add trace entry
   */
  addTraceEntry(entry: TraceEntry): void {
    this.trace.push(entry);
    this.updateNodeStatus(entry.stepId, 
      entry.status === 'started' ? 'running' :
      entry.status === 'completed' ? 'success' :
      entry.status === 'failed' ? 'failed' : 'skipped'
    );
  }

  /**
   * Generate trace visualization
   */
  traceToTimeline(): { entries: TraceEntry[]; timeline: string } {
    const entries = this.getTrace();
    const lines: string[] = ['Execution Timeline:', ''];

    for (const entry of entries) {
      const time = new Date(entry.timestamp).toLocaleTimeString();
      const status = entry.status.toUpperCase().padEnd(10);
      const duration = entry.duration ? ` (${entry.duration}ms)` : '';
      const error = entry.error ? ` - ERROR: ${entry.error}` : '';
      
      lines.push(`  ${time} | ${status} | ${entry.stepName || entry.stepId}${duration}${error}`);
    }

    return { entries, timeline: lines.join('\n') };
  }

  // ========================================
  // Style Helpers
  // ========================================

  /**
   * Get node style based on type and status
   */
  private getNodeStyle(type: VizNode['type'], status: VizNode['status']): NodeStyle {
    const baseStyle: NodeStyle = {
      fill: '#ffffff',
      stroke: '#666666',
      strokeWidth: 2,
      textColor: '#333333',
      borderRadius: 8,
      shadow: {
        color: 'rgba(0,0,0,0.1)',
        blur: 4,
        offset: { x: 2, y: 2 }
      }
    };

    // Apply type-based styles
    switch (type) {
      case 'start':
        baseStyle.fill = '#d4edda';
        baseStyle.stroke = '#28a745';
        break;
      case 'end':
        baseStyle.fill = '#cce5ff';
        baseStyle.stroke = '#007bff';
        break;
      case 'condition':
        baseStyle.fill = '#fff3cd';
        baseStyle.stroke = '#ffc107';
        baseStyle.borderRadius = 0; // Diamond shape hint
        break;
      case 'wait':
        baseStyle.fill = '#e2e3e5';
        baseStyle.stroke = '#6c757d';
        break;
      case 'connector':
        baseStyle.fill = '#d1ecf1';
        baseStyle.stroke = '#17a2b8';
        break;
    }

    // Apply status-based styles
    switch (status) {
      case 'running':
        baseStyle.stroke = '#007bff';
        baseStyle.strokeWidth = 3;
        baseStyle.shadow!.color = 'rgba(0,123,255,0.3)';
        break;
      case 'success':
        baseStyle.fill = '#d4edda';
        baseStyle.stroke = '#28a745';
        break;
      case 'failed':
        baseStyle.fill = '#f8d7da';
        baseStyle.stroke = '#dc3545';
        break;
      case 'skipped':
        baseStyle.fill = '#e2e3e5';
        baseStyle.stroke = '#6c757d';
        baseStyle.strokeWidth = 1;
        break;
    }

    return baseStyle;
  }

  /**
   * Get edge style based on type
   */
  private getEdgeStyle(type: VizEdge['type']): EdgeStyle {
    const baseStyle: EdgeStyle = {
      stroke: '#666666',
      strokeWidth: 2,
      lineStyle: 'solid',
      arrow: { type: 'arrow', size: 10 }
    };

    switch (type) {
      case 'condition':
        baseStyle.lineStyle = 'dashed';
        baseStyle.stroke = '#ffc107';
        break;
      case 'fallback':
        baseStyle.lineStyle = 'dotted';
        baseStyle.stroke = '#dc3545';
        break;
    }

    return baseStyle;
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  // ========================================
  // Accessors
  // ========================================

  /**
   * Get current graph
   */
  getGraph(): VizGraph | null {
    return this.graph;
  }

  /**
   * Get node by ID
   */
  getNode(nodeId: string): VizNode | undefined {
    return this.graph?.nodes.find(n => n.id === nodeId);
  }

  /**
   * Get edges for node
   */
  getEdgesForNode(nodeId: string): { incoming: VizEdge[]; outgoing: VizEdge[] } {
    const incoming: VizEdge[] = [];
    const outgoing: VizEdge[] = [];

    for (const edge of this.graph?.edges || []) {
      if (edge.target === nodeId) incoming.push(edge);
      if (edge.source === nodeId) outgoing.push(edge);
    }

    return { incoming, outgoing };
  }
}

// ============================================
// Execution Trace Visualizer
// ============================================

/**
 * Visualizer for execution traces
 */
export class TraceVisualizer {
  /**
   * Generate trace visualization from workflow result
   */
  static fromResult(result: WorkflowResult): TraceEntry[] {
    const entries: TraceEntry[] = [];

    for (const step of result.steps) {
      entries.push({
        timestamp: result.startedAt,
        stepId: step.id,
        stepName: step.name,
        status: 'started',
        data: step.result ? { result: step.result } : undefined
      });

      entries.push({
        timestamp: result.completedAt,
        stepId: step.id,
        stepName: step.name,
        status: step.success ? 'completed' : 'failed',
        duration: step.duration,
        error: step.error?.message,
        data: step.result ? { result: step.result } : undefined
      });
    }

    return entries;
  }

  /**
   * Generate waterfall chart data
   */
  static toWaterfall(result: WorkflowResult): {
    stepId: string;
    stepName: string;
    start: number;
    duration: number;
    status: string;
  }[] {
    let cumulativeTime = 0;

    return result.steps.map(step => {
      const start = cumulativeTime;
      cumulativeTime += step.duration;

      return {
        stepId: step.id,
        stepName: step.name || step.id,
        start,
        duration: step.duration,
        status: step.success ? 'success' : 'failed'
      };
    });
  }
}

// ============================================
// Factory Functions
// ============================================

/**
 * Create a DAG visualizer
 */
export function createVisualizer(config?: Partial<VizConfig>): DAGVisualizer {
  return new DAGVisualizer(config);
}

/**
 * Visualize workflow
 */
export function visualizeWorkflow(workflow: Workflow, config?: Partial<VizConfig>): VizGraph {
  const visualizer = new DAGVisualizer(config);
  return visualizer.fromWorkflow(workflow);
}

// ============================================
// Exports
// ============================================

export default {
  DAGVisualizer,
  TraceVisualizer,
  createVisualizer,
  visualizeWorkflow
};
