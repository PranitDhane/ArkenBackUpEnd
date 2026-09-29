/**
 * HX Engine SSE event types and step state constants.
 * Mirrors hx_engine/app/models/sse_events.py
 */

/**
 * design_complete event — summary.property_provenance shape (EPIC-XSTACK-2026-007-S3)
 *
 * summary.property_provenance: {
 *   hot_fluid: {
 *     fluid_name: string,
 *     source: string,          // e.g. "iapws", "user_provided", "llm_estimated"
 *     label: string,           // human-readable label from SOURCE_LABELS vocabulary
 *     confidence: number|null, // 0.0–1.0; null for database sources
 *     properties: {
 *       density_kg_m3: PropertyEntry,
 *       viscosity_Pa_s: PropertyEntry,
 *       cp_J_kgK: PropertyEntry,
 *       k_W_mK: PropertyEntry,
 *       Pr: PropertyEntry,
 *     }
 *   },
 *   cold_fluid: { ...same shape... }
 * }
 *
 * PropertyEntry: {
 *   value: number|null,
 *   source: string,
 *   label: string,
 *   confidence: number|null,
 *   unapproved_ai: boolean,   // true when source=="llm_estimated" with no approval_timestamp
 *   timestamp: string|null,   // ISO-8601; present for user_provided / user_approved_estimate
 *   note?: string,            // present on Pr derived entries
 * }
 */

export const HX_EVENT_TYPES = {
  STEP_STARTED: "step_started",
  STEP_APPROVED: "step_approved",
  STEP_CORRECTED: "step_corrected",
  STEP_WARNING: "step_warning",
  STEP_ESCALATED: "step_escalated",
  STEP_ERROR: "step_error",
  ITERATION_PROGRESS: "iteration_progress",
  DESIGN_COMPLETE: "design_complete",
  REDESIGN_ATTEMPT: "redesign_attempt",
};

export const STEP_STATES = {
  PENDING: "PENDING",
  RUNNING: "RUNNING",
  APPROVED: "APPROVED",
  CORRECTED: "CORRECTED",
  WARNING: "WARNING",
  ESCALATED: "ESCALATED",
  ERROR: "ERROR",
};

/** Map SSE event_type → StepCard state string */
export function eventToStepState(eventType) {
  switch (eventType) {
    case HX_EVENT_TYPES.STEP_STARTED:
      return STEP_STATES.RUNNING;
    case HX_EVENT_TYPES.STEP_APPROVED:
      return STEP_STATES.APPROVED;
    case HX_EVENT_TYPES.STEP_CORRECTED:
      return STEP_STATES.CORRECTED;
    case HX_EVENT_TYPES.STEP_WARNING:
      return STEP_STATES.WARNING;
    case HX_EVENT_TYPES.STEP_ESCALATED:
      return STEP_STATES.ESCALATED;
    case HX_EVENT_TYPES.STEP_ERROR:
      return STEP_STATES.ERROR;
    default:
      return STEP_STATES.PENDING;
  }
}
