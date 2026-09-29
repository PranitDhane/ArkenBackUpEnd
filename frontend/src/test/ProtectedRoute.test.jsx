/**
 * Tests for ProtectedRoute component
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProtectedRoute from "../components/common/ProtectedRoute";

// Mock AuthContext
const mockAuth = {
  isAuthenticated: false,
  isLoading: false,
  username: null,
  login: vi.fn(),
  logout: vi.fn(),
};

vi.mock("../context/AuthContext", () => ({
  useAuth: () => mockAuth,
}));

describe("ProtectedRoute", () => {
  it("renders children when authenticated", () => {
    mockAuth.isAuthenticated = true;
    mockAuth.isLoading = false;

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div data-testid="protected-content">Secret Content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("protected-content")).toBeInTheDocument();
  });

  it("redirects to /login when not authenticated", () => {
    mockAuth.isAuthenticated = false;
    mockAuth.isLoading = false;

    render(
      <MemoryRouter initialEntries={["/"]}>
        <ProtectedRoute>
          <div data-testid="protected-content">Secret Content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
  });

  it("shows loading spinner while checking auth", () => {
    mockAuth.isAuthenticated = false;
    mockAuth.isLoading = true;

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div data-testid="protected-content">Secret Content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
  });
});
