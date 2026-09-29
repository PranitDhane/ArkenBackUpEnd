/**
 * API Utility with Retry Logic
 *
 * Handles API calls with automatic retry on failure.
 * Implements exponential backoff for better recovery from transient errors.
 */

import toast from "react-hot-toast";

/**
 * Fetch with retry logic
 *
 * @param {string} url - API endpoint
 * @param {object} options - Fetch options
 * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
 * @param {number} baseDelay - Base delay in milliseconds for exponential backoff (default: 1000)
 * @param {boolean} showToasts - Whether to show toast notifications (default: true)
 * @returns {Promise} - Fetch response
 */
export async function fetchWithRetry(
  url,
  options = {},
  maxRetries = 3,
  baseDelay = 1000,
  showToasts = true
) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Success - clear any error toasts
      if (attempt > 0 && showToasts) {
        toast.success("Connection restored");
      }

      return response;
    } catch (error) {
      lastError = error;

      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        if (showToasts) {
          toast.error(`Failed to load data: ${error.message}`);
        }
        throw error;
      }

      // Calculate delay with exponential backoff: 1s, 2s, 4s, 8s...
      const delay = baseDelay * Math.pow(2, attempt);

      // Show retry notification
      if (showToasts) {
        toast.loading(
          `Connection failed. Retrying... (attempt ${
            attempt + 1
          }/${maxRetries})`,
          {
            id: "retry-toast",
            duration: delay,
          }
        );
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Clear the retry toast before next attempt
      if (showToasts) {
        toast.dismiss("retry-toast");
      }
    }
  }

  throw lastError;
}

/**
 * Fetch JSON with retry
 * Convenience wrapper for JSON responses
 */
export async function fetchJSON(url, options = {}, maxRetries = 3) {
  const response = await fetchWithRetry(url, options, maxRetries);
  return response.json();
}

/**
 * Manual retry wrapper for user-triggered actions
 * Used when automatic retry fails and user clicks "Retry" button
 */
export function createRetryHandler(fetchFunction, onSuccess, onError) {
  return async () => {
    const loadingToast = toast.loading("Retrying...");

    try {
      const data = await fetchFunction();
      toast.success("Data loaded successfully", { id: loadingToast });
      onSuccess(data);
    } catch (error) {
      toast.error("Still unable to load data", { id: loadingToast });
      onError(error);
    }
  };
}
