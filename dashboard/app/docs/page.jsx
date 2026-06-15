'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLayout from '../components/AppLayout.jsx';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

// ── Helpers ───────────────────────────────────────────────────────────────────

const METHOD_COLOR = {
  GET:    '#38BDF8',
  POST:   '#34D399',
  PUT:    '#FDBA74',
  DELETE: '#F87171',
};

function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => {
        entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); });
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);
  return active;
}

// ── Small components ──────────────────────────────────────────────────────────

function MethodBadge({ method }) {
  return (
    <span style={{
      fontFamily: 'DM Mono, monospace',
      fontSize: '10.5px',
      fontWeight: '500',
      color: METHOD_COLOR[method] || 'var(--text-2)',
      background: `${METHOD_COLOR[method]}14`,
      border: `1px solid ${METHOD_COLOR[method]}30`,
      borderRadius: '4px',
      padding: '2px 7px',
      letterSpacing: '0.04em',
    }}>
      {method}
    </span>
  );
}

function AuthBadge({ auth }) {
  const labels = {
    user:   { text: 'User JWT',    color: '#FDBA74' },
    device: { text: 'Device token', color: '#38BDF8' },
    apikey: { text: 'API key',     color: '#C084FC' },
    either: { text: 'JWT or API key', color: '#FDBA74' },
    none:   { text: 'Public',      color: '#7A96AE' },
  };
  const { text, color } = labels[auth] || labels.none;
  return (
    <span style={{
      fontFamily: 'DM Mono, monospace',
      fontSize: '10.5px',
      color,
      background: `${color}14`,
      border: `1px solid ${color}28`,
      borderRadius: '4px',
      padding: '2px 7px',
    }}>
      {text}
    </span>
  );
}

function CodeBlock({ code, lang = 'bash' }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border-2)',
      borderRadius: '8px',
      overflow: 'hidden',
      marginTop: '10px',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '7px 14px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface-2)',
      }}>
        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-3)' }}>{lang}</span>
        <button onClick={copy} style={{
          fontFamily: 'DM Mono, monospace',
          fontSize: '11px',
          fontWeight: '500',
          color: copied ? 'var(--accent)' : 'var(--text-3)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '2px 6px',
          transition: 'color 0.12s',
        }}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre style={{
        margin: 0,
        padding: '16px',
        fontFamily: 'DM Mono, monospace',
        fontSize: '12.5px',
        color: 'var(--text-2)',
        lineHeight: '1.7',
        overflowX: 'auto',
        whiteSpace: 'pre',
      }}>
        {code}
      </pre>
    </div>
  );
}

function ParamRow({ name, type, required, desc }) {
  return (
    <tr>
      <td style={{ padding: '8px 12px', verticalAlign: 'top' }}>
        <code style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', color: 'var(--accent)' }}>{name}</code>
        {required && <span style={{ color: '#F87171', fontSize: '11px', marginLeft: '4px' }}>*</span>}
      </td>
      <td style={{ padding: '8px 12px', verticalAlign: 'top' }}>
        <code style={{ fontFamily: 'DM Mono, monospace', fontSize: '11.5px', color: '#C084FC' }}>{type}</code>
      </td>
      <td style={{ padding: '8px 12px', color: 'var(--text-2)', fontSize: '13px', lineHeight: '1.5' }}>{desc}</td>
    </tr>
  );
}

function ParamTable({ rows }) {
  return (
    <div style={{ overflowX: 'auto', marginTop: '10px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
        <thead>
          <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
            {['Field', 'Type', 'Description'].map(h => (
              <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-3)', fontWeight: '500', letterSpacing: '0.05em' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <ParamRow {...r} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Endpoint({ method, path, auth, description, params, queryParams, response, curl }) {
  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: '10px',
      overflow: 'hidden',
      marginBottom: '24px',
      background: 'var(--surface)',
    }}>
      <div style={{
        padding: '14px 18px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface-2)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexWrap: 'wrap',
      }}>
        <MethodBadge method={method} />
        <code style={{ fontFamily: 'DM Mono, monospace', fontSize: '13px', color: 'var(--text-1)', flex: 1 }}>{path}</code>
        <AuthBadge auth={auth} />
      </div>
      <div style={{ padding: '16px 18px' }}>
        <p style={{ color: 'var(--text-2)', fontSize: '13.5px', lineHeight: '1.6', marginBottom: queryParams || params ? '16px' : 0 }}>{description}</p>

        {queryParams && (
          <>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>Query params</div>
            <ParamTable rows={queryParams} />
          </>
        )}

        {params && (
          <>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px', marginTop: queryParams ? '14px' : 0 }}>Request body</div>
            <ParamTable rows={params} />
          </>
        )}

        {response && (
          <>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: '16px', marginBottom: '4px' }}>Response</div>
            <CodeBlock code={response} lang="json" />
          </>
        )}

        {curl && (
          <>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: '16px', marginBottom: '4px' }}>Example</div>
            <CodeBlock code={curl} lang="bash" />
          </>
        )}
      </div>
    </div>
  );
}

function SectionHeading({ id, children }) {
  return (
    <h2 id={id} style={{
      fontSize: '19px',
      fontWeight: '600',
      color: 'var(--text-1)',
      marginBottom: '20px',
      paddingBottom: '12px',
      borderBottom: '1px solid var(--border)',
      scrollMarginTop: '32px',
    }}>
      {children}
    </h2>
  );
}

function SubHeading({ id, children }) {
  return (
    <h3 id={id} style={{
      fontSize: '15px',
      fontWeight: '600',
      color: 'var(--text-1)',
      marginBottom: '14px',
      marginTop: '32px',
      scrollMarginTop: '32px',
    }}>
      {children}
    </h3>
  );
}

function Note({ children }) {
  return (
    <div style={{
      background: 'rgba(253, 186, 116, 0.07)',
      border: '1px solid rgba(253, 186, 116, 0.2)',
      borderRadius: '8px',
      padding: '12px 16px',
      marginBottom: '20px',
      fontSize: '13.5px',
      color: 'var(--text-2)',
      lineHeight: '1.6',
    }}>
      <span style={{ color: 'var(--accent)', fontWeight: '600' }}>Note: </span>
      {children}
    </div>
  );
}

// ── ToC data ──────────────────────────────────────────────────────────────────

const TOC = [
  { id: 'getting-started',  label: 'Getting Started' },
  { id: 'device-pairing',   label: 'Device Pairing' },
  { id: 'sending-sms',      label: 'Sending SMS' },
  {
    id: 'api-reference', label: 'API Reference',
    children: [
      { id: 'api-auth',    label: 'Authentication' },
      { id: 'api-sms',     label: 'SMS' },
      { id: 'api-jobs',    label: 'Jobs' },
      { id: 'api-devices', label: 'Devices' },
      { id: 'api-keys',    label: 'API Keys' },
      { id: 'api-device',  label: 'Device API' },
    ],
  },
];

const ALL_IDS = TOC.flatMap(t => [t.id, ...(t.children?.map(c => c.id) || [])]);

// ── Main page ─────────────────────────────────────────────────────────────────

const ENV_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export default function DocsPage() {
  const router = useRouter();
  const active = useActiveSection(ALL_IDS);
  const [BASE, setBase] = useState('https://your-worker.workers.dev');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!Cookies.get('token')) {
      router.push('/auth/login');
      return;
    }
    const saved = localStorage.getItem('sf_docs_base_url');
    if (saved) setBase(saved);
  }, []);

  const commitBase = () => {
    const val = draft.trim().replace(/\/$/, '') || BASE;
    setBase(val);
    localStorage.setItem('sf_docs_base_url', val);
    setEditing(false);
  };

  const useMyUrl = () => {
    if (ENV_BASE) {
      setBase(ENV_BASE);
      localStorage.setItem('sf_docs_base_url', ENV_BASE);
    }
  };

  return (
    <AppLayout>
      <div className="sf-page-header">
        <div>
          <h1 className="sf-page-title">Documentation</h1>
          <p className="sf-page-subtitle">Guides and API reference for SMS Flare</p>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Sidebar ToC */}
        <aside style={{
          width: '200px',
          flexShrink: 0,
          overflowY: 'auto',
          padding: '24px',
          borderRight: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
            On this page
          </div>
          <nav>
            {TOC.map(item => (
              <div key={item.id}>
                <a href={`#${item.id}`} style={{
                  display: 'block',
                  padding: '5px 8px',
                  borderRadius: '5px',
                  fontSize: '13px',
                  fontWeight: active === item.id ? '500' : '400',
                  color: active === item.id ? 'var(--accent)' : 'var(--text-2)',
                  background: active === item.id ? 'var(--accent-subtle)' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.1s',
                  marginBottom: '1px',
                }}>
                  {item.label}
                </a>
                {item.children && (
                  <div style={{ marginLeft: '12px', borderLeft: '1px solid var(--border)', paddingLeft: '8px', marginBottom: '2px' }}>
                    {item.children.map(child => (
                      <a key={child.id} href={`#${child.id}`} style={{
                        display: 'block',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12.5px',
                        color: active === child.id ? 'var(--accent)' : 'var(--text-3)',
                        fontWeight: active === child.id ? '500' : '400',
                        background: active === child.id ? 'var(--accent-subtle)' : 'transparent',
                        textDecoration: 'none',
                        transition: 'all 0.1s',
                        marginBottom: '1px',
                      }}>
                        {child.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '32px 48px 80px' }}>
          <div style={{ maxWidth: '720px' }}>

            {/* Base URL configurator */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'var(--surface)',
              border: '1px solid var(--border-2)',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '36px',
            }}>
              <span style={{ fontSize: '12px', color: 'var(--text-3)', whiteSpace: 'nowrap', fontFamily: 'DM Mono, monospace' }}>Base URL</span>
              {editing ? (
                <>
                  <input
                    autoFocus
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') commitBase(); if (e.key === 'Escape') setEditing(false); }}
                    placeholder={BASE}
                    style={{
                      flex: 1,
                      background: 'var(--surface-2)',
                      border: '1px solid var(--accent)',
                      borderRadius: '5px',
                      padding: '5px 10px',
                      fontFamily: 'DM Mono, monospace',
                      fontSize: '12.5px',
                      color: 'var(--text-1)',
                      outline: 'none',
                    }}
                  />
                  <button onClick={commitBase} style={{ fontSize: '12px', fontWeight: '600', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>Save</button>
                  <button onClick={() => setEditing(false)} style={{ fontSize: '12px', color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>Cancel</button>
                </>
              ) : (
                <>
                  <code style={{ flex: 1, fontFamily: 'DM Mono, monospace', fontSize: '12.5px', color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{BASE}</code>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {ENV_BASE && BASE !== ENV_BASE && (
                      <button
                        onClick={useMyUrl}
                        style={{ fontSize: '12px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', whiteSpace: 'nowrap' }}
                      >
                        Use my URL
                      </button>
                    )}
                    <button
                      onClick={() => { setDraft(BASE); setEditing(true); }}
                      style={{ fontSize: '12px', color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', whiteSpace: 'nowrap' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--text-2)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
                    >
                      Edit
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Getting Started */}
            <section>
              <SectionHeading id="getting-started">Getting Started</SectionHeading>
              <p style={{ color: 'var(--text-2)', fontSize: '14px', lineHeight: '1.8', marginBottom: '16px' }}>
                SMS Flare turns any Android phone into an SMS gateway. Your dashboard sends jobs to a paired device, which sends the actual SMS messages via the phone's SIM card. No carrier API required.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
                {[
                  { step: '1', title: 'Deploy', desc: 'Deploy the Cloudflare Worker backend and open your dashboard.' },
                  { step: '2', title: 'Pair a device', desc: 'Download and install the Android app, then scan the QR code from Settings.' },
                  { step: '3', title: 'Send SMS', desc: 'Use the dashboard, API key, or REST API to send messages.' },
                ].map(({ step, title, desc }) => (
                  <div key={step} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--accent)', marginBottom: '6px' }}>Step {step}</div>
                    <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '6px' }}>{title}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: '1.5' }}>{desc}</div>
                    {step === '2' && (
                      <a
                        href="/smsflare.apk"
                        download
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          marginTop: '10px',
                          fontFamily: 'DM Mono, monospace',
                          fontSize: '11px',
                          color: 'var(--accent)',
                          background: 'rgba(0,255,127,0.06)',
                          border: '1px solid rgba(0,255,127,0.2)',
                          borderRadius: '4px',
                          padding: '4px 10px',
                          textDecoration: 'none',
                        }}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7 10 12 15 17 10"/>
                          <line x1="12" x2="12" y1="3" y2="15"/>
                        </svg>
                        Download APK
                      </a>
                    )}
                  </div>
                ))}
              </div>
              <Note>All API requests should be sent to your Worker URL. Update the Base URL at the top of this page to customize the curl examples.</Note>
            </section>

            {/* Device Pairing */}
            <section style={{ marginTop: '48px' }}>
              <SectionHeading id="device-pairing">Device Pairing</SectionHeading>
              <p style={{ color: 'var(--text-2)', fontSize: '14px', lineHeight: '1.8', marginBottom: '20px' }}>
                Each Android device must be paired before it can send SMS. Pairing creates a permanent device token the app uses to poll for jobs.
              </p>
              <ol style={{ paddingLeft: '20px', color: 'var(--text-2)', fontSize: '14px', lineHeight: '2', marginBottom: '20px' }}>
                <li>
                  Install the <strong style={{ color: 'var(--text-1)' }}>SMS Flare</strong> Android app on the phone.{' '}
                  <a
                    href="/smsflare.apk"
                    download
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontFamily: 'DM Mono, monospace',
                      fontSize: '11.5px',
                      color: 'var(--accent)',
                      background: 'rgba(0,255,127,0.06)',
                      border: '1px solid rgba(0,255,127,0.2)',
                      borderRadius: '4px',
                      padding: '2px 8px',
                      textDecoration: 'none',
                      verticalAlign: 'middle',
                    }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" x2="12" y1="3" y2="15"/>
                    </svg>
                    Download APK
                  </a>
                </li>
                <li>In the dashboard, go to <strong style={{ color: 'var(--text-1)' }}>Settings → Add Device</strong> and click <strong style={{ color: 'var(--text-1)' }}>Generate QR Code</strong>.</li>
                <li>Open the Android app and tap <strong style={{ color: 'var(--text-1)' }}>Scan QR Code</strong>.</li>
                <li>Grant SMS and notification permissions when prompted.</li>
                <li>Select which SIM card should send messages (if the phone has dual SIM).</li>
                <li>The device appears as online in the dashboard within 30 seconds.</li>
              </ol>
              <Note>The pairing token expires after 1 hour. If the app fails to register in time, generate a new QR code from Settings and try again.</Note>
              <p style={{ color: 'var(--text-2)', fontSize: '14px', lineHeight: '1.8' }}>
                To remove a device, either tap <strong style={{ color: 'var(--text-1)' }}>Unpair Device</strong> in the Android app, or delete it from the dashboard's device list in Settings. The device will stop receiving jobs immediately.
              </p>
            </section>

            {/* Sending SMS */}
            <section style={{ marginTop: '48px' }}>
              <SectionHeading id="sending-sms">Sending SMS</SectionHeading>
              <p style={{ color: 'var(--text-2)', fontSize: '14px', lineHeight: '1.8', marginBottom: '20px' }}>
                There are three ways to send messages.
              </p>

              <SubHeading>From the dashboard</SubHeading>
              <p style={{ color: 'var(--text-2)', fontSize: '14px', lineHeight: '1.8', marginBottom: '16px' }}>
                Go to <strong style={{ color: 'var(--text-1)' }}>Send SMS</strong> in the sidebar, enter a phone number in E.164 format (e.g. <code style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px' }}>+14155552671</code>) and your message (max 160 characters), then click Send.
              </p>

              <SubHeading>Via the REST API</SubHeading>
              <p style={{ color: 'var(--text-2)', fontSize: '14px', lineHeight: '1.8', marginBottom: '10px' }}>
                Use your JWT token or an API key to send messages programmatically. See <a href="#api-sms" style={{ color: 'var(--accent)', textDecoration: 'none' }}>SMS endpoints</a> below.
              </p>
              <CodeBlock lang="bash" code={`curl -X POST ${BASE}/api/sms/send \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"to": "+14155552671", "message": "Hello from SMS Flare!"}'`} />

              <SubHeading>Via API key (for integrations)</SubHeading>
              <p style={{ color: 'var(--text-2)', fontSize: '14px', lineHeight: '1.8', marginBottom: '10px' }}>
                Generate an API key in <strong style={{ color: 'var(--text-1)' }}>Settings → API Keys</strong>. API keys are long-lived tokens you can use in server-to-server integrations without a user session. They work on <code style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px' }}>POST /api/sms/send</code> and <code style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px' }}>POST /api/sms/send/batch</code>.
              </p>
              <Note>Messages are limited to 160 characters. Phone numbers must be in E.164 format (<code style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px' }}>+</code> followed by country code and number, no spaces or dashes).</Note>
            </section>

            {/* API Reference */}
            <section style={{ marginTop: '48px' }}>
              <SectionHeading id="api-reference">API Reference</SectionHeading>
              <p style={{ color: 'var(--text-2)', fontSize: '14px', lineHeight: '1.8', marginBottom: '20px' }}>
                All endpoints accept and return JSON. The base URL is your Worker's deployment URL.
              </p>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
                {Object.entries(METHOD_COLOR).map(([m, c]) => (
                  <span key={m} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: 'var(--text-3)' }}>
                    <MethodBadge method={m} /> {m === 'GET' ? 'Read' : m === 'POST' ? 'Create/Action' : m === 'PUT' ? 'Update' : 'Delete'}
                  </span>
                ))}
              </div>

              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px 16px', marginBottom: '28px', fontSize: '13.5px', color: 'var(--text-2)' }}>
                <strong style={{ color: 'var(--text-1)' }}>Authentication headers</strong>
                <ul style={{ marginTop: '8px', paddingLeft: '20px', lineHeight: '2' }}>
                  <li><code style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px' }}>Authorization: Bearer &lt;jwt&gt;</code> — for user sessions (24h lifetime)</li>
                  <li><code style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px' }}>Authorization: Bearer &lt;api_key&gt;</code> — for programmatic access</li>
                  <li><code style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px' }}>Authorization: Bearer &lt;device_token&gt;</code> — for the Android app only</li>
                </ul>
              </div>

              {/* Auth */}
              <SubHeading id="api-auth">Authentication</SubHeading>

              <Endpoint
                method="GET" path="/health" auth="none"
                description="Health check. Returns whether the server is running and JWT is configured."
                response={`{ "status": "ok", "timestamp": 1718001234, "jwt_configured": true }`}
                curl={`curl ${BASE}/health`}
              />

              <Endpoint
                method="POST" path="/auth/login" auth="none"
                description="Exchange email + password for a JWT token. The token is valid for 24 hours."
                params={[
                  { name: 'email', type: 'string', required: true, desc: 'Account email address.' },
                  { name: 'password', type: 'string', required: true, desc: 'Account password (min 8 characters).' },
                ]}
                response={`{ "token": "eyJ...", "user": { "id": "a1b2c3d4e5f6a7b8", "email": "you@example.com" } }`}
                curl={`curl -X POST ${BASE}/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email": "you@example.com", "password": "yourpassword"}'`}
              />

              <Endpoint
                method="PUT" path="/auth/password" auth="user"
                description="Change the account password. Requires the current password to verify identity."
                params={[
                  { name: 'current_password', type: 'string', required: true, desc: 'Existing password for verification.' },
                  { name: 'new_password', type: 'string', required: true, desc: 'New password (min 8 characters).' },
                ]}
                response={`{ "success": true }`}
                curl={`curl -X PUT ${BASE}/auth/password \\
  -H "Authorization: Bearer $JWT" \\
  -H "Content-Type: application/json" \\
  -d '{"current_password": "old", "new_password": "newpass123"}'`}
              />

              <Endpoint
                method="DELETE" path="/auth/account" auth="user"
                description="Permanently delete the account and all associated data (jobs, devices, API keys). This cannot be undone."
                response={`{ "success": true }`}
                curl={`curl -X DELETE ${BASE}/auth/account \\
  -H "Authorization: Bearer $JWT"`}
              />

              {/* SMS */}
              <SubHeading id="api-sms">SMS</SubHeading>

              <Endpoint
                method="POST" path="/api/sms/send" auth="either"
                description="Send a single SMS message. The job is immediately assigned to the most recently active device. If no device is online, the job is queued as pending and claimed the next time a device polls."
                params={[
                  { name: 'to', type: 'string', required: true, desc: 'Recipient phone number in E.164 format (e.g. +14155552671).' },
                  { name: 'message', type: 'string', required: true, desc: 'Message body. Max 160 characters.' },
                ]}
                response={`{
  "job_id": "a1b2c3d4e5f6a7b8",
  "status": "assigned",
  "assigned_device": "b2c3d4e5f6a7b8c9"
}`}
                curl={`curl -X POST ${BASE}/api/sms/send \\
  -H "Authorization: Bearer $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"to": "+14155552671", "message": "Hello!"}'`}
              />

              <Endpoint
                method="POST" path="/api/sms/send/batch" auth="either"
                description="Send up to 50 SMS messages in a single request. All messages are validated before any are created — if one fails validation the entire batch is rejected. All jobs are assigned to the same device."
                params={[
                  { name: 'messages', type: 'array', required: true, desc: 'Array of message objects, max 50 items.' },
                  { name: 'messages[].to', type: 'string', required: true, desc: 'Recipient phone number in E.164 format.' },
                  { name: 'messages[].message', type: 'string', required: true, desc: 'Message body. Max 160 characters.' },
                ]}
                response={`{
  "results": [
    { "job_id": "a1b2...", "status": "assigned", "assigned_device": "b2c3..." },
    { "job_id": "c3d4...", "status": "assigned", "assigned_device": "b2c3..." }
  ],
  "count": 2
}`}
                curl={`curl -X POST ${BASE}/api/sms/send/batch \\
  -H "Authorization: Bearer $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "messages": [
      {"to": "+14155550001", "message": "Hi Alice"},
      {"to": "+14155550002", "message": "Hi Bob"}
    ]
  }'`}
              />

              {/* Jobs */}
              <SubHeading id="api-jobs">Jobs</SubHeading>
              <p style={{ color: 'var(--text-2)', fontSize: '13.5px', lineHeight: '1.7', marginBottom: '16px' }}>
                Each SMS send creates a job. Jobs progress through a lifecycle: <code style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', color: '#F59E0B' }}>pending</code> → <code style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', color: '#38BDF8' }}>assigned</code> → <code style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', color: '#34D399' }}>sent</code> → <code style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', color: '#10B981' }}>delivered</code> (or <code style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', color: '#F87171' }}>failed</code>).
              </p>

              <Endpoint
                method="GET" path="/api/jobs" auth="user"
                description="List SMS jobs for the authenticated user. Returns newest first with pagination."
                queryParams={[
                  { name: 'limit', type: 'integer', required: false, desc: 'Number of results to return. Max 100, default 20.' },
                  { name: 'offset', type: 'integer', required: false, desc: 'Pagination offset. Default 0.' },
                  { name: 'status', type: 'string', required: false, desc: 'Filter by status: pending, assigned, sent, delivered, or failed.' },
                ]}
                response={`{
  "jobs": [
    {
      "id": "a1b2c3d4e5f6a7b8",
      "recipient": "+14155552671",
      "message": "Hello!",
      "status": "delivered",
      "created_at": 1718001000,
      "sent_at": 1718001032,
      "delivered_at": 1718001045
    }
  ],
  "total": 142,
  "limit": 20,
  "offset": 0
}`}
                curl={`curl "${BASE}/api/jobs?limit=10&status=delivered" \\
  -H "Authorization: Bearer $JWT"`}
              />

              <Endpoint
                method="GET" path="/api/jobs/:id" auth="user"
                description="Get a single job with its full status history log."
                response={`{
  "job": {
    "id": "a1b2c3d4e5f6a7b8",
    "recipient": "+14155552671",
    "message": "Hello!",
    "status": "delivered",
    "device_id": "b2c3d4e5f6a7b8c9",
    "created_at": 1718001000,
    "sent_at": 1718001032,
    "delivered_at": 1718001045
  },
  "logs": [
    { "status": "sent", "timestamp": 1718001032, "error_message": null },
    { "status": "delivered", "timestamp": 1718001045, "error_message": null }
  ]
}`}
                curl={`curl ${BASE}/api/jobs/a1b2c3d4e5f6a7b8 \\
  -H "Authorization: Bearer $JWT"`}
              />

              <Endpoint
                method="DELETE" path="/api/jobs/:id" auth="user"
                description="Cancel a pending or assigned job. Returns 409 if the job has already been sent, delivered, or failed."
                response={`{ "success": true }`}
                curl={`curl -X DELETE ${BASE}/api/jobs/a1b2c3d4e5f6a7b8 \\
  -H "Authorization: Bearer $JWT"`}
              />

              <Endpoint
                method="GET" path="/api/stats" auth="user"
                description="Summary statistics for the dashboard: message counts, device status, and today's activity."
                response={`{
  "total_sent": 1842,
  "pending_jobs": 4,
  "jobs_today": 17,
  "success_rate": 94,
  "total_devices": 3,
  "online_devices": 2
}`}
                curl={`curl ${BASE}/api/stats \\
  -H "Authorization: Bearer $JWT"`}
              />

              <Endpoint
                method="DELETE" path="/api/jobs" auth="user"
                description="Clear all SMS history for the account. This permanently deletes all jobs and their logs."
                response={`{ "success": true }`}
                curl={`curl -X DELETE ${BASE}/api/jobs \\
  -H "Authorization: Bearer $JWT"`}
              />

              {/* Devices */}
              <SubHeading id="api-devices">Devices</SubHeading>

              <Endpoint
                method="GET" path="/api/devices" auth="user"
                description="List all paired devices. The online field reflects whether the device sent a heartbeat in the last polling interval."
                response={`{
  "devices": [
    {
      "id": "b2c3d4e5f6a7b8c9",
      "device_model": "Google Pixel 7",
      "android_version": "14",
      "phone_number": "+14155550001",
      "battery_level": 82,
      "online": true,
      "last_heartbeat": 1718001234
    }
  ]
}`}
                curl={`curl ${BASE}/api/devices \\
  -H "Authorization: Bearer $JWT"`}
              />

              <Endpoint
                method="GET" path="/api/devices/:id" auth="user"
                description="Get a single device with its last 10 heartbeat records, useful for monitoring battery and signal over time."
                response={`{
  "device": {
    "id": "b2c3d4e5f6a7b8c9",
    "device_model": "Google Pixel 7",
    "android_version": "14",
    "battery_level": 82,
    "online": true,
    "last_heartbeat": 1718001234,
    "created_at": 1717900000
  },
  "heartbeats": [
    { "battery_level": 82, "signal_strength": -85, "sim_status": "ready", "app_version": "1.0.0", "created_at": 1718001234 }
  ]
}`}
                curl={`curl ${BASE}/api/devices/b2c3d4e5f6a7b8c9 \\
  -H "Authorization: Bearer $JWT"`}
              />

              <Endpoint
                method="DELETE" path="/api/devices/:id" auth="user"
                description="Remove a paired device from the account. The device will stop receiving jobs. Any jobs currently assigned to it will remain assigned until the device polls again (which will fail), at which point they can be reassigned."
                response={`{ "success": true }`}
                curl={`curl -X DELETE ${BASE}/api/devices/b2c3d4e5f6a7b8c9 \\
  -H "Authorization: Bearer $JWT"`}
              />

              {/* API Keys */}
              <SubHeading id="api-keys">API Keys</SubHeading>
              <p style={{ color: 'var(--text-2)', fontSize: '13.5px', lineHeight: '1.7', marginBottom: '16px' }}>
                API keys let external services send SMS without a user session. They work on <code style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px' }}>POST /api/sms/send</code> and <code style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px' }}>POST /api/sms/send/batch</code>. The full key is only shown once at creation — store it securely.
              </p>

              <Endpoint
                method="POST" path="/auth/api-keys" auth="user"
                description="Create a new API key. The full key is returned once and never stored in plaintext."
                params={[
                  { name: 'expires_in_days', type: 'integer', required: false, desc: 'Validity period in days. Max 3650. Omit for a non-expiring key.' },
                ]}
                response={`{
  "api_key": "a1b2c3d4e5f6a7b8-c9d0e1f2a3b4c5d6",
  "preview": "a1b2c3d4...",
  "created_at": 1718001234,
  "expires_at": null
}`}
                curl={`curl -X POST ${BASE}/auth/api-keys \\
  -H "Authorization: Bearer $JWT" \\
  -H "Content-Type: application/json" \\
  -d '{"expires_in_days": 90}'`}
              />

              <Endpoint
                method="GET" path="/auth/api-keys" auth="user"
                description="List all API keys. Only the key preview (first 8 characters) is returned, not the full key."
                response={`{
  "api_keys": [
    { "id": "c3d4e5f6a7b8c9d0", "key_preview": "a1b2c3d4...", "created_at": 1718001234, "expires_at": null }
  ]
}`}
                curl={`curl ${BASE}/auth/api-keys \\
  -H "Authorization: Bearer $JWT"`}
              />

              <Endpoint
                method="DELETE" path="/auth/api-keys/:id" auth="user"
                description="Revoke an API key immediately. Any requests using the revoked key will receive a 401."
                response={`{ "success": true }`}
                curl={`curl -X DELETE ${BASE}/auth/api-keys/c3d4e5f6a7b8c9d0 \\
  -H "Authorization: Bearer $JWT"`}
              />

              {/* Device API */}
              <SubHeading id="api-device">Device API</SubHeading>
              <p style={{ color: 'var(--text-2)', fontSize: '13.5px', lineHeight: '1.7', marginBottom: '16px' }}>
                These endpoints are used by the Android app. You do not need them if you're only integrating via the SMS API.
              </p>

              <Endpoint
                method="POST" path="/api/device/register" auth="none"
                description="Register a device using a pairing token obtained from POST /auth/device-pair. Returns a permanent device token used for all subsequent device requests."
                params={[
                  { name: 'pairing_token', type: 'string', required: true, desc: 'Short-lived token from the QR code.' },
                  { name: 'device_model', type: 'string', required: false, desc: 'Device model name (e.g. "Pixel 7").' },
                  { name: 'android_version', type: 'string', required: false, desc: 'Android OS version string.' },
                  { name: 'phone_number', type: 'string', required: false, desc: 'SIM phone number, if available.' },
                  { name: 'battery_level', type: 'integer', required: false, desc: 'Current battery percentage (0–100).' },
                  { name: 'sim_info', type: 'string', required: false, desc: 'Carrier/operator name.' },
                ]}
                response={`{ "device_id": "b2c3...", "device_token": "d4e5...", "polling_interval": 30 }`}
                curl={`curl -X POST ${BASE}/api/device/register \\
  -H "Content-Type: application/json" \\
  -d '{"pairing_token": "abc123", "device_model": "Pixel 7", "android_version": "14"}'`}
              />

              <Endpoint
                method="GET" path="/api/device/jobs" auth="device"
                description="Poll for the next assigned SMS job. Returns 204 if there is nothing to send. The app calls this every 30 seconds."
                response={`// 200 — job available
{ "job_id": "a1b2...", "recipient": "+14155552671", "message": "Hello!" }

// 204 — no pending jobs (empty body)`}
                curl={`curl ${BASE}/api/device/jobs \\
  -H "Authorization: Bearer $DEVICE_TOKEN"`}
              />

              <Endpoint
                method="POST" path="/api/device/jobs/:id/status" auth="device"
                description="Report the outcome of an SMS job. Valid statuses are sent (SMS was dispatched), delivered (delivery receipt received), and failed (could not send)."
                params={[
                  { name: 'status', type: 'string', required: true, desc: '"sent", "delivered", or "failed".' },
                  { name: 'timestamp', type: 'integer', required: false, desc: 'Unix epoch when the event occurred. Defaults to now.' },
                  { name: 'error_message', type: 'string', required: false, desc: 'Error details, only for failed status.' },
                ]}
                response={`{ "success": true }`}
                curl={`curl -X POST ${BASE}/api/device/jobs/a1b2c3d4/status \\
  -H "Authorization: Bearer $DEVICE_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"status": "sent", "timestamp": 1718001032}'`}
              />

              <Endpoint
                method="POST" path="/api/device/heartbeat" auth="device"
                description="Send a periodic heartbeat to mark the device as online and update battery level. The app calls this every 15 minutes."
                params={[
                  { name: 'battery_level', type: 'integer', required: true, desc: 'Current battery percentage (0–100).' },
                  { name: 'signal_strength', type: 'integer', required: false, desc: 'Signal strength in dBm.' },
                  { name: 'sim_status', type: 'string', required: false, desc: 'SIM status string (e.g. "ready").' },
                  { name: 'app_version', type: 'string', required: false, desc: 'App version string.' },
                ]}
                response={`{ "success": true }`}
                curl={`curl -X POST ${BASE}/api/device/heartbeat \\
  -H "Authorization: Bearer $DEVICE_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"battery_level": 82, "app_version": "1.0.0"}'`}
              />

              <Endpoint
                method="DELETE" path="/api/device/self" auth="device"
                description="Unpair this device from the account. The device token is invalidated and the device is removed. Use this when the user taps Unpair in the Android app."
                response={`{ "success": true }`}
                curl={`curl -X DELETE ${BASE}/api/device/self \\
  -H "Authorization: Bearer $DEVICE_TOKEN"`}
              />

              <Endpoint
                method="POST" path="/api/device/token/refresh" auth="device"
                description="Rotate the device token. The old token is immediately invalidated. If the response is lost before the app receives it, the device must be re-paired."
                response={`{ "device_token": "new_token_here", "rotated_at": 1718001234 }`}
                curl={`curl -X POST ${BASE}/api/device/token/refresh \\
  -H "Authorization: Bearer $DEVICE_TOKEN"`}
              />

            </section>
          </div>
        </main>
      </div>
    </AppLayout>
  );
}
