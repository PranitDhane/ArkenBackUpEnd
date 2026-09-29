/**
 * ShareModal — toggle public/private share link for a design.
 *
 * States: idle → generating → shared → revoking → error
 *
 * Props:
 *   conversationId  string   — the conversation to share
 *   isShared        bool     — current share state
 *   shareUrl        string|null — existing share URL (if already shared)
 *   username        string|null — owner username (for ownership check)
 *   onClose         fn       — called when modal should close
 *   onShareChange   fn(isShared, shareUrl) — called after share/revoke completes
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { shareConversation, revokeShare } from '../../api/client';

// ── tiny copy-to-clipboard helper ────────────────────────────────────────────

function useCopyToClipboard() {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);

  const copy = useCallback((text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Clipboard access denied (non-HTTPS or permission blocked) — fail silently
    });
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return { copied, copy };
}

// ── modal ─────────────────────────────────────────────────────────────────────

export default function ShareModal({
  conversationId,
  isShared,
  shareUrl,
  username,
  onClose,
  onShareChange,
}) {
  // track the *current* share state locally so the modal stays reactive
  const [shared, setShared]       = useState(isShared);
  const [currentUrl, setCurrentUrl] = useState(shareUrl || '');
  const [status, setStatus]       = useState('idle'); // idle | loading | error
  const [errorMsg, setErrorMsg]   = useState('');
  const { copied, copy }          = useCopyToClipboard();

  // close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleToggle = useCallback(async () => {
    setStatus('loading');
    setErrorMsg('');
    try {
      if (!shared) {
        // create share link
        const data = await shareConversation(conversationId, username);
        setShared(true);
        setCurrentUrl(data.share_url);
        onShareChange(true, data.share_url);
      } else {
        // revoke share link
        await revokeShare(conversationId, username);
        setShared(false);
        setCurrentUrl('');
        onShareChange(false, null);
      }
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || 'Something went wrong. Try again.');
    }
  }, [shared, conversationId, username, onShareChange]);

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    /* backdrop */
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* panel */}
      <div
        className="flex flex-col"
        style={{
          width:           '420px',
          backgroundColor: 'var(--color-surface)',
          border:          '1px solid var(--color-border)',
          borderRadius:    '2px',
          fontFamily:      'var(--font-mono)',
        }}
      >
        {/* header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <span
            className="text-xs font-bold tracking-widest uppercase"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Share Design
          </span>
          <button
            onClick={onClose}
            style={{ color: 'var(--color-text-muted)', fontSize: '16px', lineHeight: 1 }}
            title="Close"
          >
            ×
          </button>
        </div>

        {/* body */}
        <div className="px-4 py-4 flex flex-col gap-4">

          {/* NDA / confidentiality warning */}
          <div
            className="px-3 py-2 text-xs leading-relaxed"
            style={{
              color:           '#f59e0b',
              backgroundColor: 'rgba(245,158,11,0.08)',
              border:          '1px solid rgba(245,158,11,0.25)',
              borderRadius:    '2px',
            }}
          >
            Sharing publishes your full conversation including all process inputs.
            Do not share designs covered by NDA or client confidentiality.
          </div>

          {/* toggle row */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs" style={{ color: 'var(--color-text-primary)' }}>
                {shared ? 'Public link active' : 'Private'}
              </span>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {shared
                  ? 'Anyone with the link can view this design'
                  : 'Only you can access this design'}
              </span>
            </div>

            {/* toggle switch */}
            <button
              onClick={handleToggle}
              disabled={status === 'loading'}
              style={{
                position:        'relative',
                width:           '40px',
                height:          '22px',
                borderRadius:    '11px',
                border:          'none',
                cursor:          status === 'loading' ? 'not-allowed' : 'pointer',
                backgroundColor: shared ? 'var(--color-running)' : 'var(--color-border)',
                transition:      'background-color 0.15s',
                flexShrink:      0,
                opacity:         status === 'loading' ? 0.6 : 1,
              }}
              title={shared ? 'Make private' : 'Create public link'}
            >
              <span
                style={{
                  position:        'absolute',
                  top:             '3px',
                  left:            shared ? '21px' : '3px',
                  width:           '16px',
                  height:          '16px',
                  borderRadius:    '50%',
                  backgroundColor: '#fff',
                  transition:      'left 0.15s',
                }}
              />
            </button>
          </div>

          {/* URL row — only shown when shared */}
          {shared && currentUrl && (
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={currentUrl}
                className="flex-1 text-xs px-2 py-1.5 bg-transparent border truncate"
                style={{
                  color:        'var(--color-text-secondary)',
                  borderColor:  'var(--color-border)',
                  borderRadius: '2px',
                  outline:      'none',
                  minWidth:     0,
                }}
                onClick={(e) => e.target.select()}
              />
              <button
                onClick={() => copy(currentUrl)}
                className="text-xs px-3 py-1.5 border transition-colors flex-shrink-0"
                style={{
                  color:           copied ? 'var(--color-success, #22c55e)' : 'var(--color-running)',
                  borderColor:     copied ? 'var(--color-success, #22c55e)' : 'var(--color-running)',
                  backgroundColor: 'transparent',
                  borderRadius:    '2px',
                  minWidth:        '64px',
                }}
                onMouseEnter={e => { if (!copied) e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.08)'; }}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          )}

          {/* loading indicator */}
          {status === 'loading' && (
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {shared ? 'Revoking link…' : 'Generating link…'}
            </span>
          )}

          {/* error */}
          {status === 'error' && (
            <span className="text-xs" style={{ color: 'var(--color-error, #ef4444)' }}>
              {errorMsg}
            </span>
          )}

          {/* revoke note */}
          {shared && status !== 'loading' && (
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Revoking this link permanently invalidates it. Re-sharing creates a new URL.
            </span>
          )}
        </div>

        {/* footer */}
        <div
          className="flex justify-end px-4 py-3 border-t"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <button
            onClick={onClose}
            className="text-xs px-4 py-1.5 border transition-colors"
            style={{
              fontFamily:      'var(--font-mono)',
              color:           'var(--color-text-secondary)',
              borderColor:     'var(--color-border)',
              backgroundColor: 'transparent',
              borderRadius:    '2px',
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
