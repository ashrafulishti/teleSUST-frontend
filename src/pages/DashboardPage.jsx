/**
 * src/pages/DashboardPage.jsx
 *
 * Fixes:
 * 1. Groups reload properly after logout/login — useEffect depends on
 *    isAuthenticated so it re-fetches when the user logs back in.
 *    Groups state is also cleared on logout.
 *
 * 2. channel.id passed to ChatPanel is always a string — UUID objects
 *    would produce "[object Object]" in the WebSocket URL.
 *
 * 3. Join group UX — group cards now show a "Copy ID" button so the
 *    creator can share the UUID. The join modal also has a hint explaining
 *    what the Group ID is.
 */

import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import ChatPanel from '../components/ChatPanel'
import {
  getGroups,
  createGroup,
  joinGroup,
  getChannels,
  createChannel,
} from '../services/groupsService'

// ── Responsive hook ───────────────────────────────────────────────────────────

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return isMobile
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, onSubmit, submitLabel = 'Submit', loading = false, error, children }) {
  return (
    <div style={overlay} onClick={onClose}>
      <div style={modalCard} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ color: '#f0f0f5', fontSize: 15, fontWeight: 700, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>
        {error && <div style={errorBox}><span>⚠</span> {error}</div>}
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {children}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={cancelBtnStyle}>Cancel</button>
            <button type="submit" disabled={loading} style={submitBtnStyle}>
              {loading ? 'Working…' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModalInput({ label, hint, ...props }) {
  return (
    <div>
      {label && <label style={labelStyle}>{label}</label>}
      <input style={inputStyle} {...props} />
      {hint && <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{hint}</p>}
    </div>
  )
}

// ── Group item ────────────────────────────────────────────────────────────────

function GroupItem({ group, selected, onClick }) {
  const [copied, setCopied] = useState(false)
  const letter = group.name?.[0]?.toUpperCase() ?? '?'

  function copyId(e) {
    e.stopPropagation()
    navigator.clipboard.writeText(group.id).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
      background: selected ? 'rgba(99,102,241,0.15)' : 'transparent',
      border: selected ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
      transition: 'background 0.15s',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: selected ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, fontWeight: 700,
        color: selected ? '#a5b4fc' : 'rgba(255,255,255,0.5)',
      }}>{letter}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: 0, fontSize: 13, fontWeight: 600,
          color: selected ? '#a5b4fc' : 'rgba(255,255,255,0.8)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{group.name}</p>
        {group.member_count != null && (
          <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
            {group.member_count} member{group.member_count !== 1 ? 's' : ''}
          </p>
        )}
      </div>
      {/* Copy ID button — lets creator share group UUID with others */}
      <button
        onClick={copyId}
        title="Copy group ID to share with others"
        style={{
          flexShrink: 0, background: 'none', border: 'none',
          color: copied ? '#22c55e' : 'rgba(255,255,255,0.2)',
          cursor: 'pointer', fontSize: 11, padding: '2px 4px',
          borderRadius: 4, fontFamily: "'Inter', sans-serif",
          transition: 'color 0.2s',
        }}
      >
        {copied ? '✓' : '⎘'}
      </button>
    </div>
  )
}

// ── Channel item ──────────────────────────────────────────────────────────────

function ChannelItem({ channel, selected, onClick }) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '7px 10px', borderRadius: 7, cursor: 'pointer',
      background: selected ? 'rgba(99,102,241,0.15)' : 'transparent',
      transition: 'background 0.15s',
    }}>
      <span style={{ color: selected ? '#818cf8' : 'rgba(255,255,255,0.3)', fontSize: 15 }}>#</span>
      <span style={{
        fontSize: 13, fontWeight: selected ? 600 : 400,
        color: selected ? '#c7d2fe' : 'rgba(255,255,255,0.6)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{channel.name}</span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, token, logoutUser, isAuthenticated } = useAuth()
  const isMobile = useIsMobile()

  const [groups,           setGroups]           = useState([])
  const [channels,         setChannels]         = useState([])
  const [selectedGroup,    setSelectedGroup]    = useState(null)
  const [selectedChannel,  setSelectedChannel]  = useState(null)
  const [loadingGroups,    setLoadingGroups]    = useState(false)
  const [loadingChannels,  setLoadingChannels]  = useState(false)
  const [mobileTab,        setMobileTab]        = useState('groups')

  const [modal,        setModal]        = useState(null)
  const [modalError,   setModalError]   = useState('')
  const [modalLoading, setModalLoading] = useState(false)

  const [newGroupName,     setNewGroupName]     = useState('')
  const [newGroupDesc,     setNewGroupDesc]     = useState('')
  const [newGroupPassword, setNewGroupPassword] = useState('')
  const [joinGroupId,      setJoinGroupId]      = useState('')
  const [joinGroupPwd,     setJoinGroupPwd]     = useState('')
  const [newChannelName,   setNewChannelName]   = useState('')
  const [newChannelTopic,  setNewChannelTopic]  = useState('')

  // ── FIX 1: Load groups whenever auth state changes ───────────────────────
  // Previously this only ran on mount, so after logout→login the groups
  // list was empty because the effect never re-fired.
  useEffect(() => {
    if (!isAuthenticated) {
      // Clear everything on logout
      setGroups([])
      setChannels([])
      setSelectedGroup(null)
      setSelectedChannel(null)
      return
    }
    setLoadingGroups(true)
    getGroups()
      .then(data => setGroups(data.groups ?? []))
      .catch(() => {})
      .finally(() => setLoadingGroups(false))
  }, [isAuthenticated])

  // ── Load channels when group changes ─────────────────────────────────────
  useEffect(() => {
    if (!selectedGroup) { setChannels([]); setSelectedChannel(null); return }
    setLoadingChannels(true)
    setSelectedChannel(null)
    getChannels(selectedGroup.id)
      .then(data => setChannels(data.channels ?? []))
      .catch(() => {})
      .finally(() => setLoadingChannels(false))
  }, [selectedGroup])

  function selectGroup(g) {
    setSelectedGroup(g)
    if (isMobile) setMobileTab('channels')
  }

  function selectChannel(ch) {
    setSelectedChannel(ch)
    if (isMobile) setMobileTab('chat')
  }

  // ── Modal helpers ─────────────────────────────────────────────────────────
  function openModal(name) {
    setModal(name); setModalError('')
    setNewGroupName(''); setNewGroupDesc(''); setNewGroupPassword('')
    setJoinGroupId(''); setJoinGroupPwd('')
    setNewChannelName(''); setNewChannelTopic('')
  }
  function closeModal() { setModal(null); setModalError(''); setModalLoading(false) }

  async function handleCreateGroup(e) {
    e.preventDefault()
    if (!newGroupName.trim() || newGroupPassword.length < 4) return
    setModalLoading(true); setModalError('')
    try {
      const g = await createGroup({
        name: newGroupName.trim(),
        description: newGroupDesc.trim() || undefined,
        join_password: newGroupPassword,
      })
      setGroups(prev => [...prev, g])
      closeModal()
      selectGroup(g)
    } catch (err) {
      const d = err?.response?.data?.detail
      setModalError(typeof d === 'string' ? d : 'Failed to create group.')
    } finally { setModalLoading(false) }
  }

  async function handleJoinGroup(e) {
    e.preventDefault()
    if (!joinGroupId.trim() || !joinGroupPwd) return
    setModalLoading(true); setModalError('')
    try {
      const { group } = await joinGroup(joinGroupId.trim(), joinGroupPwd)
      setGroups(prev => prev.find(g => g.id === group.id) ? prev : [...prev, group])
      closeModal()
      selectGroup(group)
    } catch (err) {
      const d = err?.response?.data?.detail
      setModalError(typeof d === 'string' ? d : 'Failed to join group.')
    } finally { setModalLoading(false) }
  }

  async function handleCreateChannel(e) {
    e.preventDefault()
    if (!newChannelName.trim() || !selectedGroup) return
    setModalLoading(true); setModalError('')
    try {
      const ch = await createChannel(selectedGroup.id, {
        name: newChannelName.trim(),
        topic: newChannelTopic.trim() || undefined,
      })
      setChannels(prev => [...prev, ch])
      closeModal()
      selectChannel(ch)
    } catch (err) {
      const d = err?.response?.data?.detail
      setModalError(typeof d === 'string' ? d : 'Failed to create channel.')
    } finally { setModalLoading(false) }
  }

  // ── Panels ────────────────────────────────────────────────────────────────

  const GroupsPanel = (
    <div style={{ ...panel, borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>
      <div style={panelHeader}>
        <span style={panelTitle}>Groups</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => openModal('joinGroup')}   style={iconBtn}       title="Join group">＋</button>
          <button onClick={() => openModal('createGroup')} style={iconBtnAccent} title="Create group">✦</button>
        </div>
      </div>
      <div style={panelBody}>
        {loadingGroups && <p style={dimText}>Loading…</p>}
        {!loadingGroups && groups.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <p style={{ ...dimText, marginBottom: 12 }}>No groups yet.</p>
            <button onClick={() => openModal('createGroup')} style={submitBtnStyle}>Create one</button>
          </div>
        )}
        {groups.map(g => (
          <GroupItem
            key={g.id}
            group={g}
            selected={selectedGroup?.id === g.id}
            onClick={() => selectGroup(g)}
          />
        ))}
      </div>
      <div style={userFooter}>
        <div style={userAvatar}>{user?.username?.[0]?.toUpperCase() ?? '?'}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            margin: 0, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{user?.username ?? '…'}</p>
        </div>
        <button onClick={logoutUser} style={logoutBtn} title="Logout">⏻</button>
      </div>
    </div>
  )

  const ChannelsPanel = (
    <div style={{ ...panel, borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>
      <div style={panelHeader}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <span style={panelTitle}>{selectedGroup?.name ?? 'Channels'}</span>
        </div>
        {selectedGroup && (
          <button onClick={() => openModal('createChannel')} style={iconBtn} title="New channel">＋</button>
        )}
      </div>
      <div style={panelBody}>
        {!selectedGroup    && <p style={dimText}>Select a group first.</p>}
        {selectedGroup && loadingChannels && <p style={dimText}>Loading…</p>}
        {selectedGroup && !loadingChannels && channels.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <p style={{ ...dimText, marginBottom: 12 }}>No channels yet.</p>
            <button onClick={() => openModal('createChannel')} style={submitBtnStyle}>Create one</button>
          </div>
        )}
        {channels.map(ch => (
          <ChannelItem
            key={ch.id}
            channel={ch}
            selected={selectedChannel?.id === ch.id}
            onClick={() => selectChannel(ch)}
          />
        ))}
      </div>
    </div>
  )

  // FIX 2: channel.id always passed as string to avoid "[object Object]" in WS URL
  const ChatArea = (
    <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {selectedChannel && token ? (
        <ChatPanel
          key={String(selectedChannel.id)}
          channel={{ ...selectedChannel, id: String(selectedChannel.id) }}
          token={token}
          currentUser={user}
        />
      ) : (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#0e0e14', color: 'rgba(255,255,255,0.15)',
          fontFamily: "'Inter', sans-serif", gap: 10, padding: '2rem',
        }}>
          <div style={{ fontSize: 48 }}>💬</div>
          <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>
            {selectedGroup ? 'Select a channel to start chatting' : 'Select a group to get started'}
          </p>
        </div>
      )}
    </div>
  )

  // ── Desktop layout ────────────────────────────────────────────────────────
  if (!isMobile) {
    return (
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0e0e14', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
          {GroupsPanel}
        </div>
        <div style={{ width: 200, flexShrink: 0, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
          {ChannelsPanel}
        </div>
        {ChatArea}
        {modal && <Modals {...{
          modal, closeModal, modalError, modalLoading,
          newGroupName, setNewGroupName, newGroupDesc, setNewGroupDesc,
          newGroupPassword, setNewGroupPassword, handleCreateGroup,
          joinGroupId, setJoinGroupId, joinGroupPwd, setJoinGroupPwd, handleJoinGroup,
          newChannelName, setNewChannelName, newChannelTopic, setNewChannelTopic, handleCreateChannel,
          selectedGroup,
        }} />}
      </div>
    )
  }

  // ── Mobile layout ─────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#0e0e14', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {mobileTab === 'groups'   && <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>{GroupsPanel}</div>}
        {mobileTab === 'channels' && <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>{ChannelsPanel}</div>}
        {mobileTab === 'chat'     && <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>{ChatArea}</div>}
      </div>

      {/* Bottom tab bar */}
      <div style={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,0.08)', background: '#13131e', flexShrink: 0 }}>
        {[
          { key: 'groups',   label: 'Groups',   icon: '⊞' },
          { key: 'channels', label: 'Channels', icon: '#',  disabled: !selectedGroup },
          { key: 'chat',     label: 'Chat',     icon: '💬', disabled: !selectedChannel },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => !tab.disabled && setMobileTab(tab.key)}
            disabled={tab.disabled}
            style={{
              flex: 1, padding: '10px 0 12px', border: 'none', background: 'none',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              cursor: tab.disabled ? 'default' : 'pointer',
              opacity: tab.disabled ? 0.3 : 1,
              borderTop: mobileTab === tab.key ? '2px solid #6366f1' : '2px solid transparent',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <span style={{ fontSize: 18 }}>{tab.icon}</span>
            <span style={{
              fontSize: 10, fontWeight: mobileTab === tab.key ? 600 : 400,
              color: mobileTab === tab.key ? '#818cf8' : 'rgba(255,255,255,0.4)',
            }}>{tab.label}</span>
          </button>
        ))}
      </div>

      {modal && <Modals {...{
        modal, closeModal, modalError, modalLoading,
        newGroupName, setNewGroupName, newGroupDesc, setNewGroupDesc,
        newGroupPassword, setNewGroupPassword, handleCreateGroup,
        joinGroupId, setJoinGroupId, joinGroupPwd, setJoinGroupPwd, handleJoinGroup,
        newChannelName, setNewChannelName, newChannelTopic, setNewChannelTopic, handleCreateChannel,
        selectedGroup,
      }} />}
    </div>
  )
}

// ── Modals ────────────────────────────────────────────────────────────────────

function Modals(p) {
  if (p.modal === 'createGroup') return (
    <Modal title="Create Group" onClose={p.closeModal} onSubmit={p.handleCreateGroup}
      submitLabel="Create" loading={p.modalLoading} error={p.modalError}>
      <ModalInput label="Group name *" placeholder="e.g. Study Room"
        value={p.newGroupName} onChange={e => p.setNewGroupName(e.target.value)} required />
      <ModalInput label="Description" placeholder="Optional"
        value={p.newGroupDesc} onChange={e => p.setNewGroupDesc(e.target.value)} />
      <ModalInput label="Join password * (min 4 chars)" type="password"
        placeholder="Others need this to join"
        value={p.newGroupPassword} onChange={e => p.setNewGroupPassword(e.target.value)}
        required minLength={4} />
    </Modal>
  )

  if (p.modal === 'joinGroup') return (
    <Modal title="Join Group" onClose={p.closeModal} onSubmit={p.handleJoinGroup}
      submitLabel="Join" loading={p.modalLoading} error={p.modalError}>
      <ModalInput
        label="Group ID *"
        placeholder="Paste the group ID here"
        hint="Ask the group creator to click the ⎘ icon next to their group name to copy the ID"
        value={p.joinGroupId} onChange={e => p.setJoinGroupId(e.target.value)} required />
      <ModalInput label="Join password *" type="password" placeholder="Group password"
        value={p.joinGroupPwd} onChange={e => p.setJoinGroupPwd(e.target.value)} required />
    </Modal>
  )

  if (p.modal === 'createChannel') return (
    <Modal title={`New channel in ${p.selectedGroup?.name}`} onClose={p.closeModal}
      onSubmit={p.handleCreateChannel} submitLabel="Create"
      loading={p.modalLoading} error={p.modalError}>
      <ModalInput label="Channel name *" placeholder="e.g. general"
        value={p.newChannelName} onChange={e => p.setNewChannelName(e.target.value)} required />
      <ModalInput label="Topic" placeholder="Optional topic"
        value={p.newChannelTopic} onChange={e => p.setNewChannelTopic(e.target.value)} />
    </Modal>
  )

  return null
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const panel = { display: 'flex', flexDirection: 'column', height: '100%', background: '#13131e', overflow: 'hidden' }
const panelHeader = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 12px 8px', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.05)' }
const panelTitle = { fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
const panelBody = { flex: 1, overflowY: 'auto', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 2 }
const dimText = { fontSize: 12, color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '1rem 0' }
const userFooter = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }
const userAvatar = { width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: 'rgba(99,102,241,0.25)', border: '1px solid rgba(99,102,241,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#a5b4fc' }
const logoutBtn = { background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 16, padding: 4, borderRadius: 4 }
const iconBtn = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 16, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }
const iconBtnAccent = { ...iconBtn, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8' }
const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '1rem' }
const modalCard = { background: '#1a1a28', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '20px', width: '100%', maxWidth: 380, boxShadow: '0 25px 50px rgba(0,0,0,0.6)' }
const closeBtn = { background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 4 }
const errorBox = { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', marginBottom: 12, borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5', fontSize: 13 }
const labelStyle = { display: 'block', fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.4)', marginBottom: 4, letterSpacing: '0.04em' }
const inputStyle = { width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '9px 12px', color: '#e5e7eb', fontSize: 13, fontFamily: "'Inter', sans-serif", outline: 'none' }
const submitBtnStyle = { flex: 1, padding: '9px 0', background: 'linear-gradient(135deg, #4f46e5, #06b6d4)', border: 'none', borderRadius: 7, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }
const cancelBtnStyle = { flex: 1, padding: '9px 0', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }
