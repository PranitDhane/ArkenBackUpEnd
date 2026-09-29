/**
 * Login Page
 *
 * Branded login page with Arken AI text logo.
 * Features:
 * - Autofocus on username input
 * - Enter key form submission
 * - Loading spinner on button
 * - Error display with form state preservation
 * - Redirect if already authenticated
 */

import { useState, useRef, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loader2, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const { isAuthenticated, isLoading: authLoading, login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const usernameRef = useRef(null);

  // Autofocus username field on mount
  useEffect(() => {
    if (usernameRef.current && !authLoading && !isAuthenticated) {
      usernameRef.current.focus();
    }
  }, [authLoading, isAuthenticated]);

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg)' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-text-muted)' }} />
      </div>
    );
  }

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate username
    if (!username.trim()) {
      setError("Username is required");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const result = await login(username.trim(), password);

      if (!result.success) {
        setError(result.error);
        setPassword(""); // Clear password, keep username
      }
      // On success, isAuthenticated will become true → Navigate redirect fires
    } catch {
      setError("Unable to connect. Please try again later.");
      setPassword("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 12px',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    borderRadius: '2px',
    opacity: isSubmitting ? 0.5 : 1,
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <div
        className="w-full max-w-sm border p-8"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor:     'var(--color-border)',
          borderRadius:    '2px',
        }}
      >
        {/* Wordmark */}
        <div className="mb-8">
          <h1
            className="text-sm font-bold tracking-[0.12em] uppercase mb-1"
            style={{ color: 'var(--color-text-primary)' }}
          >
            ARKEN
          </h1>
          <p
            className="text-xs"
            style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
          >
            sign in to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-xs mb-1.5"
              style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
            >
              username
            </label>
            <input
              ref={usernameRef}
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your username"
              disabled={isSubmitting}
              style={inputStyle}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--color-border-focus)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs mb-1.5"
              style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
            >
              password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isSubmitting}
                style={{ ...inputStyle, paddingRight: '36px' }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--color-border-focus)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
              />
              {password && (
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(prev => !prev)}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px',
                    color: 'var(--color-text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword
                    ? <EyeOff className="w-3.5 h-3.5" />
                    : <Eye className="w-3.5 h-3.5" />
                  }
                </button>
              )}
            </div>
          </div>

          {error && (
            <p
              className="text-xs"
              role="alert"
              style={{ color: 'var(--color-error)', fontFamily: 'var(--font-mono)' }}
            >
              ✗ {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 text-sm transition-colors flex items-center justify-center gap-2"
            style={{
              backgroundColor: isSubmitting ? 'var(--color-border)' : 'var(--color-running)',
              color:           'white',
              border:          'none',
              fontFamily:      'var(--font-mono)',
              cursor:          isSubmitting ? 'not-allowed' : 'pointer',
              borderRadius:    '2px',
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                signing in…
              </>
            ) : (
              'sign in'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
