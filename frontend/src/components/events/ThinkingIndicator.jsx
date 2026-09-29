/**
 * ThinkingIndicator Component
 *
 * Animated indicator shown when LLM is processing.
 * Compact design that fits naturally in the step flow.
 */

import { useState, useEffect } from 'react';

export default function ThinkingIndicator({ startTime = null }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime) return;

    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 100);

    return () => clearInterval(interval);
  }, [startTime]);

  const elapsedSeconds = (elapsed / 1000).toFixed(1);

  return (
    <div className="flex items-center gap-2.5 px-3 py-2 animate-step-in">
      {/* Pulsing dot */}
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-60"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
      </span>

      <span className="text-[13px] text-gray-400 font-medium">Thinking</span>

      {/* Animated dots */}
      <span className="flex gap-[3px] -ml-1">
        <span className="w-[3px] h-[3px] bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }} />
        <span className="w-[3px] h-[3px] bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '1s' }} />
        <span className="w-[3px] h-[3px] bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '1s' }} />
      </span>

      {/* Elapsed time — shown after 1s to avoid flash */}
      {startTime && elapsed > 1000 && (
        <span className="text-xs text-gray-300 tabular-nums ml-1">
          {elapsedSeconds}s
        </span>
      )}
    </div>
  );
}
