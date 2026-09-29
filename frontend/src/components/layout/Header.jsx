/**
 * Header — app bar.
 *
 * Left:  ≡ toggle (history sidebar) + ARKEN wordmark
 * Right: connection status + username + sign out
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { checkHealth } from '../../api/client';

function StatusDot({ healthy, loading }) {
  if (loading) return (
    <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-600 animate-pulse" title="Checking…" />
  );
  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full ${healthy ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}
      title={healthy ? 'Connected' : 'Disconnected'}
    />
  );
}

export default function Header({ onToggleSidebar, sidebarOpen }) {
  const { username, logout } = useAuth();
  const navigate = useNavigate();
  const [health,  setHealth]  = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const data = await checkHealth();
        setHealth(data);
      } catch {
        setHealth({ status: 'unhealthy' });
      } finally {
        setLoading(false);
      }
    };
    check();
    const t = setInterval(check, 30000);
    return () => clearInterval(t);
  }, []);

  const healthy = health?.status === 'healthy';

  return (
    <header
      className="h-11 flex items-center justify-between px-3 shrink-0 border-b"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor:     'var(--color-border)',
      }}
    >
      {/* Left: sidebar toggle + wordmark */}
      <div className="flex items-center gap-2.5">
        {/* Sidebar toggle */}
        <button
          onClick={onToggleSidebar}
          className="flex items-center justify-center w-11 h-11 transition-colors"
          style={{
            color:           sidebarOpen ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
            borderRadius:    '2px',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = sidebarOpen ? 'var(--color-text-primary)' : 'var(--color-text-muted)'}
          title={sidebarOpen ? 'Close history' : 'Design history'}
          aria-label="Toggle design history"
        >
          {/* Hamburger icon */}
          <svg width="15" height="12" viewBox="0 0 15 12" fill="none">
            <rect y="0"  width="15" height="1.5" rx="0.75" fill="currentColor" />
            <rect y="5"  width="15" height="1.5" rx="0.75" fill="currentColor" />
            <rect y="10" width="15" height="1.5" rx="0.75" fill="currentColor" />
          </svg>
        </button>

        {/* Wordmark */}
        <span
          className="text-sm font-bold tracking-[0.12em] uppercase select-none"
          style={{ color: 'var(--color-text-primary)' }}
        >
          ARKEN
        </span>
      </div>

      {/* Right: status + user */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <StatusDot healthy={healthy} loading={loading} />
          <span
            className="text-xs hidden sm:inline"
            style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
          >
            {loading ? 'checking…' : healthy ? 'connected' : 'disconnected'}
          </span>
        </div>

        {username && (
          <>
            <span style={{ color: 'var(--color-border)' }}>|</span>
            <span
              className="text-xs hidden sm:inline"
              style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}
            >
              {username}
            </span>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="text-xs transition-colors px-2 h-11"
              style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--color-error)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
              aria-label="Sign out"
            >
              sign out
            </button>
          </>
        )}
      </div>
    </header>
  );
}
