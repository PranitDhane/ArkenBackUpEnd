// ============================================
// ARKEN AI Frontend - Type Definitions
// ============================================

// ============================================
// UI Types
// ============================================

export type SidebarSection = 
  | 'equipment' 
  | 'details' 
  | 'thermodynamics' 
  | 'warnings' 
  | 'history';

export type TransitionState = 'idle' | 'loading' | 'transitioning' | 'error';

// ============================================
// Run Types
// ============================================

export interface RunInfo {
  runId: string;
  status: 'success' | 'warning' | 'error' | 'running';
  timestamp: Date;
  label?: string;
}

// ============================================
// Stream Types (from calculation engine)
// ============================================

export interface StreamData {
  flow_rate: number;
  flow_basis: 'mass' | 'molar';
  temperature_K: number;
  pressure_Pa: number;
  composition: Record<string, number>;
  composition_basis: 'mass' | 'molar';
  phase: 'liquid' | 'vapor' | 'two_phase' | 'solid';
  vapor_fraction: number;
  molecular_weight?: number;
  density_kg_m3?: number;
}

// ============================================
// Equipment/Node Types
// ============================================

export interface EquipmentPort {
  name: string;
  edge: string;
  position: 'left' | 'left-top' | 'left-bottom' | 'right' | 'right-top' | 'right-bottom';
}

export interface EquipmentPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EquipmentNode {
  id: string;
  type: string;
  name: string;
  category: string;
  icon: string;
  ports: {
    inlet: EquipmentPort[];
    outlet: EquipmentPort[];
  };
  position: EquipmentPosition;
  state: 'calculated' | 'pending' | 'error';
  has_warnings: boolean;
  has_errors: boolean;
}

// ============================================
// Edge/Stream Types
// ============================================

export interface EdgeEndpoint {
  node: string;
  port: string;
  x: number;
  y: number;
}

export interface EdgeStyle {
  color: string;
  width: number;
  dashed: boolean;
}

export interface EdgeWaypoint {
  x: number;
  y: number;
}

export interface FlowsheetEdge {
  id: string;
  type: 'feed' | 'process' | 'product' | 'recycle';
  from: EdgeEndpoint;
  to: EdgeEndpoint;
  waypoints?: EdgeWaypoint[];
  label: string;
  style: EdgeStyle;
}

// ============================================
// Node Result Types
// ============================================

export interface EnergyStream {
  duty_kW: number;
  direction: 'in' | 'out';
}

export interface NodeResult {
  outlets: Record<string, StreamData>;
  energy_streams?: Record<string, EnergyStream>;
  status: 'active' | 'inactive' | 'error';
  warnings: string[];
  metadata: Record<string, unknown>;
}

// ============================================
// Stream Result Types
// ============================================

export interface StreamResult {
  edge_id: string;
  type: 'feed' | 'process' | 'product' | 'recycle';
  source: { node: string; port: string };
  target: { node: string; port: string };
  stream_data: StreamData;
}

// ============================================
// Topology Types
// ============================================

export interface TopologyLayout {
  type: string;
  direction: string;
  node_spacing: number;
  rank_spacing: number;
  bounds: {
    min_x: number;
    min_y: number;
    max_x: number;
    max_y: number;
  };
}

export interface TopologyLegend {
  edge_types: Record<string, { color: string; label: string; dashed?: boolean }>;
  node_states: Record<string, { color: string; label: string }>;
}

export interface Topology {
  nodes: EquipmentNode[];
  edges: FlowsheetEdge[];
  layout: TopologyLayout;
  legend: TopologyLegend;
}

// ============================================
// Simulation Result Types
// ============================================

export interface SimulationResult {
  converged: boolean;
  iterations: number;
  max_residual: number;
  residual_history: number[];
  tear_stream_residuals: Record<string, number[]>;
  execution_order: string[];
  tear_streams: string[];
  node_results: Record<string, NodeResult>;
  stream_results: Record<string, StreamResult>;
  warnings: string[];
  errors: string[];
  execution_time_s: number;
  equipment_inputs?: Record<string, Record<string, unknown>>;
  stream_properties?: Record<string, Record<string, unknown>>;
}

// ============================================
// API Response Types
// ============================================

export interface SimulationResponse {
  status: 'success' | 'not_converged';
  flowsheet_id: string;
  result: SimulationResult;
  topology?: Topology;
  warnings?: string[];
  errors?: string[];
  failure_reason?: string;
}

// ============================================
// Store Types
// ============================================

export interface UIState {
  activeSection: SidebarSection;
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
  isLoading: boolean;
}

export interface RunState {
  currentRunId: string | null;
  runHistory: RunInfo[];
  runCache: Map<string, SimulationResponse>;
  transitionState: TransitionState;
  loadingProgress: number;
  loadingMessage: string;
  pendingChanges: Map<string, unknown>;
  hasUnsavedChanges: boolean;
}
