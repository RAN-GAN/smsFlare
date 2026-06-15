'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '../../store/auth.js';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
      await login(email, password, apiUrl);
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background grid pattern */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(var(--border) 1px, transparent 1px),
          linear-gradient(90deg, var(--border) 1px, transparent 1px)
        `,
        backgroundSize: '48px 48px',
        opacity: 0.4,
        pointerEvents: 'none',
      }} />

      {/* Radial glow */}
      <div style={{
        position: 'absolute',
        top: '30%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '500px',
        height: '400px',
        background: 'radial-gradient(ellipse, rgba(253, 186, 116, 0.04) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
        {/* Logo mark */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '32px',
          justifyContent: 'center',
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'var(--accent)',
            boxShadow: '0 0 12px var(--accent-glow)',
          }} />
          <span style={{
            fontFamily: 'DM Mono, monospace',
            fontSize: '13px',
            fontWeight: '500',
            letterSpacing: '0.12em',
            color: 'var(--text-1)',
          }}>
            SMSFLARE
          </span>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '32px',
        }}>
          <h1 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: 'var(--text-1)',
            marginBottom: '4px',
            letterSpacing: '-0.015em',
          }}>
            Welcome back
          </h1>
          <p style={{
            fontSize: '13.5px',
            color: 'var(--text-2)',
            marginBottom: '28px',
          }}>
            Sign in to your instance
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label className="sf-label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@example.com"
                className="sf-input"
              />
            </div>

            <div>
              <label className="sf-label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="sf-input"
              />
            </div>

            {error && (
              <div className="sf-alert-error">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="sf-btn-primary"
              style={{ width: '100%', padding: '10px', marginTop: '4px' }}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <p style={{
          textAlign: 'center',
          marginTop: '20px',
          fontSize: '12px',
          color: 'var(--text-3)',
          fontFamily: 'DM Mono, monospace',
        }}>
          self-hosted instance
        </p>
      </div>
    </div>
  );
}
