/**
 * LocalStorage Hook
 *
 * Provides persistent state management using browser localStorage.
 */

import { useState, useEffect } from "react";

/**
 * Hook to sync state with localStorage
 * @param {string} key - localStorage key
 * @param {*} initialValue - Default value if key doesn't exist
 * @returns {[value, setValue]} Stateful value and setter function
 */
export function useLocalStorage(key, initialValue) {
  // Get initial value from localStorage or use default
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Update localStorage when value changes
  const setValue = (value) => {
    try {
      // Allow value to be a function for same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;

      setStoredValue(valueToStore);

      // Save to localStorage
      if (valueToStore === null || valueToStore === undefined) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}

/**
 * Hook to manage current conversation ID in localStorage
 * @returns {[conversationId, setConversationId, clearConversationId]}
 */
export function useCurrentConversation() {
  const [conversationId, setConversationId] = useLocalStorage(
    "currentConversationId",
    null
  );

  const clearConversationId = () => {
    setConversationId(null);
  };

  return [conversationId, setConversationId, clearConversationId];
}
