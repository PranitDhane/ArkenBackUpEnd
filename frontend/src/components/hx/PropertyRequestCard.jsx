/**
 * PropertyRequestCard — EPIC-XSTACK-2026-007-S1/S2
 *
 * Rendered inside StepCard when event_subtype === "property_request"
 * or event_subtype === "ai_property_suggestion".
 *
 * Modes:
 *  1. "property_request"   — shows AI estimate table(s), supports option [1] inline entry
 *  2. "ai_property_suggestion" — shows single AI correction suggestion with confirmation buttons
 */

import { useState } from "react";

/** Format a number for display, or return a dash. */
function fmt(value, digits = 4) {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (!isFinite(n)) return "—";
  return n.toPrecision(digits);
}

/** Confidence bar: 0..1 → width % + colour. */
function ConfidenceBar({ confidence }) {
  if (confidence == null) return null;
  const pct = Math.round(confidence * 100);
  const colour =
    pct >= 70
      ? "#22c55e" // green
      : pct >= 50
        ? "#f59e0b" // amber
        : "#ef4444"; // red
  return (
    <div className="mt-1">
      <div
        className="flex justify-between text-xs mb-0.5"
        style={{ color: "var(--color-text-muted, #9ca3af)" }}
      >
        <span>AI confidence</span>
        <span style={{ color: colour, fontWeight: 600 }}>{pct}%</span>
      </div>
      <div
        style={{
          background: "var(--color-border, #374151)",
          borderRadius: 4,
          height: 6,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            background: colour,
            height: "100%",
            borderRadius: 4,
            transition: "width 0.4s",
          }}
        />
      </div>
    </div>
  );
}

/** Table of properties for a single fluid. */
function FluidEstimateTable({ fluid }) {
  const est = fluid.ai_estimate;
  const sideLabel = fluid.side === "hot" ? "Hot side" : "Cold side";

  const rows = [
    { label: "Density ρ", unit: "kg/m³", value: est?.density_kg_m3 },
    { label: "Viscosity μ", unit: "Pa·s", value: est?.viscosity_Pa_s },
    { label: "Specific heat Cp", unit: "J/(kg·K)", value: est?.cp_J_kgK },
    { label: "Conductivity k", unit: "W/(m·K)", value: est?.k_W_mK },
    { label: "Prandtl Pr", unit: "—", value: est?.Pr },
  ];

  return (
    <div
      style={{
        background: "var(--color-card-bg, #1f2937)",
        border: "1px solid var(--color-border, #374151)",
        borderRadius: 8,
        padding: "12px 14px",
        marginBottom: 12,
      }}
    >
      <div style={{ marginBottom: 8 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: fluid.side === "hot" ? "#f87171" : "#60a5fa",
          }}
        >
          {sideLabel}
        </span>
        <span
          style={{
            marginLeft: 8,
            fontWeight: 600,
            color: "var(--color-text, #f9fafb)",
            fontSize: 13,
          }}
        >
          {fluid.fluid_name}
        </span>
        <span
          style={{
            marginLeft: 8,
            fontSize: 11,
            color: "var(--color-text-muted, #9ca3af)",
          }}
        >
          @ {fluid.temperature_C?.toFixed(1)}°C
        </span>
      </div>

      {est == null ? (
        <p style={{ fontSize: 12, color: "#f87171", margin: 0 }}>
          No AI estimate available — AI unavailable or no API key configured.
          Please provide values manually.
        </p>
      ) : (
        <>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid var(--color-border, #374151)",
                }}
              >
                <th
                  style={{
                    textAlign: "left",
                    padding: "3px 6px",
                    color: "var(--color-text-muted, #9ca3af)",
                    fontWeight: 500,
                  }}
                >
                  Property
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "3px 6px",
                    color: "var(--color-text-muted, #9ca3af)",
                    fontWeight: 500,
                  }}
                >
                  Value
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "3px 6px",
                    color: "var(--color-text-muted, #9ca3af)",
                    fontWeight: 500,
                  }}
                >
                  Unit
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ label, unit, value }) => (
                <tr
                  key={label}
                  style={{
                    borderBottom:
                      "1px solid var(--color-border-subtle, #1f2937)",
                  }}
                >
                  <td
                    style={{
                      padding: "3px 6px",
                      color: "var(--color-text-muted, #9ca3af)",
                    }}
                  >
                    {label}
                  </td>
                  <td
                    style={{
                      padding: "3px 6px",
                      textAlign: "right",
                      fontFamily: "monospace",
                      color: "var(--color-text, #f9fafb)",
                    }}
                  >
                    {fmt(value)}
                  </td>
                  <td
                    style={{
                      padding: "3px 6px",
                      color: "var(--color-text-muted, #9ca3af)",
                    }}
                  >
                    {unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <ConfidenceBar confidence={est.property_confidence} />
          {est.property_source && (
            <p
              style={{
                fontSize: 11,
                color: "var(--color-text-muted, #9ca3af)",
                marginTop: 6,
                marginBottom: 0,
              }}
            >
              Source:{" "}
              <code style={{ fontSize: 11 }}>{est.property_source}</code>
            </p>
          )}
        </>
      )}
    </div>
  );
}

/**
 * PropertyRequestCard
 *
 * Props:
 *   payload          — property_request_payload from the SSE event
 *                      shape: { fluids: [...], required_properties: [...], threshold: 0.70 }
 *   sessionId        — HX session id (required for inline submit)
 *   onRespond        — async (payload: object) => void  (calls backend proxy)
 *   escalationSubtype — "property_request" | "ai_property_suggestion" | undefined
 */
export default function PropertyRequestCard({
  payload,
  sessionId,
  onRespond,
  escalationSubtype,
}) {
  // ── AI suggestion mode ─────────────────────────────────────────────────
  if (escalationSubtype === "ai_property_suggestion" && payload) {
    return (
      <AISuggestionCard
        payload={payload}
        sessionId={sessionId}
        onRespond={onRespond}
      />
    );
  }

  // ── Standard property-request mode ────────────────────────────────────
  if (
    !payload ||
    !Array.isArray(payload.fluids) ||
    payload.fluids.length === 0
  ) {
    return null;
  }

  const threshold = payload.threshold ?? 0.7;

  return (
    <div style={{ marginBottom: 14 }}>
      <p
        style={{
          fontSize: 12,
          color: "var(--color-text-muted, #9ca3af)",
          marginBottom: 10,
          lineHeight: 1.5,
        }}
      >
        The following fluid properties were estimated by AI with confidence
        below the{" "}
        <strong style={{ color: "var(--color-text, #f9fafb)" }}>
          {Math.round(threshold * 100)}%
        </strong>{" "}
        threshold. Review the values below before approving.
      </p>

      {payload.fluids.map((fluid, i) => (
        <FluidEstimateTable key={`${fluid.side}-${i}`} fluid={fluid} />
      ))}

      {/* Inline entry form for option [1] — "Enter my own values" */}
      <PropertyEntryForm
        payload={payload}
        sessionId={sessionId}
        onRespond={onRespond}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// PropertyEntryForm — inline manual property input (option [1])
// ---------------------------------------------------------------------------

const FIELD_CONFIG = [
  {
    key: "density_kg_m3",
    label: "Density ρ",
    unit: "kg/m³",
    placeholder: "e.g. 920",
  },
  {
    key: "viscosity_Pa_s",
    label: "Viscosity μ",
    unit: "Pa·s",
    placeholder: "e.g. 0.00048",
  },
  {
    key: "cp_J_kgK",
    label: "Specific heat Cp",
    unit: "J/(kg·K)",
    placeholder: "e.g. 2100",
  },
  {
    key: "k_W_mK",
    label: "Conductivity k",
    unit: "W/(m·K)",
    placeholder: "e.g. 0.118",
  },
];

const BACKEND_BASE_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api$/, "")
  : "http://localhost:8001";

function PropertyEntryForm({ payload, sessionId, onRespond }) {
  const [showForm, setShowForm] = useState(false);
  const [fieldValues, setFieldValues] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  // Determine which side(s) need manual entry
  const fluids = payload?.fluids ?? [];
  const [activeSide, setActiveSide] = useState(fluids[0]?.side ?? "hot");

  if (fluids.length === 0 || !sessionId) return null;

  const handleFieldChange = (key, value) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: null }));
  };

  const handleSubmit = async () => {
    // Client-side: at least one field must be filled and be a finite number
    const filled = {};
    const errors = {};
    let anyFilled = false;
    for (const { key } of FIELD_CONFIG) {
      const raw = (fieldValues[key] ?? "").trim();
      if (!raw) continue;
      const n = Number(raw);
      if (!isFinite(n) || isNaN(n)) {
        errors[key] = "Must be a valid number.";
      } else {
        filled[key] = n;
        anyFilled = true;
      }
    }
    if (!anyFilled) {
      setSubmitError("Please fill in at least one property value.");
      return;
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const storedUsername = sessionStorage.getItem("auth_username") || "";
      const headers = { "Content-Type": "application/json" };
      if (storedUsername) headers["X-Username"] = storedUsername;

      const res = await fetch(
        `${BACKEND_BASE_URL}/api/hx/design/${sessionId}/respond`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            type: "override",
            values: {
              option_index: 1,
              fluid_side: activeSide,
              properties: filled,
            },
          }),
        },
      );

      if (!res.ok) {
        let detail = `Error ${res.status}`;
        try {
          const body = await res.json();
          if (body?.detail?.errors) {
            // 422 from property validator
            const perField = {};
            for (const msg of body.detail.errors) {
              for (const { key } of FIELD_CONFIG) {
                if (msg.includes(key)) {
                  perField[key] = msg;
                  break;
                }
              }
            }
            if (Object.keys(perField).length > 0) {
              setFieldErrors(perField);
              setSubmitting(false);
              return;
            }
            detail = body.detail.errors.join(" ");
          } else if (body?.detail) {
            detail =
              typeof body.detail === "string"
                ? body.detail
                : JSON.stringify(body.detail);
          }
        } catch (_) {
          /* ignore parse error */
        }
        setSubmitError(`Submission failed — ${detail}. Please try again.`);
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
      if (onRespond)
        onRespond({
          type: "override",
          values: {
            option_index: 1,
            fluid_side: activeSide,
            properties: filled,
          },
        });
    } catch (err) {
      setSubmitError(`Network error — ${err.message}. Please try again.`);
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div
        style={{
          background: "var(--color-card-bg, #1f2937)",
          border: "1px solid #22c55e",
          borderRadius: 8,
          padding: "12px 14px",
          marginTop: 12,
          fontSize: 13,
          color: "#22c55e",
        }}
      >
        Values submitted — pipeline resuming…
      </div>
    );
  }

  return (
    <div style={{ marginTop: 12 }}>
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          style={{
            fontSize: 12,
            color: "var(--color-text-muted, #9ca3af)",
            background: "none",
            border: "1px solid var(--color-border, #374151)",
            borderRadius: 6,
            padding: "4px 10px",
            cursor: "pointer",
          }}
        >
          Enter my own values instead →
        </button>
      ) : (
        <div
          style={{
            background: "var(--color-card-bg, #1f2937)",
            border: "1px solid var(--color-border, #374151)",
            borderRadius: 8,
            padding: "12px 14px",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--color-text-muted, #9ca3af)",
              marginBottom: 10,
            }}
          >
            Enter measured or datasheet values
          </div>

          {/* Side selector if multiple fluids */}
          {fluids.length > 1 && (
            <div style={{ marginBottom: 8, display: "flex", gap: 6 }}>
              {fluids.map((f) => (
                <button
                  key={f.side}
                  onClick={() => setActiveSide(f.side)}
                  style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 4,
                    border: "1px solid var(--color-border, #374151)",
                    background:
                      activeSide === f.side ? "#374151" : "transparent",
                    color: activeSide === f.side ? "#f9fafb" : "#9ca3af",
                    cursor: "pointer",
                  }}
                >
                  {f.side === "hot" ? "Hot side" : "Cold side"} — {f.fluid_name}
                </button>
              ))}
            </div>
          )}

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {FIELD_CONFIG.map(({ key, label, unit, placeholder }) => (
                <tr key={key}>
                  <td
                    style={{
                      padding: "4px 6px",
                      fontSize: 12,
                      color: "var(--color-text-muted, #9ca3af)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {label}
                  </td>
                  <td style={{ padding: "4px 6px" }}>
                    <input
                      type="number"
                      step="any"
                      placeholder={placeholder}
                      value={fieldValues[key] ?? ""}
                      onChange={(e) => handleFieldChange(key, e.target.value)}
                      disabled={submitting}
                      style={{
                        width: "100%",
                        background: "var(--color-bg, #111827)",
                        border: fieldErrors[key]
                          ? "1px solid #ef4444"
                          : "1px solid var(--color-border, #374151)",
                        borderRadius: 4,
                        color: "var(--color-text, #f9fafb)",
                        fontSize: 12,
                        padding: "3px 6px",
                        outline: "none",
                      }}
                    />
                    {fieldErrors[key] && (
                      <div
                        style={{ fontSize: 10, color: "#ef4444", marginTop: 2 }}
                      >
                        {fieldErrors[key]}
                      </div>
                    )}
                  </td>
                  <td
                    style={{
                      padding: "4px 6px",
                      fontSize: 11,
                      color: "var(--color-text-muted, #9ca3af)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {submitError && (
            <p
              style={{
                fontSize: 11,
                color: "#ef4444",
                marginTop: 8,
                marginBottom: 0,
              }}
            >
              {submitError}
            </p>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                fontSize: 12,
                padding: "5px 14px",
                borderRadius: 6,
                border: "none",
                background: submitting ? "#374151" : "#2563eb",
                color: "#f9fafb",
                cursor: submitting ? "not-allowed" : "pointer",
                fontWeight: 600,
              }}
            >
              {submitting ? "Submitting…" : "Submit Values"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              disabled={submitting}
              style={{
                fontSize: 12,
                padding: "5px 10px",
                borderRadius: 6,
                border: "1px solid var(--color-border, #374151)",
                background: "transparent",
                color: "var(--color-text-muted, #9ca3af)",
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AISuggestionCard — confirm or override an AI property correction (Step 16)
// ---------------------------------------------------------------------------

const PROPERTY_LABELS = {
  density_kg_m3: { label: "Density ρ", unit: "kg/m³" },
  viscosity_Pa_s: { label: "Viscosity μ", unit: "Pa·s" },
  cp_J_kgK: { label: "Specific heat Cp", unit: "J/(kg·K)" },
  k_W_mK: { label: "Conductivity k", unit: "W/(m·K)" },
};

function AISuggestionCard({ payload, sessionId, onRespond }) {
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const {
    fluid_side,
    property_name,
    proposed_value,
    current_value,
    reason,
    engineering_impact,
  } = payload ?? {};

  const propMeta = PROPERTY_LABELS[property_name] ?? {
    label: property_name,
    unit: "",
  };

  const sendResponse = async (optionIndex, extraValues = {}) => {
    if (!sessionId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const storedUsername = sessionStorage.getItem("auth_username") || "";
      const headers = { "Content-Type": "application/json" };
      if (storedUsername) headers["X-Username"] = storedUsername;

      const res = await fetch(
        `${BACKEND_BASE_URL}/api/hx/design/${sessionId}/respond`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            type: "accept",
            values: { option_index: optionIndex, fluid_side, ...extraValues },
          }),
        },
      );

      if (!res.ok) {
        let detail = `Error ${res.status}`;
        try {
          const body = await res.json();
          if (body?.detail)
            detail =
              typeof body.detail === "string"
                ? body.detail
                : JSON.stringify(body.detail);
        } catch (_) {
          /* ignore */
        }
        setSubmitError(`Submission failed — ${detail}. Please try again.`);
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
      if (onRespond)
        onRespond({
          type: "accept",
          values: { option_index: optionIndex, fluid_side },
        });
    } catch (err) {
      setSubmitError(`Network error — ${err.message}. Please try again.`);
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div
        style={{
          background: "var(--color-card-bg, #1f2937)",
          border: "1px solid #22c55e",
          borderRadius: 8,
          padding: "12px 14px",
          marginBottom: 14,
          fontSize: 13,
          color: "#22c55e",
        }}
      >
        Response submitted — pipeline resuming…
      </div>
    );
  }

  return (
    <div
      style={{
        background: "var(--color-card-bg, #1f2937)",
        border: "1px solid var(--color-border, #374151)",
        borderRadius: 8,
        padding: "14px 16px",
        marginBottom: 14,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "#f59e0b",
          marginBottom: 10,
        }}
      >
        AI Property Suggestion
      </div>

      <div style={{ fontSize: 13, marginBottom: 6 }}>
        <span style={{ color: "var(--color-text-muted, #9ca3af)" }}>
          Estimated {propMeta.label}:{" "}
        </span>
        <strong
          style={{
            color: "var(--color-text, #f9fafb)",
            fontFamily: "monospace",
          }}
        >
          {proposed_value != null ? Number(proposed_value).toPrecision(4) : "—"}{" "}
          {propMeta.unit}
        </strong>
      </div>

      {current_value != null && (
        <div
          style={{
            fontSize: 12,
            marginBottom: 8,
            color: "var(--color-text-muted, #9ca3af)",
          }}
        >
          Current value in use:{" "}
          <span style={{ fontFamily: "monospace" }}>
            {Number(current_value).toPrecision(4)} {propMeta.unit}
          </span>
        </div>
      )}

      {reason && (
        <p
          style={{
            fontSize: 12,
            color: "var(--color-text-muted, #9ca3af)",
            lineHeight: 1.6,
            marginBottom: 6,
            borderLeft: "3px solid #f59e0b",
            paddingLeft: 8,
          }}
        >
          {`This value was estimated because ${reason}.`}
          {engineering_impact
            ? ` Since ${engineering_impact}, your confirmation is recommended before ARKEN proceeds.`
            : ""}
        </p>
      )}

      {submitError && (
        <p style={{ fontSize: 11, color: "#ef4444", marginBottom: 8 }}>
          {submitError}
        </p>
      )}

      {!showEntryForm ? (
        <div
          style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}
        >
          <button
            onClick={() => sendResponse(0)}
            disabled={submitting}
            style={{
              fontSize: 12,
              padding: "5px 14px",
              borderRadius: 6,
              border: "none",
              background: submitting ? "#374151" : "#2563eb",
              color: "#f9fafb",
              cursor: submitting ? "not-allowed" : "pointer",
              fontWeight: 600,
            }}
          >
            {submitting ? "Submitting…" : "Continue with AI value"}
          </button>
          <button
            onClick={() => setShowEntryForm(true)}
            disabled={submitting}
            style={{
              fontSize: 12,
              padding: "5px 14px",
              borderRadius: 6,
              border: "1px solid var(--color-border, #374151)",
              background: "transparent",
              color: "var(--color-text, #f9fafb)",
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            Enter my own value →
          </button>
        </div>
      ) : (
        <AISuggestionEntryForm
          propertyName={property_name}
          fluidSide={fluid_side}
          sessionId={sessionId}
          onCancel={() => setShowEntryForm(false)}
          onRespond={onRespond}
        />
      )}
    </div>
  );
}

// Single-field entry form pre-focused on the AI-flagged property
function AISuggestionEntryForm({
  propertyName,
  fluidSide,
  sessionId,
  onCancel,
  onRespond,
}) {
  const [fieldValues, setFieldValues] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    const errors = {};
    const filled = {};
    let anyFilled = false;

    for (const { key } of FIELD_CONFIG) {
      const raw = (fieldValues[key] ?? "").trim();
      if (!raw) continue;
      const n = Number(raw);
      if (!isFinite(n) || isNaN(n)) {
        errors[key] = "Must be a valid number.";
      } else {
        filled[key] = n;
        anyFilled = true;
      }
    }

    if (!anyFilled) {
      setSubmitError("Please enter at least one property value.");
      return;
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const storedUsername = sessionStorage.getItem("auth_username") || "";
      const headers = { "Content-Type": "application/json" };
      if (storedUsername) headers["X-Username"] = storedUsername;

      const res = await fetch(
        `${BACKEND_BASE_URL}/api/hx/design/${sessionId}/respond`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            type: "override",
            values: {
              option_index: 1,
              fluid_side: fluidSide,
              properties: filled,
            },
          }),
        },
      );

      if (!res.ok) {
        let detail = `Error ${res.status}`;
        try {
          const body = await res.json();
          if (body?.detail?.errors) {
            const perField = {};
            for (const msg of body.detail.errors) {
              for (const { key } of FIELD_CONFIG) {
                if (msg.includes(key)) {
                  perField[key] = msg;
                  break;
                }
              }
            }
            if (Object.keys(perField).length > 0) {
              setFieldErrors(perField);
              setSubmitting(false);
              return;
            }
            detail = body.detail.errors.join(" ");
          } else if (body?.detail) {
            detail =
              typeof body.detail === "string"
                ? body.detail
                : JSON.stringify(body.detail);
          }
        } catch (_) {
          /* ignore */
        }
        setSubmitError(`Submission failed — ${detail}. Please try again.`);
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
      if (onRespond)
        onRespond({
          type: "override",
          values: {
            option_index: 1,
            fluid_side: fluidSide,
            properties: filled,
          },
        });
    } catch (err) {
      setSubmitError(`Network error — ${err.message}. Please try again.`);
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ fontSize: 12, color: "#22c55e", marginTop: 8 }}>
        Values submitted — pipeline resuming…
      </div>
    );
  }

  return (
    <div style={{ marginTop: 10 }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {FIELD_CONFIG.map(({ key, label, unit, placeholder }) => (
            <tr key={key}>
              <td
                style={{
                  padding: "4px 6px",
                  fontSize: 12,
                  color:
                    key === propertyName
                      ? "var(--color-text, #f9fafb)"
                      : "var(--color-text-muted, #9ca3af)",
                  whiteSpace: "nowrap",
                  fontWeight: key === propertyName ? 600 : 400,
                }}
              >
                {label}
              </td>
              <td style={{ padding: "4px 6px" }}>
                <input
                  type="number"
                  step="any"
                  placeholder={placeholder}
                  value={fieldValues[key] ?? ""}
                  onChange={(e) =>
                    setFieldValues((prev) => ({
                      ...prev,
                      [key]: e.target.value,
                    }))
                  }
                  disabled={submitting}
                  autoFocus={key === propertyName}
                  style={{
                    width: "100%",
                    background: "var(--color-bg, #111827)",
                    border: fieldErrors[key]
                      ? "1px solid #ef4444"
                      : key === propertyName
                        ? "1px solid #2563eb"
                        : "1px solid var(--color-border, #374151)",
                    borderRadius: 4,
                    color: "var(--color-text, #f9fafb)",
                    fontSize: 12,
                    padding: "3px 6px",
                    outline: "none",
                  }}
                />
                {fieldErrors[key] && (
                  <div style={{ fontSize: 10, color: "#ef4444", marginTop: 2 }}>
                    {fieldErrors[key]}
                  </div>
                )}
              </td>
              <td
                style={{
                  padding: "4px 6px",
                  fontSize: 11,
                  color: "var(--color-text-muted, #9ca3af)",
                  whiteSpace: "nowrap",
                }}
              >
                {unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {submitError && (
        <p
          style={{
            fontSize: 11,
            color: "#ef4444",
            marginTop: 8,
            marginBottom: 0,
          }}
        >
          {submitError}
        </p>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            fontSize: 12,
            padding: "5px 14px",
            borderRadius: 6,
            border: "none",
            background: submitting ? "#374151" : "#2563eb",
            color: "#f9fafb",
            cursor: submitting ? "not-allowed" : "pointer",
            fontWeight: 600,
          }}
        >
          {submitting ? "Submitting…" : "Submit Values"}
        </button>
        <button
          onClick={onCancel}
          disabled={submitting}
          style={{
            fontSize: 12,
            padding: "5px 10px",
            borderRadius: 6,
            border: "1px solid var(--color-border, #374151)",
            background: "transparent",
            color: "var(--color-text-muted, #9ca3af)",
            cursor: submitting ? "not-allowed" : "pointer",
          }}
        >
          Back
        </button>
      </div>
    </div>
  );
}
