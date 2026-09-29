/**
 * Tests for loginUser API function
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after setting up mock
import { loginUser } from "../api/client";

describe("loginUser", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns success on valid credentials", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          success: true,
          username: "TestUser",
          message: "Login successful",
        }),
    });

    const result = await loginUser({
      username: "TestUser",
      password: "test-password-only",
    });

    expect(result.success).toBe(true);
    expect(result.username).toBe("TestUser");
    expect(result.error).toBeNull();
  });

  it("returns error on 401 (invalid credentials)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ detail: "Invalid credentials" }),
    });

    const result = await loginUser({ username: "TestUser", password: "wrong" });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid credentials");
  });

  it("returns friendly error on network failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Failed to fetch"));

    const result = await loginUser({
      username: "TestUser",
      password: "test-password-only",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Unable to connect. Please try again later.");
  });

  it("returns friendly error on server error (500)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ detail: "Internal server error" }),
    });

    const result = await loginUser({
      username: "TestUser",
      password: "test-password-only",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Unable to connect. Please try again later.");
  });

  it("sends correct request body", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, username: "User1" }),
    });

    await loginUser({ username: "User1", password: "pass123" });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/auth/login"),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "User1", password: "pass123" }),
      }),
    );
  });
});
