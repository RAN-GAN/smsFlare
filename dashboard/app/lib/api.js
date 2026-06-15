import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export async function apiCall(endpoint, options = {}) {
    const token = Cookies.get('token');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (response.status === 204) {
        return null;
    }

    if (response.status === 401) {
        Cookies.remove('token');
        if (typeof window !== 'undefined') {
            window.location.href = '/auth/login/';
        }
    }

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'API error');
    }

    return data;
}

// Device management
export const deviceMgmtApi = {
    deregister: (deviceId) =>
        apiCall(`/api/devices/${deviceId}`, {
            method: 'DELETE',
        }),
};

// SMS API functions
export const smsApi = {
    sendSms: (to, message) =>
        apiCall('/api/sms/send', {
            method: 'POST',
            body: JSON.stringify({ to, message }),
        }),

    sendBatch: (messages) =>
        apiCall('/api/sms/send/batch', {
            method: 'POST',
            body: JSON.stringify({ messages }),
        }),

    getJobs: (limit, offset, status) => {
        const params = new URLSearchParams({ limit, offset });
        if (status) params.set('status', status);
        return apiCall(`/api/jobs?${params}`);
    },

    getJob: (jobId) =>
        apiCall(`/api/jobs/${jobId}`),

    cancelJob: (jobId) =>
        apiCall(`/api/jobs/${jobId}`, { method: 'DELETE' }),

    getDevices: () =>
        apiCall('/api/devices'),

    getDevice: (deviceId) =>
        apiCall(`/api/devices/${deviceId}`),

    getStats: () =>
        apiCall('/api/stats'),
};

// Device API functions
export const deviceApi = {
    register: (metadata) =>
        apiCall('/api/device/register', {
            method: 'POST',
            body: JSON.stringify(metadata),
        }),
};

// API Key functions
export const apiKeyApi = {
    create: (expires_in_days) =>
        apiCall('/auth/api-keys', {
            method: 'POST',
            body: JSON.stringify(expires_in_days ? { expires_in_days } : {}),
        }),

    list: () =>
        apiCall('/auth/api-keys'),

    revoke: (keyId) =>
        apiCall(`/auth/api-keys/${keyId}`, { method: 'DELETE' }),
};

// Device pairing + account management
export const authApi = {
    verify: () =>
        apiCall('/auth/verify'),

    generatePairingToken: () =>
        apiCall('/auth/device-pair', {
            method: 'POST',
        }),

    deleteAccount: () =>
        apiCall('/auth/account', {
            method: 'DELETE',
        }),

    changePassword: (current_password, new_password) =>
        apiCall('/auth/password', {
            method: 'PUT',
            body: JSON.stringify({ current_password, new_password }),
        }),
};

export const dataApi = {
    clearSmsHistory: () =>
        apiCall('/api/jobs', {
            method: 'DELETE',
        }),
};
