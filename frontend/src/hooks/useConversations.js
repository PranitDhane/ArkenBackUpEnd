/**
 * Conversations Management Hook
 *
 * Manages loading and refreshing conversation list.
 */

import { useState, useEffect, useCallback } from "react";
import { getConversations } from "../api/client";

/**
 * Hook to manage conversations list
 * @param {boolean} autoLoad - Whether to load automatically on mount
 * @returns {Object} { conversations, total, loading, error, refresh }
 */
export function useConversations(autoLoad = true) {
  const [conversations, setConversations] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadConversations = useCallback(async (limit = 50, offset = 0) => {
    setLoading(true);
    setError(null);

    try {
      const data = await getConversations(limit, offset);
      setConversations(data.conversations || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Failed to load conversations:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      loadConversations();
    }
  }, [autoLoad, loadConversations]);

  return {
    conversations,
    total,
    loading,
    error,
    refresh: loadConversations,
  };
}
