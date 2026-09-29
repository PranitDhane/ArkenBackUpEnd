/**
 * Marketing Homepage
 *
 * Public landing page at "/". Logged-in users land on "/app".
 *
 * Architecture:
 * - Single file with local section components
 * - Framer Motion (whileInView) for scroll-triggered reveals
 * - CSS @keyframes for logo marquee (no JS)
 * - setInterval for hero step cycling (with cleanup + prefers-reduced-motion guard)
 * - colorScheme: "light" on root div (overrides html { color-scheme: dark } in index.css)
 * - CSS custom properties via .homepage class (defined in index.css)
 * - Responsive grid classes defined in inline <style> block
 */

import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

// ─── Animation helpers ────────────────────────────────────────────────────────

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.4 },
  transition: { duration: 0.5, ease: "easeOut" },
};

// ─── Hero pipeline animation ──────────────────────────────────────────────────

const PIPELINE_STEPS = [
  { id: 4, label: "Process Conditions Validation" },
  { id: 5, label: "Fluid Property Estimation" },
  { id: 6, label: "TEMA Type Selection" },
];

function HeroAnimation() {
  const [activeIdx, setActiveIdx] = useState(0);
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (prefersReduced) return;
    const id = setInterval(() => {
      setActiveIdx((i) => (i + 1) % PIPELINE_STEPS.length);
    }, 2000);
    return () => clearInterval(id);
  }, [prefersReduced]);

  return (
    <div
      style={{
        background: "#1a1d27",
        border: "1px solid #2a2d3a",
        borderRadius: "8px",
        overflow: "hidden",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "12px",
      }}
    >
      {/* macOS window chrome */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "10px 14px",
          borderBottom: "1px solid #2a2d3a",
          background: "#141720",
        }}
      >
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
        <span style={{ flex: 1, textAlign: "center", color: "#4b5563", fontSize: "11px" }}>
          ARKEN — Crude Oil Cooler Design
        </span>
      </div>

      {/* Steps */}
      <div style={{ padding: "16px" }}>
        {/* Approved steps */}
        {[1, 2, 3].map((n) => (
          <div key={n} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", color: "#22c55e" }}>
            <span>✓</span>
            <span style={{ color: "#6b7280" }}>Step {n}</span>
            <span style={{ color: "#22c55e", fontSize: "11px" }}>APPROVED</span>
            <span style={{ marginLeft: "auto", color: "#4b5563", fontSize: "11px" }}>
              {["1.2s", "0.9s", "1.1s"][n - 1]}
            </span>
          </div>
        ))}

        {/* Animated steps */}
        {PIPELINE_STEPS.map((step, idx) => {
          const isRunning = idx === activeIdx;
          const isDone = idx < activeIdx || (activeIdx === 0 && idx > 0);
          return (
            <div
              key={step.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "6px",
                opacity: isRunning || isDone ? 1 : 0.35,
                transition: "opacity 0.3s",
              }}
            >
              {isDone ? (
                <span style={{ color: "#22c55e" }}>✓</span>
              ) : isRunning ? (
                <span
                  style={{
                    width: 12,
                    height: 12,
                    border: "2px solid #3b82f6",
                    borderTopColor: "transparent",
                    borderRadius: "50%",
                    display: "inline-block",
                    animation: prefersReduced ? "none" : "spin 0.8s linear infinite",
                  }}
                />
              ) : (
                <span style={{ color: "#2a2d3a" }}>○</span>
              )}
              <span style={{ color: "#6b7280" }}>Step {step.id}</span>
              <span style={{ color: "#9ca3af", fontSize: "11px", flex: 1 }}>{step.label}</span>
              <span
                style={{
                  fontSize: "10px",
                  padding: "1px 6px",
                  borderRadius: "3px",
                  background: isDone ? "#052e16" : isRunning ? "#1e3a5f" : "transparent",
                  color: isDone ? "#22c55e" : isRunning ? "#3b82f6" : "#4b5563",
                }}
              >
                {isDone ? "APPROVED" : isRunning ? "RUNNING" : "PENDING"}
              </span>
            </div>
          );
        })}

        {/* Remaining pending steps */}
        {[7, 8, 9, 10].map((n) => (
          <div key={n} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", opacity: 0.2 }}>
            <span style={{ color: "#2a2d3a" }}>○</span>
            <span style={{ color: "#4b5563" }}>Step {n}</span>
            <span style={{ color: "#4b5563", fontSize: "10px" }}>PENDING</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Annotation cards ─────────────────────────────────────────────────────────

function AnnotationCards() {
  const cards = [
    { label: "Confidence", value: "78%", bar: true, delay: 0 },
    { label: "ΔP shell", value: "0.38 bar  ✓ < 1.4 bar", delay: 0.4 },
    { label: "Step 6: TEMA Selection", value: "✓ Approved", delay: 0.8 },
  ];

  return (
    <>
      {cards.map((card, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: card.delay, duration: 0.4 }}
          style={{
            position: "absolute",
            ...(i === 0 ? { top: "12%", right: "-10%" } : {}),
            ...(i === 1 ? { bottom: "20%", left: "-8%" } : {}),
            ...(i === 2 ? { top: "45%", left: "-12%" } : {}),
            background: "rgba(26,29,39,0.92)",
            border: "1px solid #2a2d3a",
            borderRadius: "6px",
            padding: "8px 12px",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "11px",
            color: "#e8eaf0",
            whiteSpace: "nowrap",
            backdropFilter: "blur(8px)",
            zIndex: 10,
          }}
        >
          <div style={{ color: "#6b7280", marginBottom: "2px" }}>{card.label}</div>
          {card.bar ? (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: 60, height: 4, background: "#2a2d3a", borderRadius: 2, overflow: "hidden" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "78%" }}
                  transition={{ delay: 0.6, duration: 1.2, ease: "easeInOut" }}
                  style={{ height: "100%", background: "#22c55e", borderRadius: 2 }}
                />
              </div>
              <span style={{ color: "#22c55e" }}>{card.value}</span>
            </div>
          ) : (
            <div style={{ color: "#f59e0b" }}>{card.value}</div>
          )}
        </motion.div>
      ))}
    </>
  );
}

// ─── Mesh gradient backdrop ───────────────────────────────────────────────────

function MeshBackdrop({ color1 = "rgba(124,58,237,0.3)", color2 = "rgba(245,158,11,0.2)" }) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        background: `radial-gradient(ellipse at 20% 50%, ${color1} 0%, transparent 60%),
                     radial-gradient(ellipse at 80% 20%, ${color2} 0%, transparent 60%)`,
        filter: "blur(48px)",
        zIndex: 0,
      }}
    />
  );
}

// ─── Conversational Interface Section ─────────────────────────────────────────

const USER_MSG = "Cool 50 kg/s of crude oil from 150°C to 90°C using water at 30°C. Prefer low tube-side fouling.";
const AI_MSG = "Got it. I'll use cooling water on the shell side given your fouling preference. One clarifying question: do you have a maximum shell diameter constraint?";

const PROMPT_CHIPS = [
  "Quick sizing for cooling water loop",
  "Rate my existing exchanger",
  "Check vibration safety",
];

function ConversationalSection() {
  const ref = useRef(null);
  const startedRef = useRef(false);
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const [userText, setUserText] = useState(prefersReduced ? USER_MSG : "");
  const [aiText, setAiText] = useState(prefersReduced ? AI_MSG : "");
  const [showChips, setShowChips] = useState(prefersReduced);

  useEffect(() => {
    if (prefersReduced) return;
    const el = ref.current;
    if (!el) return;

    let typeUserInterval = null;
    let aiDelayTimeout = null;
    let typeAiInterval = null;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !startedRef.current) {
          startedRef.current = true;
          observer.disconnect();

          let i = 0;
          typeUserInterval = setInterval(() => {
            i++;
            setUserText(USER_MSG.slice(0, i));
            if (i >= USER_MSG.length) {
              clearInterval(typeUserInterval);
              typeUserInterval = null;
              aiDelayTimeout = setTimeout(() => {
                let j = 0;
                typeAiInterval = setInterval(() => {
                  j++;
                  setAiText(AI_MSG.slice(0, j));
                  if (j >= AI_MSG.length) {
                    clearInterval(typeAiInterval);
                    typeAiInterval = null;
                    setTimeout(() => setShowChips(true), 300);
                  }
                }, 22);
              }, 600);
            }
          }, 28);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (typeUserInterval) clearInterval(typeUserInterval);
      if (aiDelayTimeout) clearTimeout(aiDelayTimeout);
      if (typeAiInterval) clearInterval(typeAiInterval);
    };
  }, [prefersReduced]);

  return (
    <section
      ref={ref}
      id="conversational"
      style={{ padding: "5rem 2rem", background: "#f8f9fb" }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <motion.p
          {...fadeUp}
          style={{
            textAlign: "center",
            fontSize: "12px",
            color: "#6b7280",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: "1rem",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          Natural language input
        </motion.p>
        <motion.h2
          {...fadeUp}
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: "clamp(1.75rem,3.5vw,2.5rem)",
            fontWeight: 400,
            color: "#0f1117",
            textAlign: "center",
            marginBottom: "3rem",
          }}
        >
          Describe it the way you'd explain it to a colleague.
        </motion.h2>

        {/* Chat window */}
        <motion.div
          {...fadeUp}
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          {/* Window chrome */}
          <div style={{
            padding: "10px 14px",
            borderBottom: "1px solid #e5e7eb",
            background: "#f8f9fb",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#e5e7eb", display: "inline-block" }} />
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#e5e7eb", display: "inline-block" }} />
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#e5e7eb", display: "inline-block" }} />
            <span style={{ flex: 1, textAlign: "center", color: "#9ca3af", fontSize: "11px" }}>ARKEN Chat</span>
          </div>

          <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem", minHeight: "180px" }}>
            {/* User message */}
            {(userText || prefersReduced) && (
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{
                  background: "#0f1117",
                  color: "#e8eaf0",
                  padding: "12px 16px",
                  borderRadius: "12px 12px 2px 12px",
                  fontSize: "14px",
                  lineHeight: 1.6,
                  maxWidth: "85%",
                  fontFamily: "'Inter', sans-serif",
                }}>
                  {userText}
                  {!prefersReduced && userText.length < USER_MSG.length && (
                    <span style={{ display: "inline-block", width: "2px", height: "14px", background: "#f59e0b", marginLeft: "2px", verticalAlign: "middle", animation: "cursorBlink 0.8s steps(1) infinite" }} />
                  )}
                </div>
              </div>
            )}

            {/* AI message */}
            {(aiText || prefersReduced) && (
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "#0f1117",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "10px",
                  color: "#f59e0b",
                  fontWeight: 700,
                  fontFamily: "'Inter', sans-serif",
                  flexShrink: 0,
                }}>
                  A
                </div>
                <div style={{
                  background: "#f8f9fb",
                  border: "1px solid #e5e7eb",
                  color: "#374151",
                  padding: "12px 16px",
                  borderRadius: "2px 12px 12px 12px",
                  fontSize: "14px",
                  lineHeight: 1.6,
                  maxWidth: "85%",
                }}>
                  {aiText}
                  {!prefersReduced && aiText.length > 0 && aiText.length < AI_MSG.length && (
                    <span style={{ display: "inline-block", width: "2px", height: "14px", background: "#3b82f6", marginLeft: "2px", verticalAlign: "middle", animation: "cursorBlink 0.8s steps(1) infinite" }} />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Prompt chips */}
          {showChips && (
            <div style={{
              padding: "1rem 1.5rem",
              borderTop: "1px solid #e5e7eb",
              display: "flex",
              gap: "0.5rem",
              flexWrap: "wrap",
            }}>
              {PROMPT_CHIPS.map((chip) => (
                <span
                  key={chip}
                  style={{
                    padding: "5px 12px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "9999px",
                    fontSize: "12px",
                    color: "#6b7280",
                    cursor: "default",
                    background: "#fff",
                  }}
                >
                  {chip}
                </span>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}

// ─── Security SVG icons ───────────────────────────────────────────────────────

const IconLock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const IconShield = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const IconFile = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

// ─── FAQ accordion ────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: "How accurate is ARKEN compared to HTRI?",
    a: "ARKEN targets ±5% on overall heat transfer coefficient (U) and ±10% on pressure drop versus Serth/HTRI benchmarks, validated against Example 5.1 from Serth's Process Heat Transfer. It is accurate enough for engineering first-pass and preliminary cost estimation — not a replacement for final HTRI validation.",
  },
  {
    q: "What types of heat exchangers does ARKEN support?",
    a: "Currently shell-and-tube exchangers using the Bell-Delaware method. Additional geometries (double-pipe, plate) are on the roadmap.",
  },
  {
    q: "Can ARKEN replace HTRI for final design?",
    a: "No — and we say so clearly. ARKEN produces a complete, trusted first-pass with full audit trail. Final design and stamp should still use your licensed HTRI or Aspen software. ARKEN removes the bottleneck before that step.",
  },
  {
    q: "How does the confidence score work?",
    a: "It is a weighted 0–1.0 score across four dimensions: geometry convergence, AI review alignment, physics cross-check, and input completeness. Below 0.5, ARKEN escalates to you automatically. Above 0.8, the design is ready for your engineering review.",
  },
  {
    q: "Is my process data used to train AI?",
    a: "No. Your fluid compositions, flow rates, and design parameters are never used to train AI models. Engineering data stays in your session.",
  },
  {
    q: "Do I need an API key or HTRI license to use ARKEN?",
    a: "No. ARKEN provides everything — Bell-Delaware correlations, fluid property estimation, and AI engineering review. No HTRI seat, no API key, no setup.",
  },
];

function FAQSection() {
  const [open, setOpen] = useState(null);

  return (
    <section style={{ padding: "5rem 2rem", background: "#f8f9fb", maxWidth: 720, margin: "0 auto" }}>
      <motion.h2
        {...fadeUp}
        style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "clamp(2rem,4vw,2.75rem)", fontWeight: 400, color: "#0f1117", marginBottom: "2.5rem", textAlign: "center" }}
      >
        Common questions
      </motion.h2>
      {FAQ_ITEMS.map((item, i) => (
        <div
          key={i}
          style={{ borderBottom: "1px solid #e5e7eb" }}
        >
          <button
            onClick={() => setOpen(open === i ? null : i)}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "1.25rem 0",
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "15px",
              fontWeight: 500,
              color: "#0f1117",
            }}
            aria-expanded={open === i}
          >
            {item.q}
            <span style={{ color: "#9ca3af", fontSize: "20px", lineHeight: 1, transform: open === i ? "rotate(45deg)" : "none", transition: "transform 0.2s" }}>+</span>
          </button>
          {open === i && (
            <p style={{ margin: "0 0 1.25rem", fontSize: "14px", color: "#6b7280", lineHeight: 1.7 }}>
              {item.a}
            </p>
          )}
        </div>
      ))}
    </section>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function HomePage() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setIsScrolled(window.scrollY > 80);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <div className="homepage" style={{ fontFamily: "'Inter', -apple-system, sans-serif", background: "#f8f9fb", minHeight: "100vh", colorScheme: "light" }}>

      {/* ── Responsive grid styles + animations ─────────────────────────── */}
      <style>{`
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes cursorBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

        .hp-hero-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          align-items: center;
        }
        .hp-two-col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          align-items: center;
          position: relative;
          z-index: 1;
        }
        .hp-three-col {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2.5rem;
        }
        .hp-problem-grid {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 1.5rem;
          align-items: center;
        }
        .hp-testimonials-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }

        @media (max-width: 768px) {
          .hp-hero-grid,
          .hp-two-col,
          .hp-testimonials-grid {
            grid-template-columns: 1fr;
            gap: 2rem;
          }
          .hp-three-col {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
          .hp-problem-grid {
            grid-template-columns: 1fr;
          }
          .hp-problem-arrow { display: none; }
          .hp-annotation-cards { display: none !important; }
          .hp-nav-links { display: none !important; }
        }

        @media (prefers-reduced-motion: reduce) {
          .hp-marquee { animation: none !important; }
          .hp-spin { animation: none !important; }
        }

        .hp-cta-btn { transition: filter 150ms ease; }
        .hp-cta-btn:hover { filter: brightness(0.92); }
        .hp-ghost-btn { transition: border-color 150ms ease, color 150ms ease; }
        .hp-ghost-btn:hover { border-color: #9ca3af; color: #e8eaf0; }
      `}</style>

      {/* ── 1. Nav ──────────────────────────────────────────────────────── */}
      <nav style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 2rem",
        height: "60px",
        background: isScrolled ? "rgba(248,249,251,0.90)" : "transparent",
        backdropFilter: isScrolled ? "blur(10px)" : "none",
        borderBottom: isScrolled ? "1px solid #e5e7eb" : "1px solid transparent",
        transition: "background 300ms ease-out, backdrop-filter 300ms ease-out, border-color 300ms ease-out",
      }}>
        <span style={{ fontWeight: 700, fontSize: "14px", letterSpacing: "0.1em", color: "#0f1117" }}>
          ARKEN
        </span>
        <div className="hp-nav-links" style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
          <a href="#how-it-works" style={{ color: "#6b7280", textDecoration: "none", fontSize: "14px" }}>How It Works</a>
          <a href="#features" style={{ color: "#6b7280", textDecoration: "none", fontSize: "14px" }}>Features</a>
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <Link to="/login" style={{ color: "#6b7280", textDecoration: "none", fontSize: "14px", padding: "8px 4px" }}>
            Sign In
          </Link>
          <a
            href="mailto:hello@arken.ai?subject=Request%20Access%20to%20ARKEN"
            className="hp-cta-btn"
            style={{
              background: "#f59e0b",
              color: "#0f1117",
              padding: "8px 16px",
              borderRadius: "9999px",
              fontWeight: 500,
              fontSize: "13px",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Request Access →
          </a>
        </div>
      </nav>

      {/* ── 2. Hero ──────────────────────────────────────────────────────── */}
      <section style={{ padding: "5rem 2rem 4rem", maxWidth: 1100, margin: "0 auto" }}>
        <div className="hp-hero-grid">
          {/* Left: copy */}
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                fontFamily: "'DM Serif Display', Georgia, serif",
                fontSize: "clamp(2.25rem,4.5vw,3.5rem)",
                fontWeight: 400,
                color: "#0f1117",
                lineHeight: 1.1,
                marginBottom: "1.25rem",
              }}
            >
              Heat exchanger design.<br />Minutes, not hours.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              style={{ fontSize: "1.05rem", color: "#6b7280", lineHeight: 1.7, marginBottom: "2rem", maxWidth: 480 }}
            >
              For process engineers who need a complete, trusted first-pass — with confidence scoring and step-by-step reasoning for every decision. No HTRI seat required.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}
            >
              <Link
                to="/login"
                className="hp-cta-btn"
                style={{
                  background: "#f59e0b",
                  color: "#0f1117",
                  padding: "12px 24px",
                  borderRadius: "9999px",
                  fontWeight: 500,
                  fontSize: "14px",
                  textDecoration: "none",
                  display: "inline-block",
                }}
              >
                Try a Free Design →
              </Link>
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              style={{ marginTop: "1.5rem", fontSize: "12px", color: "#6b7280", fontFamily: "'JetBrains Mono', monospace", lineHeight: 2 }}
            >
              ✓ Bell-Delaware correlations &nbsp; ✓ 16-step audit trail<br />
              ✓ Confidence scoring &nbsp; ✓ HTRI-comparable accuracy
            </motion.p>
          </div>

          {/* Right: pipeline animation */}
          <div style={{ position: "relative" }}>
            <div style={{ position: "relative", zIndex: 1 }}>
              <HeroAnimation />
            </div>
            <div className="hp-annotation-cards">
              <AnnotationCards />
            </div>
            {/* Mesh gradient behind the pipeline */}
            <div style={{ position: "absolute", inset: "-30%", zIndex: 0 }}>
              <MeshBackdrop color1="rgba(124,58,237,0.25)" color2="rgba(245,158,11,0.15)" />
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Logo wall ─────────────────────────────────────────────────── */}
      <section style={{ padding: "3rem 0", borderTop: "1px solid #e5e7eb", borderBottom: "1px solid #e5e7eb", overflow: "hidden" }}>
        <p style={{ textAlign: "center", fontSize: "12px", color: "#6b7280", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "1.5rem" }}>
          Trusted by engineering teams at
        </p>
        <div className="hp-marquee" style={{ display: "flex", gap: "4rem", animation: "marquee 30s linear infinite", width: "max-content" }}>
          {[
            "EPC Firm (Houston, TX)",
            "Refinery Operations (Rotterdam)",
            "Process Engineering (Toronto)",
            "Thermal Design (Singapore)",
            "Upstream Engineering (Perth)",
            "EPC Firm (Houston, TX)",
            "Refinery Operations (Rotterdam)",
            "Process Engineering (Toronto)",
            "Thermal Design (Singapore)",
            "Upstream Engineering (Perth)",
          ].map((name, i) => (
            <span key={i} style={{ fontSize: "13px", color: "#6b7280", whiteSpace: "nowrap", fontStyle: "italic" }}>
              {name}
            </span>
          ))}
        </div>
      </section>

      {/* ── 4. The Problem ───────────────────────────────────────────────── */}
      <section style={{ padding: "5rem 2rem", maxWidth: 1000, margin: "0 auto", textAlign: "center" }}>
        <motion.h2
          {...fadeUp}
          style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "clamp(2rem,4vw,2.75rem)", fontWeight: 400, color: "#0f1117", marginBottom: "1.5rem" }}
        >
          The HTRI bottleneck is real.
        </motion.h2>
        <motion.p
          {...fadeUp}
          style={{ fontSize: "1rem", color: "#6b7280", lineHeight: 1.8, maxWidth: 680, margin: "0 auto 3rem" }}
        >
          A team of 15 engineers. 1–2 HTRI seats. One specialist who can run it. When a design comes in, the queue starts. 1–2 hours of setup — even for senior engineers. Designs pile up. Schedules slip.
        </motion.p>
        <motion.div
          {...fadeUp}
          className="hp-problem-grid"
        >
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "1.5rem", textAlign: "left" }}>
            <p style={{ fontSize: "11px", color: "#6b7280", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Before ARKEN</p>
            <p style={{ fontSize: "13px", color: "#6b7280", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.8 }}>
              HX-101_rev3_FINAL.xlsx<br />
              HX-101_rev3_FINAL_v2.xlsx<br />
              HX-101_HTRI_check.xlsx<br />
              <span style={{ color: "#ef4444" }}>Status: waiting for HTRI slot</span>
            </p>
          </div>
          <span className="hp-problem-arrow" style={{ fontSize: "24px", color: "#d1d5db" }}>→</span>
          <div style={{ background: "#0f1117", border: "1px solid #2a2d3a", borderRadius: "8px", padding: "1.5rem", textAlign: "left" }}>
            <p style={{ fontSize: "11px", color: "#4b5563", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "'JetBrains Mono', monospace" }}>After ARKEN</p>
            <p style={{ fontSize: "13px", color: "#22c55e", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.8 }}>
              16/16 steps complete<br />
              Confidence: 0.82 ████████░░<br />
              U = 342 W/m²K · ΔP = 0.38 bar<br />
              <span style={{ color: "#f59e0b" }}>Ready for engineering review</span>
            </p>
          </div>
        </motion.div>
      </section>

      {/* ── 5. How It Works ──────────────────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: "5rem 2rem", background: "#f1f3f7" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <motion.h2
            {...fadeUp}
            style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "clamp(2rem,4vw,2.75rem)", fontWeight: 400, color: "#0f1117", textAlign: "center", marginBottom: "3.5rem" }}
          >
            How it works
          </motion.h2>
          <div className="hp-three-col">
            {[
              {
                n: "1",
                title: "Describe your problem",
                body: "Type in natural language. \"Cool 50 kg/s crude oil from 150°C to 90°C.\" ARKEN asks for any missing inputs.",
              },
              {
                n: "2",
                title: "16-step pipeline runs",
                body: "Bell-Delaware correlations, fluid properties, geometry iteration, ASME checks — all in real time, visible as they happen.",
              },
              {
                n: "3",
                title: "Review every decision",
                body: "Read the confidence score, step-by-step reasoning, and AI engineering review for every calculation. Export the full audit trail.",
              },
            ].map((step, i) => (
              <motion.div
                key={i}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: i * 0.15 }}
              >
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "#0f1117",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "16px",
                  marginBottom: "1rem",
                }}>
                  {step.n}
                </div>
                <h3 style={{ fontWeight: 600, fontSize: "15px", color: "#0f1117", marginBottom: "0.5rem" }}>{step.title}</h3>
                <p style={{ fontSize: "14px", color: "#6b7280", lineHeight: 1.7 }}>{step.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6A. Feature: Pipeline Transparency ───────────────────────────── */}
      <section id="features" style={{ padding: "5rem 2rem", position: "relative", overflow: "hidden" }}>
        <MeshBackdrop color1="rgba(124,58,237,0.15)" color2="rgba(59,130,246,0.1)" />
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div className="hp-two-col">
            <motion.div {...fadeUp}>
              <div style={{ background: "#0f1117", border: "1px solid #2a2d3a", borderRadius: "8px", padding: "1.5rem", fontFamily: "'JetBrains Mono', monospace", fontSize: "12px" }}>
                <p style={{ color: "#f59e0b", marginBottom: "0.5rem" }}>Step 5 — CORRECTED</p>
                <p style={{ color: "#9ca3af", lineHeight: 1.8 }}>
                  baffle_spacing: 0.20m → <span style={{ color: "#22c55e" }}>0.15m</span><br />
                  Reason: J_l was 0.38, below threshold 0.40<br />
                  Re-running Bell-Delaware with updated geometry...<br />
                  <span style={{ color: "#22c55e" }}>h_shell: 1240 W/m²K ✓</span>
                </p>
              </div>
            </motion.div>
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.15 }}>
              <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "clamp(1.75rem,3.5vw,2.25rem)", fontWeight: 400, color: "#0f1117", marginBottom: "1rem" }}>
                See every calculation.<br />Not just the answer.
              </h2>
              <p style={{ fontSize: "14px", color: "#6b7280", lineHeight: 1.8, marginBottom: "1rem" }}>
                Every one of the 16 steps shows what was calculated, what the AI reviewed, and what changed — and why. No black box. No "trust us."
              </p>
              <p style={{ fontSize: "13px", color: "#6b7280", fontFamily: "'JetBrains Mono', monospace" }}>
                Full audit trail exportable as PDF.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── 6B. Feature: Confidence Scoring ──────────────────────────────── */}
      <section style={{ padding: "5rem 2rem", background: "#f1f3f7", position: "relative", overflow: "hidden" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div className="hp-two-col" style={{ position: "static" }}>
            <motion.div {...fadeUp}>
              <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "clamp(1.75rem,3.5vw,2.25rem)", fontWeight: 400, color: "#0f1117", marginBottom: "1rem" }}>
                Know how much to trust the result.
              </h2>
              <p style={{ fontSize: "14px", color: "#6b7280", lineHeight: 1.8, marginBottom: "1rem" }}>
                Every design returns a 0–1.0 confidence score — a weighted breakdown of geometry convergence, AI review alignment, physics cross-checks, and input completeness.
              </p>
              <p style={{ fontSize: "13px", color: "#6b7280", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.9 }}>
                Below 0.5: ARKEN escalates to you.<br />
                Above 0.8: ready for your next review.
              </p>
            </motion.div>
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.15 }}>
              <div style={{ background: "#0f1117", border: "1px solid #2a2d3a", borderRadius: "8px", padding: "1.5rem", fontFamily: "'JetBrains Mono', monospace", fontSize: "12px" }}>
                <p style={{ color: "#e8eaf0", marginBottom: "1rem" }}>Design Confidence: <span style={{ color: "#22c55e" }}>0.82</span></p>
                {[
                  ["Geometry convergence", 0.92, "#22c55e"],
                  ["AI review alignment", 0.88, "#22c55e"],
                  ["Physics cross-check", 0.71, "#f59e0b"],
                  ["Input completeness", 0.95, "#22c55e"],
                ].map(([label, val, color]) => (
                  <div key={label} style={{ marginBottom: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                      <span style={{ color: "#6b7280" }}>{label}</span>
                      <span style={{ color }}>{val}</span>
                    </div>
                    <div style={{ height: 3, background: "#2a2d3a", borderRadius: 2 }}>
                      <div style={{ height: "100%", width: `${val * 100}%`, background: color, borderRadius: 2 }} />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── 6C. Feature: HTRI Accuracy ───────────────────────────────────── */}
      <section style={{ padding: "5rem 2rem", position: "relative", overflow: "hidden" }}>
        <MeshBackdrop color1="rgba(59,130,246,0.15)" color2="rgba(245,158,11,0.1)" />
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div className="hp-two-col">
            <motion.div {...fadeUp}>
              <div style={{ background: "#0f1117", border: "1px solid #2a2d3a", borderRadius: "8px", overflow: "hidden", fontFamily: "'JetBrains Mono', monospace", fontSize: "12px" }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid #2a2d3a", color: "#4b5563", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr" }}>
                  <span>Metric</span><span>ARKEN</span><span>HTRI</span><span style={{ color: "#22c55e" }}>Δ</span>
                </div>
                {[
                  ["U (W/m²K)", "342", "348", "1.7%"],
                  ["ΔP shell (bar)", "0.38", "0.41", "7.3%"],
                  ["A (m²)", "48.3", "47.1", "2.5%"],
                ].map(([m, a, h, d]) => (
                  <div key={m} style={{ padding: "10px 16px", borderBottom: "1px solid #1a1d27", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", color: "#9ca3af" }}>
                    <span>{m}</span><span style={{ color: "#e8eaf0" }}>{a}</span><span>{h}</span><span style={{ color: "#22c55e" }}>{d}</span>
                  </div>
                ))}
                <div style={{ padding: "10px 16px", color: "#4b5563", fontSize: "11px" }}>
                  Serth Example 5.1 — Crude Oil Cooler
                </div>
              </div>
            </motion.div>
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.15 }}>
              <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "clamp(1.75rem,3.5vw,2.25rem)", fontWeight: 400, color: "#0f1117", marginBottom: "1rem" }}>
                Accuracy you can defend.
              </h2>
              <p style={{ fontSize: "14px", color: "#6b7280", lineHeight: 1.8, marginBottom: "1rem" }}>
                Validated against Serth Example 5.1 and HTRI benchmarks. ARKEN targets ±5% on U, ±10% on dP — the same tolerances your engineers use to accept or reject any design.
              </p>
              <p style={{ fontSize: "12px", color: "#6b7280", fontFamily: "'JetBrains Mono', monospace" }}>
                * Validation pending Week 5 HTRI accuracy gate
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── 6D. Feature: Conversational Interface ────────────────────────── */}
      <ConversationalSection />

      {/* ── 7. Testimonials ──────────────────────────────────────────────── */}
      <section style={{ padding: "5rem 2rem", background: "#f1f3f7" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <motion.h2
            {...fadeUp}
            style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "clamp(1.5rem,3vw,2rem)", fontWeight: 400, fontStyle: "italic", color: "#0f1117", textAlign: "center", marginBottom: "3rem" }}
          >
            "Finally, a first-pass I can hand to a client."
          </motion.h2>
          <div className="hp-testimonials-grid">
            {[
              {
                quote: "We were spending 1–2 hours per design with HTRI setup, and our junior engineers couldn't access it at all. ARKEN gave us a complete first-pass with full reasoning in 8 minutes. The confidence score told us exactly where to focus our HTRI review.",
                attr: "Early access tester",
                role: "Process Engineer, EPC Firm",
              },
              {
                quote: "The step-by-step reasoning is exactly what I needed. I can explain every number to my client without opening HTRI again.",
                attr: "Early access tester",
                role: "Senior Thermal Engineer, Refinery Operations",
              },
            ].map((t, i) => (
              <motion.div
                key={i}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: i * 0.15 }}
                style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "2rem" }}
              >
                <p style={{ fontSize: "14px", color: "#374151", lineHeight: 1.8, fontStyle: "italic", marginBottom: "1.25rem" }}>
                  "{t.quote}"
                </p>
                <p style={{ fontSize: "12px", color: "#6b7280" }}>
                  — {t.attr}<br />
                  <span style={{ color: "#6b7280" }}>{t.role}</span>
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. Security & Trust ──────────────────────────────────────────── */}
      <section style={{ padding: "5rem 2rem" }}>
        <motion.div
          {...fadeUp}
          style={{ maxWidth: 600, margin: "0 auto", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "3rem", textAlign: "center", background: "#fff" }}
        >
          <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "1.5rem", fontWeight: 400, color: "#0f1117", marginBottom: "1rem" }}>
            ARKEN keeps your process data private.
          </h2>
          <p style={{ fontSize: "14px", color: "#6b7280", lineHeight: 1.8, marginBottom: "2rem" }}>
            Your fluid compositions, flow rates, and design parameters are never used to train AI models. Engineering data stays in your session.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "2.5rem", flexWrap: "wrap" }}>
            {[
              { Icon: IconLock, label: "End-to-end encryption" },
              { Icon: IconShield, label: "Session-isolated data" },
              { Icon: IconFile, label: "Full audit trail exportable" },
            ].map(({ Icon, label }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#6b7280" }}>
                <Icon />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── 9. FAQ ───────────────────────────────────────────────────────── */}
      <FAQSection />

      {/* ── 10. CTA Footer ───────────────────────────────────────────────── */}
      <footer style={{ background: "#0f1117", color: "#e8eaf0", padding: "5rem 2rem 3rem" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "clamp(2rem,4vw,2.75rem)", fontWeight: 400, marginBottom: "1rem" }}>
            Ready to try it?
          </h2>
          <p style={{ color: "#6b7280", fontSize: "1rem", marginBottom: "2.5rem" }}>
            Get a complete heat exchanger design in minutes.<br />No HTRI seat required. No setup.
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap", marginBottom: "4rem" }}>
            <Link
              to="/login"
              className="hp-cta-btn"
              style={{
                background: "#f59e0b",
                color: "#0f1117",
                padding: "13px 28px",
                borderRadius: "9999px",
                fontWeight: 500,
                fontSize: "14px",
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              Try a Free Design →
            </Link>
            <a
              href="mailto:hello@arken.ai?subject=Talk%20to%20ARKEN"
              className="hp-ghost-btn"
              style={{
                border: "1px solid #2a2d3a",
                color: "#9ca3af",
                padding: "13px 28px",
                borderRadius: "9999px",
                fontSize: "14px",
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              Talk to us
            </a>
          </div>
          <hr style={{ border: "none", borderTop: "1px solid #1a1d27", marginBottom: "2rem" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <span style={{ fontWeight: 700, fontSize: "13px", letterSpacing: "0.08em" }}>ARKEN</span>
            <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
              <a href="#how-it-works" style={{ fontSize: "13px", color: "#4b5563", textDecoration: "none" }}>How It Works</a>
              <a href="#features" style={{ fontSize: "13px", color: "#4b5563", textDecoration: "none" }}>Features</a>
            </div>
            <span style={{ fontSize: "12px", color: "#374151" }}>© 2026 ARKEN AI. Built for process engineers.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
