/**
 * Utility Functions for Formatting
 *
 * Time, dates, numbers, etc.
 */

import { format, formatDistanceToNow } from "date-fns";

/**
 * Format timestamp to readable time
 * @param {string|Date} timestamp - ISO timestamp or Date object
 * @returns {string} Formatted time (e.g., "2:30 PM")
 */
export function formatTime(timestamp) {
  try {
    const date =
      typeof timestamp === "string" ? new Date(timestamp) : timestamp;
    return format(date, "h:mm a");
  } catch (error) {
    return "";
  }
}

/**
 * Format timestamp to readable date
 * @param {string|Date} timestamp - ISO timestamp or Date object
 * @returns {string} Formatted date (e.g., "Jan 9, 2026")
 */
export function formatDate(timestamp) {
  try {
    const date =
      typeof timestamp === "string" ? new Date(timestamp) : timestamp;
    return format(date, "MMM d, yyyy");
  } catch (error) {
    return "";
  }
}

/**
 * Format timestamp to relative time
 * @param {string|Date} timestamp - ISO timestamp or Date object
 * @returns {string} Relative time (e.g., "2 minutes ago")
 */
export function formatRelativeTime(timestamp) {
  try {
    const date =
      typeof timestamp === "string" ? new Date(timestamp) : timestamp;
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    return "";
  }
}

/**
 * Format duration in milliseconds to readable format
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration (e.g., "1.2s", "450ms")
 */
export function formatDuration(ms) {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Format large numbers with commas
 * @param {number} num - Number to format
 * @returns {string} Formatted number (e.g., "1,234,567")
 */
export function formatNumber(num) {
  return num.toLocaleString();
}

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text with ellipsis
 */
export function truncate(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

/**
 * Get status color class for tool execution
 * @param {string} status - Tool status (success, error, running)
 * @returns {string} Tailwind color class
 */
export function getStatusColor(status) {
  switch (status) {
    case "success":
      return "text-green-600 bg-green-50 border-green-200";
    case "error":
      return "text-red-600 bg-red-50 border-red-200";
    case "running":
      return "text-blue-600 bg-blue-50 border-blue-200";
    default:
      return "text-gray-600 bg-gray-50 border-gray-200";
  }
}
