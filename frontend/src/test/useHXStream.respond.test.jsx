import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useHXStream } from "../hooks/useHXStream";

// Contract tests for the backend proxy at POST /api/hx/design/{id}/respond.
// Asserts that respondToEscalation hits the proxy URL with the documented
// headers and body shape, and that the 410 branch marks the step ERROR.

class FakeEventSource {
  static instances = [];
  constructor(url) {
    this.url = url;
    this._listeners = {};
    this.readyState = 0;
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
  sessionStorage.setItem("auth_username", "alice");
});

afterEach(() => {
  sessionStorage.removeItem("auth_username");
  vi.restoreAllMocks();
});

function getStep(result, n) {
  return result.current.steps.find((s) => s.step === n);
}

async function escalate(result, stepId = 6) {
  act(() => {
    result.current.connectStream(
      `/api/v1/hx/design/sess-resp/stream`,
      "sess-resp",
    );
  });
  const es = FakeEventSource.instances[0];
  act(() => {
    es.emit("step_escalated", {
      event_type: "step_escalated",
      step_id: stepId,
      step_name: "Decision",
      message: "Pick one",
      options: ["A", "B"],
      recommendation: "A",
    });
  });
  await waitFor(() => {
    expect(getStep(result, stepId).state).toBe("ESCALATED");
  });
}

describe("useHXStream — respondToEscalation hits the backend proxy", () => {
  it("POSTs to /api/hx/design/{id}/respond with X-Username and engine schema", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "OK",
    });
    globalThis.fetch = fetchMock;

    const { result } = renderHook(() =>
      useHXStream({ conversationId: "c-resp" }),
    );
    await escalate(result, 6);

    await act(async () => {
      await result.current.respondToEscalation("sess-resp", "A", 0, 6);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/hx\/design\/sess-resp\/respond$/);
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(init.headers["X-Username"]).toBe("alice");
    expect(JSON.parse(init.body)).toEqual({
      type: "override",
      values: { user_input: "A", option_index: 0 },
    });
  });

  it("marks the step ERROR when the proxy relays a 410", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 410,
      text: async () => '{"detail":"Response window has expired."}',
    });

    const { result } = renderHook(() =>
      useHXStream({ conversationId: "c-410" }),
    );
    await escalate(result, 6);

    await act(async () => {
      await result.current.respondToEscalation("sess-resp", "A", 0, 6);
    });

    await waitFor(() => {
      expect(getStep(result, 6).state).toBe("ERROR");
    });
    expect(result.current.waitingForUser).toBe(false);
  });
});
