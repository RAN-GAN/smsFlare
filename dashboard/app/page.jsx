'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    async function checkAuthAndRedirect() {
      // 1. If we have a token, go straight to dashboard
      const token = Cookies.get('token');
      if (token) {
        router.replace('/dashboard/');
        return;
      }

      // 2. No token? Check if the instance is already configured
      try {
        const res = await fetch(`${API_BASE_URL}/auth/setup`);
        const { configured } = await res.json();
        
        if (!configured) {
          // First time install -> Setup
          router.replace('/auth/setup/');
        } else {
          // Already configured -> Login
          router.replace('/auth/login/');
        }
      } catch (err) {
        console.error('Failed to connect to backend:', err);
        // Fallback to login if backend is unreachable
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
