/**
 * src/hooks/useWebSocket.js
 *
 * Fix: channelId is now always converted to a string before being used
 * in the WebSocket URL. If a UUID object slips through instead of a
 * string, it would produce "wss://host/ws/[object Object]/token"
 * which connects but receives no messages since the channel can't
 * be found by that ID.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

function wsUrl(channelId, token) {
  const origin   = API_ORIGIN.replace(/^https?:\/\//, '')
  const protocol = API_ORIGIN.startsWith('https') ? 'wss' : 'ws'
  // Always stringify channelId — UUID objects produce "[object Object]"
  return `${protocol}://${origin}/ws/${String(channelId)}/${token}`
}

const FATAL_CODES = new Set([4001, 4003, 4004])
const BASE_DELAY  = 1500
const MAX_DELAY   = 30000

export function useWebSocket(channelId, token) {
  const [messages,     setMessages]     = useState([])
  const [systemEvents, setSystemEvents] = useState([])
  const [onlineUsers,  setOnlineUsers]  = useState([])
  const [status,       setStatus]       = useState('closed')
  const [error,        setError]        = useState(null)

  const wsRef      = useRef(null)
  const retryCount = useRef(0)
  const retryTimer = useRef(null)
  const mountedRef = useRef(true)

  const handleFrame = useCallback((raw) => {
    let frame
    try { frame = JSON.parse(raw) } catch { return }

    switch (frame.type) {
      case 'history':
        setMessages(prev => {
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
        setMessages(prev => prev.map(m =>
          m.id === frame.id
            ? { ...m, content: frame.content, is_edited: true, updated_at: frame.updated_at }
            : m
        ))
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
        setSystemEvents(prev => [...prev.slice(-49), frame.content])
        break
      case 'error':
        setError(frame.content)
        break
      default:
        break
    }
  }, [])

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
    ws.onmessage = (ev) => { if (mountedRef.current) handleFrame(ev.data) }
    ws.onerror   = () => {}
    ws.onclose   = (ev) => {
      if (!mountedRef.current) return
      wsRef.current = null
      if (FATAL_CODES.has(ev.code)) {
        setStatus('error')
        setError(ev.reason || 'Connection refused by server.')
        return
      }
      setStatus('closed')
      const delay = Math.min(BASE_DELAY * 2 ** retryCount.current, MAX_DELAY)
      retryCount.current += 1
      retryTimer.current = setTimeout(() => { if (mountedRef.current) connect() }, delay)
    }
  }, [channelId, token, handleFrame])

  useEffect(() => {
    mountedRef.current = true
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
        wsRef.current.onclose = null
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [channelId, token]) // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = useCallback((text) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(text.trim())
    }
  }, [])

  return { messages, systemEvents, onlineUsers, status, error, sendMessage }
}

function toMessage(frame) {
  return {
    id:         frame.id,
    content:    frame.content,
    author_id:  String(frame.author_id),
    username:   frame.username ?? '[deleted]',
    channel_id: frame.channel_id,
    timestamp:  frame.timestamp,
    is_edited:  frame.is_edited  ?? false,
    updated_at: frame.updated_at ?? null,
  }
}
