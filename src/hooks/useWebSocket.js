/**
 * src/hooks/useWebSocket.js
 *
 * Manages the full WebSocket lifecycle for a single channel.
 *
 * Features
 * --------
 * • Connects to WS /ws/{channel_id}/{token} on mount / channel change
 * • Handles all server frame types: history, message, edit, delete,
 *   status_update, system, error
 * • Auto-reconnects with exponential back-off (up to 30 s) on unexpected
 *   disconnects — NOT on auth/membership close codes (4001, 4003, 4004)
 * • Exposes sendMessage() action
 * • Cleans up on unmount or channel change — no stale sockets
 *
 * Usage
 * -----
 *   const {
 *     messages,       // Message[]  — ordered oldest → newest
 *     systemEvents,   // string[]   — join/leave announcements
 *     onlineUsers,    // { user_id, username }[]
 *     status,         // 'connecting' | 'open' | 'closed' | 'error'
 *     error,          // string | null
 *     sendMessage,    // (text: string) => void
 *   } = useWebSocket(channelId, token)
 */

import { useCallback, useEffect, useRef, useState } from 'react'

// Build the WebSocket base URL from the same env var as Axios.
// e.g. https://telesust.onrender.com  →  wss://telesust.onrender.com
const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL ?? '')
  .replace(/\/$/, '')

function wsUrl(channelId, token) {
  const origin = API_ORIGIN.replace(/^https?:\/\//, '')
  const protocol = API_ORIGIN.startsWith('https') ? 'wss' : 'ws'
  return `${protocol}://${origin}/ws/${channelId}/${token}`
}

// These close codes are sent by the backend for auth/membership failures.
// We must NOT retry on these — the problem won't self-resolve.
const FATAL_CODES = new Set([4001, 4003, 4004])
const BASE_DELAY  = 1500   // ms before first retry
const MAX_DELAY   = 30000  // ms cap

export function useWebSocket(channelId, token) {
  const [messages,     setMessages]     = useState([])
  const [systemEvents, setSystemEvents] = useState([])
  const [onlineUsers,  setOnlineUsers]  = useState([])
  const [status,       setStatus]       = useState('closed')
  const [error,        setError]        = useState(null)

  const wsRef        = useRef(null)
  const retryCount   = useRef(0)
  const retryTimer   = useRef(null)
  const mountedRef   = useRef(true)

  // ── Frame dispatcher ─────────────────────────────────────────────────────

  const handleFrame = useCallback((raw) => {
    let frame
    try { frame = JSON.parse(raw) } catch { return }

    switch (frame.type) {

      case 'history':
        setMessages(prev => {
          // Guard against duplicate replay on reconnect
          if (prev.some(m => m.id === frame.id)) return prev
          return [...prev, toMessage(frame)]
        })
        break

      case 'message':
        setMessages(prev => {
          if (prev.some(m => m.id === frame.id)) return prev
          return [...prev, toMessage(frame)]
        })
        break

      case 'edit':
        setMessages(prev =>
          prev.map(m =>
            m.id === frame.id
              ? { ...m, content: frame.content, is_edited: true, updated_at: frame.updated_at }
              : m
          )
        )
        break

      case 'delete':
        setMessages(prev => prev.filter(m => m.id !== frame.id))
        break

      case 'status_update':
        setOnlineUsers(prev => {
          const others = prev.filter(u => u.user_id !== frame.user_id)
          return frame.status === 'online'
            ? [...others, { user_id: frame.user_id, username: frame.username }]
            : others
        })
        break

      case 'system':
        setSystemEvents(prev => [...prev.slice(-49), frame.content]) // keep last 50
        break

      case 'error':
        setError(frame.content)
        break

      default:
        break
    }
  }, [])

  // ── Connect ──────────────────────────────────────────────────────────────

  const connect = useCallback(() => {
    if (!channelId || !token || !mountedRef.current) return

    setStatus('connecting')
    const ws = new WebSocket(wsUrl(channelId, token))
    wsRef.current = ws

    ws.onopen = () => {
      if (!mountedRef.current) { ws.close(); return }
      retryCount.current = 0
      setStatus('open')
      setError(null)
    }

    ws.onmessage = (ev) => {
      if (mountedRef.current) handleFrame(ev.data)
    }

    ws.onerror = () => {
      // onerror always fires before onclose — let onclose handle state
    }

    ws.onclose = (ev) => {
      if (!mountedRef.current) return
      wsRef.current = null

      if (FATAL_CODES.has(ev.code)) {
        setStatus('error')
        setError(ev.reason || 'Connection refused by server.')
        return
      }

      setStatus('closed')
      // Exponential back-off
      const delay = Math.min(BASE_DELAY * 2 ** retryCount.current, MAX_DELAY)
      retryCount.current += 1
      retryTimer.current = setTimeout(() => {
        if (mountedRef.current) connect()
      }, delay)
    }
  }, [channelId, token, handleFrame])

  // ── Lifecycle ────────────────────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true

    // Reset state when channel changes
    setMessages([])
    setSystemEvents([])
    setOnlineUsers([])
    setError(null)
    retryCount.current = 0

    connect()

    return () => {
      mountedRef.current = false
      clearTimeout(retryTimer.current)
      if (wsRef.current) {
        wsRef.current.onclose = null  // prevent reconnect loop on intentional close
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [channelId, token]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Public API ───────────────────────────────────────────────────────────

  const sendMessage = useCallback((text) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(text.trim())
    }
  }, [])

  return { messages, systemEvents, onlineUsers, status, error, sendMessage }
}

// ── Normalise a server frame to our internal Message shape ─────────────────

function toMessage(frame) {
  return {
    id:         frame.id,
    content:    frame.content,
    author_id:  frame.author_id,
    username:   frame.username ?? '[deleted]',
    channel_id: frame.channel_id,
    timestamp:  frame.timestamp,
    is_edited:  frame.is_edited  ?? false,
    updated_at: frame.updated_at ?? null,
  }
}
