export const SESSION_EXPIRED_CARD_MESSAGE =
  "Session expired — the response window closed while you were away. Please re-run the design to continue.";

export const sessionExpiredErrorMessage = (stepId) =>
  `Session expired. Please re-run the design to continue from Step ${stepId ?? ""}.`;

/**
 * Returns true only if this entry is a genuine pipeline blocker on restore:
 * - ESCALATED always blocks — the pipeline pauses on every ESCALATE decision.
 * - WARNING only blocks if it is the last step that ran. If a later step
 *   exists, the warning was informational and the pipeline already moved past it.
 */
export function isBlockingEntry(entry, allEntries) {
  if (entry.state === "ESCALATED") return true;
  if (entry.state === "WARNING") {
    const hasLaterStep = allEntries.some((e) => e.step > entry.step);
    return !hasLaterStep;
  }
  return false;
}
