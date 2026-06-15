'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AppLayout from '../components/AppLayout.jsx';
import { smsApi } from '../lib/api';

function statusClass(status) {
  switch (status) {
    case 'pending':   return 'sf-badge sf-badge-pending';
    case 'assigned':  return 'sf-badge sf-badge-assigned';
    case 'sent':      return 'sf-badge sf-badge-sent';
    case 'delivered': return 'sf-badge sf-badge-delivered';
    case 'failed':    return 'sf-badge sf-badge-failed';
    default:          return 'sf-badge';
  }
}

function formatTime(ts) {
  return new Date(ts * 1000).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
}

function TimelineDot({ status }) {
  const colors = {
    pending: 'var(--status-pending)',
    assigned: 'var(--status-assigned)',
    sent: 'var(--status-sent)',
    delivered: 'var(--status-delivered)',
    failed: 'var(--status-failed)',
  };
  const color = colors[status] || 'var(--text-3)';
  return (
    <div style={{
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      background: color,
      boxShadow: `0 0 6px ${color}`,
      flexShrink: 0,
      marginTop: '3px',
    }} />
  );
}

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
    const interval = setInterval(loadJob, 5000);
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

  if (!jobId) {
    return (
      <div className="sf-page-content">
        <div className="sf-alert-error">No job ID specified.</div>
      </div>
    );
  }

  if (loading && !job) {
    return (
      <div className="sf-page-content" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '16px',
          height: '16px',
          border: '2px solid var(--border-2)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{ color: 'var(--text-2)', fontSize: '13.5px' }}>Loading job...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sf-page-content">
        <div className="sf-alert-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="sf-page-content p-5 md:p-8 flex-1">
      {job && (
        <div className="max-w-[560px] flex flex-col gap-4">
          {/* Job card */}
          <div className="bg-surface border border-border rounded-[10px] overflow-hidden">
            {/* Card header */}
            <div className="flex items-center justify-between p-4 md:px-5 md:py-4 border-b border-border">
              <span className="font-mono text-[12px] text-text-3 truncate max-w-[150px] sm:max-w-none">
                {job.id}
              </span>
              <span className={statusClass(job.status)}>{job.status}</span>
            </div>

            {/* Card body */}
            <div className="p-5 md:p-6 flex flex-col gap-4">
              <div>
                <div className="sf-label">Recipient</div>
                <div className="font-mono text-[15px] font-medium text-text-1">
                  {job.recipient}
                </div>
              </div>

              <div>
                <div className="sf-label">Message</div>
                <div className="bg-surface-2 border border-border rounded-md p-3 px-3.5 text-[13.5px] text-text-1 leading-[1.55] whitespace-pre-wrap break-words">
                  {job.message}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border">
                <div>
                  <div className="sf-label">Created</div>
                  <div className="font-mono text-[12.5px] text-text-2">
                    {formatTime(job.created_at)}
                  </div>
                </div>
                {job.delivered_at && (
                  <div>
                    <div className="sf-label">Delivered</div>
                    <div className="font-mono text-[12.5px] text-[var(--status-delivered)]">
                      {formatTime(job.delivered_at)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Timeline */}
          {logs.length > 0 && (
            <div className="bg-surface border border-border rounded-[10px] overflow-hidden">
              <div className="p-3.5 px-5 border-b border-border">
                <h2 className="text-[12px] font-semibold tracking-[0.06em] uppercase text-text-3">
                  Delivery Timeline
                </h2>
              </div>
              <div className="p-4 px-5 flex flex-col gap-0">
                {logs.map((log, index) => (
                  <div key={index} className={`flex gap-3.5 relative ${index < logs.length - 1 ? 'pb-4' : 'pb-0'}`}>
                    {/* Vertical line */}
                    {index < logs.length - 1 && (
                      <div className="absolute left-[3.5px] top-[11px] bottom-0 w-px bg-border" />
                    )}
                    <TimelineDot status={log.status} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2.5 mb-0.5">
                        <span className={statusClass(log.status)}>{log.status}</span>
                        <span className="font-mono text-[11.5px] text-text-3">
                          {formatTime(log.timestamp)}
                        </span>
                      </div>
                      {log.error_message && (
                        <p className="text-[12.5px] text-[var(--status-failed)] mt-1">
                          {log.error_message}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function JobDetailPage() {
  return (
    <AppLayout>
      <div className="sf-page-header flex-col sm:flex-row items-start sm:items-center gap-3 px-5 py-6 md:px-8 md:py-6">
        <div className="flex-1">
          <h1 className="sf-page-title">Job Detail</h1>
          <p className="sf-page-subtitle">SMS delivery status and timeline</p>
        </div>
        <Link href="/dashboard/" className="text-[13px] text-text-2 flex items-center gap-1 transition-colors hover:text-text-1">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back to Overview
        </Link>
      </div>
      <Suspense fallback={
        <div className="sf-page-content p-5 md:p-8 text-text-2 text-[13.5px]">
          Loading...
        </div>
      }>
        <JobDetailContent />
      </Suspense>
    </AppLayout>
  );
}
