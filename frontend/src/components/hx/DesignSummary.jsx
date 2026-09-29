/**
 * DesignSummary — DESIGN COMPLETE card shown after all 16 steps finish.
 *
 * Props:
 *   design {object}
 *     confidence           {number}  0–1
 *     confidenceBreakdown  {object}
 *     U_overall / U_W_m2K  {number}  W/m²K
 *     area_required / A_m2 {number}  m²
 *     overdesign_pct       {number}  %
 *     dP_shell / dP_tube   {number}  bar
 *     dP_shell_limit / dP_tube_limit {number}
 *     tema_type            {string}
 *     cost_usd             {number}
 *     vibration_safe       {boolean}
 *   onOptimize {fn}
 */

import { useState } from "react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function DataRow({ label, value, unit, limit, warn }) {
  const withinLimit = limit != null ? value < limit : null;
  return (
    <div
      className="flex items-baseline justify-between py-1"
      style={{ borderBottom: "1px solid var(--color-border)" }}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          color: "var(--color-text-muted)",
        }}
      >
        {label}
      </span>
      <div className="flex items-baseline gap-2">
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            color: "var(--color-text-primary)",
          }}
        >
          {value != null ? value : "—"}
          {unit ? ` ${unit}` : ""}
        </span>
        {withinLimit != null && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              color: withinLimit
                ? "var(--color-approved)"
                : "var(--color-error)",
            }}
          >
            [{withinLimit ? "✓" : "✗"} &lt; {limit} {unit}]
          </span>
        )}
        {warn && (
          <span
            style={{
              color: "var(--color-warning)",
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
            }}
          >
            {warn}
          </span>
        )}
      </div>
    </div>
  );
}

function ConfidenceBreakdown({ breakdown }) {
  if (!breakdown) return null;
  return (
    <div
      className="mt-2 space-y-1 pl-2"
      style={{ borderLeft: "1px solid var(--color-border)" }}
    >
      {Object.entries(breakdown).map(([k, v]) => (
        <div key={k} className="flex justify-between">
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              color: "var(--color-text-muted)",
            }}
          >
            {k}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              color: "var(--color-text-secondary)",
            }}
          >
            {Math.round(v * 100)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Property Provenance ──────────────────────────────────────────────────────

const BADGE_COLORS = {
  iapws: "var(--color-approved)",
  coolprop: "var(--color-approved)",
  petroleum_beggs_robinson: "var(--color-approved)",
  "petroleum-named": "var(--color-approved)",
  specialty: "var(--color-approved)",
  thermo: "var(--color-approved)",
  mongodb_cached: "var(--color-approved)",
  petroleum_generic: "var(--color-warning)",
  "petroleum-generic": "var(--color-warning)",
  user_provided: "#60a5fa",
  user_approved_estimate: "var(--color-warning)",
  llm_estimated: "var(--color-warning)",
  derived: "var(--color-text-muted)",
};

const PROP_LABELS = {
  density_kg_m3: "Density",
  viscosity_Pa_s: "Viscosity",
  cp_J_kgK: "Cp",
  k_W_mK: "k",
  Pr: "Pr",
};

const PROP_UNITS = {
  density_kg_m3: "kg/m³",
  viscosity_Pa_s: "Pa·s",
  cp_J_kgK: "J/kg·K",
  k_W_mK: "W/m·K",
  Pr: "",
};

function SourceBadge({ source, label }) {
  const color = BADGE_COLORS[source] ?? "var(--color-text-muted)";
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "9px",
        color,
        border: `1px solid ${color}`,
        borderRadius: "2px",
        padding: "0 4px",
        opacity: 0.85,
      }}
    >
      {label ?? source ?? "Unknown"}
    </span>
  );
}

function PropertyProvenanceSection({ provenance }) {
  const [open, setOpen] = useState(false);
  if (!provenance) return null;

  const fluidEntries = [
    { key: "hot_fluid", entry: provenance.hot_fluid },
    { key: "cold_fluid", entry: provenance.cold_fluid },
  ].filter(({ entry }) => entry != null);

  return (
    <div
      style={{
        marginTop: "8px",
        borderTop: "1px solid var(--color-border)",
        paddingTop: "8px",
      }}
    >
      {/* Header / toggle */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          width: "100%",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            color: "var(--color-text-muted)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Property Provenance
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            color: "var(--color-text-muted)",
            marginLeft: "auto",
          }}
        >
          {open ? "▾ hide" : "▸ show"}
        </span>
      </button>

      {open && (
        <div style={{ marginTop: "8px" }}>
          {fluidEntries.map(({ key, entry }) => (
            <div key={key} style={{ marginBottom: "10px" }}>
              {/* Fluid name + source badge */}
              <div
                className="flex items-center gap-2"
                style={{ marginBottom: "4px" }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                    color: "var(--color-text-secondary)",
                    fontWeight: 600,
                  }}
                >
                  {key === "hot_fluid" ? "Hot" : "Cold"}:{" "}
                  {entry.fluid_name ?? "—"}
                </span>
                <SourceBadge source={entry.source} label={entry.label} />
                {entry.confidence != null && (
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "10px",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    {Math.round(entry.confidence * 100)}%
                  </span>
                )}
              </div>

              {/* Per-property rows */}
              <div
                style={{
                  paddingLeft: "8px",
                  borderLeft: "1px solid var(--color-border)",
                }}
              >
                {Object.entries(entry.properties ?? {}).map(([prop, pdata]) => {
                  const unapproved = pdata.unapproved_ai === true;
                  const badgeColor = unapproved
                    ? "var(--color-error)"
                    : (BADGE_COLORS[pdata.source] ?? "var(--color-text-muted)");
                  const unit = PROP_UNITS[prop] ?? "";
                  const valStr =
                    pdata.value != null
                      ? typeof pdata.value === "number"
                        ? pdata.value.toPrecision(4)
                        : String(pdata.value)
                      : "—";
                  return (
                    <div key={prop} style={{ marginBottom: "3px" }}>
                      <div className="flex items-baseline justify-between">
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "10px",
                            color: "var(--color-text-muted)",
                            minWidth: "80px",
                          }}
                        >
                          {PROP_LABELS[prop] ?? prop}
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "10px",
                            color: "var(--color-text-primary)",
                          }}
                        >
                          {valStr}
                          {unit ? ` ${unit}` : ""}
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "9px",
                            color: badgeColor,
                            border: `1px solid ${badgeColor}`,
                            borderRadius: "2px",
                            padding: "0 4px",
                            opacity: 0.85,
                            marginLeft: "6px",
                          }}
                        >
                          {pdata.label ?? pdata.source ?? "Unknown"}
                        </span>
                        {pdata.confidence != null && (
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: "10px",
                              color: "var(--color-text-muted)",
                              marginLeft: "4px",
                            }}
                          >
                            {Math.round(pdata.confidence * 100)}%
                          </span>
                        )}
                      </div>
                      {pdata.note && (
                        <div
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "9px",
                            color: "var(--color-text-muted)",
                            paddingLeft: "80px",
                          }}
                        >
                          {pdata.note}
                        </div>
                      )}
                      {unapproved && (
                        <div
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "9px",
                            color: "var(--color-warning)",
                            paddingLeft: "80px",
                          }}
                        >
                          AI-estimated — no explicit approval recorded
                        </div>
                      )}
                      {pdata.timestamp && (
                        <div
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "9px",
                            color: "var(--color-text-muted)",
                            paddingLeft: "80px",
                          }}
                        >
                          {new Date(pdata.timestamp).toLocaleString()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function DesignSummary({ design, onOptimize }) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  if (!design) return null;

  const {
    confidence,
    confidenceBreakdown,
    U_overall,
    U_W_m2K,
    area_required,
    A_m2,
    overdesign_pct,
    dP_shell,
    dP_shell_limit,
    dP_tube,
    dP_tube_limit,
    tema_type,
    cost_usd,
    vibration_safe,
    property_provenance,
  } = design;

  const pct = Math.round((confidence ?? 0) * 100);
  const color =
    pct >= 75
      ? "var(--color-approved)"
      : pct >= 55
        ? "var(--color-warning)"
        : "var(--color-error)";

  const uVal = U_overall ?? U_W_m2K;
  const aVal = area_required ?? A_m2;

  return (
    <>
      {/* Shimmer keyframe — scoped to this component */}
      <style>{`
        @keyframes dc-shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>

      <div
        className="animate-step-in"
        style={{
          margin: "10px 16px",
          border: "1px solid var(--color-approved)",
          borderRadius: "3px",
          background: "rgba(34,197,94,0.04)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-3.5 py-2.5"
          style={{ borderBottom: "1px solid rgba(34,197,94,0.15)" }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              color: "var(--color-approved)",
            }}
          >
            ✓
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--color-approved)",
            }}
          >
            Design Complete
          </span>
        </div>

        <div style={{ padding: "10px 14px 12px" }}>
          {/* Confidence row */}
          <div className="flex items-center justify-between mb-1.5">
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                color: "var(--color-text-muted)",
              }}
            >
              Confidence
            </span>
            <button
              onClick={() => setShowBreakdown((o) => !o)}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                color: "var(--color-text-muted)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--color-running)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--color-text-muted)")
              }
            >
              {showBreakdown ? "▾ hide breakdown" : "→ view breakdown"}
            </button>
          </div>

          {/* Bar */}
          <div
            style={{
              height: "6px",
              background: "var(--color-border)",
              borderRadius: "3px",
              overflow: "hidden",
              position: "relative",
              marginBottom: "4px",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${pct}%`,
                background: `linear-gradient(90deg, ${color} 0%, ${color} 100%)`,
                borderRadius: "3px",
                position: "relative",
                overflow: "hidden",
                transition: "width 0.7s ease-out",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)",
                  animation: "dc-shimmer 2s ease-in-out infinite",
                }}
              />
            </div>
          </div>

          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color,
              textAlign: "right",
              marginBottom: "8px",
            }}
          >
            {pct}%
          </div>

          {showBreakdown && (
            <ConfidenceBreakdown breakdown={confidenceBreakdown} />
          )}

          {/* Engineering data rows */}
          {(uVal != null ||
            aVal != null ||
            dP_shell != null ||
            dP_tube != null ||
            tema_type ||
            cost_usd != null ||
            vibration_safe != null) && (
            <div style={{ marginTop: showBreakdown ? "8px" : 0 }}>
              {uVal != null && (
                <DataRow
                  label="U overall"
                  value={uVal.toFixed(0)}
                  unit="W/m²K"
                />
              )}
              {aVal != null && (
                <DataRow
                  label="Area required"
                  value={aVal.toFixed(1)}
                  unit="m²"
                  warn={
                    overdesign_pct != null
                      ? `(+${overdesign_pct.toFixed(1)}% overdesign)`
                      : null
                  }
                />
              )}
              {dP_shell != null && (
                <DataRow
                  label="ΔP shell"
                  value={dP_shell.toFixed(2)}
                  unit="bar"
                  limit={dP_shell_limit}
                />
              )}
              {dP_tube != null && (
                <DataRow
                  label="ΔP tube"
                  value={dP_tube.toFixed(2)}
                  unit="bar"
                  limit={dP_tube_limit}
                />
              )}
              {tema_type && <DataRow label="TEMA type" value={tema_type} />}
              {cost_usd != null && (
                <DataRow
                  label="Cost estimate"
                  value={`$${cost_usd.toLocaleString()}`}
                />
              )}
              {vibration_safe != null && (
                <DataRow
                  label="Vibration"
                  value={vibration_safe ? "✓ Safe" : "✗ Risk"}
                  warn={!vibration_safe ? "⚠ review required" : null}
                />
              )}
            </div>
          )}

          {property_provenance && (
            <PropertyProvenanceSection provenance={property_provenance} />
          )}

          {/* Footer actions */}
          <div
            className="flex items-center gap-4 pt-2 mt-2"
            style={{ borderTop: "1px solid rgba(34,197,94,0.15)" }}
          >
            <button
              disabled
              title="Coming soon"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                color: "var(--color-text-muted)",
                background: "none",
                border: "none",
                cursor: "not-allowed",
                opacity: 0.5,
                padding: 0,
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              ↓ Export PDF
            </button>

            {onOptimize && (
              <button
                onClick={onOptimize}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  color: "var(--color-running)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "var(--color-text-primary)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "var(--color-running)")
                }
              >
                Optimize for cost →
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
