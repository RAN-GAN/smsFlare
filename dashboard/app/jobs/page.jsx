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
    <div className="sf-page-content">
      {job && (
        <div style={{ maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Job card */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            overflow: 'hidden',
          }}>
            {/* Card header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
            }}>
              <span style={{
                fontFamily: 'DM Mono, monospace',
                fontSize: '12px',
                color: 'var(--text-3)',
              }}>
                {job.id}
              </span>
              <span className={statusClass(job.status)}>{job.status}</span>
            </div>

            {/* Card body */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div className="sf-label">Recipient</div>
                <div style={{
                  fontFamily: 'DM Mono, monospace',
                  fontSize: '15px',
                  fontWeight: '500',
                  color: 'var(--text-1)',
                }}>
                  {job.recipient}
                </div>
              </div>

              <div>
                <div className="sf-label">Message</div>
                <div style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '12px 14px',
                  fontSize: '13.5px',
                  color: 'var(--text-1)',
                  lineHeight: '1.55',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {job.message}
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                paddingTop: '4px',
                borderTop: '1px solid var(--border)',
              }}>
                <div>
                  <div className="sf-label">Created</div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '12.5px', color: 'var(--text-2)' }}>
                    {formatTime(job.created_at)}
                  </div>
                </div>
                {job.delivered_at && (
                  <div>
                    <div className="sf-label">Delivered</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '12.5px', color: 'var(--status-delivered)' }}>
                      {formatTime(job.delivered_at)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Timeline */}
          {logs.length > 0 && (
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--border)',
              }}>
                <h2 style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--text-3)',
                }}>
                  Delivery Timeline
                </h2>
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '0' }}>
                {logs.map((log, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    gap: '14px',
                    paddingBottom: index < logs.length - 1 ? '16px' : '0',
                    position: 'relative',
                  }}>
                    {/* Vertical line */}
                    {index < logs.length - 1 && (
                      <div style={{
                        position: 'absolute',
                        left: '3.5px',
                        top: '11px',
                        bottom: '0',
                        width: '1px',
                        background: 'var(--border)',
                      }} />
                    )}
                    <TimelineDot status={log.status} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2px' }}>
                        <span className={statusClass(log.status)}>{log.status}</span>
                        <span style={{
                          fontFamily: 'DM Mono, monospace',
                          fontSize: '11.5px',
                          color: 'var(--text-3)',
                        }}>
                          {formatTime(log.timestamp)}
                        </span>
                      </div>
                      {log.error_message && (
                        <p style={{ fontSize: '12.5px', color: 'var(--status-failed)', marginTop: '3px' }}>
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
      <div className="sf-page-header">
        <div>
          <h1 className="sf-page-title">Job Detail</h1>
          <p className="sf-page-subtitle">SMS delivery status and timeline</p>
        </div>
        <Link href="/dashboard/" style={{
          fontSize: '13px',
          color: 'var(--text-2)',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          transition: 'color 0.12s',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back to Overview
        </Link>
      </div>
      <Suspense fallback={
        <div className="sf-page-content" style={{ color: 'var(--text-2)', fontSize: '13.5px' }}>
          Loading...
        </div>
      }>
        <JobDetailContent />
      </Suspense>
    </AppLayout>
  );
}
