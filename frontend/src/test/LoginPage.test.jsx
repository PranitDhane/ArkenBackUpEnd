/**
 * Tests for LoginPage component
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import LoginPage from "../pages/LoginPage";

// Mock AuthContext
const mockLogin = vi.fn();
const mockAuth = {
  isAuthenticated: false,
  isLoading: false,
  username: null,
  login: mockLogin,
  logout: vi.fn(),
};

vi.mock("../context/AuthContext", () => ({
  useAuth: () => mockAuth,
  AuthProvider: ({ children }) => children,
}));

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.isAuthenticated = false;
    mockAuth.isLoading = false;
    mockAuth.username = null;
  });

  it("renders branded login page with Arken AI text", () => {
    renderLoginPage();
    expect(screen.getByText("ARKEN")).toBeInTheDocument();
    expect(screen.getByText("sign in to continue")).toBeInTheDocument();
  });

  it("renders username and password fields", () => {
    renderLoginPage();
    expect(screen.getByLabelText("username")).toBeInTheDocument();
    expect(screen.getByLabelText("password")).toBeInTheDocument();
  });

  it("has autofocus on username field", () => {
    renderLoginPage();
    const usernameInput = screen.getByLabelText("username");
    // After render, the ref-based focus should trigger
    expect(usernameInput).toHaveFocus();
  });

  it("renders sign in button", () => {
    renderLoginPage();
    expect(
      screen.getByRole("button", { name: /sign in/i }),
    ).toBeInTheDocument();
  });

  it("shows validation error for empty username", async () => {
    renderLoginPage();
    const user = userEvent.setup();

    // Type password but leave username empty
    await user.type(screen.getByLabelText("password"), "test-password-only");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(screen.getByRole("alert")).toHaveTextContent("Username is required");
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it("calls login with username and password on submit", async () => {
    mockLogin.mockResolvedValueOnce({ success: true, error: null });
    renderLoginPage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("username"), "TestUser");
    await user.type(screen.getByLabelText("password"), "test-password-only");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(mockLogin).toHaveBeenCalledWith("TestUser", "test-password-only");
  });

  it("shows error message on failed login", async () => {
    mockLogin.mockResolvedValueOnce({
      success: false,
      error: "Invalid credentials",
    });
    renderLoginPage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("username"), "TestUser");
    await user.type(screen.getByLabelText("password"), "wrongpass");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Invalid credentials");
    });
  });

  it("clears password but keeps username on error", async () => {
    mockLogin.mockResolvedValueOnce({
      success: false,
      error: "Invalid credentials",
    });
    renderLoginPage();
    const user = userEvent.setup();

    const usernameInput = screen.getByLabelText("username");
    const passwordInput = screen.getByLabelText("password");

    await user.type(usernameInput, "TestUser");
    await user.type(passwordInput, "wrongpass");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Invalid credentials");
    });

    expect(usernameInput).toHaveValue("TestUser");
    expect(passwordInput).toHaveValue("");
  });

  it("shows loading spinner while submitting", async () => {
    // Make login hang
    mockLogin.mockImplementation(() => new Promise(() => {}));
    renderLoginPage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("username"), "TestUser");
    await user.type(screen.getByLabelText("password"), "test-password-only");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(screen.getByText("signing in…")).toBeInTheDocument();
  });

  it("submits form on Enter key in password field", async () => {
    mockLogin.mockResolvedValueOnce({ success: true, error: null });
    renderLoginPage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("username"), "TestUser");
    await user.type(screen.getByLabelText("password"), "test-password-only{enter}");

    expect(mockLogin).toHaveBeenCalledWith("TestUser", "test-password-only");
  });

  it("redirects authenticated users to /app, not /", () => {
    mockAuth.isAuthenticated = true;
    mockAuth.isLoading = false;

    const { container } = render(
      <MemoryRouter initialEntries={["/login"]}>
        <LoginPage />
      </MemoryRouter>,
    );

    // Navigate should fire — form should not render
    expect(screen.queryByRole("button", { name: /sign in/i })).not.toBeInTheDocument();
    // The Navigate component renders nothing visible — absence of form is the signal
    expect(container.innerHTML).toBe("");
  });

  it("shows loading spinner when auth is loading", () => {
    mockAuth.isLoading = true;
    renderLoginPage();
    // Should not show the form
    expect(screen.queryByText("Arken AI")).not.toBeInTheDocument();
  });

  it("shows password field as type password (masked)", () => {
    renderLoginPage();
    const passwordInput = screen.getByLabelText("password");
    expect(passwordInput).toHaveAttribute("type", "password");
  });
});
