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
      <div className="sf-page-header flex-col md:flex-row items-start md:items-center gap-4 px-5 py-6 md:px-8 md:py-6">
        <div className="flex-1">
          <h1 className="sf-page-title">Overview</h1>
          <p className="sf-page-subtitle">SMS gateway status and recent activity</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {backendStatus && (
            <div className={`flex items-center gap-[7px] px-[11px] py-[5px] rounded-[6px] border shrink-0 ${
              backendStatus === 'online' 
                ? 'bg-[rgba(52,211,153,0.07)] border-[rgba(52,211,153,0.2)]' 
                : 'bg-[rgba(248,113,113,0.07)] border-[rgba(248,113,113,0.2)]'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${
                backendStatus === 'online' 
                  ? 'bg-[#34D399] shadow-[0_0_6px_rgba(52,211,153,0.6)]' 
                  : 'bg-[#F87171] shadow-[0_0_6px_rgba(248,113,113,0.6)]'
              }`} />
              <span className={`text-[12px] font-mono font-medium ${
                backendStatus === 'online' ? 'text-[#34D399]' : 'text-[#F87171]'
              }`}>
                {backendStatus === 'online' ? 'Connected' : 'Unreachable'}
              </span>
            </div>
          )}
          <Link href="/send/" className="sf-btn-primary flex items-center gap-[7px] px-4 py-2 text-[13.5px] shrink-0">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" />
            </svg>
            Send SMS
          </Link>
        </div>
      </div>

      <div className="sf-page-content p-5 md:p-8 flex-1">
        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-7">
          <StatCard label="Total Jobs" value={jobs.length} sub="fetched" />
          <StatCard label="Active Devices" value={onlineDevices.length} sub={`of ${devices.length} registered`} />
          <StatCard label="Queued" value={pendingJobs.length} sub="pending / assigned" />
          <StatCard label="Success Rate" value={`${successRate}%`} sub="sent + delivered" />
        </div>

        {/* Devices */}
        <div className="mb-7">
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="sf-section-title mb-0">Registered Devices</h2>
            <Link href="/settings/" className="text-[12px] text-text-2 flex items-center gap-1 transition-colors hover:text-text-1">
              Pair new device
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {devices.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {devices.map((device) => (
                <div key={device.id} className="bg-surface border border-border rounded-[10px] p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className="text-text-3"><IconDevice /></div>
                      <span className="text-[13.5px] font-medium text-text-1 max-w-[130px] overflow-hidden text-ellipsis whitespace-nowrap">
                        {device.device_model || 'Unknown Device'}
                      </span>
                    </div>
                    <span className={device.online ? 'sf-badge sf-badge-online' : 'sf-badge sf-badge-offline'}>
                      {device.online ? 'online' : 'offline'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5 mb-3.5">
                    {device.phone_number && (
                      <div className="flex gap-1.5 items-center">
                        <span className="text-[11px] text-text-3 font-mono min-w-[56px]">PHONE</span>
                        <span className="text-[12.5px] text-text-2 font-mono">
                          {device.phone_number}
                        </span>
                      </div>
                    )}
                    {device.android_version && (
                      <div className="flex gap-1.5 items-center">
                        <span className="text-[11px] text-text-3 font-mono min-w-[56px]">ANDROID</span>
                        <span className="text-[12.5px] text-text-2">{device.android_version}</span>
                      </div>
                    )}
                    {device.battery_level !== undefined && device.battery_level !== null && (
                      <div className="flex gap-1.5 items-center">
                        <span className="text-[11px] text-text-3 font-mono min-w-[56px]">BATTERY</span>
                        <span className={`text-[12.5px] ${device.battery_level < 20 ? 'text-[var(--status-failed)]' : 'text-text-2'}`}>
                          {device.battery_level}%
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleDeregisterDevice(device.id)}
                    className="flex items-center justify-center gap-[5px] bg-transparent border border-border rounded-[5px] text-text-3 text-[12px] p-1.25 w-full cursor-pointer transition-all hover:border-[rgba(248,113,113,0.3)] hover:text-[#F87171] hover:bg-[rgba(248,113,113,0.05)] py-1.5"
                  >
                    <IconTrash />
                    Remove device
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-[10px] p-8 text-center">
              <p className="text-text-2 text-[13.5px] mb-2.5">
                No devices registered yet
              </p>
              <Link href="/settings/" className="text-[13px] font-medium text-accent">
                Generate pairing token
              </Link>
            </div>
          )}
        </div>

        {/* Jobs table */}
        <div>
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="sf-section-title mb-0">Recent Jobs</h2>
          </div>

          {loading && jobs.length === 0 ? (
            <div className="bg-surface border border-border rounded-[10px] p-8 text-center">
              <div className="w-[18px] h-[18px] border-2 border-border-2 border-t-accent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-text-3 text-[13px]">Loading jobs...</p>
            </div>
          ) : jobs.length > 0 ? (
            <div className="bg-surface border border-border rounded-[10px] overflow-x-auto">
              <table className="sf-table min-w-[600px] md:min-w-0">
                <thead>
                  <tr>
                    <th>Recipient</th>
                    <th>Message</th>
                    <th>Status</th>
                    <th className="hidden sm:table-cell">Created</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id}>
                      <td className="font-mono text-[13.5px]">
                        {job.recipient}
                      </td>
                      <td className="max-w-[120px] sm:max-w-[280px] overflow-hidden text-ellipsis whitespace-nowrap">
                        {job.message}
                      </td>
                      <td>
                        <span className={statusClass(job.status)}>{job.status}</span>
                      </td>
                      <td className="font-mono text-[13px] text-text-2 hidden sm:table-cell">
                        {formatTime(job.created_at)}
                      </td>
                      <td>
                        <Link href={`/jobs/?id=${job.id}`} className="text-[13px] font-medium text-accent transition-colors">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-[10px] p-8 text-center">
              <p className="text-text-2 text-[13.5px] mb-2.5">
                No SMS jobs yet
              </p>
              <Link href="/send/" className="text-[13px] font-medium text-accent">
                Send your first SMS
              </Link>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
