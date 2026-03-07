/**
 * src/pages/DashboardPage.jsx
 *
 * Three-column layout:
 *
 *  ┌──────────────┬─────────────────┬──────────────────────────────┐
 *  │  Groups      │  Channels       │  Main panel                  │
 *  │  sidebar     │  (loads when    │  (placeholder for messages)  │
 *  │              │   group clicked)│                              │
 *  └──────────────┴─────────────────┴──────────────────────────────┘
 *
 * State:
 *   groups         — from GET /groups
 *   selectedGroup  — GroupResponse object, set on group click
 *   channels       — from GET /groups/{id}/channels, reloads per group
 *   selectedChannel— ChannelResponse object, set on channel click
 */

import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  getGroups,
  createGroup,
  joinGroup,
  getChannels,
  createChannel,
} from '../services/groupsService'

// ── Helpers ──────────────────────────────────────────────────────────────────

function initials(name = '') {
  return name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

function hueFromString(str = '') {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return Math.abs(hash) % 360
}

function GroupAvatar({ name, size = 'sm' }) {
  const hue = hueFromString(name)
  const dim = size === 'sm' ? 'w-7 h-7 text-[11px]' : 'w-8 h-8 text-sm'
  return (
    <div
      className={`${dim} rounded-md flex items-center justify-center font-bold text-white/90 shrink-0`}
      style={{
        backgroundColor: `hsl(${hue},45%,28%)`,
        border: `1px solid hsl(${hue},45%,38%)`,
      }}
    >
      {initials(name)}
    </div>
  )
}

function SkeletonList({ rows = 4 }) {
  return (
    <div className="flex flex-col gap-1.5 px-2 mt-2">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="h-8 rounded-md bg-white/[0.04] animate-pulse" style={{ opacity: 1 - i * 0.18 }} />
      ))}
    </div>
  )
}

function ErrorBanner({ message }) {
  return (
    <div className="mx-2 mt-2 px-3 py-2 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
      {message}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, logoutUser } = useAuth()
  const navigate = useNavigate()

  // Groups
  const [groups, setGroups]               = useState([])
  const [groupsLoading, setGroupsLoading] = useState(true)
  const [groupsError, setGroupsError]     = useState(null)
  const [selectedGroup, setSelectedGroup] = useState(null)

  // Channels
  const [channels, setChannels]               = useState([])
  const [channelsLoading, setChannelsLoading] = useState(false)
  const [channelsError, setChannelsError]     = useState(null)
  const [selectedChannel, setSelectedChannel] = useState(null)

  // Modals
  const [modal, setModal] = useState(null) // 'createGroup' | 'joinGroup' | 'createChannel'

  const displayName = user?.username ?? user?.sub?.slice(0, 8) ?? 'you'

  // ── Fetch groups on mount ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    setGroupsLoading(true)
    setGroupsError(null)
    getGroups()
      .then(data => { if (!cancelled) setGroups(data) })
      .catch(err => { if (!cancelled) setGroupsError(err.response?.data?.detail ?? 'Failed to load groups.') })
      .finally(() => { if (!cancelled) setGroupsLoading(false) })
    return () => { cancelled = true }
  }, [])

  // ── Fetch channels when selected group changes ─────────────────────────────
  useEffect(() => {
    if (!selectedGroup) return
    let cancelled = false
    setChannels([])
    setSelectedChannel(null)
    setChannelsLoading(true)
    setChannelsError(null)
    getChannels(selectedGroup.id)
      .then(data => { if (!cancelled) setChannels(data) })
      .catch(err => { if (!cancelled) setChannelsError(err.response?.data?.detail ?? 'Failed to load channels.') })
      .finally(() => { if (!cancelled) setChannelsLoading(false) })
    return () => { cancelled = true }
  }, [selectedGroup?.id])

  function handleSelectGroup(group) {
    setSelectedGroup(group)
  }

  function handleLogout() {
    logoutUser()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-screen bg-[#0e0e14] text-gray-100 overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ══════════════════════════════════════════════
          COLUMN 1 — Groups sidebar
      ══════════════════════════════════════════════ */}
      <aside className="flex flex-col w-[220px] shrink-0 bg-[#111118] border-r border-white/[0.06]">

        {/* App logo */}
        <div className="flex items-center gap-2 px-4 py-[14px] border-b border-white/[0.06]">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-white font-bold text-xs shrink-0">T</div>
          <span className="font-semibold text-white text-sm tracking-tight">teleSUST</span>
        </div>

        {/* Groups list */}
        <div className="flex-1 overflow-y-auto py-3 px-2">
          <div className="flex items-center justify-between px-2 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-600">Groups</span>
            <div className="flex gap-1">
              {/* Join */}
              <button
                onClick={() => setModal('joinGroup')}
                title="Join a group"
                className="w-5 h-5 flex items-center justify-center rounded text-gray-600 hover:text-gray-300 hover:bg-white/10 transition-colors text-sm"
              >⤵</button>
              {/* Create */}
              <button
                onClick={() => setModal('createGroup')}
                title="Create a group"
                className="w-5 h-5 flex items-center justify-center rounded text-gray-600 hover:text-gray-300 hover:bg-white/10 transition-colors text-lg leading-none"
              >+</button>
            </div>
          </div>

          {groupsLoading && <SkeletonList rows={4} />}
          {groupsError && !groupsLoading && <ErrorBanner message={groupsError} />}
          {!groupsLoading && !groupsError && groups.length === 0 && (
            <p className="px-2 mt-3 text-gray-600 text-xs leading-relaxed">
              No groups yet.{' '}
              <button onClick={() => setModal('createGroup')} className="text-indigo-400 hover:text-indigo-300">
                Create one →
              </button>
            </p>
          )}

          {!groupsLoading && !groupsError && groups.length > 0 && (
            <ul className="flex flex-col gap-0.5 mt-0.5">
              {groups.map(group => {
                const isActive = selectedGroup?.id === group.id
                return (
                  <li key={group.id}>
                    <button
                      onClick={() => handleSelectGroup(group)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-all group
                        ${isActive ? 'bg-indigo-500/20 text-white' : 'text-gray-400 hover:bg-white/[0.05] hover:text-gray-200'}`}
                    >
                      <GroupAvatar name={group.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{group.name}</p>
                        <p className="text-[10px] text-gray-600 group-hover:text-gray-500">
                          {group.member_count} member{group.member_count !== 1 ? 's' : ''}
                        </p>
                      </div>
                      {isActive && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* User footer */}
        <div className="flex items-center gap-2 px-3 py-3 border-t border-white/[0.06] bg-[#0d0d14]">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
            {displayName[0]?.toUpperCase()}
          </div>
          <span className="flex-1 text-xs text-gray-300 truncate font-medium">{displayName}</span>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="text-gray-600 hover:text-red-400 transition-colors p-1 rounded hover:bg-red-400/10 text-xs"
          >⏻</button>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════
          COLUMN 2 — Channels sidebar (only when group selected)
      ══════════════════════════════════════════════ */}
      {selectedGroup && (
        <aside className="flex flex-col w-[200px] shrink-0 bg-[#13131e] border-r border-white/[0.06]">

          {/* Group header */}
          <div className="flex items-center gap-2 px-3 py-[14px] border-b border-white/[0.06]">
            <GroupAvatar name={selectedGroup.name} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{selectedGroup.name}</p>
              {selectedGroup.description && (
                <p className="text-[10px] text-gray-600 truncate">{selectedGroup.description}</p>
              )}
            </div>
          </div>

          {/* Channels list */}
          <div className="flex-1 overflow-y-auto py-3 px-2">
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-600">Channels</span>
              <button
                onClick={() => setModal('createChannel')}
                title="Create a channel"
                className="w-5 h-5 flex items-center justify-center rounded text-gray-600 hover:text-gray-300 hover:bg-white/10 transition-colors text-lg leading-none"
              >+</button>
            </div>

            {channelsLoading && <SkeletonList rows={3} />}
            {channelsError && !channelsLoading && <ErrorBanner message={channelsError} />}
            {!channelsLoading && !channelsError && channels.length === 0 && (
              <p className="px-2 mt-2 text-gray-600 text-xs leading-relaxed">
                No channels yet.{' '}
                <button onClick={() => setModal('createChannel')} className="text-indigo-400 hover:text-indigo-300">
                  Create one →
                </button>
              </p>
            )}

            {!channelsLoading && !channelsError && channels.length > 0 && (
              <ul className="flex flex-col gap-0.5">
                {channels.map(channel => {
                  const isActive = selectedChannel?.id === channel.id
                  return (
                    <li key={channel.id}>
                      <button
                        onClick={() => setSelectedChannel(channel)}
                        className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-left transition-all
                          ${isActive ? 'bg-indigo-500/20 text-white' : 'text-gray-500 hover:bg-white/[0.05] hover:text-gray-300'}`}
                      >
                        {/* # prefix like Slack/Discord */}
                        <span className={`text-sm font-light shrink-0 ${isActive ? 'text-indigo-400' : 'text-gray-600'}`}>#</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{channel.name}</p>
                          {channel.topic && (
                            <p className="text-[10px] text-gray-600 truncate">{channel.topic}</p>
                          )}
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </aside>
      )}

      {/* ══════════════════════════════════════════════
          COLUMN 3 — Main panel
      ══════════════════════════════════════════════ */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {selectedChannel ? (
          <>
            {/* Channel header */}
            <div className="flex items-center gap-3 px-6 py-[14px] border-b border-white/[0.06] bg-[#13131e] shrink-0">
              <span className="text-indigo-400 text-lg font-light">#</span>
              <div>
                <h1 className="text-white font-semibold text-sm">{selectedChannel.name}</h1>
                {selectedChannel.topic && (
                  <p className="text-gray-500 text-xs">{selectedChannel.topic}</p>
                )}
              </div>
              <span className="ml-auto font-mono text-[10px] text-gray-700 bg-white/[0.03] px-2 py-1 rounded border border-white/[0.05]">
                {selectedChannel.id}
              </span>
            </div>

            {/* Messages placeholder — you'll build this next */}
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-2">
                <div className="text-4xl opacity-20">💬</div>
                <p className="text-gray-500 text-sm font-medium">Messages coming next</p>
                <p className="text-gray-700 text-xs font-mono">channel_id: {selectedChannel.id}</p>
              </div>
            </div>
          </>
        ) : selectedGroup ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="text-4xl opacity-20">👈</div>
              <p className="text-gray-500 text-sm">Pick a channel from the sidebar</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="text-4xl opacity-20">💬</div>
              <p className="text-gray-500 text-sm">Select a group to get started</p>
            </div>
          </div>
        )}
      </main>

      {/* ══════════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════════ */}
      {modal === 'createGroup' && (
        <CreateGroupModal
          onClose={() => setModal(null)}
          onCreated={newGroup => {
            setGroups(prev => [newGroup, ...prev])
            setSelectedGroup(newGroup)
            setModal(null)
          }}
        />
      )}
      {modal === 'joinGroup' && (
        <JoinGroupModal
          onClose={() => setModal(null)}
          onJoined={group => {
            setGroups(prev => prev.find(g => g.id === group.id) ? prev : [group, ...prev])
            setSelectedGroup(group)
            setModal(null)
          }}
        />
      )}
      {modal === 'createChannel' && selectedGroup && (
        <CreateChannelModal
          groupId={selectedGroup.id}
          onClose={() => setModal(null)}
          onCreated={newChannel => {
            setChannels(prev => [...prev, newChannel])
            setSelectedChannel(newChannel)
            setModal(null)
          }}
        />
      )}
    </div>
  )
}

// ── Modal shell ───────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#1a1a28] border border-white/10 rounded-xl p-6 w-full max-w-sm shadow-2xl">
        <h2 className="text-white font-semibold text-sm mb-4">{title}</h2>
        {children}
      </div>
    </div>
  )
}

function ModalInput({ label, optional, ...props }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-1">
        {label}{optional && <span className="normal-case text-gray-600 ml-1">(optional)</span>}
      </label>
      <input
        className="w-full bg-white/[0.05] border border-white/10 rounded-md px-3 py-2 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-indigo-500/60 transition-colors"
        {...props}
      />
    </div>
  )
}

function ModalActions({ onClose, submitLabel, disabled }) {
  return (
    <div className="flex gap-2 mt-4">
      <button type="button" onClick={onClose}
        className="flex-1 py-2 rounded-md text-sm text-gray-400 hover:text-gray-200 bg-white/[0.04] hover:bg-white/[0.08] transition-colors">
        Cancel
      </button>
      <button type="submit" disabled={disabled}
        className="flex-1 py-2 rounded-md text-sm font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors">
        {submitLabel}
      </button>
    </div>
  )
}

// ── Create Group Modal ────────────────────────────────────────────────────────

function CreateGroupModal({ onClose, onCreated }) {
  const [fields, setFields] = useState({ name: '', description: '', join_password: '', is_read_only: false })
  const [error, setError]   = useState('')
  const [busy, setBusy]     = useState(false)

  const set = (key, val) => setFields(p => ({ ...p, [key]: val }))

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const group = await createGroup(fields)
      onCreated(group)
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Failed to create group.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Create a group" onClose={onClose}>
      {error && <ErrorBanner message={error} />}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <ModalInput label="Name" autoFocus required placeholder="e.g. CSE 2021 Batch"
          value={fields.name} onChange={e => set('name', e.target.value)} />
        <ModalInput label="Description" optional placeholder="What's this group for?"
          value={fields.description} onChange={e => set('description', e.target.value)} />
        {/* join_password is REQUIRED by GroupCreateRequest (min_length=4) */}
        <ModalInput label="Join Password" required type="password" placeholder="Min. 4 characters"
          value={fields.join_password} onChange={e => set('join_password', e.target.value)} />
        <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
          <input type="checkbox" className="accent-indigo-500"
            checked={fields.is_read_only} onChange={e => set('is_read_only', e.target.checked)} />
          Read-only (announcement group — only admins can post)
        </label>
        <ModalActions onClose={onClose} submitLabel={busy ? 'Creating…' : 'Create Group'}
          disabled={!fields.name.trim() || fields.join_password.length < 4 || busy} />
      </form>
    </Modal>
  )
}

// ── Join Group Modal ──────────────────────────────────────────────────────────

function JoinGroupModal({ onClose, onJoined }) {
  const [groupId, setGroupId]         = useState('')
  const [joinPassword, setJoinPassword] = useState('')
  const [error, setError]             = useState('')
  const [busy, setBusy]               = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const data = await joinGroup(groupId.trim(), joinPassword)
      onJoined(data.group)
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Failed to join group.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Join a group" onClose={onClose}>
      {error && <ErrorBanner message={error} />}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <ModalInput label="Group ID" autoFocus required placeholder="Paste the group UUID"
          value={groupId} onChange={e => setGroupId(e.target.value)} />
        <ModalInput label="Join Password" required type="password" placeholder="Group password"
          value={joinPassword} onChange={e => setJoinPassword(e.target.value)} />
        <ModalActions onClose={onClose} submitLabel={busy ? 'Joining…' : 'Join Group'}
          disabled={!groupId.trim() || !joinPassword || busy} />
      </form>
    </Modal>
  )
}

// ── Create Channel Modal ──────────────────────────────────────────────────────

function CreateChannelModal({ groupId, onClose, onCreated }) {
  const [fields, setFields] = useState({ name: '', topic: '' })
  const [error, setError]   = useState('')
  const [busy, setBusy]     = useState(false)

  const set = (key, val) => setFields(p => ({ ...p, [key]: val }))

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const channel = await createChannel(groupId, fields)
      onCreated(channel)
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Failed to create channel.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Create a channel" onClose={onClose}>
      {error && <ErrorBanner message={error} />}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <ModalInput label="Name" autoFocus required placeholder="e.g. general"
          value={fields.name} onChange={e => set('name', e.target.value)} />
        <ModalInput label="Topic" optional placeholder="What's this channel about?"
          value={fields.topic} onChange={e => set('topic', e.target.value)} />
        <ModalActions onClose={onClose} submitLabel={busy ? 'Creating…' : 'Create Channel'}
          disabled={!fields.name.trim() || busy} />
      </form>
    </Modal>
  )
}
