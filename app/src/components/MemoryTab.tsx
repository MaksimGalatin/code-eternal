'use client';
import React, { useEffect, useState } from 'react';
import type { ChatSessionMeta } from '@/lib/chat-memory/types';
import type { ChatFilePayload } from '@/lib/chat-memory/types';

const IRYS_NODE_URL = 'https://devnet.irys.xyz';

const IArchive = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>
  </svg>
);
const IChevron = ({ open }: { open: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}>
    <path d="m6 9 6 6 6-6"/>
  </svg>
);
const ILink = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/>
  </svg>
);

interface Props {
  wallet: string | null;
  memoryCount: number;
  getAccessToken: () => Promise<string | null>;
}

export default function MemoryTab({ wallet, memoryCount, getAccessToken }: Props) {
  const [sessions, setSessions] = useState<ChatSessionMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedPayload, setExpandedPayload] = useState<ChatFilePayload | null>(null);
  const [expandLoading, setExpandLoading] = useState(false);

  useEffect(() => {
    if (!wallet) return;
    setLoading(true);
    getAccessToken()
      .then(token => fetch(`/api/chat/sessions?wallet=${wallet}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }))
      .then(r => r.json())
      .then(({ sessions: s }) => { if (s) setSessions(s); })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet]);

  async function toggleSession(session: ChatSessionMeta) {
    if (expandedId === session.sessionId) {
      setExpandedId(null);
      setExpandedPayload(null);
      return;
    }
    setExpandedId(session.sessionId);
    setExpandedPayload(null);
    setExpandLoading(true);
    try {
      const res = await fetch(`${IRYS_NODE_URL}/${session.txId}`);
      if (res.ok) setExpandedPayload(await res.json());
    } catch { /* show summary only */ }
    finally { setExpandLoading(false); }
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  }

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header */}
      <div className="glass-panel" style={{ borderRadius: '16px', padding: '20px 24px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,rgb(124,58,237),rgb(6,182,212))', flexShrink: 0 }}>
            <span style={{ color: 'white' }}><IArchive /></span>
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'rgb(232,232,240)' }}>Memory Vault</div>
            <div style={{ fontSize: '12px', color: 'rgb(107,114,128)' }}>Eternal conversations on Arweave</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '8px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
          <span style={{ fontSize: '20px' }}>🧠</span>
          <span style={{ fontSize: '18px', fontWeight: 700, color: 'rgb(124,58,237)', fontFamily: 'monospace' }}>{memoryCount}</span>
          <span style={{ fontSize: '11px', color: 'rgb(107,114,128)' }}>saved sessions</span>
        </div>
      </div>

      {/* Session list */}
      <div className="glass-panel" style={{ borderRadius: '16px', overflow: 'hidden' }}>
        {loading && (
          <div style={{ padding: '48px', textAlign: 'center', color: 'rgb(107,114,128)', fontSize: '14px' }}>
            Loading memories...
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🌌</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'rgb(232,232,240)', marginBottom: '6px' }}>No memories yet</div>
            <div style={{ fontSize: '13px', color: 'rgb(107,114,128)' }}>
              Your conversations with AIfa are saved to Arweave every {20} messages.
            </div>
          </div>
        )}

        {sessions.map((session, i) => {
          const isOpen = expandedId === session.sessionId;
          return (
            <div key={session.sessionId} style={{ borderBottom: i < sessions.length - 1 ? '1px solid rgb(26,26,46)' : 'none' }}>
              {/* Session card header */}
              <button
                onClick={() => toggleSession(session)}
                style={{ width: '100%', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '14px', textAlign: 'left' }}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(124,58,237,0.15)', flexShrink: 0, marginTop: '2px' }}>
                  <span style={{ fontSize: '16px' }}>💬</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'rgb(232,232,240)', marginBottom: '4px' }}>
                    {session.title}
                  </div>
                  {session.summary && (
                    <div style={{ fontSize: '12px', color: 'rgb(107,114,128)', lineHeight: 1.4, marginBottom: '6px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {session.summary}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '11px', color: 'rgb(75,85,99)' }}>{fmtDate(session.createdAt)}</span>
                    <span style={{ fontSize: '11px', color: 'rgb(75,85,99)' }}>{session.msgCount} messages</span>
                  </div>
                </div>
                <div style={{ color: 'rgb(107,114,128)', flexShrink: 0 }}>
                  <IChevron open={isOpen} />
                </div>
              </button>

              {/* Expanded messages */}
              {isOpen && (
                <div style={{ padding: '0 20px 16px 70px' }}>
                  {/* Arweave link */}
                  <a
                    href={`${IRYS_NODE_URL}/${session.txId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'rgb(124,58,237)', textDecoration: 'none', marginBottom: '12px' }}
                  >
                    View raw on Arweave <ILink />
                  </a>

                  {expandLoading && (
                    <div style={{ fontSize: '13px', color: 'rgb(107,114,128)' }}>Loading messages...</div>
                  )}

                  {!expandLoading && expandedPayload && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
                      {expandedPayload.messages.map((msg, j) => (
                        <div key={j} style={{ display: 'flex', gap: '8px', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                          <div style={{
                            maxWidth: '80%',
                            padding: '8px 12px',
                            borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                            background: msg.role === 'user' ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${msg.role === 'user' ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.08)'}`,
                            fontSize: '13px',
                            color: 'rgb(210,210,220)',
                            lineHeight: 1.5,
                            whiteSpace: 'pre-wrap',
                          }}>
                            {msg.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {!expandLoading && !expandedPayload && (
                    <div style={{ fontSize: '13px', color: 'rgb(107,114,128)' }}>
                      Could not load messages from Arweave. The raw file is still accessible via the link above.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
