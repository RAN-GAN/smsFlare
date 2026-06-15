'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    async function checkAuthAndRedirect() {
      // 1. If we have a token, try to verify it
      const token = Cookies.get('token');
      if (token) {
        try {
          const res = await fetch(`${API_BASE_URL}/auth/verify`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            router.replace('/dashboard/');
            return;
          }
          // If not ok (e.g. 401), clear token and continue to setup check
          Cookies.remove('token');
        } catch (err) {
          console.error('Token verification failed:', err);
        }
      }

      // 2. Check if the instance is already configured
      try {
        const res = await fetch(`${API_BASE_URL}/auth/setup`);
        if (!res.ok) throw new Error('Failed to fetch setup status');
        
        const { configured } = await res.json();
        if (!configured) {
          router.replace('/auth/setup/');
        } else {
          router.replace('/auth/login/');
        }
      } catch (err) {
        console.error('Setup check failed:', err);
        // Fallback to login if backend is unreachable or error occurs
        router.replace('/auth/login/');
      }
    }

    checkAuthAndRedirect();
  }, [router]);

  return (
    <div style={{ 
      height: '100vh', 
      background: 'var(--bg)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      <div style={{
        width: '24px',
        height: '24px',
        border: '2px solid var(--border)',
        borderTopColor: 'var(--accent)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
