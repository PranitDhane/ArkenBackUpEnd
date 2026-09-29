/**
 * ToolExecutionCard Component
 *
 * Compact, Claude Code-inspired tool execution display.
 * Collapsed: single clean row with icon, name, status, duration.
 * Expanded: shows arguments and results.
 */

import { useState } from 'react';
import { ChevronDown, Check, X, Loader2, Zap } from 'lucide-react';
import { formatDuration } from '../../utils/formatters';

export default function ToolExecutionCard({
  toolName,
  status = 'running',
  duration = null,
  summary = null,
  error = null,
  arguments: args = null,
  result = null,
  estimatedDuration = null,
}) {
  const [expanded, setExpanded] = useState(false);

  // Format tool name for display
  const displayName = toolName
    ? toolName.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
    : 'Unknown Tool';

  const isRunning = status === 'running';
  const isError = status === 'error';
  const hasExpandableContent = !isRunning && (args || result || summary || error);

  return (
    <div className="animate-step-in">
      {/* Compact header row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`
          w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left
          transition-all duration-150 group
          ${isRunning
            ? 'bg-gray-50 border border-gray-200'
            : isError
              ? 'bg-red-50/60 border border-red-200/80 hover:bg-red-50'
              : 'bg-gray-50/80 border border-gray-200/80 hover:bg-gray-100/80'
          }
        `}
      >
        {/* Status icon */}
        <span className="flex-shrink-0">
          {isRunning ? (
            <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
          ) : isError ? (
            <X className="w-3.5 h-3.5 text-red-500" />
          ) : (
            <Check className="w-3.5 h-3.5 text-emerald-500" />
          )}
        </span>

        {/* Tool name */}
        <span className={`
          text-[13px] font-medium truncate
          ${isRunning ? 'text-gray-600' : isError ? 'text-red-700' : 'text-gray-700'}
        `}>
          {displayName}
        </span>

        {/* Duration / Running indicator */}
        <span className="flex items-center gap-1 ml-auto flex-shrink-0">
          {isRunning ? (
            <span className="text-xs text-gray-400">
              {estimatedDuration ? `~${formatDuration(estimatedDuration)}` : 'Running'}
            </span>
          ) : duration != null ? (
            <span className="text-xs text-gray-400 tabular-nums">
              {formatDuration(duration)}
            </span>
          ) : null}

          {/* Expand chevron */}
          <ChevronDown className={`
            w-3.5 h-3.5 text-gray-400 transition-transform duration-200
            ${expanded ? 'rotate-180' : ''}
            ${hasExpandableContent ? 'opacity-60' : 'opacity-0'}
          `} />
        </span>
      </button>

      {/* Expandable detail panel */}
      {expanded && !isRunning && (
        <div className="mt-1 ml-6 mr-1 animate-fade-in">
          {/* Arguments — object */}
          {args && typeof args === 'object' && Object.keys(args).length > 0 && (
            <div className="mb-2">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">
                Input
              </p>
              <pre className="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-md p-2 overflow-x-auto leading-relaxed">
                {JSON.stringify(args, null, 2)}
              </pre>
            </div>
          )}

          {/* Arguments — string fallback */}
          {args && typeof args === 'string' && (
            <div className="mb-2">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">
                Input
              </p>
              <pre className="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-md p-2 overflow-x-auto leading-relaxed">
                {args}
              </pre>
            </div>
          )}

          {/* Result — object */}
          {result && typeof result === 'object' && Object.keys(result).length > 0 && (
            <div className="mb-2">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">
                Output
              </p>
              <pre className="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-md p-2 overflow-x-auto max-h-60 overflow-y-auto leading-relaxed">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          {/* Result — string fallback */}
          {result && typeof result === 'string' && (
            <div className="mb-2">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">
                Output
              </p>
              <pre className="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-md p-2 overflow-x-auto max-h-60 overflow-y-auto leading-relaxed">
                {result}
              </pre>
            </div>
          )}

          {/* Summary fallback */}
          {!result && summary && (
            <p className="text-xs text-gray-500 mb-2">{summary}</p>
          )}

          {/* Error */}
          {error && (
            <div className="mb-2">
              <p className="text-[11px] font-medium text-red-400 uppercase tracking-wider mb-1">
                Error
              </p>
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md p-2">
                {error}
              </p>
            </div>
          )}

          {/* Empty state */}
          {!args && !result && !summary && !error && (
            <p className="text-xs text-gray-400 italic mb-2">No details available</p>
          )}
        </div>
      )}
    </div>
  );
}
