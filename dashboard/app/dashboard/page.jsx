'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AppLayout from '../components/AppLayout.jsx';
import { smsApi, deviceMgmtApi } from '../lib/api';

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
  const d = new Date(ts * 1000);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    hour12: false,
  });
}

function IconDevice() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="20" x="5" y="2" rx="2" />
      <path d="M12 18h.01" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function IconBattery() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="18" height="10" rx="2" />
      <path d="M22 11v2" />
      <path d="M6 11h6" />
    </svg>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="sf-stat-card">
      <div className="sf-stat-label">{label}</div>
      <div className="sf-stat-value">{value}</div>
      {sub && <div className="sf-stat-sub">{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const [jobs, setJobs] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [jobsData, devicesData] = await Promise.all([
        smsApi.getJobs(20, 0),
        smsApi.getDevices(),
      ]);
      setJobs(jobsData.jobs || []);
      setDevices(devicesData.devices || []);
      setBackendStatus('online');
    } catch (err) {
      setBackendStatus('offline');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleDeregisterDevice = async (deviceId) => {
    if (!confirm('Remove this device? It will stop receiving SMS jobs.')) return;
    try {
      await deviceMgmtApi.deregister(deviceId);
      setDevices((prev) => prev.filter((d) => d.id !== deviceId));
    } catch (err) {
      console.error('Failed to remove device:', err);
    }
  };

  const onlineDevices = devices.filter((d) => d.online);
  const pendingJobs = jobs.filter((j) => j.status === 'pending' || j.status === 'assigned');
  const deliveredJobs = jobs.filter((j) => j.status === 'delivered' || j.status === 'sent');
  const successRate = jobs.length > 0
    ? Math.round((deliveredJobs.length / jobs.length) * 100)
    : 0;

  return (
    <AppLayout>
      {/* Page header */}
      <div className="sf-page-header">
        <div>
          <h1 className="sf-page-title">Overview</h1>
          <p className="sf-page-subtitle">SMS gateway status and recent activity</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {backendStatus && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              padding: '5px 11px',
              borderRadius: '6px',
              background: backendStatus === 'online' ? 'rgba(52, 211, 153, 0.07)' : 'rgba(248, 113, 113, 0.07)',
              border: `1px solid ${backendStatus === 'online' ? 'rgba(52, 211, 153, 0.2)' : 'rgba(248, 113, 113, 0.2)'}`,
            }}>
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: backendStatus === 'online' ? '#34D399' : '#F87171',
                boxShadow: backendStatus === 'online' ? '0 0 6px rgba(52,211,153,0.6)' : '0 0 6px rgba(248,113,113,0.6)',
              }} />
              <span style={{
                fontSize: '12px',
                color: backendStatus === 'online' ? '#34D399' : '#F87171',
                fontFamily: 'DM Mono, monospace',
                fontWeight: '500',
              }}>
                {backendStatus === 'online' ? 'Connected' : 'Unreachable'}
              </span>
            </div>
          )}
          <Link href="/send/" className="sf-btn-primary" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
            padding: '8px 16px',
            fontSize: '13.5px',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" />
            </svg>
            Send SMS
          </Link>
        </div>
      </div>

      <div className="sf-page-content" style={{ flex: 1 }}>
        {/* Stats row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '14px',
          marginBottom: '28px',
        }}>
          <StatCard label="Total Jobs" value={jobs.length} sub="fetched" />
          <StatCard label="Active Devices" value={onlineDevices.length} sub={`of ${devices.length} registered`} />
          <StatCard label="Queued" value={pendingJobs.length} sub="pending / assigned" />
          <StatCard label="Success Rate" value={`${successRate}%`} sub="sent + delivered" />
        </div>

        {/* Devices */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '14px',
          }}>
            <h2 className="sf-section-title" style={{ marginBottom: 0 }}>Registered Devices</h2>
            <Link href="/settings/" style={{
              fontSize: '12px',
              color: 'var(--text-2)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'color 0.12s',
            }}>
              Pair new device
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {devices.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '12px',
            }}>
              {devices.map((device) => (
                <div key={device.id} style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '16px',
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '12px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ color: 'var(--text-3)' }}><IconDevice /></div>
                      <span style={{
                        fontSize: '13.5px',
                        fontWeight: '500',
                        color: 'var(--text-1)',
                        maxWidth: '130px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {device.device_model || 'Unknown Device'}
                      </span>
                    </div>
                    <span className={device.online ? 'sf-badge sf-badge-online' : 'sf-badge sf-badge-offline'}>
                      {device.online ? 'online' : 'offline'}
                    </span>
                  </div>

                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px',
                    marginBottom: '14px',
                  }}>
                    {device.phone_number && (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'DM Mono, monospace', minWidth: '56px' }}>PHONE</span>
                        <span style={{ fontSize: '12.5px', color: 'var(--text-2)', fontFamily: 'DM Mono, monospace' }}>
                          {device.phone_number}
                        </span>
                      </div>
                    )}
                    {device.android_version && (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'DM Mono, monospace', minWidth: '56px' }}>ANDROID</span>
                        <span style={{ fontSize: '12.5px', color: 'var(--text-2)' }}>{device.android_version}</span>
                      </div>
                    )}
                    {device.battery_level !== undefined && device.battery_level !== null && (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'DM Mono, monospace', minWidth: '56px' }}>BATTERY</span>
                        <span style={{
                          fontSize: '12.5px',
                          color: device.battery_level < 20 ? 'var(--status-failed)' : 'var(--text-2)',
                        }}>
                          {device.battery_level}%
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleDeregisterDevice(device.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      borderRadius: '5px',
                      color: 'var(--text-3)',
                      fontSize: '12px',
                      padding: '5px 10px',
                      cursor: 'pointer',
                      transition: 'all 0.12s',
                      width: '100%',
                      justifyContent: 'center',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'rgba(248, 113, 113, 0.3)';
                      e.currentTarget.style.color = '#F87171';
                      e.currentTarget.style.background = 'rgba(248, 113, 113, 0.05)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.color = 'var(--text-3)';
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <IconTrash />
                    Remove device
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '32px',
              textAlign: 'center',
            }}>
              <p style={{ color: 'var(--text-2)', fontSize: '13.5px', marginBottom: '10px' }}>
                No devices registered yet
              </p>
              <Link href="/settings/" style={{
                fontSize: '13px',
                fontWeight: '500',
                color: 'var(--accent)',
              }}>
                Generate pairing token
              </Link>
            </div>
          )}
        </div>

        {/* Jobs table */}
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '14px',
          }}>
            <h2 className="sf-section-title" style={{ marginBottom: 0 }}>Recent Jobs</h2>
          </div>

          {loading && jobs.length === 0 ? (
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '32px',
              textAlign: 'center',
            }}>
              <div style={{
                width: '18px',
                height: '18px',
                border: '2px solid var(--border-2)',
                borderTopColor: 'var(--accent)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 12px',
              }} />
              <p style={{ color: 'var(--text-3)', fontSize: '13px' }}>Loading jobs...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : jobs.length > 0 ? (
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              overflow: 'hidden',
            }}>
              <table className="sf-table">
                <thead>
                  <tr>
                    <th>Recipient</th>
                    <th>Message</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id}>
                      <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '13.5px' }}>
                        {job.recipient}
                      </td>
                      <td style={{
                        maxWidth: '280px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {job.message}
                      </td>
                      <td>
                        <span className={statusClass(job.status)}>{job.status}</span>
                      </td>
                      <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '13px', color: 'var(--text-2)' }}>
                        {formatTime(job.created_at)}
                      </td>
                      <td>
                        <Link href={`/jobs/?id=${job.id}`} style={{
                          fontSize: '13px',
                          fontWeight: '500',
                          color: 'var(--accent)',
                          transition: 'color 0.12s',
                        }}>
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '32px',
              textAlign: 'center',
            }}>
              <p style={{ color: 'var(--text-2)', fontSize: '13.5px', marginBottom: '10px' }}>
                No SMS jobs yet
              </p>
              <Link href="/send/" style={{
                fontSize: '13px',
                fontWeight: '500',
                color: 'var(--accent)',
              }}>
                Send your first SMS
              </Link>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
