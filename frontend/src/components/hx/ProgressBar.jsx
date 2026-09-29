/**
 * ProgressBar — 3px fill bar + step label, visible while pipeline is running.
 *
 * Props:
 *   currentStep  {number}  1–16
 *   totalSteps   {number}  default 16
 *   stepName     {string}  current step description
 *   isEscalated  {boolean} show ⚠ awaiting input badge instead of ● live
 */

export default function ProgressBar({
  currentStep,
  totalSteps = 16,
  stepName,
  isEscalated = false,
}) {
  const pct = Math.round((currentStep / totalSteps) * 100);

  return (
    <>
      {/* Slim fill bar */}
      <div style={{ height: '3px', background: 'var(--color-border)', flexShrink: 0 }}>
        <div
          className="transition-all duration-500 ease-out"
          style={{
            height:          '100%',
            width:           `${pct}%`,
            backgroundColor: isEscalated ? 'var(--color-escalated)' : 'var(--color-running)',
          }}
        />
      </div>

      {/* Label row */}
      <div
        className="flex items-center gap-2 px-4"
        style={{
          height:          '32px',
          borderBottom:    '1px solid var(--color-border)',
          fontFamily:      'var(--font-mono)',
          fontSize:        '11px',
          flexShrink:      0,
        }}
      >
        <span style={{ color: 'var(--color-text-primary)' }}>
          Step {currentStep} / {totalSteps}
        </span>
        {stepName && (
          <span style={{ color: 'var(--color-text-muted)' }}>
            — {stepName}
          </span>
        )}

        <span style={{ flex: 1 }} />

        {isEscalated ? (
          <span style={{ color: 'var(--color-escalated)' }}>⚠ awaiting input</span>
        ) : (
          <span
            style={{ color: 'var(--color-running)', animation: 'pulse 1.5s ease-in-out infinite' }}
          >
            ● live
          </span>
        )}
      </div>
    </>
  );
}
