/**
 * Chat Context Provider
 *
 * Global state management for conversations and chat.
 * Provides conversation data and actions to all child components.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  getConversations,
  getContext,
  deleteConversation as apiDeleteConversation,
} from "../api/client";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useAuth } from "./AuthContext";

// Create the context
const ChatContext = createContext(null);

const ERR_NOT_FOUND = "Conversation not found";

/**
 * Chat Context Provider Component
 */
export function ChatProvider({ children }) {
  // Get username from auth context
  const { username } = useAuth();

  // Current conversation ID (persisted in localStorage)
  const [conversationId, setConversationId] = useLocalStorage(
    "currentConversationId",
    null,
  );

  // Conversation list
  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [conversationsError, setConversationsError] = useState(null);

  // Current conversation context (messages, state)
  const [currentContext, setCurrentContext] = useState(null);
  const [contextLoading, setContextLoading] = useState(false);

  // Track latest run_id from context (for "View Flowsheet" button)
  const [latestRunId, setLatestRunId] = useState(null);

  // Ref to track if context was loaded via loadConversation (skip useEffect fetch)
  const skipNextContextFetchRef = useRef(false);

  /**
   * Load conversation list from backend
   */
  const refreshConversations = useCallback(async () => {
    if (!username) return;
    setConversationsLoading(true);
    setConversationsError(null);

    try {
      const data = await getConversations(50, 0);
      setConversations(data.conversations || []);
    } catch (error) {
      console.error("Failed to load conversations:", error);
      setConversationsError(error.message);
    } finally {
      setConversationsLoading(false);
    }
  }, []);

  /**
   * Load context for a specific conversation
   */
  const loadConversationContext = useCallback(
    async (convId) => {
      if (!convId) {
        setCurrentContext(null);
        return;
      }

      setContextLoading(true);

      try {
        const context = await getContext(convId);
        setCurrentContext(context);
      } catch (error) {
        console.error("Failed to load conversation context:", error);
        // If conversation not found, clear it
        if (error.message === ERR_NOT_FOUND) {
          setConversationId(null);
        }
        setCurrentContext(null);
      } finally {
        setContextLoading(false);
      }
    },
    [setConversationId],
  );

  /**
   * Delete a conversation
   */
  const deleteConversation = useCallback(
    async (convId) => {
      try {
        await apiDeleteConversation(convId);

        // If deleting current conversation, clear it
        if (convId === conversationId) {
          setConversationId(null);
          setCurrentContext(null);
        }

        // Refresh list
        await refreshConversations();

        return true;
      } catch (error) {
        console.error("Failed to delete conversation:", error);
        return false;
      }
    },
    [conversationId, setConversationId, refreshConversations],
  );

  /**
   * Start a new conversation
   */
  const createNewConversation = useCallback(() => {
    setConversationId(null);
    setCurrentContext(null);
    setLatestRunId(null);
  }, [setConversationId]);

  /**
   * Update latest run ID (called after simulation completes)
   * Takes the first run_id from the array (most recent)
   */
  const updateLatestRunId = useCallback((runIds) => {
    if (runIds && runIds.length > 0) {
      setLatestRunId(runIds[0]);
    }
  }, []);

  /**
   * Append messages directly into currentContext without a backend re-fetch.
   * Used by ResultsPage after re-simulation to show the exchange instantly
   * before the new page's loadConversation() fires.
   */
  const appendMessagesToContext = useCallback((newMessages) => {
    setCurrentContext((prev) => {
      if (!prev) return prev;
      const existing = prev.messages || [];
      return {
        ...prev,
        messages: [...existing, ...newMessages],
      };
    });
  }, []);

  /**
   * Load a conversation by ID (used when navigating to ResultsPage)
   * This loads the conversation context and sets it as active
   * Skips the automatic useEffect fetch by using a ref flag
   */
  const loadConversation = useCallback(
    async (convId) => {
      if (!convId) return;

      try {
        const context = await getContext(convId);

        // Set context FIRST
        setCurrentContext(context);

        // Extract latest run_id
        const runIds = context?.run_ids || [];
        setLatestRunId(runIds.length > 0 ? runIds[0] : null);

        // Mark that we should skip the next useEffect fetch
        skipNextContextFetchRef.current = true;

        // Set as active conversation (triggers useEffect but it will skip)
        setConversationId(convId);
      } catch (error) {
        console.error("Failed to load conversation:", error);
        throw error; // Re-throw so ResultsPage can handle redirect
      }
    },
    [setConversationId],
  );

  /**
   * Switch to a different conversation.
   * Pass skipContextFetch=true when the conversation doesn't exist on the
   * backend yet (e.g. pre-generated ID for a new conversation).
   */
  const switchConversation = useCallback(
    (convId, { skipContextFetch = false } = {}) => {
      if (skipContextFetch) {
        skipNextContextFetchRef.current = true;
      }
      setConversationId(convId);
    },
    [setConversationId],
  );

  // On fresh login, clear any stale conversationId so the user
  // always lands on the welcome screen instead of a previous chat.
  const prevUsernameRef = useRef(undefined);
  // True until the very first null→truthy username transition is consumed.
  // That transition is always auth resolving on page reload, never a genuine
  // fresh login (which follows a deliberate logout → null).
  const isInitialAuthResolutionRef = useRef(true);
  // Stable refs so the effect below doesn't re-fire when callbacks change
  const refreshRef = useRef(refreshConversations);
  refreshRef.current = refreshConversations;
  const createNewRef = useRef(createNewConversation);
  createNewRef.current = createNewConversation;

  useEffect(() => {
    if (prevUsernameRef.current === undefined) {
      // First render — if username is already set (page reload while
      // still authenticated) we intentionally keep the persisted
      // conversationId so the user returns to where they left off.
      prevUsernameRef.current = username;
      if (username) {
        // Auth was already resolved on first render — no null→truthy transition
        // will follow, so the initial-auth flag can be consumed now.
        isInitialAuthResolutionRef.current = false;
        refreshRef.current();
      }
      return;
    }
    if (!prevUsernameRef.current && username) {
      if (isInitialAuthResolutionRef.current) {
        // First null→truthy after mount: auth resolved asynchronously on page
        // reload.  Keep the persisted conversationId so the user returns to
        // where they left off.  createNewConversation() is NOT called here.
        isInitialAuthResolutionRef.current = false;
      } else {
        // Subsequent null→truthy: genuine fresh login after an explicit logout.
        createNewRef.current();
      }
    }
    if (prevUsernameRef.current && !username) {
      // User logged out — reset the flag so the next login triggers a fresh
      // conversation as expected.
      isInitialAuthResolutionRef.current = true;
    }
    prevUsernameRef.current = username;
    if (username) refreshRef.current();
  }, [username]); // Only re-run when username changes

  // Load context when conversation changes (skip if loadConversation was just called)
  useEffect(() => {
    let isMounted = true;

    const loadContext = async () => {
      if (!conversationId) {
        setCurrentContext(null);
        return;
      }

      // Skip if loadConversation was just called (it already loaded the context)
      // OR if this is a brand-new pre-generated ID (conv_ prefix, not yet on backend)
      if (skipNextContextFetchRef.current) {
        skipNextContextFetchRef.current = false;
        return;
      }

      setContextLoading(true);

      try {
        const context = await getContext(conversationId);
        if (isMounted) {
          setCurrentContext(context);
          // Extract latest run_id (first in run_ids array)
          const runIds = context?.run_ids || [];
          setLatestRunId(runIds.length > 0 ? runIds[0] : null);
        }
      } catch (error) {
        console.error("Failed to load conversation context:", error);
        if (isMounted) {
          // If conversation not found, clear it
          if (error.message === ERR_NOT_FOUND) {
            setConversationId(null);
          }
          setCurrentContext(null);
          setLatestRunId(null);
        }
      } finally {
        if (isMounted) {
          setContextLoading(false);
        }
      }
    };

    loadContext();

    return () => {
      isMounted = false;
    };
  }, [conversationId]); // Only depend on conversationId

  // Context value
  const value = {
    // Current conversation
    conversationId,
    setConversationId: switchConversation,

    // Conversation list
    conversations,
    conversationsLoading,
    conversationsError,
    refreshConversations,

    // Current context
    currentContext,
    contextLoading,
    loadConversationContext,
    loadConversation,
    latestRunId,
    updateLatestRunId,
    appendMessagesToContext,

    // Auth
    username,

    // Actions
    deleteConversation,
    createNewConversation,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

/**
 * Hook to use chat context
 */
export function useChatContext() {
  const context = useContext(ChatContext);

  if (!context) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }

  return context;
}

export default ChatContext;
