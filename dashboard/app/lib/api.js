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

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'API error');
    }

    return data;
}

// SMS API functions
export const smsApi = {
    sendSms: (to, message) =>
        apiCall('/api/sms/send', {
            method: 'POST',
            body: JSON.stringify({ to, message }),
        }),

    getJobs: (limit, offset) =>
        apiCall(`/api/jobs?limit=${limit}&offset=${offset}`),

    getJob: (jobId) =>
        apiCall(`/api/jobs/${jobId}`),

    getDevices: () =>
        apiCall('/api/devices'),
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
    create: () =>
        apiCall('/auth/api-keys', {
            method: 'POST',
        }),

    list: () =>
        apiCall('/auth/api-keys'),
};

// Device pairing
export const authApi = {
    generatePairingToken: () =>
        apiCall('/auth/device-pair', {
            method: 'POST',
        }),
};
