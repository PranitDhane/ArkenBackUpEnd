/**
 * AgentTextBlock Component
 *
 * Displays intermediate LLM reasoning text between tool calls.
 * Styled with a subtle left accent border for visual distinction
 * from the final response bubble.
 */

import MarkdownRenderer from '../markdown/MarkdownRenderer';

export default function AgentTextBlock({ content }) {
  return (
    <div className="animate-step-in pl-3.5 border-l-2 border-blue-300/60 py-0.5 my-1">
      <div className="text-[13px] leading-relaxed text-gray-600">
        <MarkdownRenderer content={content} />
      </div>
    </div>
  );
}
