'use client';

import { create } from 'zustand';
import Cookies from 'js-cookie';

const useAuthStore = create((set, get) => ({
    user: null,
    token: null,
    isLoading: false,
    error: null,

    // Initialize from cookies
    init: () => {
        const token = Cookies.get('token');
        if (token) {
            set({ token });
        }
    },

    // Login
    login: async (email, password, apiUrl) => {
        set({ isLoading: true, error: null });
        try {
            const response = await fetch(`${apiUrl}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                throw new Error('Login failed');
            }

            const data = await response.json();
            Cookies.set('token', data.token, { expires: 7 });
            set({ token: data.token, user: data.user, error: null });
            return data;
        } catch (e) {
            set({ error: e.message });
            throw e;
        } finally {
            set({ isLoading: false });
        }
    },

    // Register
    register: async (email, password, apiUrl) => {
        set({ isLoading: true, error: null });
        try {
            const response = await fetch(`${apiUrl}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Registration failed');
            }

            const data = await response.json();
            Cookies.set('token', data.token, { expires: 7 });
            set({ token: data.token, user: data.user, error: null });
            return data;
        } catch (e) {
            set({ error: e.message });
            throw e;
        } finally {
            set({ isLoading: false });
        }
    },

    // Logout
    logout: () => {
        Cookies.remove('token');
        set({ user: null, token: null });
    },

    // Check if authenticated
    isAuthenticated: () => {
        const { token } = get();
        return !!token;
    },
}));

export default useAuthStore;
