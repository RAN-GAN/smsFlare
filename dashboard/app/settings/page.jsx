'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'react-qr-code';
import AppLayout from '../components/AppLayout.jsx';
import { authApi, apiKeyApi, dataApi } from '../lib/api';
import useAuthStore from '../store/auth.js';

function Section({ title, subtitle, children }) {
  return (
    <div className="bg-surface border border-border rounded-[10px] overflow-hidden">
      <div className="px-5 py-4.5 md:px-[22px] md:py-[18px] border-b border-border">
        <h2 className={`text-[14px] font-semibold text-text-1 ${subtitle ? 'mb-0.5' : 'mb-0'}`}>
          {title}
        </h2>
        {subtitle && (
          <p className="text-[12.5px] text-text-2 mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="p-5 md:p-[22px]">
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
    <div className="w-full">
      {label && <div className="sf-label">{label}</div>}
      <div className="flex bg-surface-2 border border-border-2 rounded-md overflow-hidden">
        <div className="flex-1 p-2.25 px-3 font-mono text-[12px] text-text-2 overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
          {value}
        </div>
        <button
          onClick={copy}
          className={`px-3.5 border-none border-l border-border font-mono text-[11.5px] font-medium cursor-pointer transition-all whitespace-nowrap ${
            copied ? 'bg-[var(--accent-subtle)] text-accent' : 'bg-surface-3 text-text-2'
          }`}
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
      <div className="sf-page-header px-5 py-6 md:px-8 md:py-6">
        <div>
          <h1 className="sf-page-title">Settings</h1>
          <p className="sf-page-subtitle">Devices, API keys, and account management</p>
        </div>
      </div>

      <div className="sf-page-content p-5 md:p-8">
        {error && (
          <div className="sf-alert-error mb-5">{error}</div>
        )}

        <div className="flex flex-col gap-4 max-w-[680px]">

          {/* Device Pairing */}
          <Section title="Device Pairing" subtitle="Generate a one-time token to pair a new Android device">
            {!showPairingToken ? (
              <button
                onClick={handleGeneratePairingToken}
                disabled={loading}
                className="sf-btn-primary px-4.5 py-2.25 w-full sm:w-auto"
              >
                {loading ? 'Generating...' : 'Generate Pairing Token'}
              </button>
            ) : (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
                  {/* QR Code */}
                  <div className="p-3.5 bg-white rounded-lg shrink-0">
                    <QRCode value={qrValue} size={140} />
                  </div>

                  {/* Manual fallback */}
                  <div className="flex-1 flex flex-col gap-3 min-w-0 w-full">
                    <p className="text-[13px] text-text-2">
                      Scan the QR code with the Android app, or enter the token manually.
                    </p>
                    <CopyableCode value={pairingToken} label="Pairing Token (expires in 1 hour)" />
                    <div>
                      <div className="sf-label">API URL</div>
                      <code className="font-mono text-[12px] text-text-2 break-all">
                        {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'}
                      </code>
                    </div>
                    <button
                      onClick={() => { setShowPairingToken(false); setPairingToken(''); }}
                      className="bg-transparent border-none text-text-3 text-[12.5px] cursor-pointer text-left p-0 transition-colors hover:text-text-2"
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
              className="sf-btn-ghost mb-5 w-full sm:w-auto"
            >
              {loading ? 'Creating...' : 'Create API Key'}
            </button>

            {apiKeys.length > 0 ? (
              <div className="bg-surface-2 border border-border rounded-lg overflow-x-auto">
                <table className="sf-table min-w-[400px] sm:min-w-0">
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
                        <td className="font-mono text-[12.5px] text-text-1">
                          {key.key_preview}
                        </td>
                        <td className="font-mono text-[12px]">
                          {new Date(key.created_at * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="font-mono text-[12px]">
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
              <p className="text-[13px] text-text-3">No API keys yet.</p>
            )}
          </Section>

          {/* Integration */}
          <Section title="Integration Guide" subtitle="Send SMS programmatically via the REST API">
            <div className="flex flex-col gap-4">
              <div>
                <div className="sf-label">Send SMS</div>
                <pre className="sf-code-block">{`curl -X POST https://your-worker.workers.dev/api/sms/send \\
          -H "Authorization: Bearer YOUR_API_KEY" \\
          -H "Content-Type: application/json" \\
          -d '{"to": "+14155552671", "message": "Hello from SMS Flare!"}'`}</pre>
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
            <div className="flex flex-col gap-3.5">
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
            <form onSubmit={handleChangePassword} className="flex flex-col gap-3.5 max-w-[320px]">
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
                <button type="submit" disabled={loading} className="sf-btn-ghost px-4.5 py-2.25 w-full sm:w-auto">
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </Section>

          {/* Danger Zone */}
          <div className="bg-surface border border-[rgba(248,113,113,0.2)] rounded-[10px] overflow-hidden">
            <div className="px-5 py-4.5 md:px-[22px] md:py-[18px] border-b border-[rgba(248,113,113,0.15)]">
              <h2 className="text-[14px] font-semibold text-[#F87171]">Danger Zone</h2>
              <p className="text-[12.5px] text-text-3 mt-0.5">
                These actions are permanent and cannot be undone.
              </p>
            </div>
            <div className="p-5 md:p-[22px] flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 px-4 bg-surface-2 border border-border rounded-lg gap-4">
                <div>
                  <p className="text-[13.5px] font-medium text-text-1 mb-0.5">
                    Clear SMS History
                  </p>
                  <p className="text-[12px] text-text-3">
                    Delete all SMS jobs and delivery logs.
                  </p>
                </div>
                <button onClick={handleClearHistory} disabled={loading} className="sf-btn-danger whitespace-nowrap w-full sm:w-auto">
                  Clear History
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 px-4 bg-[rgba(248,113,113,0.04)] border border-[rgba(248,113,113,0.2)] rounded-lg gap-4">
                <div>
                  <p className="text-[13.5px] font-medium text-[#F87171] mb-0.5">
                    Delete Account
                  </p>
                  <p className="text-[12px] text-text-3">
                    Remove account, all devices, jobs, and API keys.
                  </p>
                </div>
                <button
                  onClick={handleDeleteAccount}
                  disabled={loading}
                  className="bg-[#F87171] border-none rounded-md text-white px-4 py-2 text-[13.5px] font-medium cursor-pointer transition-opacity whitespace-nowrap w-full sm:w-auto hover:opacity-90 disabled:opacity-40"
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
