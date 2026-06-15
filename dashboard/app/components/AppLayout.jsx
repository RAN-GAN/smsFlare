'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import useAuthStore from '../store/auth.js';
import Cookies from 'js-cookie';

function IconGrid() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

function IconSend() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}

const NAV = [
  { href: '/dashboard/', label: 'Overview', Icon: IconGrid },
  { href: '/send/', label: 'Send SMS', Icon: IconSend },
  { href: '/settings/', label: 'Settings', Icon: IconSettings },
];

export default function AppLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { token, init, logout } = useAuthStore();

  useEffect(() => {
    init();
    if (!Cookies.get('token')) {
      router.push('/auth/login');
    }
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{
        width: '214px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
      }}>
        {/* Logo */}
        <div style={{
          padding: '22px 18px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '9px',
        }}>
          <div style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: 'var(--accent)',
            boxShadow: '0 0 10px var(--accent-glow)',
            flexShrink: 0,
          }} />
          <span style={{
            fontFamily: 'DM Mono, monospace',
            fontSize: '12.5px',
            fontWeight: '500',
            letterSpacing: '0.1em',
            color: 'var(--text-1)',
          }}>
            SMSFLARE
          </span>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '10px 10px' }}>
          {NAV.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname.startsWith(href.replace(/\/$/, ''));
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '9px',
                  padding: '8.5px 10px',
                  borderRadius: '7px',
                  marginBottom: '2px',
                  fontSize: '13.5px',
                  fontWeight: active ? '500' : '400',
                  color: active ? 'var(--accent)' : 'var(--text-2)',
                  background: active ? 'var(--accent-subtle)' : 'transparent',
                  transition: 'all 0.12s',
                  textDecoration: 'none',
                }}
              >
                <Icon />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: sign out */}
        <div style={{
          padding: '12px 10px 16px',
          borderTop: '1px solid var(--border)',
        }}>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 10px',
              width: '100%',
              borderRadius: '7px',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-3)',
              fontSize: '13px',
              fontWeight: '400',
              cursor: 'pointer',
              transition: 'color 0.12s',
              textAlign: 'left',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--text-2)';
              e.currentTarget.style.background = 'var(--surface-2)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--text-3)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <IconLogout />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
    </div>
  );
}
