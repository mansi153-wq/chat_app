import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import API from "../api/axios";
import "../styles/chat.css";

// ─── Avatar helper ─────────────────────────────────────────────────────────────
function Avatar({ name, size = 36, online = false }) {
  const colors = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444"];
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length];
  return (
    <div className="avatar-wrap" style={{ width: size, height: size }}>
      <div className="avatar" style={{ background: color, width: size, height: size, fontSize: size * 0.4 }}>
        {name?.[0]?.toUpperCase()}
      </div>
      {online && <span className="avatar-dot" />}
    </div>
  );
}

// ─── Time format ───────────────────────────────────────────────────────────────
function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function formatDay(ts) {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

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

  const messagesEndRef = useRef(null);
  const typingTimeout = useRef(null);
  const inputRef = useRef(null);

  // ─── Load conversations ──────────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    try {
      const res = await API.get("/conversations");
      setConversations(res.data.conversations);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // ─── Load messages ───────────────────────────────────────────────────────────
  const openConversation = async (conv) => {
    setActiveConv(conv);
    setMessages([]);
    setLoadingMsgs(true);
    setSidebarOpen(false);
    try {
      const res = await API.get(`/messages/${conv.id}`);
      setMessages(res.data.messages);
    } catch (e) { console.error(e); }
    setLoadingMsgs(false);
    inputRef.current?.focus();
  };

  // ─── Socket events ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !activeConv) return;
    socket.emit("join_conversation", activeConv.id);

    const onMsg = (msg) => {
      setMessages((prev) => [...prev, msg]);
      setTypingUser(null);
    };
    const onTyping = ({ username }) => setTypingUser(username);
    const onStopTyping = () => setTypingUser(null);

    socket.on("receive_message", onMsg);
    socket.on("user_typing", onTyping);
    socket.on("user_stop_typing", onStopTyping);

    return () => {
      socket.emit("leave_conversation", activeConv.id);
      socket.off("receive_message", onMsg);
      socket.off("user_typing", onTyping);
      socket.off("user_stop_typing", onStopTyping);
    };
  }, [socket, activeConv]);

  // ─── Scroll to bottom ────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUser]);

  // ─── Send message ────────────────────────────────────────────────────────────
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !activeConv) return;

    const content = input.trim();
    setInput("");

    // Optimistic update
    const optimistic = {
      id: `opt-${Date.now()}`,
      conversation_id: activeConv.id,
      sender_id: user.id,
      content,
      created_at: new Date().toISOString(),
      sender_username: user.username,
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = await API.post("/messages", { conversation_id: activeConv.id, content });
      const saved = res.data.message;

      setMessages((prev) => prev.map(m => m.id === optimistic.id ? saved : m));

      // Broadcast via socket
      socket?.emit("send_message", saved);

      // Update conversation list
      setConversations((prev) =>
        prev.map(c => c.id === activeConv.id
          ? { ...c, last_message: content, last_message_time: saved.created_at }
          : c
        ).sort((a, b) => new Date(b.last_message_time || 0) - new Date(a.last_message_time || 0))
      );
    } catch (e) {
      setMessages((prev) => prev.filter(m => m.id !== optimistic.id));
    }
  };

  // ─── Typing indicator ────────────────────────────────────────────────────────
  const handleTyping = (e) => {
    setInput(e.target.value);
    if (!socket || !activeConv) return;
    socket.emit("typing", { conversationId: activeConv.id, userId: user.id, username: user.username });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit("stop_typing", { conversationId: activeConv.id, userId: user.id });
    }, 1500);
  };

  // ─── Search users ────────────────────────────────────────────────────────────
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

  // ─── Start conversation ──────────────────────────────────────────────────────
  const startConversation = async (otherUser) => {
    try {
      const res = await API.post("/conversations", { user2_id: otherUser.id });
      setSearchQuery("");
      setSearchResults([]);
      await loadConversations();
      // Open the conversation
      const conv = {
        id: res.data.conversation_id,
        other_user_id: otherUser.id,
        other_username: otherUser.username,
        other_avatar: otherUser.avatar,
      };
      openConversation(conv);
    } catch (e) { console.error(e); }
  };

  // ─── Group messages by day ───────────────────────────────────────────────────
  const grouped = [];
  let lastDay = null;
  for (const msg of messages) {
    const day = formatDay(msg.created_at);
    if (day !== lastDay) { grouped.push({ type: "divider", day }); lastDay = day; }
    grouped.push({ type: "msg", ...msg });
  }

  const isOnline = (uid) => onlineUsers.includes(String(uid));

  return (
    <div className="chat-root">
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
          <button className="logout-btn" onClick={logout} title="Logout">
            <svg viewBox="0 0 20 20" fill="none"><path d="M13 3H7a2 2 0 00-2 2v10a2 2 0 002 2h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M15 7l3 3-3 3M8 10h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>

        <div className="sidebar-me">
          <Avatar name={user?.username} size={34} online={true} />
          <div>
            <div className="me-name">{user?.username}</div>
            <div className="me-status">● Active</div>
          </div>
        </div>

        <div className="search-box">
          <svg viewBox="0 0 20 20" fill="none"><circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.5"/><path d="M15 15l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          <input
            placeholder="Search people…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && <button className="clear-search" onClick={() => setSearchQuery("")}>×</button>}
        </div>

        {searchQuery ? (
          <div className="search-results">
            {searching && <div className="search-hint">Searching…</div>}
            {!searching && searchResults.length === 0 && (
              <div className="search-hint">No users found</div>
            )}
            {searchResults.map(u => (
              <button key={u.id} className="search-user-row" onClick={() => startConversation(u)}>
                <Avatar name={u.username} size={36} online={isOnline(u.id)} />
                <div>
                  <div className="su-name">{u.username}</div>
                  <div className="su-email">{u.email}</div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="conv-list">
            <div className="conv-list-label">Messages</div>
            {conversations.length === 0 && (
              <div className="no-convs">Search for someone to start chatting</div>
            )}
            {conversations.map(c => (
              <button
                key={c.id}
                className={`conv-row ${activeConv?.id === c.id ? "active" : ""}`}
                onClick={() => openConversation(c)}
              >
                <Avatar name={c.other_username} size={42} online={isOnline(c.other_user_id)} />
                <div className="conv-info">
                  <div className="conv-name">{c.other_username}</div>
                  <div className="conv-last">
                    {c.last_message || "No messages yet"}
                  </div>
                </div>
                {c.last_message_time && (
                  <div className="conv-time">{formatTime(c.last_message_time)}</div>
                )}
              </button>
            ))}
          </div>
        )}
      </aside>

      {/* ── Chat area ── */}
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
            <p>Search for a user on the left to begin chatting</p>
            <button className="open-sidebar-btn" onClick={() => setSidebarOpen(true)}>
              Browse contacts
            </button>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="chat-header">
              <button className="back-btn" onClick={() => { setActiveConv(null); setSidebarOpen(true); }}>
                <svg viewBox="0 0 20 20" fill="none"><path d="M12 5l-5 5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <Avatar name={activeConv.other_username} size={38} online={isOnline(activeConv.other_user_id)} />
              <div className="chat-header-info">
                <div className="chat-header-name">{activeConv.other_username}</div>
                <div className="chat-header-status">
                  {isOnline(activeConv.other_user_id) ? "Online" : "Offline"}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="messages-area">
              {loadingMsgs && (
                <div className="msg-loading">
                  <span className="loader-sm" />
                </div>
              )}
              {grouped.map((item, i) =>
                item.type === "divider" ? (
                  <div key={`d-${i}`} className="day-divider">
                    <span>{item.day}</span>
                  </div>
                ) : (
                  <div
                    key={item.id}
                    className={`message-row ${item.sender_id === user.id ? "mine" : "theirs"}`}
                  >
                    {item.sender_id !== user.id && (
                      <Avatar name={item.sender_username} size={28} />
                    )}
                    <div className="bubble-wrap">
                      <div className="bubble">{item.content}</div>
                      <div className="msg-time">{formatTime(item.created_at)}</div>
                    </div>
                  </div>
                )
              )}

              {typingUser && (
                <div className="message-row theirs">
                  <Avatar name={typingUser} size={28} />
                  <div className="typing-bubble">
                    <span /><span /><span />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form className="chat-input-bar" onSubmit={sendMessage}>
              <input
                ref={inputRef}
                className="chat-input"
                value={input}
                onChange={handleTyping}
                placeholder={`Message ${activeConv.other_username}…`}
              />
              <button type="submit" className="send-btn" disabled={!input.trim()}>
                <svg viewBox="0 0 20 20" fill="none">
                  <path d="M3 10l14-7-5 7 5 7-14-7z" fill="currentColor"/>
                </svg>
              </button>
            </form>
          </>
        )}
      </main>

      {/* Mobile overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
}
