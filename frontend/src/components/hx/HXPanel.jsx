/**
 * HXPanel — the 72% right panel showing the 16-step pipeline progress.
 *
 * Real mode: pass steps/isRunning/currentStep/design/sessionId from useHXStream hook.
 * Idle:      shows a prompt to send a heat exchanger design request via chat.
 */

import StepCard from "./StepCard";
import ProgressBar from "./ProgressBar";
import DesignSummary from "./DesignSummary";

// The 16 step names (§6 of master plan — must match engine PIPELINE_STEPS
// in hx_design_engine/hx_engine/app/core/pipeline_runner.py)
export const STEP_NAMES = [
  "Parse & Validate Requirements",
  "Calculate Heat Duty",
  "Fluid Properties",
  "TEMA Type & Initial Geometry",
  "LMTD & Correction Factor",
  "Initial U & Size",
  "Tube-Side Heat Transfer",
  "Shell-Side Heat Transfer",
  "Overall Heat Transfer",
  "Pressure Drop Validation",
  "Area & Overdesign",
  "Geometry Iteration",
  "Vibration Safety Check",
  "Mechanical Design",
  "Cost Estimate",
  "Final Design Validation",
];

// ── ResultsHeader ─────────────────────────────────────────────────────────────

/**
 * Scan completed steps for a specific output field.
 * Returns the first numeric value found, or null.
 */
function findOutput(steps, field) {
  if (!steps) return null;
  for (const s of steps) {
    if (!s.data?.outputs) continue;
    const v = s.data.outputs[field];
    if (v != null && typeof v === "number") return v;
  }
  return null;
}

function ResultsCard({ label, value, unit, accent }) {
  const accentColor =
    accent === "amber" ? "var(--color-corrected)" : "var(--color-running)";
  return (
    <div
      style={{
        flex: 1,
        padding: "8px 12px",
        borderRight: "1px solid var(--color-border)",
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "9px",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--color-text-muted)",
          marginBottom: "4px",
        }}
      >
        {label}
      </div>
      {value != null ? (
        <div style={{ display: "flex", alignItems: "baseline", gap: "3px" }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "15px",
              fontWeight: 600,
              color: accentColor,
            }}
          >
            {value}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "9px",
              color: "var(--color-text-muted)",
            }}
          >
            {unit}
          </span>
        </div>
      ) : (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "13px",
            color: "var(--color-text-muted)",
          }}
        >
          —
        </span>
      )}
    </div>
  );
}

function ResultsHeader({ steps }) {
  const qRaw = findOutput(steps, "Q_W");
  const lmtd = findOutput(steps, "LMTD_K");
  const uVal = findOutput(steps, "U_W_m2K") ?? findOutput(steps, "U_overall");
  const aVal = findOutput(steps, "A_m2") ?? findOutput(steps, "area_required");

  const qKw = qRaw != null ? (qRaw / 1000).toFixed(1) : null;
  const lmtdFmt = lmtd != null ? lmtd.toFixed(1) : null;
  const uFmt = uVal != null ? Math.round(uVal) : null;
  const aFmt = aVal != null ? aVal.toFixed(1) : null;

  return (
    <div
      style={{
        display: "flex",
        borderBottom: "1px solid var(--color-border)",
        backgroundColor: "var(--color-surface)",
        flexShrink: 0,
      }}
    >
      <ResultsCard label="Heat Duty" value={qKw} unit="kW" accent="amber" />
      <ResultsCard label="LMTD" value={lmtdFmt} unit="K" accent="blue" />
      <ResultsCard label="Overall U" value={uFmt} unit="W/m²K" accent="amber" />
      <ResultsCard
        label="Area"
        value={aFmt}
        unit="m²"
        accent="blue"
        style={{ borderRight: "none" }}
      />
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isActionableStep(s) {
  return (
    s.state === "ESCALATED" ||
    (s.state === "WARNING" && s.data?.options?.length > 0)
  );
}

// Attaches onRespond to the step's data when the pipeline is still accepting
// responses. Once DESIGN_COMPLETE fires (pipelineActive=false), returns s.data
// unchanged so the action buttons are removed.
function stepDataWithRespond(s, pipelineActive, sessionId, onRespond) {
  if (!pipelineActive || !onRespond || !isActionableStep(s)) return s.data;
  return {
    ...s.data,
    sessionId,
    onRespond: (answer, idx) => onRespond(sessionId, answer, idx, s.step),
  };
}

// ── HXPanel ───────────────────────────────────────────────────────────────────

/**
 * Props:
 *   steps       {Array}   from useHXStream
 *   isRunning   {boolean}
 *   currentStep {number|null}
 *   design      {object|null}
 *   sessionId   {string|null}
 *   onOptimize  {fn}
 *   onRespond   {fn(sessionId, answer, optionIndex, stepId)} — for ESCALATED/WARNING step inline response
 *   onChatMessage {fn(text)} — for “Explain tradeoffs” button on ESCALATED/WARNING cards
 */
export default function HXPanel({
  steps: extSteps,
  isRunning,
  waitingForUser,
  currentStep,
  design,
  sessionId,
  onOptimize,
  onRespond,
  onChatMessage,
}) {
  const hasData = (extSteps && extSteps.length > 0) || isRunning || !!design;

  // Build full 16-step list: fill PENDING for steps not yet in extSteps
  const allSteps = STEP_NAMES.map((name, i) => {
    const stepNum = i + 1;
    const provided = extSteps?.find((s) => s.step === stepNum);
    return provided ?? { step: stepNum, name, state: "PENDING" };
  });

  const isEscalated = extSteps?.some((s) => s.state === "ESCALATED") ?? false;
  const showProgress = isRunning && currentStep != null;
  const showSummary = !!design;
  const showIdle = !hasData;

  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      {/* Progress bar (running) */}
      {showProgress && (
        <ProgressBar
          currentStep={currentStep}
          totalSteps={16}
          stepName={STEP_NAMES[currentStep - 1]}
          isEscalated={isEscalated}
        />
      )}

      {/* Results header — shown when any step has outputs */}
      {hasData && <ResultsHeader steps={extSteps} />}

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* Idle state */}
        {showIdle && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <h2
              className="text-xs font-normal tracking-widest uppercase"
              style={{
                color: "var(--color-text-muted)",
                fontFamily: "var(--font-mono)",
              }}
            >
              Bell-Delaware · 16-Step Pipeline
            </h2>
            <p
              className="text-xs text-center max-w-xs"
              style={{
                color: "var(--color-text-muted)",
                fontFamily: "var(--font-mono)",
              }}
            >
              Send a heat exchanger design request in the chat to start the
              pipeline
            </p>
          </div>
        )}

        {/* Running or completed — show step cards */}
        {hasData && (
          <>
            {showSummary && (
              <DesignSummary design={design} onOptimize={onOptimize} />
            )}

            {allSteps.map((s) => (
              <StepCard
                key={s.step}
                step={s.step}
                name={s.name ?? STEP_NAMES[s.step - 1]}
                state={s.state}
                elapsed={s.elapsed}
                data={stepDataWithRespond(
                  s,
                  isRunning || waitingForUser,
                  sessionId,
                  onRespond,
                )}
                iteration={s.iteration}
                onChatMessage={onChatMessage}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
