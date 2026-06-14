'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { smsApi } from '../lib/api';

function JobDetailContent() {
  const [job, setJob] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const searchParams = useSearchParams();
  const jobId = searchParams.get('id');

  useEffect(() => {
    if (!jobId) return;
    loadJob();
    const interval = setInterval(loadJob, 3000);
    return () => clearInterval(interval);
  }, [jobId]);

  const loadJob = async () => {
    try {
      const data = await smsApi.getJob(jobId);
      setJob(data.job);
      setLogs(data.logs || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':   return 'bg-yellow-100 text-yellow-800';
      case 'assigned':  return 'bg-blue-100 text-blue-800';
      case 'sent':
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'failed':    return 'bg-red-100 text-red-800';
      default:          return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (timestamp) => new Date(timestamp * 1000).toLocaleString();

  if (!jobId) {
    return (
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">No job ID specified.</div>
      </main>
    );
  }

  if (loading && !job) {
    return (
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-600">Loading...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">{error}</div>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {job && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <h1 className="text-2xl font-bold text-gray-900">SMS Job Details</h1>
              <span className={`px-4 py-2 rounded-lg font-semibold text-sm ${getStatusColor(job.status)}`}>
                {job.status.toUpperCase()}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job ID</label>
                <p className="text-gray-900 font-mono text-sm">{job.id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recipient</label>
                <p className="text-gray-900">{job.recipient}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded border border-gray-200">
                  {job.message}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                  <p className="text-gray-900 text-sm">{formatTime(job.created_at)}</p>
                </div>
                {job.delivered_at && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Delivered</label>
                    <p className="text-gray-900 text-sm">{formatTime(job.delivered_at)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {logs.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Delivery Timeline</h2>
              <div className="space-y-3">
                {logs.map((log, index) => (
                  <div key={index} className="flex gap-4 pb-3 border-b border-gray-200 last:border-b-0">
                    <div className="flex-shrink-0">
                      <span className={`inline-block px-3 py-1 rounded text-xs font-medium ${getStatusColor(log.status)}`}>
                        {log.status}
                      </span>
                    </div>
                    <div className="flex-grow">
                      <p className="text-sm text-gray-600">{formatTime(log.timestamp)}</p>
                      {log.error_message && (
                        <p className="text-sm text-red-600 mt-1">Error: {log.error_message}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

export default function JobDetailPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/dashboard/" className="text-blue-600 hover:text-blue-700 font-semibold">
            ← Back to Dashboard
          </Link>
        </div>
      </header>
      <Suspense fallback={<main className="max-w-2xl mx-auto px-4 py-8"><p className="text-gray-600">Loading...</p></main>}>
        <JobDetailContent />
      </Suspense>
    </div>
  );
}
