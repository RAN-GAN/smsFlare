'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    async function redirect() {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/setup`);
        const { configured } = await res.json();
        if (!configured) {
          router.push('/auth/setup');
          return;
        }
      } catch {
        // Backend unreachable — fall through to login
      }
      const token = Cookies.get('token');
      router.push(token ? '/dashboard/' : '/auth/login/');
    }
    redirect();
  }, []);

  return null;
}
