'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import useAuthStore from '../store/auth.js';
import Cookies from 'js-cookie';
import { authApi } from '../lib/api';

function IconGrid() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

function IconSend() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function IconBook() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" x2="6" y1="6" y2="18" />
      <line x1="6" x2="18" y1="6" y2="18" />
    </svg>
  );
}

const NAV = [
  { href: '/dashboard/', label: 'Overview', Icon: IconGrid },
  { href: '/send/', label: 'Send SMS', Icon: IconSend },
  { href: '/settings/', label: 'Settings', Icon: IconSettings },
  { href: '/docs/', label: 'Docs', Icon: IconBook },
];

export default function AppLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { init, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    async function verifySession() {
      init();
      const token = Cookies.get('token');
      if (!token) {
        router.push('/auth/login');
        return;
      }

      try {
        await authApi.verify();
        setVerifying(false);
      } catch (err) {
        // apiCall already handles 401/redirect
        console.error('Session verification failed:', err);
      }
    }

    verifySession();
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  if (verifying) {
    return (
      <div className="flex h-screen bg-bg items-center justify-center">
        <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="p-5 md:px-[18px] md:py-[22px] border-b border-border flex items-center gap-2.5">
        <div className="w-[7px] h-[7px] rounded-full bg-accent shadow-[0_0_10px_var(--accent-glow)] shrink-0" />
        <span className="font-mono text-[12.5px] font-medium tracking-[0.1em] text-text-1">
          SMSFLARE
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-2.5">
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href.replace(/\/$/, ''));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-2.5 py-[8.5px] rounded-[7px] mb-0.5 text-[13.5px] transition-all no-underline ${
                active ? 'font-medium text-accent bg-[var(--accent-subtle)]' : 'font-normal text-text-2 hover:bg-surface-2'
              }`}
            >
              <Icon />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: sign out */}
      <div className="px-2.5 py-3 md:pt-3 md:pb-4 border-t border-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-2.5 py-2 w-full rounded-[7px] border-none bg-transparent text-text-3 text-[13px] font-normal cursor-pointer transition-colors text-left hover:text-text-2 hover:bg-surface-2"
        >
          <IconLogout />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-bg overflow-hidden flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between px-5 py-3 border-b border-border bg-surface shrink-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-[7px] h-[7px] rounded-full bg-accent shadow-[0_0_10px_var(--accent-glow)] shrink-0" />
          <span className="font-mono text-[12.5px] font-medium tracking-[0.1em] text-text-1">
            SMSFLARE
          </span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1 text-text-2 hover:text-text-1"
        >
          {mobileMenuOpen ? <IconClose /> : <IconMenu />}
        </button>
      </header>

      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex w-[214px] shrink-0 flex-col bg-surface border-r border-border">
        <NavContent />
      </aside>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu (Drawer) */}
      <aside className={`md:hidden fixed top-[57px] bottom-0 left-0 z-40 w-64 bg-surface border-r border-border transition-transform duration-300 ease-in-out ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <NavContent />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto flex flex-col min-w-0">
        {children}
      </main>
    </div>
  );
}
