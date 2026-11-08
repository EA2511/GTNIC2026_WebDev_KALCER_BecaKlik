'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, User, Bike } from 'lucide-react';

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
  'Saya sudah menunggu di titik jemput.',
  'Saya berada di dekat pintu lobi utama.',
  'Mohon tunggu sebentar ya Pak.',
  'Terima kasih banyak!',
];

const quickMessagesDriver = [
  'Saya sedang meluncur ke titik penjemputan di Majalengka.',
  'Saya sudah tiba di depan lokasi jemput.',
  'Becak listrik warna biru langit BL-001 ya Kak.',
  'Siap, saya tunggu di dekat gerbang.',
];

export default function TripChat({
  orderId,
  currentUserRole,
  currentUserName,
  currentUserId,
}: TripChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Poll messages every 800ms for real-time responsiveness between Pelanggan & Driver
  useEffect(() => {
    let isMounted = true;

    async function fetchMessages() {
      try {
        const res = await fetch(`/api/orders/${orderId}/chat`, {
          cache: 'no-store',
        });
        const data = await res.json();
        if (isMounted && Array.isArray(data.messages)) {
          setMessages((prev) => {
            if (
              prev.length === data.messages.length &&
              prev.every((m, idx) => m.id === data.messages[idx]?.id)
            ) {
              return prev;
            }
            return data.messages;
          });
        }
      } catch (err) {
        console.error('Error fetching chat messages:', err);
      }
    }

    void fetchMessages();
    const interval = setInterval(fetchMessages, 800);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [orderId]);

  // Scroll only the inner chat container on new message (never scroll the main window!)
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
  }, [messages.length]);

  // Send message (Instant Optimistic Update + Server Sync)
  async function handleSendMessage(textToSend?: string) {
    const text = (textToSend || inputText).trim();
    if (!text || loading) return;

    if (!textToSend) setInputText('');
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
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setLoading(false);
    }
  }

  const quickTemplates =
    currentUserRole === 'PENUMPANG' ? quickMessagesPassenger : quickMessagesDriver;

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: 'var(--shadow)',
        display: 'flex',
        flexDirection: 'column',
        height: '380px',
        overflow: 'hidden',
      }}
    >
      {/* Chat Header */}
      <div
        style={{
          background: 'linear-gradient(90deg, #075985 0%, #0284c7 100%)',
          color: 'white',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={17} color="#38bdf8" />
          <strong style={{ fontSize: '13px' }}>
            Percakapan Perjalanan · Pesanan #{orderId}
          </strong>
        </div>
        <span
          style={{
            fontSize: '11px',
            color: '#38bdf8',
            background: 'rgba(56, 189, 248, 0.2)',
            padding: '2px 8px',
            borderRadius: '999px',
            fontWeight: 700,
          }}
        >
          ● Terenkripsi In-App
        </span>
      </div>

      {/* Messages List Area */}
      <div
        ref={messagesContainerRef}
        style={{
          flex: 1,
          padding: '14px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          background: '#f8fafc',
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              margin: 'auto',
              textAlign: 'center',
              color: '#94a3b8',
              fontSize: '13px',
            }}
          >
            <MessageSquare size={28} color="#cbd5e1" style={{ margin: '0 auto 6px auto' }} />
            <p style={{ margin: 0 }}>Belum ada pesan.</p>
            <small>Gunakan pesan cepat di bawah untuk koordinasi titik jemput.</small>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderRole === currentUserRole;
            const timeStr = new Date(msg.createdAt).toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={msg.id}
                style={{
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '82%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    fontSize: '10px',
                    color: '#64748b',
                    marginBottom: '3px',
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
                  <span>{msg.senderNama}</span>
                </div>

                <div
                  style={{
                    background: isMe
                      ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
                      : '#ffffff',
                    color: isMe ? '#ffffff' : '#0f172a',
                    padding: '9px 13px',
                    borderRadius: isMe ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                    fontSize: '13px',
                    lineHeight: '1.45',
                    boxShadow: isMe
                      ? '0 4px 12px rgba(2, 132, 199, 0.22)'
                      : '0 2px 6px rgba(0,0,0,0.05)',
                    border: isMe ? 'none' : '1px solid #cbd5e1',
                  }}
                >
                  {msg.pesan}
                </div>

                <span style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                  {timeStr}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Preset Chips */}
      <div
        style={{
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          padding: '8px 12px',
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
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
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {template}
          </button>
        ))}
      </div>

      {/* Chat Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        style={{
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          padding: '8px 12px',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
        }}
      >
        <input
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ketik pesan untuk driver / penumpang..."
          maxLength={500}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: '999px',
            border: '1px solid #cbd5e1',
            fontSize: '13px',
            outline: 'none',
          }}
        />

        <button
          type="submit"
          className="button button-primary"
          disabled={loading || !inputText.trim()}
          style={{
            borderRadius: '999px',
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
          }}
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
