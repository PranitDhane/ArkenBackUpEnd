/**
 * WelcomeScreen — terminal-style empty state.
 * §13.1: centered prompt + 2 example chips. No icons, no gradients.
 */

const EXAMPLE_PROMPTS = [
  'Design a heat exchanger to cool 50 kg/s of crude oil from 150°C to 90°C using cooling water at 30°C',
  'Rate this existing AES shell-and-tube: 500 tubes, 25mm OD, 4880mm length, 0.38m baffle spacing',
];

export default function WelcomeScreen({ onSend }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 px-6">
      <p
        className="text-sm font-medium"
        style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', textWrap: 'balance' }}
      >
        Describe your heat exchanger problem.
      </p>

      <div className="flex flex-col gap-2 w-full max-w-sm">
        {EXAMPLE_PROMPTS.map((prompt, i) => (
          <button
            key={i}
            onClick={() => onSend?.(prompt)}
            className="text-left text-xs px-3 py-2.5 border transition-colors duration-150"
            style={{
              fontFamily:      'var(--font-mono)',
              color:           'var(--color-text-muted)',
              borderColor:     'var(--color-border)',
              backgroundColor: 'transparent',
              borderRadius:    '8px',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor     = 'var(--color-running)';
              e.currentTarget.style.color           = 'var(--color-text-secondary)';
              e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.05)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor     = 'var(--color-border)';
              e.currentTarget.style.color           = 'var(--color-text-muted)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span style={{ color: 'var(--color-running)' }}>▶ </span>
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
