'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'react-qr-code';
import AppLayout from '../components/AppLayout.jsx';
import { authApi, apiKeyApi, dataApi } from '../lib/api';
import useAuthStore from '../store/auth.js';

function Section({ title, subtitle, children }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '10px',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '18px 22px',
        borderBottom: '1px solid var(--border)',
      }}>
        <h2 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-1)', marginBottom: subtitle ? '2px' : 0 }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ fontSize: '12.5px', color: 'var(--text-2)', marginTop: '2px' }}>{subtitle}</p>
        )}
      </div>
      <div style={{ padding: '22px' }}>
        {children}
      </div>
    </div>
  );
}

function CopyableCode({ value, label }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div>
      {label && <div className="sf-label">{label}</div>}
      <div style={{
        display: 'flex',
        gap: '0',
        background: 'var(--surface-2)',
        border: '1px solid var(--border-2)',
        borderRadius: '6px',
        overflow: 'hidden',
      }}>
        <div style={{
          flex: 1,
          padding: '9px 12px',
          fontFamily: 'DM Mono, monospace',
          fontSize: '12px',
          color: 'var(--text-2)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {value}
        </div>
        <button
          onClick={copy}
          style={{
            padding: '0 14px',
            background: copied ? 'var(--accent-subtle)' : 'var(--surface-3)',
            border: 'none',
            borderLeft: '1px solid var(--border)',
            color: copied ? 'var(--accent)' : 'var(--text-2)',
            fontFamily: 'DM Mono, monospace',
            fontSize: '11.5px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.12s',
            whiteSpace: 'nowrap',
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [pairingToken, setPairingToken] = useState('');
  const [apiKeys, setApiKeys] = useState([]);
  const [showPairingToken, setShowPairingToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState(null);

  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => { loadApiKeys(); }, []);

  const loadApiKeys = async () => {
    try {
      const data = await apiKeyApi.list();
      setApiKeys(data.api_keys || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGeneratePairingToken = async () => {
    setLoading(true);
    try {
      const data = await authApi.generatePairingToken();
      setPairingToken(data.pairing_token);
      setShowPairingToken(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const qrValue = pairingToken
    ? JSON.stringify({ token: pairingToken, api_url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787' })
    : '';

  const handleGenerateApiKey = async () => {
    setLoading(true);
    try {
      const data = await apiKeyApi.create();
      alert(`API Key: ${data.api_key}\n\nSave this somewhere safe — it will not be shown again.`);
      loadApiKeys();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }
    setLoading(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMsg({ type: 'success', text: 'Password updated successfully' });
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm('Delete all SMS jobs and delivery logs? This cannot be undone.')) return;
    setLoading(true);
    try {
      await dataApi.clearSmsHistory();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Permanently delete your account and all data? This cannot be undone.')) return;
    if (!confirm('Are you absolutely sure? This is irreversible.')) return;
    setLoading(true);
    try {
      await authApi.deleteAccount();
      logout();
      router.push('/auth/login');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="sf-page-header">
        <div>
          <h1 className="sf-page-title">Settings</h1>
          <p className="sf-page-subtitle">Devices, API keys, and account management</p>
        </div>
      </div>

      <div className="sf-page-content">
        {error && (
          <div className="sf-alert-error" style={{ marginBottom: '20px' }}>{error}</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '680px' }}>

          {/* Device Pairing */}
          <Section title="Device Pairing" subtitle="Generate a one-time token to pair a new Android device">
            {!showPairingToken ? (
              <button
                onClick={handleGeneratePairingToken}
                disabled={loading}
                className="sf-btn-primary"
                style={{ padding: '9px 18px' }}
              >
                {loading ? 'Generating...' : 'Generate Pairing Token'}
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  {/* QR Code */}
                  <div style={{
                    padding: '14px',
                    background: '#ffffff',
                    borderRadius: '8px',
                    flexShrink: 0,
                  }}>
                    <QRCode value={qrValue} size={140} />
                  </div>

                  {/* Manual fallback */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '220px' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-2)' }}>
                      Scan the QR code with the Android app, or enter the token manually.
                    </p>
                    <CopyableCode value={pairingToken} label="Pairing Token (expires in 1 hour)" />
                    <div>
                      <div className="sf-label">API URL</div>
                      <code style={{
                        fontFamily: 'DM Mono, monospace',
                        fontSize: '12px',
                        color: 'var(--text-2)',
                      }}>
                        {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'}
                      </code>
                    </div>
                    <button
                      onClick={() => { setShowPairingToken(false); setPairingToken(''); }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-3)',
                        fontSize: '12.5px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        padding: '0',
                        transition: 'color 0.12s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--text-2)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
                    >
                      Generate a new token
                    </button>
                  </div>
                </div>
              </div>
            )}
          </Section>

          {/* API Keys */}
          <Section title="API Keys" subtitle="Authenticate programmatic requests to send SMS">
            <button
              onClick={handleGenerateApiKey}
              disabled={loading}
              className="sf-btn-ghost"
              style={{ marginBottom: '20px' }}
            >
              {loading ? 'Creating...' : 'Create API Key'}
            </button>

            {apiKeys.length > 0 ? (
              <div style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                overflow: 'hidden',
              }}>
                <table className="sf-table">
                  <thead>
                    <tr>
                      <th>Key Preview</th>
                      <th>Created</th>
                      <th>Expires</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apiKeys.map((key) => (
                      <tr key={key.id}>
                        <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '12.5px', color: 'var(--text-1)' }}>
                          {key.key_preview}
                        </td>
                        <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px' }}>
                          {new Date(key.created_at * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px' }}>
                          {key.expires_at
                            ? new Date(key.expires_at * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : 'Never'
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: 'var(--text-3)' }}>No API keys yet.</p>
            )}
          </Section>

          {/* Integration */}
          <Section title="Integration Guide" subtitle="Send SMS programmatically via the REST API">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div className="sf-label">Send SMS</div>
                <pre className="sf-code-block">{`curl -X POST ${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'}/api/sms/send \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"to": "+1234567890", "message": "Hello from SMS Flare!"}'`}</pre>
              </div>
              <div>
                <div className="sf-label">Response</div>
                <pre className="sf-code-block">{`{
  "job_id": "abc123def456",
  "status": "pending",
  "assigned_device": "device_xyz"
}`}</pre>
              </div>
            </div>
          </Section>

          {/* Your Data */}
          <Section title="Your Data" subtitle="All data lives in your Cloudflare D1 database — you own it entirely">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <div className="sf-label">Inspect directly</div>
                <pre className="sf-code-block">{`# Recent SMS jobs
wrangler d1 execute smsflare \\
  --command "SELECT * FROM sms_jobs ORDER BY created_at DESC LIMIT 50"

# Registered devices
wrangler d1 execute smsflare \\
  --command "SELECT id, device_model, online, last_heartbeat FROM devices"`}</pre>
              </div>
              <div>
                <div className="sf-label">Export to SQL</div>
                <pre className="sf-code-block">{`wrangler d1 export smsflare --output backup.sql`}</pre>
              </div>
            </div>
          </Section>

          {/* Change Password */}
          <Section title="Change Password">
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '320px' }}>
              <div>
                <label className="sf-label">Current Password</label>
                <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required className="sf-input" />
              </div>
              <div>
                <label className="sf-label">New Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} placeholder="Min. 8 characters" className="sf-input" />
              </div>
              <div>
                <label className="sf-label">Confirm New Password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="sf-input" />
              </div>
              {passwordMsg && (
                <div className={passwordMsg.type === 'success' ? 'sf-alert-success' : 'sf-alert-error'}>
                  {passwordMsg.text}
                </div>
              )}
              <div>
                <button type="submit" disabled={loading} className="sf-btn-ghost" style={{ padding: '9px 18px' }}>
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </Section>

          {/* Danger Zone */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid rgba(248, 113, 113, 0.2)',
            borderRadius: '10px',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '18px 22px',
              borderBottom: '1px solid rgba(248, 113, 113, 0.15)',
            }}>
              <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#F87171' }}>Danger Zone</h2>
              <p style={{ fontSize: '12.5px', color: 'var(--text-3)', marginTop: '2px' }}>
                These actions are permanent and cannot be undone.
              </p>
            </div>
            <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                gap: '16px',
              }}>
                <div>
                  <p style={{ fontSize: '13.5px', fontWeight: '500', color: 'var(--text-1)', marginBottom: '2px' }}>
                    Clear SMS History
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                    Delete all SMS jobs and delivery logs.
                  </p>
                </div>
                <button onClick={handleClearHistory} disabled={loading} className="sf-btn-danger" style={{ whiteSpace: 'nowrap' }}>
                  Clear History
                </button>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                background: 'rgba(248, 113, 113, 0.04)',
                border: '1px solid rgba(248, 113, 113, 0.2)',
                borderRadius: '8px',
                gap: '16px',
              }}>
                <div>
                  <p style={{ fontSize: '13.5px', fontWeight: '500', color: '#F87171', marginBottom: '2px' }}>
                    Delete Account
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                    Remove account, all devices, jobs, and API keys.
                  </p>
                </div>
                <button
                  onClick={handleDeleteAccount}
                  disabled={loading}
                  style={{
                    background: '#F87171',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#fff',
                    padding: '8px 16px',
                    fontSize: '13.5px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    opacity: loading ? 0.4 : 1,
                    whiteSpace: 'nowrap',
                    transition: 'opacity 0.12s',
                  }}
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
