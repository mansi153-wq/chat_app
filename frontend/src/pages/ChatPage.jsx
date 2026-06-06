import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import API from "../api/axios";
import ProfilePage from "./ProfilePage";
import "../styles/chat.css";

const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "🔥", "👏"];
const API_BASE = process.env.REACT_APP_API_URL?.replace("/api", "") || "http://localhost:5000";

// ── Helpers ────────────────────────────────────────────────────────────────────
function Avatar({ name, src, size = 36, online = false, onClick }) {
  const colors = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444"];
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length];
  const imgSrc = src?.startsWith("/uploads") ? `${API_BASE}${src}` : src;
  return (
    <div className="avatar-wrap" style={{ width: size, height: size }} onClick={onClick}>
      {imgSrc
        ? <img className="avatar avatar-img" src={imgSrc} alt={name} style={{ width: size, height: size }} />
        : <div className="avatar" style={{ background: color, width: size, height: size, fontSize: size * 0.4 }}>{name?.[0]?.toUpperCase()}</div>
      }
      {online && <span className="avatar-dot" />}
    </div>
  );
}

function GroupAvatar({ name, size = 36 }) {
  return (
    <div className="avatar" style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)", width: size, height: size, fontSize: size * 0.38, borderRadius: "50%", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, flexShrink:0 }}>
      {name?.[0]?.toUpperCase()}
    </div>
  );
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function formatDay(ts) {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

// ── Create Group Modal ─────────────────────────────────────────────────────────
function CreateGroupModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await API.get(`/user/search?q=${search}`);
        setResults(res.data.users);
      } catch (e) {}
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const toggle = (u) => {
    setSelected(p => p.find(x => x.id === u.id) ? p.filter(x => x.id !== u.id) : [...p, u]);
  };

  const create = async () => {
    if (!name.trim() || selected.length < 2) return;
    setCreating(true);
    try {
      const res = await API.post("/conversations/group", { name, member_ids: selected.map(u => u.id) });
      onCreated(res.data.conversation_id, name);
    } catch (e) { console.error(e); }
    setCreating(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span>New Group</span>
          <button onClick={onClose}>×</button>
        </div>
        <input className="modal-input" placeholder="Group name…" value={name} onChange={e => setName(e.target.value)} />
        <input className="modal-input" placeholder="Search people to add…" value={search} onChange={e => setSearch(e.target.value)} />
        {selected.length > 0 && (
          <div className="modal-selected">
            {selected.map(u => (
              <div key={u.id} className="selected-chip">
                {u.username}
                <button onClick={() => toggle(u)}>×</button>
              </div>
            ))}
          </div>
        )}
        <div className="modal-results">
          {results.map(u => (
            <button key={u.id} className={`modal-user-row ${selected.find(x=>x.id===u.id) ? "selected" : ""}`} onClick={() => toggle(u)}>
              <Avatar name={u.username} size={32} />
              <span>{u.username}</span>
              {selected.find(x=>x.id===u.id) && <span className="check">✓</span>}
            </button>
          ))}
        </div>
        <button className="modal-create-btn" onClick={create} disabled={!name.trim() || selected.length < 2 || creating}>
          {creating ? "Creating…" : `Create Group (${selected.length + 1} members)`}
        </button>
      </div>
    </div>
  );
}

// ── Reaction Picker ────────────────────────────────────────────────────────────
function ReactionPicker({ onReact, onClose }) {
  return (
    <div className="reaction-picker" onMouseLeave={onClose}>
      {REACTION_EMOJIS.map(e => (
        <button key={e} className="reaction-option" onClick={() => onReact(e)}>{e}</button>
      ))}
    </div>
  );
}

// ── Single Message ─────────────────────────────────────────────────────────────
function Message({ msg, isMine, onReact, onDelete, currentUserId, otherUsername }) {
  const [showPicker, setShowPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [popEmoji, setPopEmoji] = useState(null);

  const grouped = {};
  (msg.reactions || []).forEach(r => {
    if (!grouped[r.emoji]) grouped[r.emoji] = [];
    grouped[r.emoji].push(r.user_id);
  });

  const handleReact = (emoji) => {
    setShowPicker(false);
    setPopEmoji(emoji);
    setTimeout(() => setPopEmoji(null), 700);
    onReact(msg.id, emoji);
  };

  const isRead = (msg.read_by || []).filter(uid => uid !== currentUserId).length > 0;

  if (msg.is_deleted) {
    return (
      <div className={`message-row ${isMine ? "mine" : "theirs"}`}>
        <div className="bubble-outer">
          <div className="bubble bubble-deleted">🚫 Message deleted</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`message-row ${isMine ? "mine" : "theirs"}`}
      onMouseLeave={() => { setShowPicker(false); setShowMenu(false); }}>
      <div className="bubble-outer">
        {showPicker && <ReactionPicker onReact={handleReact} onClose={() => setShowPicker(false)} />}
        {popEmoji && <div className={`pop-emoji ${isMine ? "pop-left" : "pop-right"}`}>{popEmoji}</div>}

        {/* Context menu */}
        <div className={`msg-actions ${isMine ? "actions-left" : "actions-right"}`}>
          <button className="msg-action-btn" onClick={() => setShowPicker(p => !p)} title="React">😊</button>
          {isMine && <button className="msg-action-btn danger" onClick={() => onDelete(msg.id)} title="Delete">🗑</button>}
        </div>

        {/* File/image content */}
        {msg.file_url && msg.file_type === "image" && (
          <div className="bubble bubble-img">
            <img
              src={`${API_BASE}${msg.file_url}`}
              alt="shared"
              className="chat-image"
              onClick={() => window.open(`${API_BASE}${msg.file_url}`, "_blank")}
            />
          </div>
        )}
        {msg.file_url && msg.file_type === "file" && (
          <div className="bubble bubble-file">
            <a href={`${API_BASE}${msg.file_url}`} target="_blank" rel="noreferrer" className="file-link">
              📎 {msg.file_name || "Download file"}
            </a>
          </div>
        )}

        {/* Text content */}
        {msg.content && <div className="bubble" onDoubleClick={() => setShowPicker(true)}>{msg.content}</div>}

        {/* Reactions */}
        {Object.keys(grouped).length > 0 && (
          <div className={`reactions-row ${isMine ? "reactions-mine" : ""}`}>
            {Object.entries(grouped).map(([emoji, users]) => (
              <button
                key={emoji}
                className={`reaction-chip ${users.includes(currentUserId) ? "reacted" : ""}`}
                onClick={() => handleReact(emoji)}
              >
                {emoji} <span>{users.length}</span>
              </button>
            ))}
          </div>
        )}

        {/* Time + read receipt */}
        <div className="msg-meta">
          <span className="msg-time">{formatTime(msg.created_at)}</span>
          {isMine && (
            <span className="read-receipt" title={isRead ? `Seen by ${otherUsername}` : "Delivered"}>
              {isRead ? "✓✓" : "✓"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Search bar inside chat ─────────────────────────────────────────────────────
function ChatSearch({ convId, onClose, onResults }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const search = async (q) => {
    setQuery(q);
    if (!q.trim()) { onResults(null); return; }
    setLoading(true);
    try {
      const res = await API.get(`/messages/${convId}?search=${encodeURIComponent(q)}`);
      onResults(res.data.messages);
    } catch (e) {}
    setLoading(false);
  };

  return (
    <div className="chat-search-bar">
      <svg viewBox="0 0 20 20" fill="none"><circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.5"/><path d="M15 15l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
      <input autoFocus placeholder="Search messages…" value={query} onChange={e => search(e.target.value)} />
      {loading && <span className="search-spinner" />}
      <button onClick={() => { onResults(null); onClose(); }}>×</button>
    </div>
  );
}

// ── Main ChatPage ──────────────────────────────────────────────────────────────
export default function ChatPage() {
  const { user, logout } = useAuth();
  const { socket, onlineUsers } = useSocket();

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [viewingProfile, setViewingProfile] = useState(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [searchedMessages, setSearchedMessages] = useState(null);
  const [uploading, setUploading] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeout = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  const displayMessages = searchedMessages || messages;

  const loadConversations = useCallback(async () => {
    try {
      const res = await API.get("/conversations");
      setConversations(res.data.conversations);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  const openConversation = async (conv) => {
    setActiveConv(conv);
    setMessages([]);
    setLoadingMsgs(true);
    setSidebarOpen(false);
    setSearchedMessages(null);
    setShowChatSearch(false);
    try {
      const res = await API.get(`/messages/${conv.id}`);
      setMessages(res.data.messages);
      // Mark as read
      await API.post("/messages/read", { conversation_id: conv.id });
      socket?.emit("messages_read", { conversationId: conv.id, userId: user.id });
    } catch (e) { console.error(e); }
    setLoadingMsgs(false);
    inputRef.current?.focus();
  };

  // ── Socket ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !activeConv) return;
    socket.emit("join_conversation", activeConv.id);

    const onMsg = (msg) => { setMessages(p => [...p, msg]); setTypingUser(null); };
    const onTyping = ({ username }) => setTypingUser(username);
    const onStopTyping = () => setTypingUser(null);
    const onReaction = ({ messageId, reactions }) =>
      setMessages(p => p.map(m => m.id === messageId ? { ...m, reactions } : m));
    const onDeleted = ({ messageId }) =>
      setMessages(p => p.map(m => m.id === messageId ? { ...m, is_deleted: 1, content: null } : m));
    const onRead = ({ userId: readerId, messageIds }) => {
      if (readerId === user.id) return;
      setMessages(p => p.map(m =>
        messageIds.includes(m.id) && !(m.read_by || []).includes(readerId)
          ? { ...m, read_by: [...(m.read_by || []), readerId] }
          : m
      ));
    };

    socket.on("receive_message", onMsg);
    socket.on("user_typing", onTyping);
    socket.on("user_stop_typing", onStopTyping);
    socket.on("reaction_updated", onReaction);
    socket.on("message_deleted", onDeleted);
    socket.on("messages_read", onRead);

    return () => {
      socket.emit("leave_conversation", activeConv.id);
      socket.off("receive_message", onMsg);
      socket.off("user_typing", onTyping);
      socket.off("user_stop_typing", onStopTyping);
      socket.off("reaction_updated", onReaction);
      socket.off("message_deleted", onDeleted);
      socket.off("messages_read", onRead);
    };
  }, [socket, activeConv, user.id]);

  useEffect(() => {
    if (!searchedMessages) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUser, searchedMessages]);

  // ── Send text ──────────────────────────────────────────────────────────────
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !activeConv) return;
    const content = input.trim();
    setInput("");
    const optimistic = {
      id: `opt-${Date.now()}`, conversation_id: activeConv.id,
      sender_id: user.id, content, created_at: new Date().toISOString(),
      sender_username: user.username, reactions: [], read_by: [], is_deleted: 0,
    };
    setMessages(p => [...p, optimistic]);
    try {
      const res = await API.post("/messages", { conversation_id: activeConv.id, content });
      const saved = res.data.message;
      setMessages(p => p.map(m => m.id === optimistic.id ? saved : m));
      socket?.emit("send_message", saved);
      setConversations(p =>
        p.map(c => c.id === activeConv.id
          ? { ...c, last_message: content, last_message_time: saved.created_at }
          : c
        ).sort((a, b) => new Date(b.last_message_time || 0) - new Date(a.last_message_time || 0))
      );
    } catch (e) {
      setMessages(p => p.filter(m => m.id !== optimistic.id));
    }
  };

  // ── Upload file ────────────────────────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeConv) return;
    e.target.value = "";
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("conversation_id", activeConv.id);
      const res = await API.post("/messages/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
      const saved = res.data.message;
      setMessages(p => [...p, saved]);
      socket?.emit("send_message", saved);
      setConversations(p =>
        p.map(c => c.id === activeConv.id
          ? { ...c, last_message: "📎 File", last_message_time: saved.created_at }
          : c
        ).sort((a, b) => new Date(b.last_message_time || 0) - new Date(a.last_message_time || 0))
      );
    } catch (e) { console.error(e); }
    setUploading(false);
  };

  // ── Delete message ─────────────────────────────────────────────────────────
  const handleDelete = async (messageId) => {
    try {
      await API.delete(`/messages/${messageId}`);
      setMessages(p => p.map(m => m.id === messageId ? { ...m, is_deleted: 1, content: null } : m));
      socket?.emit("message_deleted", { messageId, conversationId: activeConv.id });
    } catch (e) { console.error(e); }
  };

  // ── React ──────────────────────────────────────────────────────────────────
  const handleReact = async (messageId, emoji) => {
    try {
      const res = await API.post(`/messages/${messageId}/react`, { emoji });
      const { reactions } = res.data;
      setMessages(p => p.map(m => m.id === messageId ? { ...m, reactions } : m));
      socket?.emit("react_message", { messageId, reactions, conversationId: activeConv.id });
    } catch (e) { console.error(e); }
  };

  const handleTyping = (e) => {
    setInput(e.target.value);
    if (!socket || !activeConv) return;
    socket.emit("typing", { conversationId: activeConv.id, userId: user.id, username: user.username });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit("stop_typing", { conversationId: activeConv.id, userId: user.id });
    }, 1500);
  };

  // ── Search users ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await API.get(`/user/search?q=${searchQuery}`);
        setSearchResults(res.data.users);
      } catch (e) {}
      setSearching(false);
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const startConversation = async (otherUser) => {
    try {
      const res = await API.post("/conversations", { user2_id: otherUser.id });
      setSearchQuery(""); setSearchResults([]);
      await loadConversations();
      openConversation({ id: res.data.conversation_id, other_user_id: otherUser.id, other_username: otherUser.username, other_avatar: otherUser.avatar, is_group: 0 });
    } catch (e) { console.error(e); }
  };

  const handleGroupCreated = async (convId, name) => {
    setShowGroupModal(false);
    await loadConversations();
    openConversation({ id: convId, group_name: name, is_group: 1 });
  };

  // ── Group messages by day ──────────────────────────────────────────────────
  const grouped = [];
  let lastDay = null;
  for (const msg of displayMessages) {
    const day = formatDay(msg.created_at);
    if (day !== lastDay) { grouped.push({ type: "divider", day }); lastDay = day; }
    grouped.push({ type: "msg", ...msg });
  }

  const isOnline = (uid) => onlineUsers.includes(String(uid));
  const convName = (c) => c.is_group ? c.group_name || c.name : c.other_username;

  if (showProfile) {
    return <ProfilePage userId={viewingProfile} onClose={() => { setShowProfile(false); setViewingProfile(null); }} onLogout={logout} />;
  }

  return (
    <div className="chat-root">
      {showGroupModal && <CreateGroupModal onClose={() => setShowGroupModal(false)} onCreated={handleGroupCreated} />}

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="brand-icon">
              <svg viewBox="0 0 20 20" fill="none">
                <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H6l-4 3V5z" fill="url(#bg)"/>
                <defs><linearGradient id="bg" x1="0" y1="0" x2="20" y2="20"><stop stopColor="#6366f1"/><stop offset="1" stopColor="#a855f7"/></linearGradient></defs>
              </svg>
            </div>
            <span>Drift</span>
          </div>
          <div className="header-actions">
            <button className="icon-btn" onClick={() => setShowGroupModal(true)} title="New group">
              <svg viewBox="0 0 20 20" fill="none"><circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.5"/><circle cx="14" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5"/><path d="M1 17c0-3 2.7-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M16 12c2 .5 3 2 3 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
            <button className="logout-btn" onClick={logout} title="Logout">
              <svg viewBox="0 0 20 20" fill="none"><path d="M13 3H7a2 2 0 00-2 2v10a2 2 0 002 2h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M15 7l3 3-3 3M8 10h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </div>

        <button className="sidebar-me" onClick={() => { setViewingProfile(null); setShowProfile(true); }}>
          <Avatar name={user?.username} size={34} online={true} />
          <div className="me-info">
            <div className="me-name">{user?.username}</div>
            <div className="me-status">● Active</div>
          </div>
          <span className="me-edit-hint">edit</span>
        </button>

        <div className="search-box">
          <svg viewBox="0 0 20 20" fill="none"><circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.5"/><path d="M15 15l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          <input placeholder="Search people…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          {searchQuery && <button className="clear-search" onClick={() => setSearchQuery("")}>×</button>}
        </div>

        {searchQuery ? (
          <div className="search-results">
            {searching && <div className="search-hint">Searching…</div>}
            {!searching && searchResults.length === 0 && <div className="search-hint">No users found</div>}
            {searchResults.map(u => (
              <button key={u.id} className="search-user-row" onClick={() => startConversation(u)}>
                <Avatar name={u.username} size={36} online={isOnline(u.id)} />
                <div><div className="su-name">{u.username}</div><div className="su-email">{u.email}</div></div>
              </button>
            ))}
          </div>
        ) : (
          <div className="conv-list">
            <div className="conv-list-label">Messages</div>
            {conversations.length === 0 && <div className="no-convs">Search for someone to start chatting</div>}
            {conversations.map(c => (
              <button key={c.id} className={`conv-row ${activeConv?.id === c.id ? "active" : ""}`} onClick={() => openConversation(c)}>
                {c.is_group
                  ? <GroupAvatar name={c.group_name || c.name} size={42} />
                  : <Avatar name={c.other_username} size={42} src={c.other_avatar} online={isOnline(c.other_user_id)} />
                }
                <div className="conv-info">
                  <div className="conv-name">
                    {convName(c)}
                    {c.is_group && <span className="group-badge">group</span>}
                  </div>
                  <div className="conv-last">
                    {c.last_message_type === "image" ? "📷 Image" : c.last_message_type === "file" ? "📎 File" : c.last_message || "No messages yet"}
                  </div>
                </div>
                {c.last_message_time && <div className="conv-time">{formatTime(c.last_message_time)}</div>}
              </button>
            ))}
          </div>
        )}
      </aside>

      {/* ── Chat main ── */}
      <main className="chat-main">
        {!activeConv ? (
          <div className="chat-empty">
            <div className="empty-icon">
              <svg viewBox="0 0 64 64" fill="none">
                <path d="M8 16C8 11.6 11.6 8 16 8h32c4.4 0 8 3.6 8 8v24c0 4.4-3.6 8-8 8H20l-12 8V16z" fill="url(#eg)"/>
                <path d="M20 24h24M20 32h16" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <defs><linearGradient id="eg" x1="0" y1="0" x2="64" y2="64"><stop stopColor="#6366f1" stopOpacity=".3"/><stop offset="1" stopColor="#a855f7" stopOpacity=".3"/></linearGradient></defs>
              </svg>
            </div>
            <h2>Start a conversation</h2>
            <p>Search for a user or create a group</p>
            <button className="open-sidebar-btn" onClick={() => setSidebarOpen(true)}>Browse contacts</button>
          </div>
        ) : (
          <>
            <div className="chat-header">
              <button className="back-btn" onClick={() => { setActiveConv(null); setSidebarOpen(true); }}>
                <svg viewBox="0 0 20 20" fill="none"><path d="M12 5l-5 5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              {activeConv.is_group
                ? <GroupAvatar name={activeConv.group_name || activeConv.name} size={38} />
                : <Avatar name={activeConv.other_username} src={activeConv.other_avatar} size={38} online={isOnline(activeConv.other_user_id)}
                    onClick={() => { setViewingProfile(activeConv.other_user_id); setShowProfile(true); }} />
              }
              <div className="chat-header-info">
                <div className="chat-header-name">
                  {activeConv.is_group ? (activeConv.group_name || activeConv.name) : activeConv.other_username}
                  {activeConv.is_group && <span className="group-badge">group</span>}
                </div>
                <div className="chat-header-status">
                  {activeConv.is_group
                    ? `${activeConv.member_count || ""} members`
                    : isOnline(activeConv.other_user_id) ? "🟢 Online" : "⚫ Offline"
                  }
                </div>
              </div>
              <button className="icon-btn ml-auto" onClick={() => setShowChatSearch(p => !p)} title="Search in chat">
                <svg viewBox="0 0 20 20" fill="none"><circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.5"/><path d="M15 15l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>

            {showChatSearch && (
              <ChatSearch
                convId={activeConv.id}
                onClose={() => setShowChatSearch(false)}
                onResults={setSearchedMessages}
              />
            )}
            {searchedMessages && (
              <div className="search-results-banner">
                {searchedMessages.length} result{searchedMessages.length !== 1 ? "s" : ""} found
                <button onClick={() => setSearchedMessages(null)}>Clear</button>
              </div>
            )}

            <div className="messages-area">
              {loadingMsgs && <div className="msg-loading"><span className="loader-sm" /></div>}
              {grouped.map((item, i) =>
                item.type === "divider" ? (
                  <div key={`d-${i}`} className="day-divider"><span>{item.day}</span></div>
                ) : (
                  <div key={item.id} className={`message-row-wrap ${item.sender_id === user.id ? "mine" : "theirs"}`}>
                    {item.sender_id !== user.id && (
                      <Avatar name={item.sender_username} size={28} />
                    )}
                    <div style={{display:"flex",flexDirection:"column",flex:1,alignItems: item.sender_id === user.id ? "flex-end" : "flex-start"}}>
                      {activeConv.is_group && item.sender_id !== user.id && (
                        <div className="group-sender-name">{item.sender_username}</div>
                      )}
                      <Message
                        msg={item}
                        isMine={item.sender_id === user.id}
                        onReact={handleReact}
                        onDelete={handleDelete}
                        currentUserId={user.id}
                        otherUsername={activeConv.other_username}
                      />
                    </div>
                  </div>
                )
              )}
              {typingUser && (
                <div className="message-row theirs">
                  <Avatar name={typingUser} size={28} />
                  <div className="typing-bubble"><span /><span /><span /></div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-bar" onSubmit={sendMessage}>
              <button type="button" className="attach-btn" onClick={() => fileInputRef.current.click()} disabled={uploading} title="Attach file">
                {uploading
                  ? <span className="upload-spinner" />
                  : <svg viewBox="0 0 20 20" fill="none"><path d="M4 10l5.5 5.5a4 4 0 005.657-5.657L7.914 2.6A2.5 2.5 0 004.38 6.136l7.07 7.071a1 1 0 001.415-1.414L6.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                }
              </button>
              <input ref={fileInputRef} type="file" hidden onChange={handleFileUpload} accept="image/*,.pdf,.doc,.docx,.txt" />
              <input ref={inputRef} className="chat-input" value={input} onChange={handleTyping} placeholder={`Message ${activeConv.is_group ? (activeConv.group_name || "group") : activeConv.other_username}…`} />
              <button type="submit" className="send-btn" disabled={!input.trim()}>
                <svg viewBox="0 0 20 20" fill="none"><path d="M3 10l14-7-5 7 5 7-14-7z" fill="currentColor"/></svg>
              </button>
            </form>
          </>
        )}
      </main>

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
}
