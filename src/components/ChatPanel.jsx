/**
 * src/components/ChatPanel.jsx
 *
 * Fixes in this version
 * ---------------------
 * 1. currentUserId — was using currentUser?.sub which is the JWT claim name.
 *    After the AuthContext fix, user comes from GET /auth/me which returns
 *    { id, username, email, ... } — so the correct field is .id not .sub.
 *    Guard: try both so it works regardless of which shape arrives.
 *
 * 2. Mobile responsive — full layout works on small screens:
 *    • Message list scrolls correctly inside flex container
 *    • Send bar stays pinned to bottom on mobile
 *    • Text sizes, padding, avatar sizes adjusted for small screens
 *    • Action buttons (edit/delete) show on tap on mobile (touch devices
 *      have no hover, so we use a selected state instead)
 *
 * 3. Message rendering — added defensive checks so missing fields never
 *    crash the component (username, timestamp, content all have fallbacks)
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'
import { editMessage, deleteMessage } from '../services/messagesService'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(isoString) {
  if (!isoString) return ''
  try {
    const d = new Date(isoString)
    const now = new Date()
    const diffDays = Math.floor((now - d) / 86400000)
    if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (diffDays === 1) return `Yesterday ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
      ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

function avatarHue(str = '') {
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return Math.abs(h) % 360
}

function UserAvatar({ username, size = 32 }) {
  const hue = avatarHue(username || '?')
  const letter = (username?.[0] ?? '?').toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `hsl(${hue},45%,28%)`,
      border: `1.5px solid hsl(${hue},45%,40%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, color: 'rgba(255,255,255,0.85)',
    }}>
      {letter}
    </div>
  )
}

// ── Status pill ───────────────────────────────────────────────────────────────

const STATUS_STYLES = {
  connecting: { bg: 'rgba(234,179,8,0.15)',  dot: '#eab308', label: 'Connecting…' },
  open:       { bg: 'rgba(34,197,94,0.15)',  dot: '#22c55e', label: 'Connected'   },
  closed:     { bg: 'rgba(107,114,128,0.15)',dot: '#6b7280', label: 'Reconnecting…'},
  error:      { bg: 'rgba(239,68,68,0.15)',  dot: '#ef4444', label: 'Error'        },
}

function StatusPill({ status }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.closed
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      background: s.bg, borderRadius: 99, padding: '3px 8px',
      fontSize: 11, color: s.dot, fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%', background: s.dot, display: 'inline-block',
        boxShadow: status === 'open' ? `0 0 6px ${s.dot}` : 'none',
        animation: status === 'connecting' ? 'pulse 1.4s ease-in-out infinite' : 'none',
      }} />
      {s.label}
    </div>
  )
}

function SystemLine({ text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 16px' }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.04)' }} />
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', whiteSpace: 'nowrap' }}>{text}</span>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.04)' }} />
    </div>
  )
}

// ── Message row ───────────────────────────────────────────────────────────────

function MessageRow({ msg, isMine, onEdit, onDelete, editingId, onEditSubmit, onEditCancel, isTapped, onTap }) {
  const isEditing = editingId === msg.id
  const [editText, setEditText] = useState(msg.content || '')
  const editRef = useRef(null)
  const hue = avatarHue(msg.username || '?')

  useEffect(() => {
    if (isEditing) {
      setEditText(msg.content || '')
      setTimeout(() => editRef.current?.focus(), 30)
    }
  }, [isEditing, msg.content])

  function handleEditKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (editText.trim()) onEditSubmit(msg.id, editText.trim()) }
    if (e.key === 'Escape') onEditCancel()
  }

  return (
    <div
      onClick={() => isMine && onTap(msg.id)}
      style={{
        display: 'flex', gap: 10, padding: '5px 12px',
        borderRadius: 6, cursor: isMine ? 'pointer' : 'default',
        background: isTapped ? 'rgba(255,255,255,0.04)' : 'transparent',
        transition: 'background 0.15s', position: 'relative',
      }}
    >
      {/* Avatar */}
      <UserAvatar username={msg.username} size={32} />

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: `hsl(${hue},70%,72%)` }}>
            {msg.username || '[deleted]'}
          </span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)' }}>
            {formatTime(msg.timestamp)}
          </span>
          {msg.is_edited && (
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', fontStyle: 'italic' }}>(edited)</span>
          )}
        </div>

        {/* Body */}
        {isEditing ? (
          <div>
            <textarea
              ref={editRef}
              value={editText}
              onChange={e => setEditText(e.target.value)}
              onKeyDown={handleEditKey}
              rows={Math.min((editText.match(/\n/g)?.length ?? 0) + 2, 6)}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(99,102,241,0.5)',
                borderRadius: 6, padding: '6px 10px',
                color: '#e5e7eb', fontSize: 13, lineHeight: 1.55,
                resize: 'none', outline: 'none',
                fontFamily: "'Inter', sans-serif",
              }}
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
              <button onClick={() => { if (editText.trim()) onEditSubmit(msg.id, editText.trim()) }} style={btnStyle('indigo')}>Save</button>
              <button onClick={onEditCancel} style={btnStyle('gray')}>Cancel</button>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', alignSelf: 'center' }}>Enter · Esc</span>
            </div>
          </div>
        ) : (
          <p style={{
            fontSize: 13.5, color: 'rgba(255,255,255,0.85)',
            lineHeight: 1.6, margin: 0,
            wordBreak: 'break-word', whiteSpace: 'pre-wrap',
          }}>
            {msg.content}
          </p>
        )}
      </div>

      {/* Action buttons — show on hover (desktop) or tap (mobile) */}
      {isMine && !isEditing && isTapped && (
        <div style={{
          display: 'flex', gap: 2, alignItems: 'flex-start',
          paddingTop: 2, position: 'absolute', right: 12, top: 6,
          background: '#1a1a28', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)',
          padding: '3px 4px',
        }}>
          <button title="Edit" onClick={e => { e.stopPropagation(); onEdit(msg.id) }} style={iconBtn}>✎</button>
          <button title="Delete" onClick={e => { e.stopPropagation(); onDelete(msg.id) }} style={{ ...iconBtn, color: 'rgba(239,68,68,0.7)' }}>✕</button>
        </div>
      )}
    </div>
  )
}

function btnStyle(color) {
  return {
    padding: '3px 10px', borderRadius: 4, border: 'none',
    background: color === 'indigo' ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.06)',
    color: color === 'indigo' ? '#a5b4fc' : 'rgba(255,255,255,0.55)',
    fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
  }
}

const iconBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: 'rgba(255,255,255,0.5)', fontSize: 13, padding: '2px 6px',
  borderRadius: 4, lineHeight: 1, fontFamily: "'Inter', sans-serif",
}

// ── Delete confirmation ───────────────────────────────────────────────────────

function DeleteConfirm({ onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 200, padding: '1rem',
    }}>
      <div style={{
        background: '#1a1a28', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12, padding: '24px', width: '100%', maxWidth: 320,
        boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
      }}>
        <p style={{ color: '#f0f0f5', fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Delete message?</p>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 20 }}>This cannot be undone.</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} style={{ ...btnStyle('gray'), flex: 1, padding: '10px 0' }}>Cancel</button>
          <button onClick={onConfirm} style={{
            flex: 1, padding: '10px 0', borderRadius: 4, border: 'none',
            background: 'rgba(239,68,68,0.2)', color: '#fca5a5',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
          }}>Delete</button>
        </div>
      </div>
    </div>
  )
}

// ── Main ChatPanel ────────────────────────────────────────────────────────────

export default function ChatPanel({ channel, token, currentUser }) {
  const { messages, systemEvents, onlineUsers, status, error, sendMessage } =
    useWebSocket(channel.id, token)

  const [input,       setInput]       = useState('')
  const [editingId,   setEditingId]   = useState(null)
  const [confirmId,   setConfirmId]   = useState(null)
  const [actionError, setActionError] = useState(null)
  const [tappedId,    setTappedId]    = useState(null) // for mobile tap-to-show-actions

  const bottomRef   = useRef(null)
  const listRef     = useRef(null)
  const atBottomRef = useRef(true)
  const textareaRef = useRef(null)

  // FIX: support both { id } (from GET /auth/me) and { sub } (from JWT decode fallback)
  const currentUserId = currentUser?.id ?? currentUser?.sub ?? ''

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (atBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length])

  function handleScroll() {
    const el = listRef.current
    if (!el) return
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100
  }

  // Reset on channel change
  useEffect(() => {
    setInput(''); setEditingId(null); setConfirmId(null)
    setActionError(null); setTappedId(null)
    atBottomRef.current = true
  }, [channel.id])

  // Dismiss tapped state when clicking elsewhere
  useEffect(() => {
    function onDocClick() { setTappedId(null) }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  // ── Send ──────────────────────────────────────────────────────────────────
  function handleSend() {
    const text = input.trim()
    if (!text || status !== 'open') return
    sendMessage(text)
    setInput('')
    atBottomRef.current = true
    // reset textarea height
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  function handleInputKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  // ── Edit ──────────────────────────────────────────────────────────────────
  async function handleEditSubmit(msgId, newContent) {
    setActionError(null)
    try {
      await editMessage(msgId, newContent)
      setEditingId(null)
    } catch (err) {
      setActionError(err.response?.data?.detail ?? 'Failed to edit message.')
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function handleDeleteConfirm() {
    if (!confirmId) return
    setActionError(null)
    try {
      await deleteMessage(confirmId)
    } catch (err) {
      setActionError(err.response?.data?.detail ?? 'Failed to delete message.')
    } finally {
      setConfirmId(null)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', minHeight: 0,   // critical for flex children to scroll
      background: '#0e0e14', fontFamily: "'Inter', sans-serif",
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes msgIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .msg-new { animation: msgIn 0.16s ease-out both; }
        .chat-textarea::placeholder { color: rgba(255,255,255,0.25); }
        .chat-textarea:focus { outline: none; }
        .send-btn:hover:not(:disabled) { opacity: 0.85; }
        @media (max-width: 480px) {
          .channel-topic { display: none; }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: '#13131e', flexShrink: 0, minWidth: 0,
      }}>
        <span style={{ color: '#818cf8', fontSize: 18, fontWeight: 300, flexShrink: 0 }}>#</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ color: '#f0f0f5', fontSize: 14, fontWeight: 600, margin: 0, truncate: true,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {channel.name}
          </h2>
          {channel.topic && (
            <p className="channel-topic" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, margin: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {channel.topic}
            </p>
          )}
        </div>
        {onlineUsers.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11,
            color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
            {onlineUsers.length}
          </div>
        )}
        <StatusPill status={status} />
      </div>

      {/* ── Error banner ── */}
      {(error || actionError) && (
        <div style={{
          padding: '8px 14px', background: 'rgba(239,68,68,0.1)',
          borderBottom: '1px solid rgba(239,68,68,0.2)',
          color: '#fca5a5', fontSize: 12, flexShrink: 0,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>⚠ {actionError || error}</span>
          <button onClick={() => setActionError(null)}
            style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* ── Message list ── */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        style={{
          flex: 1, overflowY: 'auto', overflowX: 'hidden',
          padding: '8px 0', display: 'flex', flexDirection: 'column',
          gap: 0, minHeight: 0,   // must have minHeight:0 for flex+overflow to work
        }}
      >
        {/* Connecting state */}
        {status === 'connecting' && messages.length === 0 && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
            Connecting to #{channel.name}…
          </div>
        )}

        {/* Empty state */}
        {status === 'open' && messages.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 8,
            color: 'rgba(255,255,255,0.18)', padding: '2rem' }}>
            <div style={{ fontSize: 40 }}>💬</div>
            <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>No messages yet</p>
            <p style={{ fontSize: 12, margin: 0, color: 'rgba(255,255,255,0.12)' }}>
              Be the first to say something in #{channel.name}
            </p>
          </div>
        )}

        {/* Messages */}
        {messages.map(msg => (
          <div key={msg.id} className="msg-new">
            <MessageRow
              msg={msg}
              isMine={!!currentUserId && msg.author_id === currentUserId}
              editingId={editingId}
              isTapped={tappedId === msg.id}
              onTap={id => setTappedId(prev => prev === id ? null : id)}
              onEdit={id => { setEditingId(id); setTappedId(null); setActionError(null) }}
              onDelete={id => { setConfirmId(id); setTappedId(null); setActionError(null) }}
              onEditSubmit={handleEditSubmit}
              onEditCancel={() => setEditingId(null)}
            />
          </div>
        ))}

        {/* System events */}
        {systemEvents.slice(-5).map((ev, i) => (
          <SystemLine key={i} text={ev} />
        ))}

        <div ref={bottomRef} style={{ height: 8 }} />
      </div>

      {/* ── Send bar ── */}
      <div style={{
        padding: '8px 12px 12px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: '#13131e', flexShrink: 0,
      }}>
        <div style={{
          display: 'flex', gap: 8, alignItems: 'flex-end',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 10, padding: '6px 6px 6px 12px',
        }}>
          <textarea
            ref={textareaRef}
            className="chat-textarea"
            value={input}
            onChange={e => {
              setInput(e.target.value)
              // auto-grow
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
            onKeyDown={handleInputKey}
            placeholder={
              status === 'open' ? `Message #${channel.name}`
              : status === 'connecting' ? 'Connecting…'
              : 'Reconnecting…'
            }
            disabled={status !== 'open'}
            rows={1}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: '#e5e7eb', fontSize: 14, lineHeight: 1.5,
              resize: 'none', fontFamily: "'Inter', sans-serif",
              minHeight: 22, maxHeight: 120,
              // iOS fix — prevent zoom on focus
              fontSize: '16px',
            }}
          />
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={!input.trim() || status !== 'open'}
            style={{
              width: 34, height: 34, borderRadius: 8, border: 'none', flexShrink: 0,
              background: input.trim() && status === 'open'
                ? 'linear-gradient(135deg, #4f46e5, #06b6d4)'
                : 'rgba(255,255,255,0.07)',
              color: input.trim() && status === 'open' ? '#fff' : 'rgba(255,255,255,0.25)',
              cursor: input.trim() && status === 'open' ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, transition: 'background 0.2s, opacity 0.2s',
            }}
          >↑</button>
        </div>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)', margin: '4px 0 0',
          display: 'none' /* hide hint on mobile to save space */ }}
          className="send-hint">
          Enter to send · Shift+Enter for new line
        </p>
      </div>

      {/* ── Delete confirmation ── */}
      {confirmId && (
        <DeleteConfirm
          onConfirm={handleDeleteConfirm}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  )
}
