'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, MessageSquare, User, Bike, CheckCheck } from 'lucide-react';

interface ChatMessage {
  id: number;
  orderId: number;
  senderRole: 'PENUMPANG' | 'DRIVER' | 'ADMIN';
  senderNama: string;
  pesan: string;
  createdAt: string;
}

interface TripChatProps {
  orderId: number;
  currentUserRole: 'PENUMPANG' | 'DRIVER';
  currentUserName: string;
  currentUserId?: number;
}

const quickMessagesPassenger = [
  '📍 Sudah di titik jemput',
  '⏳ Mohon tunggu sebentar ya',
  '👋 Di dekat lobi / gerbang',
  '✅ Terima kasih banyak!',
];

const quickMessagesDriver = [
  '🚀 Sedang meluncur ke titik jemput',
  '📍 Sudah tiba di depan lokasi',
  '🚙 Becak biru langit BL-001',
  '👍 Siap, saya tunggu di sini',
];

export default function TripChat({
  orderId,
  currentUserRole,
  currentUserName,
  currentUserId,
}: TripChatProps) {
  const storageKey = `becaklik_chat_${orderId}`;

  // Initial messages from localStorage (strictly filtered by current orderId)
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.filter((m: ChatMessage) => m && m.orderId === orderId);
          }
        }
      } catch {}
    }
    return [];
  });

  // Reset and load clean isolated chat when orderId changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`becaklik_chat_${orderId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setMessages(parsed.filter((m: ChatMessage) => m && m.orderId === orderId));
            return;
          }
        }
      } catch {}
    }
    setMessages([]);
  }, [orderId]);

  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  // Helper to deduplicate and sort messages strictly for current orderId
  const mergeMessages = useCallback((prevList: ChatMessage[], incomingList: ChatMessage[]): ChatMessage[] => {
    const map = new Map<string, ChatMessage>();

    // Masukkan pesan yang sudah ada khusus orderId ini
    for (const m of prevList) {
      if (!m || !m.pesan || m.orderId !== orderId) continue;
      const key = `${m.id || ''}_${m.pesan}_${m.senderRole}`;
      map.set(key, m);
    }

    // Gabungkan pesan dari server / broadcast tanpa mencampur aduk order lain
    for (const m of incomingList) {
      if (!m || !m.pesan || m.orderId !== orderId) continue;
      const key = `${m.id || ''}_${m.pesan}_${m.senderRole}`;
      if (!map.has(key)) {
        map.set(key, m);
      }
    }

    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Simpan salinan terbaru ke localStorage khusus orderId ini
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify(merged));
      } catch {}
    }

    return merged;
  }, [orderId, storageKey]);

  // 1. Sinkronisasi Antar Tab (Driver <-> Penumpang) via BroadcastChannel
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(`becaklik_chat_${orderId}`);
      bc.onmessage = (event) => {
        if (event.data?.type === 'NEW_CHAT' && event.data.message) {
          const incoming: ChatMessage = event.data.message;
          if (incoming && incoming.orderId === orderId) {
            setMessages((prev) => mergeMessages(prev, [incoming]));
          }
        }
      };
    } catch {
      // BroadcastChannel tidak didukung di beberapa webview lama
    }

    // Storage Event fallback untuk sinkronisasi antar-tab
    const handleStorage = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            const filtered = parsed.filter((m: ChatMessage) => m && m.orderId === orderId);
            setMessages((prev) => mergeMessages(prev, filtered));
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, [orderId, storageKey, mergeMessages]);

  // 2. Polling pesan dari server (Serverless-Safe: hanya memuat pesan khusus orderId ini)
  useEffect(() => {
    let isMounted = true;

    async function fetchMessages() {
      try {
        const res = await fetch(`/api/orders/${orderId}/chat`, {
          cache: 'no-store',
        });
        const data = await res.json();
        if (isMounted && Array.isArray(data.messages)) {
          const orderMessages = data.messages.filter((m: ChatMessage) => m && m.orderId === orderId);
          setMessages((prev) => mergeMessages(prev, orderMessages));
        }
      } catch {
        // Abaikan offline / error sementara
      }
    }

    void fetchMessages();
    const interval = setInterval(fetchMessages, 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [orderId, mergeMessages]);

  // 3. Scroll halus ke pesan terbawah setiap ada pesan baru
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      if (isInitialMount.current) {
        container.scrollTop = container.scrollHeight;
        isInitialMount.current = false;
      } else {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      }
    }
  }, [messages.length]);

  // 4. Kirim Pesan (Optimistic 0ms + LocalStorage + Broadcast + Server Sync)
  async function handleSendMessage(textToSend?: string) {
    const text = (textToSend || inputText).trim();
    if (!text || loading) return;

    if (!textToSend) setInputText('');

    const optimisticMessage: ChatMessage = {
      id: Date.now(),
      orderId,
      senderRole: currentUserRole,
      senderNama: currentUserName,
      pesan: text,
      createdAt: new Date().toISOString(),
    };

    // a. Langsung tampil di layar (0ms latency)
    setMessages((prev) => mergeMessages(prev, [optimisticMessage]));

    // b. Broadcast ke tab lain (Pelanggan <-> Driver)
    try {
      const bc = new BroadcastChannel(`becaklik_chat_${orderId}`);
      bc.postMessage({ type: 'NEW_CHAT', message: optimisticMessage });
      bc.close();
    } catch {}

    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pesan: text,
          senderRole: currentUserRole,
          senderNama: currentUserName,
          senderId: currentUserId,
        }),
      });
      const data = await res.json();
      if (data.success && data.message) {
        setMessages((prev) => mergeMessages(prev, [data.message]));
      }
    } catch (err) {
      console.warn('Chat server sync notice:', err);
    } finally {
      setLoading(false);
    }
  }

  const quickTemplates =
    currentUserRole === 'PENUMPANG' ? quickMessagesPassenger : quickMessagesDriver;

  return (
    <div
      className="trip-chat-container"
      style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 18px -2px rgba(2, 132, 199, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Header Percakapan */}
      <div
        className="trip-chat-header"
        style={{
          background: 'linear-gradient(90deg, #075985 0%, #0284c7 100%)',
          color: '#ffffff',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          gap: '8px',
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              border: '1.5px solid rgba(255, 255, 255, 0.35)',
            }}
          >
            {currentUserRole === 'PENUMPANG' ? (
              <Bike size={16} color="#ffffff" />
            ) : (
              <User size={16} color="#ffffff" />
            )}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
              <strong
                style={{
                  fontSize: '13px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'block',
                  minWidth: 0,
                }}
              >
                {currentUserRole === 'PENUMPANG'
                  ? 'Mitra Driver BL-001'
                  : 'Pelanggan'}
              </strong>
              <span
                style={{
                  fontSize: '9px',
                  background: '#10b981',
                  color: '#ffffff',
                  padding: '1px 6px',
                  borderRadius: '999px',
                  fontWeight: 700,
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                ● Online
              </span>
            </div>
            <span
              style={{
                fontSize: '10px',
                color: '#e0f2fe',
                display: 'block',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              Pesanan #{orderId} · Terenkripsi
            </span>
          </div>
        </div>

        <span
          style={{
            fontSize: '9.5px',
            color: '#38bdf8',
            background: 'rgba(56, 189, 248, 0.18)',
            padding: '2px 7px',
            borderRadius: '999px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          ⚡ Live
        </span>
      </div>

      {/* Area Daftar Pesan */}
      <div
        ref={messagesContainerRef}
        className="trip-chat-messages"
        style={{
          flex: '1 1 0%',
          minHeight: 0,
          padding: '12px 14px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '9px',
          background: '#f8fafc',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              margin: 'auto',
              textAlign: 'center',
              color: '#94a3b8',
              fontSize: '12px',
              padding: '10px',
            }}
          >
            <MessageSquare size={26} color="#cbd5e1" style={{ margin: '0 auto 6px auto' }} />
            <p style={{ margin: '0 0 4px 0', fontWeight: 600, color: '#64748b' }}>
              Belum ada percakapan.
            </p>
            <small style={{ fontSize: '11px' }}>
              Gunakan pesan cepat di bawah untuk koordinasi titik jemput.
            </small>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.senderRole === currentUserRole;
            const timeStr = new Date(msg.createdAt).toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={msg.id ? `msg-${msg.id}` : `idx-${index}`}
                style={{
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  minWidth: '60px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start',
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                }}
              >
                <div
                  style={{
                    fontSize: '10px',
                    color: '#64748b',
                    marginBottom: '2px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {msg.senderRole === 'DRIVER' ? (
                    <Bike size={11} color="#0284c7" />
                  ) : (
                    <User size={11} color="#0369a1" />
                  )}
                  <span>{isMe ? 'Anda' : msg.senderNama}</span>
                </div>

                <div
                  style={{
                    background: isMe
                      ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
                      : '#ffffff',
                    color: isMe ? '#ffffff' : '#0f172a',
                    padding: '8px 12px',
                    borderRadius: isMe ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                    fontSize: '13px',
                    lineHeight: '1.45',
                    boxShadow: isMe
                      ? '0 3px 10px rgba(2, 132, 199, 0.22)'
                      : '0 1px 4px rgba(0,0,0,0.06)',
                    border: isMe ? 'none' : '1px solid #e2e8f0',
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {msg.pesan}
                </div>

                <div
                  style={{
                    fontSize: '9.5px',
                    color: '#94a3b8',
                    marginTop: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                  }}
                >
                  <span>{timeStr}</span>
                  {isMe && <CheckCheck size={11} color="#0284c7" />}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Preset Pesan Cepat (Mobile Touch-Optimized) */}
      <div
        className="trip-chat-presets"
        style={{
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          padding: '8px 10px',
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
        }}
      >
        {quickTemplates.map((template, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendMessage(template)}
            style={{
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '999px',
              padding: '6px 11px',
              fontSize: '11px',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#e0f2fe')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#f1f5f9')}
          >
            {template}
          </button>
        ))}
      </div>

      {/* Form Input Bar (Responsif di HP & Bebas Auto-Zoom iOS) */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="trip-chat-form"
        style={{
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          padding: '10px 12px',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          flexShrink: 0,
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
        }}
      >
        <input
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            currentUserRole === 'PENUMPANG'
              ? 'Ketik pesan untuk driver...'
              : 'Ketik pesan untuk penumpang...'
          }
          maxLength={500}
          style={{
            flex: 1,
            minWidth: 0,
            width: '100%',
            height: '42px',
            padding: '0 16px',
            borderRadius: '999px',
            border: '1.5px solid #cbd5e1',
            fontSize: '16px', // Kritis: minimal 16px agar Safari iOS tidak auto-zoom halaman
            outline: 'none',
            background: '#f8fafc',
            color: '#0f172a',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = '#0284c7')}
          onBlur={(e) => (e.currentTarget.style.borderColor = '#cbd5e1')}
        />

        <button
          type="submit"
          disabled={loading || !inputText.trim()}
          aria-label="Kirim Pesan"
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: !inputText.trim() || loading ? '#cbd5e1' : '#0284c7',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            border: 'none',
            cursor: !inputText.trim() || loading ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s ease, transform 0.1s ease',
            boxShadow:
              !inputText.trim() || loading
                ? 'none'
                : '0 3px 8px rgba(2, 132, 199, 0.35)',
          }}
          onMouseDown={(e) => {
            if (inputText.trim() && !loading) e.currentTarget.style.transform = 'scale(0.92)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <Send size={15} style={{ marginLeft: '1px' }} />
        </button>
      </form>
    </div>
  );
}
