/**
 * mockSSE — drives useHXStream with synthetic events for local development.
 *
 * Usage (in a dev component or story):
 *
 *   import { startMockDesign } from "../../utils/mockSSE";
 *   const { connectStream, ...rest } = useHXStream();
 *   <button onClick={() => startMockDesign(connectStream)}>Run Mock</button>
 *
 * startMockDesign() replaces the real EventSource with a fake one that
 * fires events from MOCK_SEQUENCE on a timer, so the full UI flow can
 * be exercised without a running HX Engine.
 */

import { HX_EVENT_TYPES } from "../types/hxEvents";

// ── Mock event sequence ────────────────────────────────────────────────────

const MOCK_SEQUENCE = [
  { ms: 200,  type: HX_EVENT_TYPES.STEP_STARTED,   data: { step_id: 1 } },
  { ms: 900,  type: HX_EVENT_TYPES.STEP_APPROVED,   data: { step_id: 1, elapsed_s: 0.9, reasoning: "Hot-side: steam 180 °C / 12 bar. Cold-side: cooling water 25 → 45 °C. Q = 2.4 MW confirmed." } },
  { ms: 200,  type: HX_EVENT_TYPES.STEP_STARTED,   data: { step_id: 2 } },
  { ms: 700,  type: HX_EVENT_TYPES.STEP_APPROVED,   data: { step_id: 2, elapsed_s: 0.7, reasoning: "Q = ṁ·Cp·ΔT = 12.3 kg/s × 4.18 kJ/kg·K × 20 K = 2.41 MW. ✓" } },
  { ms: 200,  type: HX_EVENT_TYPES.STEP_STARTED,   data: { step_id: 3 } },
  { ms: 1100, type: HX_EVENT_TYPES.STEP_CORRECTED,  data: { step_id: 3, elapsed_s: 1.1, from: "μ = 0.35 mPa·s (inlet)", to: "μ = 0.28 mPa·s (mean bulk 85 °C)", why: "Viscosity must be evaluated at mean bulk temperature.", reasoning: "HEDH Table B.5: water at 85 °C = 0.336 mPa·s. Wall correction 0.84 → 0.28 mPa·s." } },
  { ms: 200,  type: HX_EVENT_TYPES.STEP_STARTED,   data: { step_id: 4 } },
  { ms: 800,  type: HX_EVENT_TYPES.STEP_APPROVED,   data: { step_id: 4, elapsed_s: 0.8, reasoning: "LMTD = 87.3 K (counterflow). Ft = 0.94. Effective LMTD = 82.1 K." } },
  { ms: 200,  type: HX_EVENT_TYPES.STEP_STARTED,   data: { step_id: 5 } },
  { ms: 1300, type: HX_EVENT_TYPES.STEP_APPROVED,   data: { step_id: 5, elapsed_s: 1.3, reasoning: "U = 1200 W/m²K → A = 24.4 m². Shell ID = 610 mm (24\"). 280 tubes." } },
  { ms: 200,  type: HX_EVENT_TYPES.STEP_STARTED,   data: { step_id: 6 } },
  { ms: 900,  type: HX_EVENT_TYPES.STEP_APPROVED,   data: { step_id: 6, elapsed_s: 0.9, reasoning: "Triangular pitch PT = 23.8 mm. 284 tubes. Bundle D = 588 mm." } },
  { ms: 200,  type: HX_EVENT_TYPES.STEP_STARTED,   data: { step_id: 7 } },
  { ms: 1400, type: HX_EVENT_TYPES.STEP_WARNING,    data: { step_id: 7, elapsed_s: 1.4, message: "Baffle cut 25% — shell-side ΔP near limit. Consider 30% cut.", reasoning: "ΔP_shell = 65 kPa; limit 70 kPa. 7% margin. Proceeding." } },
  { ms: 200,  type: HX_EVENT_TYPES.STEP_STARTED,   data: { step_id: 8 } },
  { ms: 1800, type: HX_EVENT_TYPES.STEP_APPROVED,   data: { step_id: 8, elapsed_s: 1.8, reasoning: "Bell-Delaware: j_s = 0.195. h_s = 3420 W/m²K. h_s_eff = 2768 W/m²K." } },
  { ms: 200,  type: HX_EVENT_TYPES.STEP_STARTED,   data: { step_id: 9 } },
  { ms: 1500, type: HX_EVENT_TYPES.STEP_APPROVED,   data: { step_id: 9, elapsed_s: 1.5, reasoning: "Dittus-Boelter: Re = 18400. Nu = 142. h_t = 4850 W/m²K." } },
  { ms: 200,  type: HX_EVENT_TYPES.STEP_STARTED,   data: { step_id: 10 } },
  { ms: 1000, type: HX_EVENT_TYPES.STEP_CORRECTED,  data: { step_id: 10, elapsed_s: 2.8, from: "D_s = 603 mm (calculated)", to: "D_s = 610 mm (TEMA standard)", why: "Nearest standard shell size selected.", reasoning: "TEMA standards: 590, 610, 635 mm. 610 mm closest to 603 mm." } },
  { ms: 200,  type: HX_EVENT_TYPES.STEP_STARTED,   data: { step_id: 11 } },
  { ms: 1200, type: HX_EVENT_TYPES.STEP_WARNING,    data: { step_id: 11, elapsed_s: 1.2, message: "ΔP_shell = 0.65 bar (limit 0.70 bar). 7% margin — monitor.", reasoning: "Kern: ΔP_shell = 0.65 bar. ΔP_tube = 0.28 bar. Both within limits." } },
  { ms: 200,  type: HX_EVENT_TYPES.STEP_STARTED,   data: { step_id: 12 } },
  { ms: 500,  type: HX_EVENT_TYPES.ITERATION_PROGRESS, data: { step_id: 12, current: 1, total: 10, delta_u: 8.2, converged: false } },
  { ms: 500,  type: HX_EVENT_TYPES.ITERATION_PROGRESS, data: { step_id: 12, current: 2, total: 10, delta_u: 3.1, converged: false } },
  { ms: 500,  type: HX_EVENT_TYPES.ITERATION_PROGRESS, data: { step_id: 12, current: 3, total: 10, delta_u: 1.4, converged: false } },
  { ms: 500,  type: HX_EVENT_TYPES.ITERATION_PROGRESS, data: { step_id: 12, current: 4, total: 10, delta_u: 0.6, converged: true } },
  { ms: 200,  type: HX_EVENT_TYPES.STEP_APPROVED,   data: { step_id: 12, elapsed_s: 2.2, reasoning: "U converged at 1187 W/m²K after 4 iterations (ΔU < 1%).", iteration: { current: 4, total: 10, deltaU: 0.6, converged: true } } },
  { ms: 200,  type: HX_EVENT_TYPES.STEP_STARTED,   data: { step_id: 13 } },
  { ms: 700,  type: HX_EVENT_TYPES.STEP_APPROVED,   data: { step_id: 13, elapsed_s: 0.7, reasoning: "Strouhal: f_v = 18.3 Hz vs f_n = 42.1 Hz. Safety ratio = 2.3 > 2.0. ✓" } },
  { ms: 200,  type: HX_EVENT_TYPES.STEP_STARTED,   data: { step_id: 14 } },
  { ms: 900,  type: HX_EVENT_TYPES.STEP_APPROVED,   data: { step_id: 14, elapsed_s: 0.9, reasoning: "TEMA Class C. Shell: SA-516 Gr.70. Tubes: SA-179. Tube-sheet = 52 mm." } },
  { ms: 200,  type: HX_EVENT_TYPES.STEP_STARTED,   data: { step_id: 15 } },
  { ms: 600,  type: HX_EVENT_TYPES.STEP_APPROVED,   data: { step_id: 15, elapsed_s: 0.6, reasoning: "Material: $18,400. Fabrication: $6,200. Total FOB: $24,600." } },
  { ms: 200,  type: HX_EVENT_TYPES.STEP_STARTED,   data: { step_id: 16 } },
  { ms: 1100, type: HX_EVENT_TYPES.STEP_APPROVED,   data: { step_id: 16, elapsed_s: 1.1, reasoning: "All 16 checks passed. Overdesign = 3.8%. ✓" } },
  {
    ms: 300,
    type: HX_EVENT_TYPES.DESIGN_COMPLETE,
    data: {
      confidence:          0.91,
      confidenceBreakdown: { thermal: 0.94, convergence: 0.96, geometry: 0.88, validation: 0.87 },
      U_overall:           1187,
      area_required:       25.3,
      overdesign_pct:      3.8,
      dP_shell:            0.65,
      dP_shell_limit:      0.70,
      dP_tube:             0.28,
      dP_tube_limit:       0.35,
      tema_type:           "BEM",
      cost_usd:            24600,
      vibration_safe:      true,
    },
  },
];

// ── Fake EventSource ───────────────────────────────────────────────────────

class FakeEventSource {
  constructor(sequence, handlers, onDone) {
    this._closed = false;
    this._timers = [];
    this._onDone = onDone;
    this._schedule(sequence, handlers);
  }

  _schedule(sequence, handlers) {
    let elapsed = 0;
    for (let i = 0; i < sequence.length; i++) {
      const item = sequence[i];
      const isLast = i === sequence.length - 1;
      elapsed += item.ms;
      const t = setTimeout(() => {
        if (this._closed) return;
        const listener = handlers[item.type];
        if (listener) {
          listener({ data: JSON.stringify(item.data) });
        }
        if (isLast && this._onDone) {
          this._onDone();
        }
      }, elapsed);
      this._timers.push(t);
    }
  }

  close() {
    this._closed = true;
    this._timers.forEach(clearTimeout);
    this._onDone = null; // prevent double-call if close() races with last event
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Patch window.EventSource for the duration of one mock design run.
 * connectStream() will call `new EventSource(url)` — we intercept it.
 *
 * @param {function} connectStream  — from useHXStream()
 * @param {Array}    [sequence]     — override MOCK_SEQUENCE for custom runs
 */
export function startMockDesign(connectStream, sequence = MOCK_SEQUENCE) {
  const OriginalEventSource = window.EventSource;

  window.EventSource = class extends EventTarget {
    constructor(_url) {
      super();
      const handlers = {};
      let restored = false;
      const restore = () => {
        if (!restored) {
          restored = true;
          window.EventSource = OriginalEventSource;
        }
      };
      this._fake = new FakeEventSource(sequence, handlers, restore);
      // addEventListener calls from useHXStream register into `handlers`
      this.addEventListener = (type, fn) => { handlers[type] = fn; };
      this.close = () => {
        this._fake.close();
        restore();
      };
      this.onerror = null;
    }
  };

  // Trigger connectStream with a dummy URL — FakeEventSource fires the events
  connectStream("/api/v1/hx/design/mock-session/stream");
}
