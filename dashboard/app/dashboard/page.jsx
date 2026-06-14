'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useAuthStore from '../store/auth.js';
import { smsApi } from '../lib/api';
import Cookies from 'js-cookie';

export default function DashboardPage() {
  const [jobs, setJobs] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [jobsData, devicesData] = await Promise.all([smsApi.getJobs(10, 0), smsApi.getDevices()]);

      setJobs(jobsData.jobs || []);
      setDevices(devicesData.devices || []);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'assigned':
        return 'bg-blue-100 text-blue-800';
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">SMS Flare Dashboard</h1>
          <div className="flex gap-4">
            <Link href="/send" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Send SMS
            </Link>
            <Link href="/settings" className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300">
              Settings
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Devices Section */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Online Devices</h2>
          {devices.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {devices.map((device) => (
                <div key={device.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-gray-900">{device.device_model || 'Unknown Device'}</h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        device.online ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {device.online ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-600">
                      <strong>Android:</strong> {device.android_version || 'N/A'}
                    </p>
                    <p className="text-gray-600">
                      <strong>Battery:</strong> {device.battery_level || 'N/A'}%
                    </p>
                    <p className="text-gray-600">
                      <strong>Phone:</strong> {device.phone_number || 'N/A'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-600 mb-4">No devices registered yet</p>
              <Link href="/settings" className="text-blue-600 hover:text-blue-700 font-semibold">
                Generate pairing token
              </Link>
            </div>
          )}
        </section>

        {/* Jobs Section */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent SMS Jobs</h2>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Loading...</p>
            </div>
          ) : jobs.length > 0 ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Recipient</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Message</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Created</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{job.recipient}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{job.message}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{formatTime(job.created_at)}</td>
                      <td className="px-6 py-4 text-sm">
                        <Link href={`/jobs/${job.id}`} className="text-blue-600 hover:text-blue-700 font-semibold">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-600 mb-4">No SMS jobs yet</p>
              <Link href="/send" className="text-blue-600 hover:text-blue-700 font-semibold">
                Send your first SMS
              </Link>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
