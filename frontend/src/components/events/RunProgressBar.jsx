/**
 * RunProgressBar Component
 * 
 * Shows simulation progress with stage name and percentage.
 */

import { Activity } from 'lucide-react';

export default function RunProgressBar({
  stage = 'Processing',
  percentage = 0,
  message = null,
  currentBlock = null,
  totalBlocks = null,
}) {
  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-medium text-purple-700">{stage}</span>
        </div>
        <span className="text-sm font-semibold text-purple-700">{percentage}%</span>
      </div>
      
      {/* Progress bar */}
      <div className="h-2 bg-purple-100 rounded-full overflow-hidden">
        <div 
          className="h-full bg-purple-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>
      
      {/* Additional info */}
      <div className="flex items-center justify-between mt-2">
        {/* Block progress */}
        {currentBlock && totalBlocks && (
          <span className="text-xs text-purple-600">
            Block {currentBlock} of {totalBlocks}
          </span>
        )}
        
        {/* Status message */}
        {message && (
          <span className="text-xs text-purple-600 truncate max-w-[200px]">
            {message}
          </span>
        )}
      </div>
    </div>
  );
}
