/**
 * Layout — ARKEN app shell.
 *
 * Structure:
 *   Header (full width, h-11)
 *   └── [HistorySidebar 240px?] | [ChatPanel 28%] | [4px handle] | [HXPanel 72%]
 *
 * The history sidebar slides in from the left (toggled by Header's ≡ button).
 * The 28/72 split is draggable.
 *
 * Children must be exactly two elements: [ChatPanel, HXPanel]
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import Header from './Header';
import HistorySidebar from './HistorySidebar';

const MIN_CHAT_PCT  = 20;
const MAX_CHAT_PCT  = 50;
const DEFAULT_PCT   = 28;
const MOBILE_BREAKPOINT = 1024;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

export default function Layout({ children }) {
  const [chatPct,        setChatPct]        = useState(DEFAULT_PCT);
  const [sidebarOpen,    setSidebarOpen]    = useState(false);
  const [activeTab,      setActiveTab]      = useState('chat'); // mobile tab
  const containerRef = useRef(null);
  const dragging     = useRef(false);
  const isMobile     = useIsMobile();

  const toggleSidebar = useCallback(() => setSidebarOpen(o => !o), []);

  const onMouseDown = useCallback(() => {
    dragging.current = true;
    document.body.style.cursor     = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (e) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct  = ((e.clientX - rect.left) / rect.width) * 100;
      setChatPct(Math.min(MAX_CHAT_PCT, Math.max(MIN_CHAT_PCT, pct)));
    };

    const onUp = () => {
      dragging.current               = false;
      document.body.style.cursor     = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
  }, []);

  const onKeyDown = useCallback((e) => {
    if (e.key === 'ArrowLeft')  setChatPct(p => Math.max(MIN_CHAT_PCT, p - 1));
    if (e.key === 'ArrowRight') setChatPct(p => Math.min(MAX_CHAT_PCT, p + 1));
  }, []);

  const [chatPanel, hxPanel] = Array.isArray(children) ? children : [children, null];

  return (
    <div
      className="flex flex-col h-screen"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <Header onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />

      {/* ── Mobile: tab bar + single panel ─────────────────── */}
      {isMobile && (
        <>
          <div
            className="flex shrink-0 border-b"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
          >
            {[
              { id: 'chat', label: 'Chat' },
              { id: 'hx',   label: 'HX Pipeline' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 py-2.5 text-xs tracking-wide transition-colors"
                style={{
                  fontFamily: 'var(--font-mono)',
                  color: activeTab === tab.id ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                  borderBottom: activeTab === tab.id ? '2px solid var(--color-running)' : '2px solid transparent',
                  backgroundColor: 'transparent',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col flex-1 min-h-0">
            {activeTab === 'chat' ? chatPanel : hxPanel}
          </div>
        </>
      )}

      {/* ── Desktop: sidebar + draggable split ─────────────── */}
      {!isMobile && (
        <div className="flex flex-1 min-h-0">
          {/* History sidebar (240px, collapsible) */}
          <HistorySidebar isOpen={sidebarOpen} />

          {/* Split panels */}
          <div ref={containerRef} className="flex flex-1 min-h-0 min-w-0">

            {/* Chat panel */}
            <div
              className="flex flex-col min-h-0 border-r"
              style={{
                width:       `${chatPct}%`,
                borderColor: 'var(--color-border)',
              }}
            >
              {chatPanel}
            </div>

            {/* Resize handle */}
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize panels"
              aria-valuenow={Math.round(chatPct)}
              aria-valuemin={MIN_CHAT_PCT}
              aria-valuemax={MAX_CHAT_PCT}
              tabIndex={0}
              className="resize-handle w-1 shrink-0 focus:outline-none"
              onMouseDown={onMouseDown}
              onKeyDown={onKeyDown}
            />

            {/* HX progress panel */}
            <div className="flex flex-col min-h-0 flex-1">
              {hxPanel}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
