/**
 * MessageList Component
 *
 * Pure content renderer — renders messages and live streaming state.
 * Scroll management is handled by the parent via useAutoScroll hook.
 * The parent passes a bottomRef which is rendered as a scroll anchor.
 */

import MessageBubble from './MessageBubble';
import WelcomeScreen from './WelcomeScreen';
import ThinkingIndicator from '../events/ThinkingIndicator';
import ToolExecutionCard from '../events/ToolExecutionCard';
import RunProgressBar from '../events/RunProgressBar';
import AgentTextBlock from '../events/AgentTextBlock';
import MarkdownRenderer from '../markdown/MarkdownRenderer';

export default function MessageList({
  messages = [],
  isThinking = false,
  thinkingStartTime = null,
  activeTool = null,
  runProgress = null,
  agentSteps = [],
  onSuggestionClick,
  streamingMessage = "",
  onRetry,
  onEditMessage,
  editingMessageIndex = null,
  reportPending = false,
  bottomRef,        // scroll anchor — provided by parent via useAutoScroll
}) {
  // Show welcome screen if no messages
  if (messages.length === 0 && !isThinking) {
    return <WelcomeScreen onSuggestionClick={onSuggestionClick} />;
  }

  // Find the index of the last assistant/user messages (for retry button)
  const lastAssistantIndex = messages.reduce(
    (acc, msg, i) => (msg.role === 'assistant' ? i : acc),
    -1
  );
  const lastUserIndex = messages.reduce(
    (acc, msg, i) => (msg.role === 'user' ? i : acc),
    -1
  );

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <div className="max-w-2xl mx-auto">
        {/* Render all messages with their inline tool executions */}
        {messages.map((message, index) => (
          <div key={index}>
            {/* User message */}
            {message.role === 'user' && (
              <MessageBubble
                message={message}
                onRetry={onRetry}
                onEdit={onEditMessage}
                messageIndex={index}
                isLastUser={index === lastUserIndex}
                isProcessing={isThinking}
                editingMessageIndex={editingMessageIndex}
              />
            )}

            {/* Assistant message — interleaved steps or fallback tool cards */}
            {message.role === 'assistant' && (
              <div>
                {message.agentSteps?.length > 0 ? (
                  /* New: interleaved steps display */
                  <div className="space-y-1.5 mb-3">
                    {message.agentSteps.map((step, i) => {
                      if (step.type === 'text' && !step.isFinal)
                        return <AgentTextBlock key={i} content={step.content} />;
                      if (step.type === 'tool')
                        return (
                          <ToolExecutionCard
                            key={i}
                            toolName={step.toolName || step.tool_name || step.name}
                            status={step.status}
                            duration={step.durationMs || step.duration_ms || step.duration}
                            summary={step.summary}
                            error={step.error}
                            arguments={step.arguments || step.args}
                            result={step.result}
                          />
                        );
                      return null;
                    })}
                  </div>
                ) : message.toolExecutions?.length > 0 ? (
                  /* Fallback: flat tool cards for old conversations */
                  <div className="space-y-1.5 mb-3">
                    {message.toolExecutions.map((tool, i) => (
                      <ToolExecutionCard
                        key={i}
                        toolName={tool.tool_name || tool.name}
                        status={tool.status}
                        duration={tool.duration_ms || tool.duration}
                        summary={tool.summary}
                        error={tool.error}
                        arguments={tool.arguments}
                        result={tool.result}
                      />
                    ))}
                  </div>
                ) : null}
                <MessageBubble
                  message={message}
                  onRetry={onRetry}
                  isLastAssistant={index === lastAssistantIndex}
                />
              </div>
            )}
          </div>
        ))}

        {/* Live processing — ordered step-by-step display */}
        {isThinking && agentSteps.length > 0 && (
          <div className="space-y-1.5 mt-1">
            {agentSteps.map((step, index) => {
              if (step.type === 'text')
                return <AgentTextBlock key={index} content={step.content} />;
              if (step.type === 'tool_running')
                return (
                  <ToolExecutionCard
                    key={index}
                    toolName={step.name}
                    status="running"
                    arguments={step.args}
                    estimatedDuration={step.estimatedDuration}
                  />
                );
              if (step.type === 'tool')
                return (
                  <ToolExecutionCard
                    key={index}
                    toolName={step.name}
                    status={step.status}
                    duration={step.duration}
                    summary={step.summary}
                    error={step.error}
                    arguments={step.args}
                    result={step.result}
                  />
                );
              return null;
            })}

            {/* Run progress bar inside steps */}
            {runProgress && (
              <RunProgressBar
                stage={runProgress.stage}
                percentage={runProgress.percentage}
                message={runProgress.message}
                currentBlock={runProgress.currentBlock}
                totalBlocks={runProgress.totalBlocks}
              />
            )}

            {/* Streaming assistant response (arrives via SSE message_delta) */}
            {streamingMessage && (
              <div className="mb-6 w-full">
                <div className="prose prose-sm max-w-none dark:prose-invert" style={{ lineHeight: '1.7' }}>
                  <MarkdownRenderer content={streamingMessage} />
                  <span
                    className="inline-block w-0.5 h-4 ml-0.5 animate-pulse align-text-bottom"
                    style={{ backgroundColor: 'var(--color-text-muted)', borderRadius: '1px' }}
                  />
                </div>
              </div>
            )}

            {/* Inline thinking indicator between iterations */}
            {!activeTool && !runProgress && !streamingMessage && (
              <ThinkingIndicator startTime={thinkingStartTime} />
            )}
          </div>
        )}

        {/* Initial thinking indicator (no steps yet) */}
        {isThinking && agentSteps.length === 0 && !streamingMessage && (
          <div className="mt-1">
            <ThinkingIndicator startTime={thinkingStartTime} />
          </div>
        )}

        {/* Streaming response when no agent steps are present (simple Q&A, no tools) */}
        {isThinking && agentSteps.length === 0 && streamingMessage && (
          <div className="mb-4 w-full mt-1">
            <div className="w-full">
              <div className="bg-surface px-6 py-4">
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <MarkdownRenderer content={streamingMessage} />
                </div>
                <span className="inline-block w-1.5 h-4 ml-0.5 bg-blue-500 animate-pulse rounded-sm align-text-bottom" />
              </div>
            </div>
          </div>
        )}

        {/* Design report pending indicator — shown while backend generates LLM report */}
        {reportPending && !isThinking && !messages.some(
          (m) => m.role === 'assistant' && (m.metadata?.type === 'design_report' || m.content?.startsWith('### Design Complete'))
        ) && (
          <div className="mt-2 mb-4 flex items-center gap-2 px-2 py-1.5 text-xs"
            style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: 'var(--color-accent, #3b82f6)' }} />
            Generating design report…
          </div>
        )}

        {/* Scroll anchor — controlled by parent via useAutoScroll */}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
