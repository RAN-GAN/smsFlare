'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { smsApi } from '../lib/api';

export default function SendPage() {
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const characterCount = message.length;
  const maxCharacters = 160;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!recipient.trim()) {
      setError('Please enter a recipient phone number');
      return;
    }

    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }

    if (message.length > maxCharacters) {
      setError(`Message cannot exceed ${maxCharacters} characters`);
      return;
    }

    setLoading(true);
    try {
      const response = await smsApi.sendSms(recipient, message);
      setSuccess(`SMS queued for delivery! Job ID: ${response.job_id}`);
      setRecipient('');
      setMessage('');

      // Redirect to job details after a short delay
      setTimeout(() => {
        router.push(`/jobs/${response.job_id}`);
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
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

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Send SMS</h1>
          <p className="text-gray-600 mb-8">Send an SMS message through your registered devices</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Recipient */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recipient Phone Number</label>
              <input
                type="tel"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="+1234567890"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Format: +1234567890 or 1234567890</p>
            </div>

            {/* Message */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-gray-700">Message</label>
                <span className={`text-sm ${characterCount > maxCharacters ? 'text-red-600' : 'text-gray-500'}`}>
                  {characterCount}/{maxCharacters}
                </span>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message here..."
                rows="5"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              {characterCount > maxCharacters && (
                <p className="text-sm text-red-600 mt-1">Message exceeds maximum length</p>
              )}
            </div>

            {/* Errors */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
            )}

            {/* Success */}
            {success && (
              <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || characterCount > maxCharacters}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
            >
              {loading ? 'Sending...' : 'Send SMS'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
