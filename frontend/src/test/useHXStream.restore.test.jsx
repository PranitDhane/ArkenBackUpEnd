import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useHXStream } from "../hooks/useHXStream";
import { isBlockingEntry } from "../utils/pipelineUtils";

// ── helpers ───────────────────────────────────────────────────────────────────

function makeHxSteps(descriptors) {
  return descriptors.map(({ step_id, ai_decision, options = [] }) => ({
    step_id,
    step_name: `Step ${step_id}`,
    ai_decision,
    duration_s: 1.0,
    outputs: { [`out_step_${step_id}`]: step_id * 10 },
    ai_review: {
      reasoning: `reasoning for step ${step_id}`,
      recommendation: `rec for step ${step_id}`,
      options,
    },
    warnings: [],
    validation_passed: true,
  }));
}

/**
 * Render useHXStream with the given context and wait until the restore effect
 * has settled (fetch promise chain + both setSteps calls flushed).
 *
 * We use waitFor on a step that must change state after the fetch resolves,
 * which ensures React has processed all batched state updates before we assert.
 */
async function renderWithContext(context, { waitForStep, waitForState } = {}) {
  const hookResult = renderHook(() =>
    useHXStream({ conversationId: "conv-1", currentContext: context }),
  );
  // If the caller tells us which step should reach a terminal state, poll for it.
  if (waitForStep !== undefined && waitForState !== undefined) {
    await waitFor(() => {
      const step = hookResult.result.current.steps.find(
        (s) => s.step === waitForStep,
      );
      if (!step || step.state !== waitForState) {
        throw new Error(
          `Waiting for step ${waitForStep} to be ${waitForState}, got ${step?.state}`,
        );
      }
    });
  } else {
    // Default: give the microtask queue enough time to flush the fetch chain
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
  }
  return hookResult;
}

// ── isBlockingEntry ───────────────────────────────────────────────────────────

describe("isBlockingEntry", () => {
  describe("WARNING steps", () => {
    it("is not blocking when a later step exists (auto-resolved warning)", () => {
      // Arrange: step 7 WARNING, step 8 APPROVED — pipeline moved past it
      const entries = [
        { step: 7, state: "WARNING", data: { options: ["opt1"] } },
        { step: 8, state: "APPROVED", data: {} },
      ];

      // Act
      const blockingEntries = entries.filter((e) => isBlockingEntry(e, entries));

      // Assert
      expect(blockingEntries).toHaveLength(0);
    });

    it("is blocking when it is the last step (pipeline stopped here)", () => {
      // Arrange: step 8 APPROVED, step 9 WARNING — nothing ran after step 9
      const entries = [
        { step: 8, state: "APPROVED", data: {} },
        { step: 9, state: "WARNING", data: { options: ["opt1"] } },
      ];

      // Act
      const blockingEntries = entries.filter((e) => isBlockingEntry(e, entries));

      // Assert
      expect(blockingEntries).toHaveLength(1);
      expect(blockingEntries[0].step).toBe(9);
    });

    it("treats only the last WARNING as blocking when multiple WARNINGs exist", () => {
      // Arrange: primary bug scenario — steps 7, 9, 11 all WARNING with later
      // steps after 7 and 9, but step 11 is the last entry
      const entries = [
        { step: 7,  state: "WARNING",  data: { options: ["opt"] } },
        { step: 8,  state: "APPROVED", data: {} },
        { step: 9,  state: "WARNING",  data: { options: ["opt"] } },
        { step: 10, state: "APPROVED", data: {} },
        { step: 11, state: "WARNING",  data: { options: ["opt"] } },
      ];

      // Act
      const blockingEntries = entries.filter((e) => isBlockingEntry(e, entries));

      // Assert — only step 11 is blocking; 7 and 9 are auto-resolved
      expect(blockingEntries).toHaveLength(1);
      expect(blockingEntries[0].step).toBe(11);
    });

    it("is not blocking when WARNING has no options but a later step exists", () => {
      // Arrange: informational WARNING (no options) followed by a later step
      const entries = [
        { step: 5, state: "WARNING", data: {} },
        { step: 6, state: "APPROVED", data: {} },
      ];

      // Act
      const blockingEntries = entries.filter((e) => isBlockingEntry(e, entries));

      // Assert
      expect(blockingEntries).toHaveLength(0);
    });
  });

  describe("ESCALATED steps", () => {
    it("is always blocking regardless of later steps", () => {
      // Arrange: ESCALATED at step 5, with step 6 APPROVED after it
      // (edge case: pipeline resumed after a resolved escalation)
      const entries = [
        { step: 5, state: "ESCALATED", data: {} },
        { step: 6, state: "APPROVED",  data: {} },
      ];

      // Act
      const blockingEntries = entries.filter((e) => isBlockingEntry(e, entries));

      // Assert — ESCALATED is always treated as blocking
      expect(blockingEntries).toHaveLength(1);
      expect(blockingEntries[0].step).toBe(5);
    });

    it("is blocking when it is the last step", () => {
      // Arrange: pipeline stopped at an ESCALATED step
      const entries = [
        { step: 4, state: "CORRECTED", data: {} },
        { step: 5, state: "APPROVED",  data: {} },
        { step: 6, state: "ESCALATED", data: {} },
      ];

      // Act
      const blockingEntries = entries.filter((e) => isBlockingEntry(e, entries));

      // Assert
      expect(blockingEntries).toHaveLength(1);
      expect(blockingEntries[0].step).toBe(6);
    });
  });

  describe("non-blocking states", () => {
    it("returns false for APPROVED, CORRECTED, ERROR, PENDING, RUNNING", () => {
      // Arrange
      const nonBlockingStates = ["APPROVED", "CORRECTED", "ERROR", "PENDING", "RUNNING"];
      const entries = nonBlockingStates.map((state, i) => ({
        step: i + 1,
        state,
        data: {},
      }));

      // Act + Assert
      entries.forEach((e) => {
        expect(isBlockingEntry(e, entries)).toBe(false);
      });
    });
  });
});

// ── Restore effect — expired-session step mapper ──────────────────────────────

describe("restore effect — expired-session mapper", () => {
  const SESSION_ID = "test-session-abc";

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("preserves WARNING state for auto-resolved steps when /status returns 404 (primary bug scenario)", async () => {
    // Arrange: steps 7, 9, 11 WARNING with later steps after 7 and 9;
    // step 11 is the last — it was the blocking step. Session has expired (404).
    fetch.mockResolvedValue({ ok: false, status: 404 });

    const hxSteps = makeHxSteps([
      { step_id: 7,  ai_decision: "WARN",    options: ["opt-a"] },
      { step_id: 8,  ai_decision: "PROCEED" },
      { step_id: 9,  ai_decision: "WARN",    options: ["opt-b"] },
      { step_id: 10, ai_decision: "PROCEED" },
      { step_id: 11, ai_decision: "WARN",    options: ["opt-c"] },
    ]);

    // Act: render and wait until step 11 (the blocking step) reaches ERROR state
    const { result } = await renderWithContext(
      { hx_session_id: SESSION_ID, hx_steps: hxSteps, hx_waiting_for_user: true },
      { waitForStep: 11, waitForState: "ERROR" },
    );

    // Assert
    const step7  = result.current.steps.find((s) => s.step === 7);
    const step9  = result.current.steps.find((s) => s.step === 9);
    const step11 = result.current.steps.find((s) => s.step === 11);

    expect(step7.state).toBe("WARNING");   // auto-resolved — must stay WARNING
    expect(step9.state).toBe("WARNING");   // auto-resolved — must stay WARNING
    expect(step11.state).toBe("ERROR");    // last step (blocking) — correctly expired
    expect(step11.data.message).toMatch(/Session expired/);
  });

  it("preserves WARNING state when /status fetch throws a network error", async () => {
    // Arrange: fetch rejects entirely (network down)
    fetch.mockRejectedValue(new Error("network error"));

    const hxSteps = makeHxSteps([
      { step_id: 7,  ai_decision: "WARN",    options: ["opt-a"] },
      { step_id: 8,  ai_decision: "PROCEED" },
      { step_id: 9,  ai_decision: "WARN",    options: ["opt-c"] },
    ]);

    // Act: wait until step 9 (the blocking step) reaches ERROR state
    const { result } = await renderWithContext(
      { hx_session_id: SESSION_ID, hx_steps: hxSteps, hx_waiting_for_user: true },
      { waitForStep: 9, waitForState: "ERROR" },
    );

    // Assert
    const step7 = result.current.steps.find((s) => s.step === 7);
    const step9 = result.current.steps.find((s) => s.step === 9);

    expect(step7.state).toBe("WARNING");  // auto-resolved (step 8 came after)
    expect(step9.state).toBe("ERROR");    // last step — expired
  });

  it("converts ESCALATED step to ERROR when session expired", async () => {
    // Arrange: pipeline stopped at an ESCALATED step; session has expired
    fetch.mockResolvedValue({ ok: false, status: 404 });

    const hxSteps = makeHxSteps([
      { step_id: 4, ai_decision: "PROCEED" },
      { step_id: 5, ai_decision: "PROCEED" },
      { step_id: 6, ai_decision: "ESCALATE", options: ["option A", "option B"] },
    ]);

    // Act: wait until step 6 (the ESCALATED blocking step) reaches ERROR state
    const { result } = await renderWithContext(
      { hx_session_id: SESSION_ID, hx_steps: hxSteps, hx_waiting_for_user: true },
      { waitForStep: 6, waitForState: "ERROR" },
    );

    // Assert
    const step6 = result.current.steps.find((s) => s.step === 6);
    expect(step6.state).toBe("ERROR");
    expect(step6.data.message).toMatch(/Session expired/);
  });

  it("never modifies APPROVED or CORRECTED steps in the expired-session mapper", async () => {
    // Arrange: steps 4 CORRECTED, 5-8 APPROVED, step 9 WARNING (last)
    fetch.mockResolvedValue({ ok: false, status: 404 });

    const hxSteps = makeHxSteps([
      { step_id: 4, ai_decision: "CORRECT" },
      { step_id: 5, ai_decision: "PROCEED" },
      { step_id: 6, ai_decision: "PROCEED" },
      { step_id: 7, ai_decision: "PROCEED" },
      { step_id: 8, ai_decision: "PROCEED" },
      { step_id: 9, ai_decision: "WARN",    options: ["opt-x"] },
    ]);

    // Act: wait until step 9 (the only blocking step) reaches ERROR state
    const { result } = await renderWithContext(
      { hx_session_id: SESSION_ID, hx_steps: hxSteps, hx_waiting_for_user: true },
      { waitForStep: 9, waitForState: "ERROR" },
    );

    // Assert — non-blocking steps keep their restored state
    const step4 = result.current.steps.find((s) => s.step === 4);
    const step5 = result.current.steps.find((s) => s.step === 5);
    const step8 = result.current.steps.find((s) => s.step === 8);
    const step9 = result.current.steps.find((s) => s.step === 9);

    expect(step4.state).toBe("CORRECTED");
    expect(step5.state).toBe("APPROVED");
    expect(step8.state).toBe("APPROVED");
    expect(step9.state).toBe("ERROR");     // the only blocking step
  });
});
