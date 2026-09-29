/**
 * useAutoScroll
 *
 * Smart auto-scroll for chat-style message lists.
 * - Follows the stream when the user is at (or near) the bottom.
 * - Stops following as soon as the user scrolls up.
 * - Shows a "scroll to latest" button while streaming and scrolled away.
 * - Snaps back to following when the user scrolls back to the bottom.
 */

import { useRef, useState, useEffect, useCallback } from "react";

const NEAR_BOTTOM_PX = 80; // px from bottom that counts as "at bottom"

export function useAutoScroll(deps = []) {
  const scrollRef = useRef(null); // attach to the overflow-y-auto container
  const bottomRef = useRef(null); // attach to a zero-height anchor at the end of content
  const userScrolledRef = useRef(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Detect intentional user scroll
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceFromBottom <= NEAR_BOTTOM_PX;
    userScrolledRef.current = !atBottom;
    // Only show button while streaming (caller passes isThinking in deps)
    setShowScrollButton(!atBottom);
  }, []);

  // Attach scroll listener to the container
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Auto-scroll when deps change, but only if user hasn't scrolled away
  useEffect(() => {
    if (!userScrolledRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const scrollToBottom = useCallback(() => {
    userScrolledRef.current = false;
    setShowScrollButton(false);
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Reset scroll state (e.g. on conversation switch) so stale
  // "scroll to latest" button doesn't carry over to a new/empty chat.
  const resetScroll = useCallback(() => {
    userScrolledRef.current = false;
    setShowScrollButton(false);
  }, []);

  return {
    scrollRef,
    bottomRef,
    showScrollButton,
    scrollToBottom,
    resetScroll,
  };
}
