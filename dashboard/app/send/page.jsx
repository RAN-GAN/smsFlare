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
      <div className="sf-page-header px-5 py-6 md:px-8 md:py-6">
        <div>
          <h1 className="sf-page-title">Send SMS</h1>
          <p className="sf-page-subtitle">Dispatch a message via your registered devices</p>
        </div>
      </div>

      <div className="sf-page-content p-5 md:p-8">
        <div className="max-w-[520px]">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Recipient */}
            <div>
              <label className="sf-label">Recipient Number</label>
              <input
                type="tel"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="+1 234 567 8900"
                className="sf-input font-mono"
              />
              <p className="text-[12px] text-text-3 mt-1.5">
                Include country code, e.g. +12345678900
              </p>
            </div>

            {/* Message */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="sf-label mb-0">Message</label>
                <span className={`font-mono text-[11.5px] ${
                  overLimit ? 'text-[var(--status-failed)]' : count > MAX * 0.8 ? 'text-[var(--status-pending)]' : 'text-text-3'
                }`}>
                  {count} / {MAX}
                </span>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                rows={5}
                className="sf-input resize-none leading-[1.55]"
              />
              {/* Character bar */}
              <div className="mt-1.5 h-0.5 bg-border rounded-sm overflow-hidden">
                <div 
                  className={`h-full rounded-sm transition-all duration-100 ${
                    overLimit ? 'bg-[var(--status-failed)]' : count > MAX * 0.8 ? 'bg-[var(--status-pending)]' : 'bg-accent'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {error && <div className="sf-alert-error">{error}</div>}
            {success && <div className="sf-alert-success">{success}</div>}

            {/* Actions */}
            <div className="flex gap-2.5 items-center">
              <button
                type="submit"
                disabled={loading || overLimit}
                className="sf-btn-primary px-6 py-2.5 flex items-center gap-[7px] w-full sm:w-auto justify-center"
              >
                {loading ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
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
          <div className="mt-8 bg-surface border border-border rounded-lg p-4">
            <p className="text-[12px] text-text-3 leading-relaxed">
              Messages are dispatched to the device with the most recent heartbeat.
              Failed jobs remain in <span className="font-mono text-[var(--status-failed)]">failed</span> state permanently — there is no automatic retry.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
