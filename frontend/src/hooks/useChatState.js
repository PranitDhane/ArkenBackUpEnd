/**
 * Chat State Management Hook
 *
 * Manages all chat UI state including messages, thinking status,
 * active tool executions, and streaming text.
 */

import { useReducer } from "react";

// Initial state
const initialState = {
  messages: [], // Array of message objects
  isThinking: false, // Is LLM currently thinking?
  thinkingStartTime: null, // When thinking started (for duration)
  activeTool: null, // Currently executing tool { name, args, startTime }
  toolExecutions: [], // Completed tool executions
  runProgress: null, // Current simulation progress { stage, percentage, etc }
  agentSteps: [], // Ordered list of { type: "text"|"tool"|"tool_running", ... }
  error: null, // Current error message
  streamingMessage: "", // Accumulates message_delta chunks for live typing effect
  editingMessageIndex: null, // Index of message currently being edited/processed
};

// Action types
export const ACTIONS = {
  THINKING_START: "THINKING_START",
  THINKING_END: "THINKING_END",
  TOOL_START: "TOOL_START",
  TOOL_END: "TOOL_END",
  RUN_PROGRESS: "RUN_PROGRESS",
  APP_ERROR: "APP_ERROR",
  ADD_MESSAGE: "ADD_MESSAGE",
  ADD_USER_MESSAGE: "ADD_USER_MESSAGE",
  LOAD_MESSAGES: "LOAD_MESSAGES",
  RESET: "RESET",
  RESET_RESPONSE: "RESET_RESPONSE",
  SET_THINKING: "SET_THINKING",
  SET_ERROR: "SET_ERROR",
  CLEAR_ERROR: "CLEAR_ERROR",
  CANCEL_REQUEST: "CANCEL_REQUEST",
  AGENT_TEXT: "AGENT_TEXT",
  MESSAGE_DELTA: "MESSAGE_DELTA",
  POP_LAST_ASSISTANT: "POP_LAST_ASSISTANT",
  TRIM_AFTER_LAST_USER: "TRIM_AFTER_LAST_USER",
  EDIT_USER_MESSAGE: "EDIT_USER_MESSAGE",
  SET_EDITING_MESSAGE_INDEX: "SET_EDITING_MESSAGE_INDEX",
};

// Reducer function
function chatReducer(state, action) {
  switch (action.type) {
    case ACTIONS.THINKING_START:
      return {
        ...state,
        isThinking: true,
        thinkingStartTime: Date.now(),
        error: null,
      };

    case ACTIONS.THINKING_END:
      return {
        ...state,
        isThinking: false,
        thinkingStartTime: null,
        activeTool: null, // Safety: clear orphan spinner if tool_end was missed
      };

    case ACTIONS.TOOL_START:
      return {
        ...state,
        activeTool: {
          name: action.payload.tool_name,
          args: action.payload.arguments,
          startTime: Date.now(),
          estimatedDuration: action.payload.estimated_duration_ms,
        },
        agentSteps: [
          ...state.agentSteps,
          {
            type: "tool_running",
            name: action.payload.tool_name,
            args: action.payload.arguments,
            estimatedDuration: action.payload.estimated_duration_ms,
          },
        ],
      };

    case ACTIONS.TOOL_END: {
      // Find last tool_running step in agentSteps and upgrade to completed tool
      const updatedAgentSteps = [...state.agentSteps];
      for (let i = updatedAgentSteps.length - 1; i >= 0; i--) {
        if (updatedAgentSteps[i].type === "tool_running") {
          updatedAgentSteps[i] = {
            type: "tool",
            name: action.payload.tool_name,
            status: action.payload.status,
            duration: action.payload.duration_ms,
            summary: action.payload.summary,
            error: action.payload.error_message,
            args: state.activeTool?.args || null,
            result: action.payload.result || null,
          };
          break;
        }
      }
      return {
        ...state,
        activeTool: null,
        toolExecutions: [
          ...state.toolExecutions,
          {
            name: action.payload.tool_name,
            status: action.payload.status,
            duration: action.payload.duration_ms,
            summary: action.payload.summary,
            error: action.payload.error_message,
            args: state.activeTool?.args || null,
            result: action.payload.result || null,
            timestamp: Date.now(),
          },
        ],
        agentSteps: updatedAgentSteps,
      };
    }

    case ACTIONS.RUN_PROGRESS:
      return {
        ...state,
        runProgress: {
          stage: action.payload.stage,
          percentage: action.payload.percentage,
          message: action.payload.message,
          currentBlock: action.payload.current_block,
          totalBlocks: action.payload.total_blocks,
        },
      };

    case ACTIONS.AGENT_TEXT:
      return {
        ...state,
        agentSteps: [
          ...state.agentSteps,
          {
            type: "text",
            content: action.payload.content,
            iteration: action.payload.iteration,
          },
        ],
      };

    case ACTIONS.MESSAGE_DELTA:
      return {
        ...state,
        streamingMessage: state.streamingMessage + (action.payload.delta || ""),
      };

    case ACTIONS.APP_ERROR:
      return {
        ...state,
        error: {
          type: action.payload.error_type,
          message: action.payload.error_message,
          details: action.payload.details,
          recoverable: action.payload.recoverable,
        },
        isThinking: false,
        activeTool: null,
      };

    case ACTIONS.ADD_MESSAGE: {
      const incomingToolExecs = action.payload.tool_executions || [];
      // Build a lookup from the live SSE tool executions so we can merge
      // fields that the HTTP response doesn't carry (e.g. arguments).
      const sseByIndex = state.toolExecutions; // array in execution order

      let toolExecsForMessage;
      if (incomingToolExecs.length > 0) {
        // HTTP response has tool_executions — use them as base but enrich
        // with any extra fields from the SSE-captured data.
        toolExecsForMessage = incomingToolExecs.map((t, i) => {
          const sseTool = sseByIndex[i]; // match by position
          return {
            tool_name: t.tool_name || t.name,
            status: t.status,
            duration_ms: t.duration_ms || t.duration,
            summary:
              t.summary ||
              t.result_summary ||
              (sseTool ? sseTool.summary : undefined),
            error: t.error,
            // Merge arguments from SSE if the HTTP response didn't include them
            arguments: t.arguments || (sseTool ? sseTool.args : undefined),
            // Full tool result: prefer HTTP (authoritative), fallback to SSE
            result: t.result || (sseTool ? sseTool.result : undefined),
          };
        });
      } else {
        // No HTTP tool_executions — adopt the live SSE cards entirely.
        toolExecsForMessage = sseByIndex.map((t) => ({
          tool_name: t.name,
          status: t.status,
          duration_ms: t.duration,
          summary: t.summary,
          error: t.error,
          arguments: t.args,
          result: t.result || undefined,
        }));
      }

      // Enrich agentSteps tool entries with authoritative HTTP data
      let enrichedSteps = [...state.agentSteps];
      if (incomingToolExecs.length > 0) {
        let toolIndex = 0;
        enrichedSteps = enrichedSteps.map((step) => {
          if (
            (step.type === "tool" || step.type === "tool_running") &&
            incomingToolExecs[toolIndex]
          ) {
            const httpTool = incomingToolExecs[toolIndex];
            toolIndex++;
            return {
              ...step,
              type: "tool",
              result: httpTool.result,
              summary: httpTool.summary || httpTool.result_summary,
              args: httpTool.arguments || step.args,
            };
          }
          // If positional match exhausted, try name-based fallback
          if (
            (step.type === "tool" || step.type === "tool_running") &&
            toolIndex >= incomingToolExecs.length
          ) {
            const byName = incomingToolExecs.find(
              (t) => (t.tool_name || t.name) === step.name,
            );
            if (byName) {
              return {
                ...step,
                type: "tool",
                result: byName.result,
                summary: byName.summary || byName.result_summary,
                args: byName.arguments || step.args,
              };
            }
          }
          return step;
        });
      }
      // Append final response text as the last step
      if (action.payload.role === "assistant" && action.payload.content) {
        enrichedSteps.push({
          type: "text",
          content: action.payload.content,
          isFinal: true,
        });
      }

      return {
        ...state,
        messages: [
          ...state.messages,
          {
            role: action.payload.role,
            content: action.payload.content,
            timestamp: action.payload.timestamp || new Date().toISOString(),
            metadata: action.payload.metadata,
            run_ids: action.payload.run_ids,
            // Preserve status (error, cancelled, etc.)
            status: action.payload.status,
            cancelled:
              action.payload.cancelled || action.payload.status === "cancelled",
            // Image attachments (user messages)
            attachments: action.payload.attachments,
            // Normalised array used by MessageList for inline rendering
            toolExecutions: toolExecsForMessage,
            // Ordered interleaved steps (text + tools)
            agentSteps: enrichedSteps.length > 1 ? enrichedSteps : undefined,
          },
        ],
        // Clear the global live lists — ownership moves to the message
        toolExecutions: [],
        agentSteps: [],
        error: null,
      };
    }

    case ACTIONS.ADD_USER_MESSAGE:
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            role: "user",
            content: action.payload.message,
            timestamp: new Date().toISOString(),
          },
        ],
        error: null,
      };

    case ACTIONS.LOAD_MESSAGES:
      // Step 4.2: Load historical messages with proper formatting
      // Convert backend message format to frontend format
      const loadedMessages = action.payload.messages.map((msg) => {
        const toolExecs =
          msg.toolExecutions ||
          msg.tool_executions ||
          msg.metadata?.tool_executions ||
          [];
        let mappedAgentSteps = (msg.metadata?.agent_steps || []).map((step) =>
          step.type === "tool"
            ? {
                ...step,
                toolName: step.tool_name,
                durationMs: step.duration_ms,
                isFinal: step.is_final,
              }
            : { ...step, isFinal: step.is_final },
        );
        // Backfill missing arguments/result from toolExecutions (old data compat)
        if (mappedAgentSteps.length > 0 && toolExecs.length > 0) {
          let toolIdx = 0;
          mappedAgentSteps = mappedAgentSteps.map((step) => {
            if (step.type === "tool" && toolExecs[toolIdx]) {
              const te = toolExecs[toolIdx];
              toolIdx++;
              return {
                ...step,
                arguments: step.arguments || te.arguments,
                args: step.args || te.arguments,
                result: step.result || te.result,
                summary: step.summary || te.summary || te.result_summary,
              };
            }
            return step;
          });
        }
        return {
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp || new Date().toISOString(),
          metadata: msg.metadata,
          // Preserve cancelled / status flags from DB
          status: msg.status,
          cancelled: msg.status === "cancelled" || msg.cancelled || false,
          // Carry forward image attachment metadata for display in MessageBubble
          attachments:
            msg.attachments || msg.metadata?.attachments || undefined,
          toolExecutions: toolExecs,
          agentSteps: mappedAgentSteps,
        };
      });

      return {
        ...state,
        messages: loadedMessages,
        // Clear state when loading historical messages
        isThinking: false,
        activeTool: null,
        toolExecutions: [],
        agentSteps: [],
        runProgress: null,
      };

    case ACTIONS.RESET:
      return {
        ...initialState,
      };

    case ACTIONS.RESET_RESPONSE:
      return {
        ...state,
        activeTool: null,
        toolExecutions: [], // Clear tool executions when starting new response
        agentSteps: [],
        runProgress: null,
        error: null,
        streamingMessage: "", // Clear streaming text for new response
      };

    case ACTIONS.SET_THINKING:
      return {
        ...state,
        isThinking: action.payload,
        thinkingStartTime: action.payload ? Date.now() : null,
        // Only clear activeTool and runProgress when thinking stops.
        // toolExecutions is intentionally kept alive so ADD_MESSAGE can adopt
        // the live SSE cards onto the message before clearing them.
        activeTool: action.payload ? state.activeTool : null,
        runProgress: action.payload ? state.runProgress : null,
        // Safety net: clear agentSteps when thinking stops in case ADD_MESSAGE
        // didn't fire (error path). Normal flow: ADD_MESSAGE clears first.
        agentSteps: action.payload ? state.agentSteps : [],
        // Clear streaming text when thinking stops — the full message is in
        // ADD_MESSAGE by now.
        streamingMessage: action.payload ? state.streamingMessage : "",
      };

    case ACTIONS.SET_ERROR:
      return {
        ...state,
        error: {
          type: "client_error",
          message: action.payload,
          recoverable: true,
        },
        isThinking: false,
      };

    case ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    case ACTIONS.SET_EDITING_MESSAGE_INDEX:
      return {
        ...state,
        editingMessageIndex: action.payload,
      };

    case ACTIONS.CANCEL_REQUEST: {
      // If there's a partial streamed response, save it as a real message
      // so the user sees what was generated before they clicked Stop.
      // Include any tool executions and agent steps that occurred before cancel.
      const partial = state.streamingMessage;
      const cancelledToolExecs = state.toolExecutions.map((t) => ({
        tool_name: t.name,
        status: t.status,
        duration_ms: t.duration,
        summary: t.summary,
        error: t.error,
        arguments: t.args,
        result: t.result || undefined,
      }));
      // Upgrade any still-running tool steps to "cancelled"
      const cancelledSteps = state.agentSteps.map((step) =>
        step.type === "tool_running"
          ? { ...step, type: "tool", status: "cancelled" }
          : step,
      );
      // Append the partial text as the final step if present
      if (partial) {
        cancelledSteps.push({
          type: "text",
          content: partial,
          isFinal: true,
        });
      }
      const messagesAfterCancel =
        partial || cancelledToolExecs.length > 0
          ? [
              ...state.messages,
              {
                role: "assistant",
                content: partial || "",
                timestamp: new Date().toISOString(),
                cancelled: true,
                toolExecutions:
                  cancelledToolExecs.length > 0
                    ? cancelledToolExecs
                    : undefined,
                agentSteps:
                  cancelledSteps.length > 1 ? cancelledSteps : undefined,
              },
            ]
          : state.messages;
      return {
        ...state,
        messages: messagesAfterCancel,
        streamingMessage: "",
        isThinking: false,
        activeTool: null,
        toolExecutions: [],
        agentSteps: [],
        runProgress: null,
      };
    }

    case ACTIONS.POP_LAST_ASSISTANT: {
      // Remove the last message if it's an assistant message.
      // Does NOT touch isThinking — safe to call mid-retry.
      const msgs = [...state.messages];
      if (msgs.length > 0 && msgs[msgs.length - 1].role === "assistant") {
        msgs.pop();
      }
      return {
        ...state,
        messages: msgs,
        streamingMessage: "",
      };
    }

    case ACTIONS.TRIM_AFTER_LAST_USER: {
      // Keep all messages up to and including the last user message.
      // Removes every assistant message that followed it (design response + report).
      // Does NOT touch isThinking — safe to call mid-retry.
      let lastUserIdx = -1;
      for (let i = state.messages.length - 1; i >= 0; i--) {
        if (state.messages[i].role === "user") {
          lastUserIdx = i;
          break;
        }
      }
      if (lastUserIdx === -1) return { ...state, streamingMessage: "" };
      return {
        ...state,
        messages: state.messages.slice(0, lastUserIdx + 1),
        streamingMessage: "",
      };
    }

    case ACTIONS.EDIT_USER_MESSAGE: {
      // Truncate messages from the edited index onward, then append
      // the new user message with the edited content.
      const editIndex = action.payload.messageIndex;
      const truncated = state.messages.slice(0, editIndex);
      truncated.push({
        role: "user",
        content: action.payload.newContent,
        timestamp: new Date().toISOString(),
        ...(action.payload.attachments
          ? { attachments: action.payload.attachments }
          : {}),
      });
      return {
        ...state,
        messages: truncated,
        toolExecutions: [],
        agentSteps: [],
        streamingMessage: "",
        error: null,
      };
    }

    default:
      return state;
  }
}

/**
 * Hook to manage chat state
 * @returns {[state, dispatch]} State and dispatch function
 */
export function useChatState() {
  return useReducer(chatReducer, initialState);
}
