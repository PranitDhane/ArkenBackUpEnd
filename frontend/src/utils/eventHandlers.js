/**
 * SSE Event Handlers
 *
 * Maps SSE event types to chat state actions.
 * Currently handles generic chatbot events only (no tools).
 * Tool events (tool_start, tool_end, run_progress, agent_text)
 * will be added back when HX Engine integration is ready.
 */

import { ACTIONS } from "../hooks/useChatState";

/**
 * Handle incoming SSE event and dispatch appropriate action
 * @param {Object} event - SSE event object
 * @param {function} dispatch - Dispatch function from useChatState
 */
export function handleSSEEvent(event, dispatch) {
  switch (event.event_type) {
    case "thinking_start":
      // Do NOT dispatch THINKING_START from SSE — the HTTP flow controls
      // isThinking via SET_THINKING(true) BEFORE the SSE connection opens.
      break;

    case "thinking_end":
      // Do NOT dispatch THINKING_END from SSE — the SSEClient resolves its
      // `completed` promise on thinking_end instead. The HTTP flow dispatches
      // SET_THINKING(false) after ADD_MESSAGE.
      break;

    case "message_delta":
      dispatch({
        type: ACTIONS.MESSAGE_DELTA,
        payload: {
          delta: event.delta,
          accumulated_length: event.accumulated_length,
        },
      });
      break;

    case "message_final":
      // Final message arrives via HTTP response (source of truth).
      // SSE message_final is used only as a stream completion signal.
      break;

    case "app_error":
      dispatch({
        type: ACTIONS.APP_ERROR,
        payload: {
          error_type: event.error_type,
          error_message: event.error_message,
          details: event.details,
          recoverable: event.recoverable,
        },
      });
      break;

    // Handle stream timeout gracefully
    case "stream_timeout":
      console.warn("[Event] Stream timeout:", event.message);
      break;

    // Handle generic errors sent via SSE
    case "error":
      console.error("[Event] Stream error:", event.message);
      dispatch({
        type: ACTIONS.APP_ERROR,
        payload: {
          error_type: "stream_error",
          error_message: event.message || "Stream error occurred",
          recoverable: true,
        },
      });
      break;

    default:
      console.warn("[Event] Unknown event type:", event.event_type);
  }
}
