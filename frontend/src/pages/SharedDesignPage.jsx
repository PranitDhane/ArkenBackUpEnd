/**
 * SharedDesignPage — public read-only view of a shared HX design.
 *
 * Route: /share/:token  (no auth required)
 *
 * Fetches GET /api/share/:token and renders:
 *   - Design title + created date
 *   - Full message history (MessageBubble)
 *   - HX pipeline step cards (StepCard)
 *   - "View in ARKEN" CTA if user is authenticated
 *
 * States: loading → active → 404/revoked → error
 */

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSharedDesign } from '../api/client';
import MessageBubble from '../components/chat/MessageBubble';
import StepCard from '../components/hx/StepCard';

// ── Step name lookup (mirrors the HX pipeline §6 of master plan) ────────────────────
// Must stay in sync with engine PIPELINE_STEPS in
// hx_design_engine/hx_engine/app/core/pipeline_runner.py and the
// STEP_NAMES array in frontend/src/components/hx/HXPanel.jsx.

const STEP_NAMES = {
  1:  'Parse & Validate Requirements',
  2:  'Calculate Heat Duty',
  3:  'Fluid Properties',
  4:  'TEMA Type & Initial Geometry',
  5:  'LMTD & Correction Factor',
  6:  'Initial U & Size',
  7:  'Tube-Side Heat Transfer',
  8:  'Shell-Side Heat Transfer',
  9:  'Overall Heat Transfer',
  10: 'Pressure Drop Validation',
  11: 'Area & Overdesign',
  12: 'Geometry Iteration',
  13: 'Vibration Safety Check',
  14: 'Mechanical Design',
  15: 'Cost Estimate',
  16: 'Final Design Validation',
};

function stepName(stepId) {
  return STEP_NAMES[stepId] || stepId;
}

// ── Loading skeleton ───────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      {[1, 2, 3].map(i => (
        <div
          key={i}
          style={{
            height:          i === 1 ? '40px' : '80px',
            backgroundColor: 'var(--color-border)',
            borderRadius:    '2px',
            opacity:         0.4,
          }}
        />
      ))}
    </div>
  );
}

// ── 404 / revoked state ────────────────────────────────────────────────────────

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <span style={{ fontSize: '32px' }}>🔒</span>
      <p
        className="text-sm"
        style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}
      >
        This design is no longer available.
      </p>
      <p
        className="text-xs"
        style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
      >
        The link may have been revoked by the owner.
      </p>
      <Link
        to="/login"
        className="text-xs px-4 py-2 border transition-colors mt-2"
        style={{
          fontFamily:      'var(--font-mono)',
          color:           'var(--color-running)',
          borderColor:     'var(--color-running)',
          backgroundColor: 'transparent',
          borderRadius:    '2px',
          textDecoration:  'none',
        }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.08)'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        Sign in to ARKEN
      </Link>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SharedDesignPage() {
  const { token } = useParams();
  const [status,  setStatus]  = useState('loading');   // loading | active | not_found | error
  const [design,  setDesign]  = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await getSharedDesign(token);
        if (!cancelled) {
          setDesign(data);
          setStatus('active');
        }
      } catch (err) {
        if (!cancelled) {
          setStatus(err.message === 'not_found' ? 'not_found' : 'error');
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [token]);

  // ── chrome ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--color-bg, #0f1117)' }}
    >
      {/* top bar */}
      <div
        className="flex items-center justify-between px-6 py-3 border-b"
        style={{
          borderColor:     'var(--color-border, #2a2d3a)',
          backgroundColor: 'var(--color-surface, #13161f)',
        }}
      >
        <span
          className="text-sm font-bold tracking-widest"
          style={{
            fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
            color:      'var(--color-text-primary, #e8eaf0)',
          }}
        >
          ARKEN AI
        </span>
        <span
          className="text-xs px-2 py-0.5 border"
          style={{
            fontFamily:  'var(--font-mono, "JetBrains Mono", monospace)',
            color:       'var(--color-text-muted, #6b7280)',
            borderColor: 'var(--color-border, #2a2d3a)',
            borderRadius:'2px',
          }}
        >
          Read-only share
        </span>
      </div>

      {/* content */}
      <div
        className="mx-auto px-4 py-8"
        style={{ maxWidth: '780px' }}
      >
        {status === 'loading' && <LoadingSkeleton />}
        {(status === 'not_found' || status === 'error') && <NotFound />}

        {status === 'active' && design && (
          <div className="flex flex-col gap-8">
            {/* design header */}
            <div className="flex flex-col gap-1">
              <h1
                className="text-base font-medium"
                style={{
                  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                  color:      'var(--color-text-primary, #e8eaf0)',
                }}
              >
                {design.title || 'Untitled design'}
              </h1>
              <span
                className="text-xs"
                style={{
                  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                  color:      'var(--color-text-muted, #6b7280)',
                }}
              >
                {new Date(design.created_at).toLocaleDateString(undefined, {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </span>
            </div>

            {/* HX step cards — shown above chat if present */}
            {design.hx_steps && design.hx_steps.length > 0 && (
              <div className="flex flex-col gap-2">
                <span
                  className="text-xs font-bold tracking-widest uppercase"
                  style={{
                    fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                    color:      'var(--color-text-muted, #6b7280)',
                  }}
                >
                  Pipeline steps
                </span>
                {design.hx_steps.map((s) => (
                  <StepCard
                    key={s.step_id}
                    step={s.step_number}
                    name={stepName(s.step_id)}
                    state={s.status}
                    elapsed={null}
                    data={s.result || {}}
                  />
                ))}
              </div>
            )}

            {/* message history */}
            {design.messages && design.messages.length > 0 && (
              <div className="flex flex-col">
                <span
                  className="text-xs font-bold tracking-widest uppercase mb-4"
                  style={{
                    fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                    color:      'var(--color-text-muted, #6b7280)',
                  }}
                >
                  Conversation
                </span>
                {design.messages.map((msg, idx) => (
                  <MessageBubble
                    key={msg.message_id || idx}
                    message={msg}
                    isLastAssistant={false}
                    isLastUser={false}
                  />
                ))}
              </div>
            )}

            {/* CTA footer */}
            <div
              className="flex flex-col items-center gap-3 py-8 border-t"
              style={{ borderColor: 'var(--color-border, #2a2d3a)' }}
            >
              <p
                className="text-xs text-center"
                style={{
                  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                  color:      'var(--color-text-muted, #6b7280)',
                }}
              >
                Design your own heat exchangers with ARKEN AI
              </p>
              <Link
                to="/login"
                className="text-xs px-5 py-2 border transition-colors"
                style={{
                  fontFamily:      'var(--font-mono, "JetBrains Mono", monospace)',
                  color:           'var(--color-running, #3b82f6)',
                  borderColor:     'var(--color-running, #3b82f6)',
                  backgroundColor: 'transparent',
                  borderRadius:    '2px',
                  textDecoration:  'none',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.08)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                Get started
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
