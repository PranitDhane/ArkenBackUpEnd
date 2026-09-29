/**
 * Tests for HomePage component
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Mock framer-motion — strip animation props so they don't leak to DOM elements
const motionProps = new Set([
  "initial", "animate", "whileInView", "exit", "transition", "viewport",
  "variants", "whileHover", "whileTap", "whileDrag", "layout", "layoutId",
]);
function stripMotionProps({ children, ...props }) {
  const safe = {};
  for (const [k, v] of Object.entries(props)) {
    if (!motionProps.has(k)) safe[k] = v;
  }
  return safe;
}
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }) => <div {...stripMotionProps({ children, ...props })}>{children}</div>,
    h1: ({ children, ...props }) => <h1 {...stripMotionProps({ children, ...props })}>{children}</h1>,
    h2: ({ children, ...props }) => <h2 {...stripMotionProps({ children, ...props })}>{children}</h2>,
    p: ({ children, ...props }) => <p {...stripMotionProps({ children, ...props })}>{children}</p>,
    section: ({ children, ...props }) => <section {...stripMotionProps({ children, ...props })}>{children}</section>,
  },
  useInView: () => [null, true],
  AnimatePresence: ({ children }) => children,
}));

// Mock AuthContext — homepage is public (no auth required)
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    isAuthenticated: false,
    isLoading: false,
    username: null,
    login: vi.fn(),
    logout: vi.fn(),
  }),
  AuthProvider: ({ children }) => children,
}));

// Mock ChatContext — homepage doesn't use it, but it wraps the route in App.jsx
vi.mock("../context/ChatContext", () => ({
  useChatContext: () => ({}),
  ChatProvider: ({ children }) => children,
}));

import HomePage from "../pages/HomePage";

function renderHomePage() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <HomePage />
    </MemoryRouter>,
  );
}

describe("HomePage Nav", () => {
  it("renders ARKEN wordmark", () => {
    renderHomePage();
    // ARKEN appears in nav, window chrome, and footer — just confirm at least one exists
    expect(screen.getAllByText("ARKEN").length).toBeGreaterThan(0);
  });

  it("Sign In links to /login", () => {
    renderHomePage();
    const signIn = screen.getByRole("link", { name: /sign in/i });
    expect(signIn).toHaveAttribute("href", "/login");
  });

  it("Request Access is a mailto link", () => {
    renderHomePage();
    const requestAccess = screen.getByRole("link", { name: /request access/i });
    expect(requestAccess.getAttribute("href")).toMatch(/^mailto:/);
  });

  it("nav has How It Works and Features anchor links", () => {
    renderHomePage();
    const links = screen.getAllByRole("link", { name: /how it works/i });
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]).toHaveAttribute("href", "#how-it-works");
  });
});

describe("HomePage Hero", () => {
  it("renders tagline", () => {
    renderHomePage();
    // h1 text is split across two lines — check for the first part
    expect(screen.getAllByText(/Heat exchanger design/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Minutes, not hours/i).length).toBeGreaterThan(0);
  });

  it("renders trust signals", () => {
    renderHomePage();
    // These appear in both the hero and in feature sections
    expect(screen.getAllByText(/Bell-Delaware correlations/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/16-step audit trail/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Confidence scoring/i).length).toBeGreaterThan(0);
  });

  it("Try a Free Design links to /login", () => {
    renderHomePage();
    const ctaLinks = screen.getAllByRole("link", { name: /try a free design/i });
    expect(ctaLinks.length).toBeGreaterThan(0);
    ctaLinks.forEach((link) => expect(link).toHaveAttribute("href", "/login"));
  });

  it("renders pipeline steps", () => {
    renderHomePage();
    expect(screen.getByText(/Process Conditions Validation/i)).toBeInTheDocument();
  });

  it("skips animation when prefers-reduced-motion is true", () => {
    // Mock matchMedia to return prefers-reduced-motion: true
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    vi.useFakeTimers();
    renderHomePage();

    // Advance time — steps should NOT cycle because animation is disabled
    act(() => {
      vi.advanceTimersByTime(6000);
    });

    // Page still renders without crashing
    expect(screen.getAllByText(/Heat exchanger design/i).length).toBeGreaterThan(0);
    vi.useRealTimers();
  });
});

describe("HomePage annotation cards", () => {
  it("renders confidence annotation card", () => {
    renderHomePage();
    expect(screen.getByText("Confidence")).toBeInTheDocument();
    expect(screen.getByText("78%")).toBeInTheDocument();
  });

  it("renders all 3 annotation cards", () => {
    renderHomePage();
    // ΔP shell appears in both annotation card and accuracy table — just confirm presence
    expect(screen.getAllByText(/ΔP shell/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/TEMA Selection/i)).toBeInTheDocument();
  });
});

describe("HomePage FAQ accordion", () => {
  it("FAQ question expands on click", () => {
    renderHomePage();
    const question = screen.getByRole("button", { name: /How accurate is ARKEN/i });
    fireEvent.click(question);
    // Use the FAQ-specific text (contains "overall heat transfer coefficient" — unique to FAQ)
    expect(screen.getByText(/overall heat transfer coefficient/i)).toBeInTheDocument();
  });

  it("FAQ question collapses on second click", () => {
    renderHomePage();
    const question = screen.getByRole("button", { name: /How accurate is ARKEN/i });
    fireEvent.click(question);
    expect(screen.getByText(/overall heat transfer coefficient/i)).toBeInTheDocument();
    fireEvent.click(question);
    expect(screen.queryByText(/overall heat transfer coefficient/i)).not.toBeInTheDocument();
  });

  it("opening one FAQ closes another", () => {
    renderHomePage();
    const q1 = screen.getByRole("button", { name: /How accurate is ARKEN/i });
    const q2 = screen.getByRole("button", { name: /What types of heat exchangers/i });

    fireEvent.click(q1);
    expect(screen.getByText(/overall heat transfer coefficient/i)).toBeInTheDocument();

    fireEvent.click(q2);
    // q1 answer gone, q2 answer visible
    expect(screen.queryByText(/overall heat transfer coefficient/i)).not.toBeInTheDocument();
    expect(screen.getByText(/shell-and-tube exchangers/i)).toBeInTheDocument();
  });
});

describe("HomePage auth access", () => {
  it("renders homepage without redirect for unauthenticated user", () => {
    renderHomePage();
    // Marketing page is visible — not redirected to /login
    expect(screen.getAllByText(/Heat exchanger design/i).length).toBeGreaterThan(0);
  });

  it("CTA buttons link to /login not /app", () => {
    renderHomePage();
    const ctaLinks = screen.getAllByRole("link", { name: /try a free design/i });
    ctaLinks.forEach((link) => {
      expect(link).not.toHaveAttribute("href", "/app");
      expect(link).toHaveAttribute("href", "/login");
    });
  });
});

describe("HomePage sections", () => {
  it("renders The Problem section", () => {
    renderHomePage();
    expect(screen.getByText(/The HTRI bottleneck is real/i)).toBeInTheDocument();
  });

  it("renders How It Works section", () => {
    renderHomePage();
    expect(screen.getAllByText(/How it works/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Describe your problem/i)).toBeInTheDocument();
  });

  it("renders testimonials with Early access attribution", () => {
    renderHomePage();
    const attributions = screen.getAllByText(/Early access tester/i);
    expect(attributions.length).toBeGreaterThan(0);
  });

  it("renders footer with copyright", () => {
    renderHomePage();
    expect(screen.getByText(/© 2026 ARKEN AI/i)).toBeInTheDocument();
  });
});

describe("HomePage Section 6D — Conversational Interface", () => {
  it("renders the conversational section header", () => {
    renderHomePage();
    expect(screen.getByText(/Describe it the way you'd explain it to a colleague/i)).toBeInTheDocument();
  });

  it("shows full user message when prefers-reduced-motion is true", () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    renderHomePage();
    expect(screen.getByText(/Cool 50 kg\/s of crude oil/i)).toBeInTheDocument();
  });

  it("shows AI response when prefers-reduced-motion is true", () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    renderHomePage();
    expect(screen.getByText(/cooling water on the shell side/i)).toBeInTheDocument();
  });

  it("shows prompt chips when prefers-reduced-motion is true", () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    renderHomePage();
    expect(screen.getByText(/Quick sizing for cooling water loop/i)).toBeInTheDocument();
    expect(screen.getByText(/Rate my existing exchanger/i)).toBeInTheDocument();
  });

  it("footer links to anchors not dead spans", () => {
    renderHomePage();
    const howItWorks = screen.getAllByRole("link", { name: /how it works/i });
    howItWorks.forEach((link) => expect(link).toHaveAttribute("href", "#how-it-works"));
  });
});
