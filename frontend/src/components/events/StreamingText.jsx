/**
 * StreamingText Component
 * 
 * Displays text as it streams in with a typing cursor effect.
 * Uses a buffer to create a smooth, natural typing animation.
 * Renders markdown properly like the final message bubble.
 */

import { useState, useEffect, useRef } from 'react';
import MarkdownRenderer from '../markdown/MarkdownRenderer';

// Characters to display per interval (higher = faster)
const CHARS_PER_TICK = 3;
// Interval in milliseconds (lower = faster)
const TICK_INTERVAL = 30;

export default function StreamingText({ text = '' }) {
  const [displayedText, setDisplayedText] = useState('');
  const displayedLengthRef = useRef(0);
  const intervalRef = useRef(null);
  
  useEffect(() => {
    // If text is longer than what we've displayed, animate the new characters
    if (text.length > displayedLengthRef.current) {
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      // Animate characters incrementally
      intervalRef.current = setInterval(() => {
        setDisplayedText(prev => {
          const currentLength = prev.length;
          
          // If we've caught up to the full text, stop
          if (currentLength >= text.length) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            displayedLengthRef.current = text.length;
            return text;
          }
          
          // Add next batch of characters
          const nextLength = Math.min(currentLength + CHARS_PER_TICK, text.length);
          displayedLengthRef.current = nextLength;
          return text.slice(0, nextLength);
        });
      }, TICK_INTERVAL);
    }
    
    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [text]);
  
  // Reset when text is cleared (new message)
  useEffect(() => {
    if (text === '') {
      setDisplayedText('');
      displayedLengthRef.current = 0;
    }
  }, [text]);
  
  if (!displayedText && !text) return null;
  
  return (
    <div className="mb-4 w-full">
      <div className="w-full">
        <div className="bg-white px-6 py-4 relative">
          {/* Markdown content with typing cursor */}
          <div className="prose prose-sm max-w-none">
            <MarkdownRenderer content={displayedText} />
            {/* Typing cursor - inline blinking cursor */}
            <span className="inline-block w-0.5 h-5 bg-blue-500 ml-1 animate-pulse align-middle" />
          </div>
        </div>
      </div>
    </div>
  );
}
