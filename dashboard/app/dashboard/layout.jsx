'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '../store/auth.js';
import Cookies from 'js-cookie';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const { token, init } = useAuthStore();

  useEffect(() => {
    init();
    const token = Cookies.get('token');
    if (!token) {
      router.push('/auth/login');
    }
  }, []);

  if (!token) {
    return null;
  }

  return children;
}
