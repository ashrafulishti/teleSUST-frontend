/**
 * src/components/ChatPanel.jsx
 *
 * Full real-time chat panel for a single channel.
 *
 * Features
 * --------
 * • Connects via WebSocket using useWebSocket hook
 * • Renders message history with author, timestamp, edited badge
 * • Auto-scrolls to bottom on new messages (unless user has scrolled up)
 * • Send bar: textarea, submit on Enter (Shift+Enter for newline)
 * • Inline edit: click ✎ → textarea replaces content → PUT /messages/{id}
 * • Delete: click ✕ → confirm → DELETE /messages/{id}
 * • Presence: online user count badge in header
 * • Connection status indicator (connecting / open / closed / error)
 * • System events (join/leave) rendered as subtle dividers
 *
 * Props
 * -----
 *   channel : ChannelResponse  — { id, name, topic, group_id, created_at }
 *   token   : string           — JWT from AuthContext
 *   currentUser : object       — decoded JWT payload { sub, username, ... }
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'
import { editMessage, deleteMessage } from '../services/messagesService'

// ── Tiny helpers ─────────────────────────────────────────────────────────────

function formatTime(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  const now = new Date()
  const diffDays = Math.floor((now - d) / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return `Yesterday ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function avatarHue(str = '') {
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return Math.abs(h) % 360
}

function UserAvatar({ username, size = 28 }) {
  const hue = avatarHue(username)
  const letter = (username?.[0] ?? '?').toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `hsl(${hue},45%,28%)`,
      border: `1.5px solid hsl(${hue},45%,40%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, color: 'rgba(255,255,255,0.85)',
      letterSpacing: '-0.01em',
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
      background: s.bg, borderRadius: 99, padding: '3px 9px',
      fontSize: 11, color: s.dot, fontWeight: 500,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: s.dot,
        boxShadow: status === 'open' ? `0 0 6px ${s.dot}` : 'none',
        display: 'inline-block',
        animation: status === 'connecting' ? 'pulse 1.4s ease-in-out infinite' : 'none',
      }} />
      {s.label}
    </div>
  )
}

// ── System event divider ──────────────────────────────────────────────────────

function SystemLine({ text }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '4px 0', margin: '2px 0',
    }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.04)' }} />
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', whiteSpace: 'nowrap' }}>
        {text}
      </span>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.04)' }} />
    </div>
  )
}

// ── Single message row ────────────────────────────────────────────────────────

function MessageRow({ msg, isMine, onEdit, onDelete, editingId, onEditSubmit, onEditCancel }) {
  const isEditing = editingId === msg.id
  const [editText, setEditText] = useState(msg.content)
  const editRef = useRef(null)

  useEffect(() => {
    if (isEditing) {
      setEditText(msg.content)
      setTimeout(() => editRef.current?.focus(), 30)
    }
  }, [isEditing, msg.content])

  function handleEditKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (editText.trim()) onEditSubmit(msg.id, editText.trim())
    }
    if (e.key === 'Escape') onEditCancel()
  }

  return (
    <div
      className="message-row"
      style={{
        display: 'flex', gap: 10, padding: '4px 16px',
        borderRadius: 6,
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.classList.add('hovered')}
      onMouseLeave={e => e.currentTarget.classList.remove('hovered')}
    >
      {/* Avatar */}
      <UserAvatar username={msg.username} size={32} />

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 3 }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: `hsl(${avatarHue(msg.username)},70%,75%)` }}>
            {msg.username}
          </span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)' }}>
            {formatTime(msg.timestamp)}
          </span>
          {msg.is_edited && (
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', fontStyle: 'italic' }}>
              (edited)
            </span>
          )}
        </div>

        {/* Body — editing or display */}
        {isEditing ? (
          <div>
            <textarea
              ref={editRef}
              value={editText}
              onChange={e => setEditText(e.target.value)}
              onKeyDown={handleEditKey}
              rows={Math.min(editText.split('\n').length + 1, 6)}
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
            <div style={{ display: 'flex', gap: 6, marginTop: 5 }}>
              <button
                onClick={() => { if (editText.trim()) onEditSubmit(msg.id, editText.trim()) }}
                style={btnStyle('indigo')}
              >Save</button>
              <button onClick={onEditCancel} style={btnStyle('gray')}>Cancel</button>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', alignSelf: 'center' }}>
                Enter to save · Esc to cancel
              </span>
            </div>
          </div>
        ) : (
          <p style={{
            fontSize: 13.5, color: 'rgba(255,255,255,0.82)',
            lineHeight: 1.55, margin: 0,
            wordBreak: 'break-word', whiteSpace: 'pre-wrap',
          }}>
            {msg.content}
          </p>
        )}
      </div>

      {/* Action buttons — only visible on hover, only for own messages */}
      {isMine && !isEditing && (
        <div className="msg-actions" style={{
          display: 'flex', gap: 2, alignItems: 'flex-start',
          paddingTop: 2, opacity: 0, transition: 'opacity 0.12s',
        }}>
          <button
            title="Edit message"
            onClick={() => onEdit(msg.id)}
            style={iconBtn}
          >✎</button>
          <button
            title="Delete message"
            onClick={() => onDelete(msg.id)}
            style={{ ...iconBtn, color: 'rgba(239,68,68,0.7)' }}
          >✕</button>
        </div>
      )}
    </div>
  )
}

function btnStyle(color) {
  const bg = color === 'indigo' ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.06)'
  const hover = color === 'indigo' ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.1)'
  return {
    padding: '3px 10px', borderRadius: 4, border: 'none',
    background: bg, color: color === 'indigo' ? '#a5b4fc' : 'rgba(255,255,255,0.55)',
    fontSize: 12, fontWeight: 500, cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
  }
}

const iconBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: 'rgba(255,255,255,0.35)', fontSize: 13, padding: '2px 5px',
  borderRadius: 4, lineHeight: 1,
  fontFamily: "'Inter', sans-serif",
}

// ── Delete confirmation dialog ────────────────────────────────────────────────

function DeleteConfirm({ onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 200,
    }}>
      <div style={{
        background: '#1a1a28', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12, padding: '24px 28px', maxWidth: 340, width: '100%',
        boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
      }}>
        <p style={{ color: '#f0f0f5', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
          Delete message?
        </p>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, marginBottom: 20 }}>
          This cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} style={{ ...btnStyle('gray'), flex: 1, padding: '8px 0' }}>
            Cancel
          </button>
          <button onClick={onConfirm} style={{
            flex: 1, padding: '8px 0', borderRadius: 4, border: 'none',
            background: 'rgba(239,68,68,0.2)', color: '#fca5a5',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
          }}>
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main ChatPanel ─────────────────────────────────────────────────────────────

export default function ChatPanel({ channel, token, currentUser }) {
  const { messages, systemEvents, onlineUsers, status, error, sendMessage } =
    useWebSocket(channel.id, token)

  const [input,       setInput]       = useState('')
  const [editingId,   setEditingId]   = useState(null)
  const [confirmId,   setConfirmId]   = useState(null)  // message to delete
  const [actionError, setActionError] = useState(null)

  const bottomRef    = useRef(null)
  const listRef      = useRef(null)
  const atBottomRef  = useRef(true)
  const textareaRef  = useRef(null)

  // ── Auto-scroll ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (atBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  function handleScroll() {
    const el = listRef.current
    if (!el) return
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  // Reset on channel change
  useEffect(() => {
    setInput('')
    setEditingId(null)
    setConfirmId(null)
    setActionError(null)
    atBottomRef.current = true
  }, [channel.id])

  // ── Send message ───────────────────────────────────────────────────────────

  function handleSend() {
    const text = input.trim()
    if (!text || status !== 'open') return
    sendMessage(text)
    setInput('')
    atBottomRef.current = true
  }

  function handleInputKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Edit ───────────────────────────────────────────────────────────────────

  async function handleEditSubmit(msgId, newContent) {
    setActionError(null)
    try {
      await editMessage(msgId, newContent)
      // WS broadcast will update the message in state automatically
      setEditingId(null)
    } catch (err) {
      setActionError(err.response?.data?.detail ?? 'Failed to edit message.')
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function handleDeleteConfirm() {
    if (!confirmId) return
    setActionError(null)
    try {
      await deleteMessage(confirmId)
      // WS broadcast will remove the message from state automatically
    } catch (err) {
      setActionError(err.response?.data?.detail ?? 'Failed to delete message.')
    } finally {
      setConfirmId(null)
    }
  }

  // ── Merge messages and system events into a unified timeline ───────────────
  // System events aren't timestamped from the server, so we append them at the
  // bottom as a simple notification rather than interleaving by time.

  const currentUserId = currentUser?.sub ?? currentUser?.id ?? ''

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: '#0e0e14', fontFamily: "'Inter', sans-serif",
    }}>
      {/* ── Keyframe animations ── */}
      <style>{`
        .message-row:hover { background: rgba(255,255,255,0.025); }
        .message-row:hover .msg-actions { opacity: 1 !important; }
        .msg-actions button:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.7) !important; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        .msg-new { animation: fadeIn 0.18s ease-out both; }
        textarea:focus { border-color: rgba(99,102,241,0.6) !important; }
        .send-bar textarea:focus { border-color: rgba(99,102,241,0.5) !important; }
      `}</style>

      {/* ── Channel header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: '#13131e', flexShrink: 0,
      }}>
        <span style={{ color: '#818cf8', fontSize: 20, fontWeight: 300, lineHeight: 1 }}>#</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ color: '#f0f0f5', fontSize: 14, fontWeight: 600, margin: 0 }}>
            {channel.name}
          </h2>
          {channel.topic && (
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: 0 }}>
              {channel.topic}
            </p>
          )}
        </div>

        {/* Online count */}
        {onlineUsers.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 12, color: 'rgba(255,255,255,0.4)',
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
            {onlineUsers.length} online
          </div>
        )}

        <StatusPill status={status} />
      </div>

      {/* ── Connection / action error banner ── */}
      {(error || actionError) && (
        <div style={{
          padding: '8px 16px', background: 'rgba(239,68,68,0.1)',
          borderBottom: '1px solid rgba(239,68,68,0.2)',
          color: '#fca5a5', fontSize: 12, flexShrink: 0,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>⚠ {actionError || error}</span>
          <button
            onClick={() => { setActionError(null) }}
            style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: 14 }}
          >×</button>
        </div>
      )}

      {/* ── Message list ── */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        style={{
          flex: 1, overflowY: 'auto', padding: '12px 0',
          display: 'flex', flexDirection: 'column', gap: 1,
        }}
      >
        {/* Empty state */}
        {messages.length === 0 && status === 'open' && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 8,
            color: 'rgba(255,255,255,0.2)',
          }}>
            <div style={{ fontSize: 36 }}>💬</div>
            <p style={{ fontSize: 13, fontWeight: 500 }}>No messages yet</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)' }}>
              Be the first to say something in #{channel.name}
            </p>
          </div>
        )}

        {/* Loading state */}
        {status === 'connecting' && messages.length === 0 && (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.25)', fontSize: 13,
          }}>
            Connecting to #{channel.name}…
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <div key={msg.id} className="msg-new">
            <MessageRow
              msg={msg}
              isMine={msg.author_id === currentUserId}
              editingId={editingId}
              onEdit={(id) => { setEditingId(id); setActionError(null) }}
              onDelete={(id) => { setConfirmId(id); setActionError(null) }}
              onEditSubmit={handleEditSubmit}
              onEditCancel={() => setEditingId(null)}
            />
          </div>
        ))}

        {/* System events at bottom */}
        {systemEvents.slice(-5).map((ev, i) => (
          <SystemLine key={i} text={ev} />
        ))}

        {/* Scroll anchor */}
        <div ref={bottomRef} style={{ height: 4 }} />
      </div>

      {/* ── Send bar ── */}
      <div
        className="send-bar"
        style={{
          padding: '10px 16px 14px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: '#13131e', flexShrink: 0,
        }}
      >
        <div style={{
          display: 'flex', gap: 8, alignItems: 'flex-end',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 8, padding: '6px 6px 6px 12px',
          transition: 'border-color 0.2s',
        }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleInputKey}
            placeholder={
              status === 'open'
                ? `Message #${channel.name}`
                : status === 'connecting'
                ? 'Connecting…'
                : 'Reconnecting…'
            }
            disabled={status !== 'open'}
            rows={1}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: '#e5e7eb', fontSize: 13.5, lineHeight: 1.55,
              resize: 'none', fontFamily: "'Inter', sans-serif",
              minHeight: 22, maxHeight: 120, overflowY: 'auto',
              // grow with content
              height: 'auto',
            }}
            onInput={e => {
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || status !== 'open'}
            title="Send (Enter)"
            style={{
              width: 32, height: 32, borderRadius: 6, border: 'none',
              background: input.trim() && status === 'open'
                ? 'linear-gradient(135deg, #4f46e5, #06b6d4)'
                : 'rgba(255,255,255,0.07)',
              color: input.trim() && status === 'open'
                ? '#fff'
                : 'rgba(255,255,255,0.3)',
              cursor: input.trim() && status === 'open' ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, flexShrink: 0, transition: 'background 0.2s',
            }}
          >
            ↑
          </button>
        </div>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 5, marginBottom: 0 }}>
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
