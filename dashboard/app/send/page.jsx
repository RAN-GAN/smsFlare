'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '../components/AppLayout.jsx';
import { smsApi } from '../lib/api';

export default function SendPage() {
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const MAX = 160;
  const count = message.length;
  const overLimit = count > MAX;
  const pct = Math.min((count / MAX) * 100, 100);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!recipient.trim()) { setError('Enter a recipient phone number'); return; }
    if (!message.trim()) { setError('Enter a message'); return; }
    if (overLimit) { setError(`Message exceeds ${MAX} characters`); return; }

    setLoading(true);
    try {
      const response = await smsApi.sendSms(recipient, message);
      setSuccess(`Job queued — ID: ${response.job_id}`);
      setRecipient('');
      setMessage('');
      setTimeout(() => router.push(`/jobs/?id=${response.job_id}`), 1400);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      {/* Page header */}
      <div className="sf-page-header">
        <div>
          <h1 className="sf-page-title">Send SMS</h1>
          <p className="sf-page-subtitle">Dispatch a message via your registered devices</p>
        </div>
      </div>

      <div className="sf-page-content">
        <div style={{ maxWidth: '520px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Recipient */}
            <div>
              <label className="sf-label">Recipient Number</label>
              <input
                type="tel"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="+1 234 567 8900"
                className="sf-input"
                style={{ fontFamily: 'DM Mono, monospace' }}
              />
              <p style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '5px' }}>
                Include country code, e.g. +12345678900
              </p>
            </div>

            {/* Message */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="sf-label" style={{ marginBottom: 0 }}>Message</label>
                <span style={{
                  fontFamily: 'DM Mono, monospace',
                  fontSize: '11.5px',
                  color: overLimit ? 'var(--status-failed)' : count > MAX * 0.8 ? 'var(--status-pending)' : 'var(--text-3)',
                }}>
                  {count} / {MAX}
                </span>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                rows={5}
                className="sf-input"
                style={{ resize: 'none', lineHeight: '1.55' }}
              />
              {/* Character bar */}
              <div style={{
                marginTop: '6px',
                height: '2px',
                background: 'var(--border)',
                borderRadius: '1px',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: overLimit ? 'var(--status-failed)' : count > MAX * 0.8 ? 'var(--status-pending)' : 'var(--accent)',
                  borderRadius: '1px',
                  transition: 'width 0.1s, background 0.15s',
                }} />
              </div>
            </div>

            {error && <div className="sf-alert-error">{error}</div>}
            {success && <div className="sf-alert-success">{success}</div>}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                type="submit"
                disabled={loading || overLimit}
                className="sf-btn-primary"
                style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '7px' }}
              >
                {loading ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 0.8s linear infinite' }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Queuing...
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" />
                    </svg>
                    Send SMS
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Info box */}
          <div style={{
            marginTop: '32px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '16px',
          }}>
            <p style={{ fontSize: '12px', color: 'var(--text-3)', lineHeight: '1.6' }}>
              Messages are dispatched to the device with the most recent heartbeat.
              Failed jobs remain in <span style={{ fontFamily: 'DM Mono, monospace', color: 'var(--status-failed)' }}>failed</span> state permanently — there is no automatic retry.
            </p>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AppLayout>
  );
}
