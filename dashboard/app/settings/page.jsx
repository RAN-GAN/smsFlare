'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { authApi, apiKeyApi } from '../lib/api';

export default function SettingsPage() {
  const [pairingToken, setPairingToken] = useState('');
  const [apiKeys, setApiKeys] = useState([]);
  const [showPairingToken, setShowPairingToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
              <div className="space-y-3">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Token (expires in 1 hour):</p>
                  <div className="flex gap-2">
                    <code className="flex-grow px-3 py-2 bg-white border border-gray-300 rounded font-mono text-sm truncate">
                      {pairingToken}
                    </code>
                    <button
                      onClick={handleCopyToken}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
                    >
                      {copiedToken ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Enter this token in your Android app to pair the device with your account.
                </p>
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
