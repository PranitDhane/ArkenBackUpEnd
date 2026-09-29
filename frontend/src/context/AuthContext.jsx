/**
 * Auth Context Provider
 *
 * Manages authentication state using sessionStorage.
 * Provides login/logout functionality and auth state to all child components.
 *
 * Storage: sessionStorage (clears on browser close)
 * Keys: auth_username, auth_isAuthenticated
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { loginUser } from "../api/client";

const AuthContext = createContext(null);

const STORAGE_KEYS = {
  USERNAME: "auth_username",
  IS_AUTHENTICATED: "auth_isAuthenticated",
};

/**
 * Auth Context Provider Component
 */
export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Check sessionStorage for existing auth on mount
   */
  const checkAuth = useCallback(() => {
    try {
      const storedAuth = sessionStorage.getItem(STORAGE_KEYS.IS_AUTHENTICATED);
      const storedUsername = sessionStorage.getItem(STORAGE_KEYS.USERNAME);

      if (storedAuth === "true" && storedUsername) {
        setIsAuthenticated(true);
        setUsername(storedUsername);
      }
    } catch (error) {
      console.error("Failed to check auth state:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check auth state on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  /**
   * Login with username and password
   * @param {string} inputUsername - Username entered by user
   * @param {string} password - Password entered by user
   * @returns {Promise<{success: boolean, error: string|null}>}
   */
  const login = useCallback(async (inputUsername, password) => {
    const result = await loginUser({ username: inputUsername, password });

    if (result.success) {
      // Store in sessionStorage
      sessionStorage.setItem(STORAGE_KEYS.IS_AUTHENTICATED, "true");
      sessionStorage.setItem(STORAGE_KEYS.USERNAME, result.username);

      // Update state
      setIsAuthenticated(true);
      setUsername(result.username);

      return { success: true, error: null };
    }

    return { success: false, error: result.error };
  }, []);

  /**
   * Logout - clear state and sessionStorage
   */
  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEYS.IS_AUTHENTICATED);
    sessionStorage.removeItem(STORAGE_KEYS.USERNAME);
    // Clear persisted conversation so next login lands on a fresh page
    localStorage.removeItem('currentConversationId');
    setIsAuthenticated(false);
    setUsername(null);
  }, []);

  const value = {
    isAuthenticated,
    username,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use auth context
 * @returns {{ isAuthenticated: boolean, username: string|null, isLoading: boolean, login: Function, logout: Function }}
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

export default AuthContext;
