/**
 * Tests for AuthContext
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "../context/AuthContext";

// Mock the loginUser API
vi.mock("../api/client", () => ({
  loginUser: vi.fn(),
}));

import { loginUser } from "../api/client";

// Helper component to expose AuthContext values
function AuthConsumer() {
  const { isAuthenticated, username, isLoading, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="username">{username || "null"}</span>
      <button
        data-testid="login"
        onClick={() => login("TestUser", "arkenai123")}
      >
        Login
      </button>
      <button data-testid="logout" onClick={logout}>
        Logout
      </button>
    </div>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("starts with loading state then resolves to unauthenticated", async () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });
    expect(screen.getByTestId("authenticated").textContent).toBe("false");
    expect(screen.getByTestId("username").textContent).toBe("null");
  });

  it("restores auth from sessionStorage on mount", async () => {
    sessionStorage.setItem("auth_isAuthenticated", "true");
    sessionStorage.setItem("auth_username", "PreviousUser");

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });
    expect(screen.getByTestId("authenticated").textContent).toBe("true");
    expect(screen.getByTestId("username").textContent).toBe("PreviousUser");
  });

  it("login stores in sessionStorage and updates state", async () => {
    loginUser.mockResolvedValueOnce({
      success: true,
      username: "TestUser",
      error: null,
    });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    await act(async () => {
      screen.getByTestId("login").click();
    });

    expect(screen.getByTestId("authenticated").textContent).toBe("true");
    expect(screen.getByTestId("username").textContent).toBe("TestUser");
    expect(sessionStorage.getItem("auth_isAuthenticated")).toBe("true");
    expect(sessionStorage.getItem("auth_username")).toBe("TestUser");
  });

  it("login with invalid credentials does not authenticate", async () => {
    loginUser.mockResolvedValueOnce({
      success: false,
      username: null,
      error: "Invalid credentials",
    });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    await act(async () => {
      screen.getByTestId("login").click();
    });

    expect(screen.getByTestId("authenticated").textContent).toBe("false");
    expect(sessionStorage.getItem("auth_isAuthenticated")).toBeNull();
  });

  it("logout clears state and sessionStorage", async () => {
    sessionStorage.setItem("auth_isAuthenticated", "true");
    sessionStorage.setItem("auth_username", "TestUser");

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("authenticated").textContent).toBe("true");
    });

    await act(async () => {
      screen.getByTestId("logout").click();
    });

    expect(screen.getByTestId("authenticated").textContent).toBe("false");
    expect(screen.getByTestId("username").textContent).toBe("null");
    expect(sessionStorage.getItem("auth_isAuthenticated")).toBeNull();
    expect(sessionStorage.getItem("auth_username")).toBeNull();
  });

  it("throws error when useAuth is used outside AuthProvider", () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      render(<AuthConsumer />);
    }).toThrow("useAuth must be used within an AuthProvider");

    consoleSpy.mockRestore();
  });
});
