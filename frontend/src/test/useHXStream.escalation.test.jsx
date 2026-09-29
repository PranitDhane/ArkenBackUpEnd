import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHXStream } from "../hooks/useHXStream";

// Regression tests for bug_a78b6473:
//   "Pipeline appears to advance past Step 6 decision while Step 6 still
//    shows AWAITING INPUT".
//
// Two invariants the reducer in useHXStream must hold:
//   (1) Cross-step: if an event arrives for step M, no step with id < M
//       may remain in ESCALATED state.
//   (2) Per-step: every fresh step_escalated event must carry a unique
//       `received_at` so ActionableDecisionBody's bodyKey changes and the
//       local `submitted` ("…sending") flag resets.

class FakeEventSource {
  static instances = [];
  constructor(url) {
    this.url = url;
    this._listeners = {};
    this.readyState = 0;
    this.onerror = null;
    this.onopen = null;
    FakeEventSource.instances.push(this);
  }
  addEventListener(type, fn) {
    (this._listeners[type] ||= []).push(fn);
  }
  emit(type, data) {
    (this._listeners[type] || []).forEach((fn) =>
      fn({ data: JSON.stringify(data) }),
    );
  }
  close() {
    this.readyState = 2;
  }
}

beforeEach(() => {
  FakeEventSource.instances = [];
  globalThis.EventSource = FakeEventSource;
});

afterEach(() => {
  vi.restoreAllMocks();
});

function getStep(result, n) {
  return result.current.steps.find((s) => s.step === n);
}

describe("useHXStream — escalation reducer invariants (bug_a78b6473)", () => {
  it("clears ESCALATED on step N when step_started arrives for step N+1", async () => {
    const { result } = renderHook(() => useHXStream({ conversationId: "c-1" }));

    act(() => {
      result.current.connectStream("/api/v1/hx/design/sess-1/stream", "sess-1");
    });

    const es = FakeEventSource.instances[0];
    expect(es).toBeDefined();

    // Step 6 escalates with options
    act(() => {
      es.emit("step_escalated", {
        event_type: "step_escalated",
        step_id: 6,
        step_name: "Initial U & Size",
        message: "Choose multi-shell arrangement",
        options: ["A) 5 shells in series", "B) Use single shell"],
        recommendation: "A) 5 shells in series",
      });
    });

    expect(getStep(result, 6).state).toBe("ESCALATED");
    expect(result.current.waitingForUser).toBe(true);

    // Engine moves on to step 7 — step 6 must transition out of ESCALATED.
    act(() => {
      es.emit("step_started", {
        event_type: "step_started",
        step_id: 7,
        step_name: "Tube-Side h",
      });
    });

    const step6 = getStep(result, 6);
    expect(step6.state).not.toBe("ESCALATED");
    expect(result.current.currentStep).toBe(7);
  });

  it("clears stale ESCALATED on step N when step_corrected arrives for step N+1", async () => {
    const { result } = renderHook(() => useHXStream({ conversationId: "c-1" }));

    act(() => {
      result.current.connectStream("/api/v1/hx/design/sess-1/stream", "sess-1");
    });

    const es = FakeEventSource.instances[0];

    act(() => {
      es.emit("step_escalated", {
        event_type: "step_escalated",
        step_id: 6,
        step_name: "Initial U & Size",
        message: "Choose multi-shell arrangement",
        options: ["A", "B"],
      });
    });

    // Engine emits a terminal event for step 7 directly (simulates the
    // worst-case race where the reducer never observed step_started(7)
    // before step_corrected(7) lands).
    act(() => {
      es.emit("step_corrected", {
        event_type: "step_corrected",
        step_id: 7,
        step_name: "Tube-Side h",
        correction: { tube_diameter: { old: 0.025, new: 0.02 } },
        duration_ms: 1200,
        outputs: { h_t: 4500 },
      });
    });

    expect(getStep(result, 6).state).not.toBe("ESCALATED");
    expect(getStep(result, 7).state).toBe("CORRECTED");
  });

  it("at-most-one ESCALATED step invariant across full Step 6→11 sequence", async () => {
    const { result } = renderHook(() => useHXStream({ conversationId: "c-1" }));
    act(() => {
      result.current.connectStream("/api/v1/hx/design/sess-1/stream", "sess-1");
    });
    const es = FakeEventSource.instances[0];

    const escalationOpts = ["A) opt", "B) opt"];

    for (const stepId of [6, 7, 8, 9, 10, 11]) {
      act(() => {
        es.emit("step_started", {
          event_type: "step_started",
          step_id: stepId,
          step_name: `Step ${stepId}`,
        });
      });
      act(() => {
        es.emit("step_escalated", {
          event_type: "step_escalated",
          step_id: stepId,
          step_name: `Step ${stepId}`,
          message: `decide step ${stepId}`,
          options: escalationOpts,
        });
      });
      // After every emit, at most one step may be ESCALATED.
      const escalatedCount = result.current.steps.filter(
        (s) => s.state === "ESCALATED",
      ).length;
      expect(escalatedCount).toBeLessThanOrEqual(1);

      // Resolve by emitting step_started for the next step (except after 11)
      if (stepId < 11) {
        act(() => {
          es.emit("step_approved", {
            event_type: "step_approved",
            step_id: stepId,
            step_name: `Step ${stepId}`,
            duration_ms: 9000,
            outputs: {},
          });
        });
      }
    }

    // Final state: only step 11 should be ESCALATED; steps 6–10 must all
    // be in a terminal (non-ESCALATED) state.
    expect(getStep(result, 11).state).toBe("ESCALATED");
    for (const id of [6, 7, 8, 9, 10]) {
      expect(getStep(result, id).state).not.toBe("ESCALATED");
    }
  });

  it("stamps a fresh received_at on every escalation event so bodyKey changes", async () => {
    const { result } = renderHook(() => useHXStream({ conversationId: "c-1" }));
    act(() => {
      result.current.connectStream("/api/v1/hx/design/sess-1/stream", "sess-1");
    });
    const es = FakeEventSource.instances[0];

    act(() => {
      es.emit("step_escalated", {
        event_type: "step_escalated",
        step_id: 6,
        step_name: "Initial U & Size",
        message: "decide",
        options: ["A", "B"],
      });
    });
    const firstSeq = getStep(result, 6).data.received_at;
    expect(typeof firstSeq).toBe("number");

    // Force the wall clock forward so Date.now() differs.
    await new Promise((r) => setTimeout(r, 5));

    // Re-emit with identical option text — the second event must still
    // produce a different received_at so the StepCard's bodyKey changes
    // and ActionableDecisionBody remounts (resetting "_sending").
    act(() => {
      es.emit("step_escalated", {
        event_type: "step_escalated",
        step_id: 6,
        step_name: "Initial U & Size",
        message: "decide",
        options: ["A", "B"],
      });
    });
    const secondSeq = getStep(result, 6).data.received_at;
    expect(typeof secondSeq).toBe("number");
    expect(secondSeq).not.toBe(firstSeq);
  });
});
