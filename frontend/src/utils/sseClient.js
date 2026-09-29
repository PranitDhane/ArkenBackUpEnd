/**
 * Imperative SSE Client
 *
 * A plain JavaScript class (not a React hook) that manages an EventSource
 * connection for one request/response lifecycle.
 *
 * Usage:
 *   const sse = new SSEClient(url, onEvent);
 *   await sse.ready;          // resolves when connection opens (or timeout)
 *   const response = await fetch(POST ...);
 *   // ... process response ...
 *   sse.close();
 *
 * Why not a hook?
 * React hooks run after render. We need the SSE connection open BEFORE
 * the HTTP POST fires — in the same async function body. An imperative
 * class lets us create the EventSource and await its `onopen` callback
 * synchronously relative to the fetch call.
 */

/** SSE event types the backend emits as named events. */
const EVENT_TYPES = [
  "thinking_start",
  "thinking_end",
  "message_delta",
  "message_final",
  "app_error",
  "hx_design_started",
];

/** Maximum time (ms) to wait for EventSource.onopen before proceeding. */
const CONNECT_TIMEOUT_MS = 3000;

/**
 * Maximum time (ms) to wait for the SSE stream to complete (thinking_end)
 * after the HTTP response has arrived. Safety net so we never hang forever.
 */
const STREAM_COMPLETE_TIMEOUT_MS = 30000;

export default class SSEClient {
  /**
   * @param {string} url        - Full SSE endpoint URL
   * @param {function} onEvent  - Callback invoked for each parsed event object
   */
  constructor(url, onEvent) {
    this._onEvent = onEvent;
    this._eventSource = null;
    this._closed = false;

    // Resolved externally when thinking_end arrives or the stream closes.
    // The caller awaits this after the HTTP POST to ensure all SSE events
    // (tool_start, tool_end, etc.) have been dispatched before hiding the
    // live block.
    this._resolveCompleted = null;
    this.completed = new Promise((resolve) => {
      this._resolveCompleted = resolve;
    });

    // Promise that resolves once the connection is open (or on timeout).
    // The caller awaits this before firing the HTTP POST.
    this.ready = new Promise((resolve) => {
      try {
        const es = new EventSource(url);
        this._eventSource = es;

        // -- Connection opened ------------------------------------------------
        es.onopen = () => {
          resolve();
        };

        // -- Named event listeners --------------------------------------------
        EVENT_TYPES.forEach((eventType) => {
          es.addEventListener(eventType, (e) => {
            if (this._closed) return;
            try {
              const event = JSON.parse(e.data);
              this._onEvent(event);

              // thinking_end is the last event the backend emits for a turn.
              // Resolve the `completed` promise so the caller knows all events
              // have been dispatched and it's safe to hide the live block.
              if (eventType === "thinking_end") {
                this._resolveCompleted();
              }
            } catch (err) {
              console.error(`[SSEClient] Failed to parse ${eventType}:`, err);
            }
          });
        });

        // -- Error / unexpected close -----------------------------------------
        es.onerror = () => {
          if (this._closed) return;

          const state = es.readyState;

          // Server closed gracefully (e.g. after thinking_end)
          if (state === EventSource.CLOSED) {
            this._resolveCompleted(); // resolve in case thinking_end was missed
            this._cleanup();
            return;
          }

          // Connection failed before opening — resolve the ready promise
          // so the HTTP POST can still proceed (graceful degradation).
          console.warn("[SSEClient] Connection error — proceeding without SSE");
          resolve();
          this._resolveCompleted(); // don't block the caller
          this._cleanup();
        };

        // -- Timeout safety net -----------------------------------------------
        // If the server is slow to accept the SSE connection, don't block the
        // user's message forever. Resolve after CONNECT_TIMEOUT_MS so the POST
        // fires regardless.
        setTimeout(() => {
          if (!this._closed) {
            console.warn(
              "[SSEClient] Connect timeout — proceeding without SSE",
            );
            resolve();
          }
        }, CONNECT_TIMEOUT_MS);
      } catch (err) {
        // EventSource constructor can throw (e.g. invalid URL)
        console.error("[SSEClient] Failed to create EventSource:", err);
        resolve(); // let the caller continue
        this._resolveCompleted(); // don't block the caller
      }
    });
  }

  /**
   * Wait for the SSE stream to complete (thinking_end) with a timeout.
   * Returns immediately if already completed or closed.
   */
  async waitForCompletion() {
    return Promise.race([
      this.completed,
      new Promise((resolve) =>
        setTimeout(() => {
          console.warn("[SSEClient] Stream completion timeout — proceeding");
          resolve();
        }, STREAM_COMPLETE_TIMEOUT_MS),
      ),
    ]);
  }

  /** Close the connection and remove all listeners. */
  close() {
    this._resolveCompleted(); // resolve in case close() is called before thinking_end
    this._cleanup();
  }

  /** @private */
  _cleanup() {
    if (this._closed) return;
    this._closed = true;

    if (this._eventSource) {
      this._eventSource.close();
      this._eventSource = null;
    }
  }
}
