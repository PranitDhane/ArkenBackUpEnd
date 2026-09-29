/**
 * useHXStream — manages the HX Engine SSE stream.
 *
 * Returns data in the shape HXPanel expects:
 *   steps[]       { step, name, state, elapsed, data, iteration }
 *   currentStep   number | null  (step number currently RUNNING)
 *   sessionId     string | null  (HX Engine session identifier)
 *   isRunning     boolean
 *   designResult  object | null
 *   error         string | null
 *
 * Flow (real mode):
 *   1. Backend emits hx_design_started SSE event with { session_id, stream_url }
 *   2. ChatContainer calls connectStream(streamUrl, sessionId)
 *   3. Hook opens EventSource to HX Engine, updates steps on each event
 *   4. DESIGN_COMPLETE → sets designResult, closes stream
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { HX_EVENT_TYPES, eventToStepState } from "../types/hxEvents";
import { STEP_NAMES } from "../components/hx/HXPanel";
import {
  isBlockingEntry,
  SESSION_EXPIRED_CARD_MESSAGE,
  sessionExpiredErrorMessage,
} from "../utils/pipelineUtils";

// Direct HX Engine URL for dev (EventSource must go straight to the engine,
// not through the backend). Empty in prod → nginx routes /api/v1/hx/... correctly.
const HX_ENGINE_BASE = import.meta.env.VITE_HX_ENGINE_URL || "";

// Backend base URL for API calls routed through the backend (e.g. respond proxy).
const BACKEND_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api$/, "")
  : "http://localhost:8001";

// Map HX Engine internal enum values (stored in MongoDB) to the display strings
// the frontend uses.  SSE events carry APPROVED/CORRECTED; restored records
// carry PROCEED/CORRECT/WARN/ESCALATE (AIDecisionEnum).
const AI_DECISION_MAP = {
  PROCEED: "APPROVED",
  CORRECT: "CORRECTED",
  WARN: "WARNING",
  ESCALATE: "ESCALATED",
  // Pass-through for values already in display form
  APPROVED: "APPROVED",
  CORRECTED: "CORRECTED",
  WARNING: "WARNING",
  ESCALATED: "ESCALATED",
  ERROR: "ERROR",
};

/**
 * Synthesize a design result from persisted step records.
 * Called when restoring after page refresh — hx_steps are only persisted
 * after is_complete=True, so this always represents a finished pipeline.
 */
function synthesizeDesignResult(hxSteps) {
  // Merge all step outputs into one flat dict (later steps overwrite earlier)
  const outputs = {};
  for (const r of hxSteps) {
    Object.assign(outputs, r.outputs || {});
  }

  // Approximate confidence from step AI decisions
  const weights = {
    PROCEED: 1,
    APPROVED: 1,
    CORRECT: 0.7,
    CORRECTED: 0.7,
    WARN: 0.5,
    WARNING: 0.5,
    ESCALATE: 0.3,
    ESCALATED: 0.3,
    ERROR: 0,
  };
  const scores = hxSteps.map((r) => weights[r.ai_decision] ?? 0.8);
  const confidence =
    scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0.8;

  return {
    pipeline_status: "completed",
    confidence,
    U_W_m2K: outputs.U_W_m2K ?? null,
    A_m2: outputs.A_m2 ?? null,
    Q_W: outputs.Q_W ?? null,
    LMTD_K: outputs.LMTD_K ?? null,
    tema_type: outputs.tema_type ?? null,
    overdesign_pct: outputs.overdesign_pct ?? null,
    dP_shell: outputs.dP_shell ?? null,
    dP_tube: outputs.dP_tube ?? null,
    dP_shell_limit: outputs.dP_shell_limit ?? null,
    dP_tube_limit: outputs.dP_tube_limit ?? null,
    cost_usd: outputs.cost_usd ?? null,
    vibration_safe: outputs.vibration_safe ?? null,
  };
}

/**
 * Convert a persisted StepRecord (from MongoDB via /context) into the shape
 * useHXStream uses for each step entry.
 *
 * StepRecord fields: step_id, step_name, duration_s, ai_decision, outputs,
 *   ai_review { reasoning, corrections, warnings, recommendation, options }
 */
function stepRecordToEntry(record, stepNames) {
  const stepId = record.step_id;
  const rawState =
    record.ai_decision || (record.validation_passed ? "PROCEED" : "ERROR");
  const state = AI_DECISION_MAP[rawState] ?? "APPROVED";
  const aiReview = record.ai_review || {};

  // Build the `data` payload that CardBody/OutputsTable/Reasoning use
  const data = {
    outputs: record.outputs || {},
    reasoning: aiReview.reasoning || aiReview.observation || "",
  };

  if (state === "CORRECTED" && aiReview.corrections?.length) {
    const first = aiReview.corrections[0];
    data.from = String(first.old_value ?? "");
    data.to = String(first.new_value ?? "");
    data.why = first.reason || "";
  }

  if (state === "WARNING") {
    // Short one-liner above the KV table; reasoning goes in the collapsible section.
    data.message =
      aiReview.recommendation ||
      aiReview.observation ||
      record.warnings?.[0] ||
      "";
    data.options = aiReview.options || [];
    data.option_ratings = aiReview.option_ratings || [];
    data.recommendation = aiReview.recommendation || null;
  }

  if (state === "ESCALATED") {
    // Reconstruct the full escalation payload from the persisted ai_review.
    // ActionableDecisionBody reads data.question, data.options, data.option_ratings,
    // data.recommendation — all come from the ai_review stored in the StepRecord.
    data.question = aiReview.reasoning || aiReview.observation || "";
    data.options = aiReview.options || [];
    data.option_ratings = aiReview.option_ratings || [];
    data.recommendation = aiReview.recommendation || null;
  }

  return {
    step: stepId,
    name: record.step_name ?? stepNames[stepId - 1] ?? `Step ${stepId}`,
    state,
    elapsed: record.duration_s ?? null,
    data,
    iteration: null,
  };
}

function makeInitialSteps() {
  return STEP_NAMES.map((name, i) => ({
    step: i + 1,
    name,
    state: "PENDING",
    elapsed: null,
    data: null,
    iteration: null,
  }));
}

export function useHXStream({
  conversationId,
  currentContext,
  onDesignComplete,
} = {}) {
  const [steps, setSteps] = useState(makeInitialSteps);
  const [isRunning, setIsRunning] = useState(false);
  const [waitingForUser, setWaitingForUser] = useState(false);
  const [currentStep, setCurrentStep] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [designResult, setDesignResult] = useState(null);
  const [error, setError] = useState(null);
  // True while waiting for the backend to persist the design report
  const [reportPending, setReportPending] = useState(false);
  const eventSourceRef = useRef(null);
  // Track the hx_session_id we last restored so we don't re-apply on every render
  const restoredSessionRef = useRef(null);
  // Stable ref for the callback so handleEvent doesn't re-create on every render
  const onDesignCompleteRef = useRef(onDesignComplete);
  onDesignCompleteRef.current = onDesignComplete;

  // ── Internal step updater ──────────────────────────────────────────────────

  const updateStep = useCallback((stepId, patch) => {
    setSteps((prev) =>
      prev.map((s) => (s.step === stepId ? { ...s, ...patch } : s)),
    );
  }, []);

  // ── Event handler ──────────────────────────────────────────────────────────

  const handleEvent = useCallback(
    (eventType, data) => {
      if (eventType === HX_EVENT_TYPES.DESIGN_COMPLETE) {
        console.log("[useHXStream] DESIGN_COMPLETE received");
        // data is the raw SSE event: { event_type, session_id, summary: { ... } }
        // summary does NOT include confidence — synthesize it from the live steps
        // so the DesignSummary renders the real value (same as the restore path).
        setSteps((currentSteps) => {
          const liveRecords = currentSteps
            .filter((s) => s.state !== "PENDING" && s.state !== "RUNNING")
            .map((s) => ({
              ai_decision: s.state,
              outputs: s.data?.outputs || {},
            }));
          const synthesized = synthesizeDesignResult(liveRecords);
          // Merge backend summary fields on top so any server-computed values win
          const summary = data?.summary || {};
          setDesignResult({ ...synthesized, ...summary });
          return currentSteps; // no change to steps
        });
        setIsRunning(false);
        setWaitingForUser(false);
        setCurrentStep(null);
        setReportPending(true);
        eventSourceRef.current?.close();
        // Notify parent so it can trigger a context re-fetch to pick up the
        // backend-persisted design report.
        console.log(
          "[useHXStream] calling onDesignComplete ref:",
          !!onDesignCompleteRef.current,
        );
        onDesignCompleteRef.current?.(data?.session_id);
        return;
      }

      if (eventType === HX_EVENT_TYPES.ITERATION_PROGRESS) {
        // IterationProgressEvent fields: iteration_number, max_iterations,
        // delta_U_pct, constraints_met — map to StepCard's IterationProgress shape.
        // step_id is optional (Step 12 convergence loop will add it).
        if (data.step_id) {
          updateStep(data.step_id, {
            iteration: {
              current: data.iteration_number ?? 0,
              total: data.max_iterations ?? 20,
              deltaU: data.delta_U_pct ?? null,
              converged: data.constraints_met ?? false,
            },
          });
        }
        return;
      }

      const stepId = data.step_id;
      if (!stepId) return;

      const newState = eventToStepState(eventType);

      // ── Pipeline halted by step error ─────────────────────────────────
      // When the backend emits step_error (e.g. max escalations exhausted),
      // the pipeline has stopped — mark the step, stop running, close stream.
      // The backend orchestration will generate a detailed failure report via
      // the LLM (with full step data + escalation history) and post it as a
      // chat message automatically.
      if (newState === "ERROR") {
        updateStep(stepId, {
          state: "ERROR",
          elapsed: data.duration_ms != null ? data.duration_ms / 1000 : null,
          data: { ...data },
        });
        setIsRunning(false);
        setWaitingForUser(false);
        setCurrentStep(null);
        eventSourceRef.current?.close();
        return;
      }

      if (newState === "RUNNING") {
        setCurrentStep(stepId);
        setWaitingForUser(false); // pipeline resumed — no longer waiting
        // Cross-step invariant: clearing the current step + sweeping any
        // earlier ESCALATED stragglers prevents the "Step N stuck on
        // AWAITING INPUT while Step N+1 is live" UI defect (see
        // bug_a78b6473_xstack_pipeline_advances_past_unresolved_decision).
        setSteps((prev) =>
          prev.map((s) => {
            if (s.step === stepId) {
              return { ...s, state: "RUNNING", elapsed: null, data: null };
            }
            if (s.step < stepId && s.state === "ESCALATED") {
              return {
                ...s,
                state: "APPROVED",
                data: { ...(s.data || {}), _stale_escalation_cleared: true },
              };
            }
            return s;
          }),
        );
        return;
      }

      // Duration: HX Engine emits duration_ms (integer milliseconds).
      // StepCard displays it as seconds with one decimal place.
      const elapsed = data.duration_ms != null ? data.duration_ms / 1000 : null;

      // Build state-specific data payload normalised for StepCard.
      let patchData = { ...data };

      if (newState === "ESCALATED") {
        // StepEscalatedEvent: { message, options, recommendation }
        // ActionableDecisionBody reads data.question, data.options, data.recommendation.
        if (patchData.message && !patchData.question) {
          patchData.question = patchData.message;
        }
        patchData.options = data.options || [];
        patchData.option_ratings = data.option_ratings || [];
        patchData.recommendation = data.recommendation || null;
        // EPIC-XSTACK-2026-007-S1: property-request escalation extras
        patchData.event_subtype = data.event_subtype || null;
        patchData.property_request_payload =
          data.property_request_payload || null;
        // Stamp a per-event sequence number so ActionableDecisionBody's
        // bodyKey changes for every fresh escalation event, forcing a
        // remount that resets the local `submitted` (`…sending`) flag.
        // Without this, a re-escalation with identical option text reuses
        // the prior component instance and the "_sending" indicator
        // gets stuck (see bug_a78b6473_xstack_pipeline_advances_past_
        // unresolved_decision).
        patchData.received_at = Date.now();
      } else if (newState === "CORRECTED") {
        // StepCorrectedEvent.correction is a dict: { fieldName: { old, new }, ... }
        // e.g. { "tube_diameter": { "old": 0.025, "new": 0.020 } }
        // StepCard reads data.from / data.to / data.why.
        const entries = Object.entries(data.correction || {});
        if (entries.length > 0) {
          const [field, vals] = entries[0];
          patchData.from = `${field}: ${vals.old ?? ""}`;
          patchData.to = `${field}: ${vals.new ?? ""}`;
          // why is the short per-correction reason (same as the restore path uses
          // first.reason), NOT the full reasoning string — that's already shown
          // in the collapsible <Reasoning> block and would duplicate otherwise.
          patchData.why = vals.why || vals.reason || data.why || "";
        }
      } else if (newState === "WARNING") {
        // StepWarningEvent fields: warning_message (short), reasoning (full AI text),
        // user_summary, outputs, options, recommendation.
        // StepCard reads data.message + data.reasoning + data.options + data.recommendation.
        patchData.message = data.warning_message || data.user_summary || "";
        patchData.reasoning = data.reasoning || "";
        patchData.outputs = data.outputs || {};
        patchData.options = data.options || [];
        patchData.option_ratings = data.option_ratings || [];
        patchData.recommendation = data.recommendation || null;
      }

      // Ensure reasoning + outputs are always available for CardBody
      if (!patchData.reasoning && data.reasoning) {
        patchData.reasoning = data.reasoning;
      }
      if (!patchData.outputs && data.outputs) {
        patchData.outputs = data.outputs;
      }

      // Mark pipeline as waiting for user input on actionable ESCALATED/WARNING
      if (
        newState === "ESCALATED" ||
        (newState === "WARNING" && patchData.options?.length > 0)
      ) {
        setWaitingForUser(true);
      }

      setCurrentStep((prev) => (prev === stepId ? null : prev));
      // Cross-step invariant: any event for step M means the engine has
      // moved past every earlier step. Clear stale ESCALATED state on
      // steps < M so the UI can never show two AWAITING INPUT cards at
      // once (see bug_a78b6473_xstack_pipeline_advances_past_unresolved
      // _decision). The current step's update is folded into the same
      // setSteps call so React renders both transitions atomically.
      setSteps((prev) =>
        prev.map((s) => {
          if (s.step === stepId) {
            return { ...s, state: newState, elapsed, data: patchData };
          }
          if (s.step < stepId && s.state === "ESCALATED") {
            return {
              ...s,
              state: "APPROVED",
              data: { ...(s.data || {}), _stale_escalation_cleared: true },
            };
          }
          return s;
        }),
      );
    },
    [updateStep],
  );

  // ── Connect real EventSource ───────────────────────────────────────────────

  const connectStream = useCallback(
    (streamUrl, newSessionId) => {
      eventSourceRef.current?.close();

      setSteps(makeInitialSteps());
      setIsRunning(true);
      setCurrentStep(null);
      setSessionId(newSessionId ?? null);
      setDesignResult(null);
      setError(null);
      setReportPending(false);

      // URL resolution:
      // - absolute URL (starts with http/https) → use as-is
      // - relative URL → prepend VITE_HX_ENGINE_URL (dev) or leave relative (prod/nginx)
      const fullUrl = streamUrl.startsWith("http")
        ? streamUrl
        : `${HX_ENGINE_BASE}${streamUrl}`;

      const es = new EventSource(fullUrl);
      eventSourceRef.current = es;

      Object.values(HX_EVENT_TYPES).forEach((eventType) => {
        es.addEventListener(eventType, (e) => {
          try {
            handleEvent(eventType, JSON.parse(e.data));
          } catch (err) {
            console.error("[useHXStream] Failed to parse SSE event:", err);
          }
        });
      });

      es.onerror = () => {
        console.error("[useHXStream] SSE connection error");
        setError("Connection lost. Please refresh.");
        setIsRunning(false);
        es.close();
      };
    },
    [handleEvent],
  );

  /**
   * Re-open the SSE stream after a page refresh WITHOUT resetting the already-
   * restored step list.  Used only in the restore effect when the pipeline was
   * paused waiting for user input.
   */
  const reconnectStream = useCallback(
    (hxSessionId) => {
      eventSourceRef.current?.close();

      const streamPath = `/api/v1/hx/design/${hxSessionId}/stream`;
      const fullUrl = `${HX_ENGINE_BASE}${streamPath}`;
      console.log("[RECONNECT] Opening SSE at:", fullUrl);

      const es = new EventSource(fullUrl);
      eventSourceRef.current = es;

      es.onopen = () => {
        console.log("[RECONNECT] SSE connection opened successfully");
      };

      Object.values(HX_EVENT_TYPES).forEach((eventType) => {
        es.addEventListener(eventType, (e) => {
          console.log(
            "[RECONNECT] SSE event received:",
            eventType,
            e.data?.slice?.(0, 120),
          );
          try {
            handleEvent(eventType, JSON.parse(e.data));
          } catch (err) {
            console.error("[useHXStream] Failed to parse SSE event:", err);
          }
        });
      });

      es.onerror = (err) => {
        console.error(
          "[RECONNECT] SSE error:",
          err,
          "readyState:",
          es.readyState,
        );
        setError("Connection lost. Please refresh.");
        setIsRunning(false);
        es.close();
      };
    },
    [handleEvent],
  );

  // ── Respond to an ESCALATED step ──────────────────────────────────────────

  const respondToEscalation = useCallback(
    async (sid, response, optionIndex, stepId) => {
      const id = sid ?? sessionId;
      console.log("[RESPOND] respondToEscalation called", {
        sid,
        sessionId,
        id,
        response,
        optionIndex,
        stepId,
      });
      if (!id) {
        console.error(
          "[useHXStream] respondToEscalation called with no sessionId",
        );
        return;
      }
      // Route all escalation responses through the backend proxy so that
      // user-provided property values can be pre-validated before forwarding
      // to the HX Engine (EPIC-XSTACK-2026-007-S2).
      const respondUrl = `${BACKEND_BASE}/api/hx/design/${id}/respond`;
      console.log("[RESPOND] POSTing to:", respondUrl, "body:", response);
      // Attach the X-Username header so the backend proxy can authenticate.
      // The username is written to sessionStorage by AuthContext on login.
      const storedUsername = sessionStorage.getItem("auth_username") || "";
      const respondHeaders = { "Content-Type": "application/json" };
      if (storedUsername) respondHeaders["X-Username"] = storedUsername;
      try {
        const res = await fetch(respondUrl, {
          method: "POST",
          headers: respondHeaders,
          // HX Engine UserResponse schema: { type, values: { user_input, option_index } }
          body: JSON.stringify({
            type: "override",
            values: {
              user_input: response,
              option_index: optionIndex ?? -1,
            },
          }),
        });
        console.log(
          "[RESPOND] response status:",
          res.status,
          res.ok ? "OK" : "FAILED",
        );
        if (!res.ok) {
          const text = await res.text().catch(() => String(res.status));
          console.error(
            `[useHXStream] respondToEscalation failed (${res.status}):`,
            text,
          );
          if (res.status === 410) {
            // Response window expired — the HX Engine future timed out.
            // Mark only the specific step that was waiting as ERROR so the
            // card updates visually and the user knows to re-run the design.
            setWaitingForUser(false);
            setIsRunning(false);
            eventSourceRef.current?.close();
            setSteps((prev) =>
              prev.map((s) =>
                s.step === stepId
                  ? {
                      ...s,
                      state: "ERROR",
                      data: {
                        ...s.data,
                        message: SESSION_EXPIRED_CARD_MESSAGE,
                      },
                    }
                  : s,
              ),
            );
            setError(sessionExpiredErrorMessage(stepId));
          } else {
            setError(
              `Failed to send response (${res.status}). Please try again.`,
            );
          }
        }
      } catch (err) {
        console.error("[useHXStream] respondToEscalation network error:", err);
        setError(
          "Network error sending response. Please check your connection.",
        );
      }
    },
    [sessionId],
  );

  // ── Reset on conversation change ───────────────────────────────────────────
  // Always clear the restore guard so the next context load re-applies the
  // correct session's steps. Without this, switching A→B→A would leave
  // restoredSessionRef pointing at A's session from a previous restore,
  // making the restore effect bail out on the return visit to A.

  useEffect(() => {
    // Clear the restore guard unconditionally so the restore effect always
    // runs fresh for whatever context the new conversation provides.
    restoredSessionRef.current = null;

    if (!conversationId) {
      eventSourceRef.current?.close();
      setSteps(makeInitialSteps());
      setIsRunning(false);
      setCurrentStep(null);
      setSessionId(null);
      setDesignResult(null);
      setError(null);
    } else {
      // Switching to a different conversation: reset steps immediately so the
      // panel shows the pending/loading state while context fetches, rather than
      // showing stale data from the previous conversation's live SSE stream.
      setSteps(makeInitialSteps());
    }
  }, [conversationId]);

  // ── Restore persisted step records after page refresh ─────────────────────
  // Depends on hx_session_id (not just conversationId) so it fires only once
  // the backend has written the session ID into the conversation context.

  useEffect(() => {
    const hxSessionId = currentContext?.hx_session_id;
    const hxSteps = currentContext?.hx_steps;

    console.log("[RESTORE] effect fired", {
      hxSessionId,
      hxStepsCount: hxSteps?.length ?? 0,
      hx_waiting_for_user: currentContext?.hx_waiting_for_user,
      isRunning,
      restoredRef: restoredSessionRef.current,
    });

    // Nothing to restore, or already restored this session
    if (!hxSessionId || !hxSteps?.length) {
      console.log("[RESTORE] bail: no sessionId or no steps");
      return;
    }
    if (restoredSessionRef.current === hxSessionId) {
      console.log("[RESTORE] bail: already restored this session", hxSessionId);
      return;
    }
    // Don't overwrite an active live stream
    if (isRunning) {
      console.log("[RESTORE] bail: isRunning=true, skipping restore");
      return;
    }

    restoredSessionRef.current = hxSessionId;
    setSessionId(hxSessionId);

    const entries = hxSteps.map((r) => stepRecordToEntry(r, STEP_NAMES));
    console.log(
      "[RESTORE] entries mapped:",
      entries.map((e) => ({ step: e.step, state: e.state })),
    );

    setSteps((prev) => {
      const restored = new Map(entries.map((e) => [e.step, e]));
      return prev.map((s) => restored.get(s.step) ?? s);
    });

    // Restore waitingForUser: true if any restored step is ESCALATED or an
    // actionable WARNING.  Primary signal: hx_waiting_for_user flag in context.
    // Fallback: if the pipeline never finished (< 16 steps persisted) and an
    // ESCALATED step exists, the backend flag may be stale/missing — treat it
    // as waiting anyway so the user can still respond.
    const contextWaiting = currentContext?.hx_waiting_for_user === true;
    const pipelineIncomplete = entries.length < 16;
    const hasActiveEscalation = entries.some((e) =>
      isBlockingEntry(e, entries),
    );
    console.log(
      "[RESTORE] contextWaiting:",
      contextWaiting,
      "hasActiveEscalation:",
      hasActiveEscalation,
      "pipelineIncomplete:",
      pipelineIncomplete,
    );
    const escalatedSteps = entries.filter((e) => isBlockingEntry(e, entries));
    console.log(
      "[RESTORE] escalated steps:",
      escalatedSteps.map((e) => ({
        step: e.step,
        state: e.state,
        dataKeys: Object.keys(e.data || {}),
      })),
    );

    // Treat as waiting if the flag is set OR if the pipeline is incomplete with an escalation
    const shouldWait =
      hasActiveEscalation && (contextWaiting || pipelineIncomplete);
    if (shouldWait) {
      // ── Issue 4 fix: verify live backend status before showing options ──
      // The context snapshot may be stale (e.g. the USER_RESPONSE_TIMEOUT
      // fired while the user was away).  Hit the live /status endpoint to
      // confirm the session is actually still waiting for input.
      const statusUrl = `${HX_ENGINE_BASE}/api/v1/hx/design/${hxSessionId}/status`;
      console.log("[RESTORE] → verifying live status at:", statusUrl);
      fetch(statusUrl)
        .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
        .then((status) => {
          console.log("[RESTORE] live status:", {
            waiting_for_user: status.waiting_for_user,
            pipeline_status: status.pipeline_status,
          });
          if (
            status.waiting_for_user === true &&
            status.pipeline_status !== "error"
          ) {
            // Session is genuinely still waiting — show options & reconnect SSE
            console.log(
              "[RESTORE] → session still active, reconnecting SSE stream:",
              hxSessionId,
            );
            setWaitingForUser(true);
            setIsRunning(true);
            reconnectStream(hxSessionId);
          } else {
            // Session expired or errored — mark only the blocking step as ERROR.
            // Auto-resolved WARNING steps (pipeline continued past them) keep
            // their original WARNING state so the audit trail is preserved.
            console.log(
              "[RESTORE] → session expired/errored, marking blocking step as ERROR",
            );
            setSteps((prev) =>
              prev.map((s) =>
                isBlockingEntry(s, entries)
                  ? {
                      ...s,
                      state: "ERROR",
                      data: {
                        ...s.data,
                        message: SESSION_EXPIRED_CARD_MESSAGE,
                      },
                    }
                  : s,
              ),
            );
            setWaitingForUser(false);
            setIsRunning(false);
          }
        })
        .catch((err) => {
          // Status fetch failed (404 = session gone, network error, etc.)
          // Treat as expired — safer than showing stale options.
          console.warn(
            "[RESTORE] status check failed, treating as expired:",
            err,
          );
          setSteps((prev) =>
            prev.map((s) =>
              isBlockingEntry(s, entries)
                ? {
                    ...s,
                    state: "ERROR",
                    data: { ...s.data, message: SESSION_EXPIRED_CARD_MESSAGE },
                  }
                : s,
            ),
          );
          setWaitingForUser(false);
          setIsRunning(false);
        });
    } else {
      // Restore the design summary so DesignSummary renders after page refresh
      console.log("[RESTORE] → no escalation, synthesizing design result");
      setDesignResult(synthesizeDesignResult(hxSteps));
    }
  }, [
    currentContext?.hx_session_id,
    currentContext?.hx_steps,
    currentContext?.hx_waiting_for_user,
    isRunning,
    reconnectStream,
  ]);

  // ── Reset ──────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    eventSourceRef.current?.close();
    setSteps(makeInitialSteps());
    setIsRunning(false);
    setWaitingForUser(false);
    setCurrentStep(null);
    setSessionId(null);
    setDesignResult(null);
    setError(null);
    setReportPending(false);
  }, []);

  // ── Clear reportPending when report arrives in context ─────────────────────
  useEffect(() => {
    if (!reportPending) return;
    // Check both the dedicated field AND messages for the report
    const hasReportField = !!currentContext?.hx_design_report;
    const hasReportMessage = (currentContext?.messages || []).some(
      (m) =>
        m.role === "assistant" &&
        (m.metadata?.type === "design_report" ||
          m.content?.startsWith("### Design Complete")),
    );
    if (hasReportField || hasReportMessage) {
      setReportPending(false);
    }
  }, [reportPending, currentContext]);

  return {
    steps,
    isRunning,
    waitingForUser,
    currentStep,
    sessionId,
    designResult,
    error,
    reportPending,
    connectStream,
    reset,
    respondToEscalation,
  };
}
