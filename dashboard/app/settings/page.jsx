'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import QRCode from 'react-qr-code';
import { useRouter } from 'next/navigation';
import { authApi, apiKeyApi, dataApi } from '../lib/api';
import useAuthStore from '../store/auth.js';

export default function SettingsPage() {
  const [pairingToken, setPairingToken] = useState('');
  const [apiKeys, setApiKeys] = useState([]);
  const [showPairingToken, setShowPairingToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    loadApiKeys();
  }, []);

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
    ? JSON.stringify({
        token: pairingToken,
        api_url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787',
      })
    : '';

  const handleGenerateApiKey = async () => {
    setLoading(true);
    try {
      const data = await apiKeyApi.create();
      // Show the key once
      alert(`API Key: ${data.api_key}\n\nSave this somewhere safe. You won't be able to see it again!`);
      loadApiKeys();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(pairingToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState(null); // { type: 'success'|'error', text }

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
      setPasswordMsg({ type: 'success', text: 'Password changed successfully' });
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
    if (!confirm('Permanently delete your account and all data (devices, jobs, API keys)? This cannot be undone.')) return;
    if (!confirm('Are you sure? This is irreversible.')) return;
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 font-semibold">
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600 mb-8">Manage your devices and API access</p>

        {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>}

        <div className="space-y-6">
          {/* Device Pairing */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Device Pairing</h2>
            <p className="text-gray-600 mb-4">Generate a token to pair a new Android device</p>

            {!showPairingToken ? (
              <button
                onClick={handleGeneratePairingToken}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition duration-200"
              >
                {loading ? 'Generating...' : 'Generate Pairing Token'}
              </button>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                  {/* QR code */}
                  <div className="flex-shrink-0 p-4 bg-white border border-gray-200 rounded-lg">
                    <QRCode value={qrValue} size={160} />
                    <p className="text-xs text-gray-500 text-center mt-2">Scan with Android app</p>
                  </div>

                  {/* Manual token fallback */}
                  <div className="flex-grow space-y-3">
                    <p className="text-sm font-medium text-gray-700">Or enter the token manually:</p>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Token (expires in 1 hour):</p>
                      <div className="flex gap-2">
                        <code className="flex-grow px-2 py-1.5 bg-white border border-gray-300 rounded font-mono text-xs truncate">
                          {pairingToken}
                        </code>
                        <button
                          onClick={handleCopyToken}
                          className="flex-shrink-0 px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 text-xs font-medium"
                        >
                          {copiedToken ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      API URL: <code className="bg-gray-100 px-1 rounded">{process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'}</code>
                    </p>
                    <button
                      onClick={() => { setShowPairingToken(false); setPairingToken(''); }}
                      className="text-sm text-gray-500 hover:text-gray-700 underline"
                    >
                      Generate a new token
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* API Keys */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">API Keys</h2>
            <p className="text-gray-600 mb-6">Use API keys to send SMS through external applications</p>

            <div className="mb-6">
              <button
                onClick={handleGenerateApiKey}
                disabled={loading}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition duration-200"
              >
                {loading ? 'Creating...' : 'Create New API Key'}
              </button>
            </div>

            {apiKeys.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Preview</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Created</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Expires</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {apiKeys.map((key) => (
                      <tr key={key.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-mono text-gray-600">{key.key_preview}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(key.created_at * 1000).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {key.expires_at ? new Date(key.expires_at * 1000).toLocaleDateString() : 'Never'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-600">No API keys yet. Create one to get started.</p>
            )}
          </section>

          {/* Change Password */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Change Password</h2>
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Min. 8 characters"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              {passwordMsg && (
                <div className={`p-3 rounded-lg text-sm ${
                  passwordMsg.type === 'success'
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  {passwordMsg.text}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg text-sm transition duration-200"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </section>

          {/* Danger Zone */}
          <section className="bg-white rounded-lg shadow p-6 border border-red-200">
            <h2 className="text-xl font-semibold text-red-700 mb-1">Danger Zone</h2>
            <p className="text-sm text-gray-500 mb-6">These actions are permanent and cannot be undone.</p>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Clear SMS History</p>
                  <p className="text-sm text-gray-500">Delete all SMS jobs and delivery logs.</p>
                </div>
                <button
                  onClick={handleClearHistory}
                  disabled={loading}
                  className="px-4 py-2 bg-white border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 font-medium rounded-lg text-sm transition duration-200"
                >
                  Clear History
                </button>
              </div>

              <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                <div>
                  <p className="font-medium text-red-900">Delete My Account</p>
                  <p className="text-sm text-red-700">Remove your account, all devices, jobs, and API keys.</p>
                </div>
                <button
                  onClick={handleDeleteAccount}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition duration-200"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </section>

          {/* Your Data */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Your Data</h2>
            <p className="text-sm text-gray-500 mb-4">
              All data is stored in your Cloudflare D1 database — you own it entirely.
            </p>

            <div className="space-y-3 text-sm text-gray-700">
              <div>
                <p className="font-medium text-gray-900 mb-1">Inspect data directly</p>
                <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-xs overflow-x-auto">
{`# List all your SMS jobs
wrangler d1 execute smsflare --command "SELECT * FROM sms_jobs ORDER BY created_at DESC LIMIT 50"

# List registered devices
wrangler d1 execute smsflare --command "SELECT id, device_model, online, last_heartbeat FROM devices"`}
                </pre>
              </div>

              <div>
                <p className="font-medium text-gray-900 mb-1">Export to JSON</p>
                <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-xs overflow-x-auto">
{`wrangler d1 export smsflare --output backup.sql`}
                </pre>
              </div>

              <p className="text-xs text-gray-500">
                You can also browse your database in the{' '}
                <a
                  href="https://dash.cloudflare.com/?to=/:account/workers/d1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Cloudflare Dashboard → D1
                </a>
                .
              </p>
            </div>
          </section>

          {/* Integration Documentation */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Integration Guide</h2>

            <div className="space-y-4 text-sm text-gray-600">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Send SMS via API</h3>
                <pre className="bg-gray-50 p-4 rounded overflow-x-auto text-xs">
{`curl -X POST http://localhost:8787/api/sms/send \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "+1234567890",
    "message": "Hello from SMS Flare!"
  }'`}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Response</h3>
                <pre className="bg-gray-50 p-4 rounded overflow-x-auto text-xs">
{`{
  "job_id": "abc123def456",
  "status": "pending",
  "assigned_device": "device_xyz"
}`}
                </pre>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
