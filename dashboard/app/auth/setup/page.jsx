'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export default function SetupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403) {
          router.push('/auth/login/');
          return;
        }
        throw new Error(data.error || 'Setup failed');
      }
      Cookies.set('token', data.token, { expires: 7 });
      router.push('/dashboard/');
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
      {/* Background grid */}
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

      <div style={{ position: 'relative', width: '100%', maxWidth: '420px' }}>
        {/* Logo */}
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
          {/* Setup badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--accent-subtle)',
            border: '1px solid var(--accent-muted)',
            borderRadius: '4px',
            padding: '4px 10px',
            marginBottom: '16px',
          }}>
            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent)' }} />
            <span style={{
              fontFamily: 'DM Mono, monospace',
              fontSize: '11px',
              fontWeight: '500',
              letterSpacing: '0.06em',
              color: 'var(--accent)',
              textTransform: 'uppercase',
            }}>
              First-time setup
            </span>
          </div>

          <h1 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: 'var(--text-1)',
            marginBottom: '4px',
            letterSpacing: '-0.015em',
          }}>
            Create admin account
          </h1>
          <p style={{
            fontSize: '13px',
            color: 'var(--text-2)',
            marginBottom: '28px',
            lineHeight: '1.5',
          }}>
            This page is only available once. Set up your credentials to access this instance.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label className="sf-label">Admin Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@yourdomain.com"
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
                minLength={8}
                placeholder="Min. 8 characters"
                className="sf-input"
              />
            </div>

            <div>
              <label className="sf-label">Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
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
              {loading ? 'Creating account...' : 'Create Admin Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
