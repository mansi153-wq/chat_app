import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";
import "../styles/profile.css";

const API_BASE = process.env.REACT_APP_API_URL?.replace("/api", "") || "http://localhost:5000";

export default function ProfilePage({ userId, onClose, onLogout }) {
  const { user: me, updateUser } = useAuth();
  const isOwnProfile = !userId || userId === me?.id;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState("");
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [saveMsg, setSaveMsg] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const endpoint = isOwnProfile ? "/user/profile" : `/user/profile/${userId}`;
        const res = await API.get(endpoint);
        setProfile(res.data.user);
        setBio(res.data.user.bio || "");
        setUsername(res.data.user.username || "");
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [userId, isOwnProfile]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("bio", bio);
      formData.append("username", username);
      if (avatarFile) formData.append("avatar", avatarFile);

      const res = await API.put("/user/profile", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setProfile(res.data.user);
      setEditing(false);
      setAvatarFile(null);
      setAvatarPreview(null);
      // Sync updated user into AuthContext so sidebar/header reflects changes
      updateUser(res.data.user);
      setSaveMsg("Profile updated ✓");
      setTimeout(() => setSaveMsg(""), 2500);
    } catch (e) {
      setSaveMsg("Failed to save");
      setTimeout(() => setSaveMsg(""), 2500);
    }
    setSaving(false);
  };

  const avatarColors = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444"];
  const avatarColor = avatarColors[((profile?.username || "").charCodeAt(0) || 0) % avatarColors.length];

  const displayAvatar = avatarPreview
    || (profile?.avatar
        ? (profile.avatar.startsWith("http") ? profile.avatar : `${API_BASE}${profile.avatar}`)
        : null);
  const initials = (profile?.username || "?")[0].toUpperCase();

  const joinedDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString([], { month: "long", year: "numeric" })
    : "";

  return (
    <div className="profile-root">
      {/* Background blobs */}
      <div className="profile-blob blob-1" />
      <div className="profile-blob blob-2" />

      <div className="profile-card">
        {/* Header */}
        <div className="profile-topbar">
          <button className="profile-back" onClick={onClose}>
            <svg viewBox="0 0 20 20" fill="none"><path d="M12 5l-5 5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Back
          </button>
          {isOwnProfile && !editing && (
            <button className="profile-edit-btn" onClick={() => setEditing(true)}>
              ✏️ Edit profile
            </button>
          )}
          {isOwnProfile && (
            <button className="profile-logout-btn" onClick={onLogout}>Sign out</button>
          )}
        </div>

        {loading ? (
          <div className="profile-loading"><span className="loader" /></div>
        ) : (
          <div className="profile-body">
            {/* Avatar */}
            <div className="profile-avatar-wrap">
              {displayAvatar
                ? <img className="profile-avatar-img" src={displayAvatar} alt={profile?.username} />
                : <div className="profile-avatar-letter" style={{ background: avatarColor }}>{initials}</div>
              }
              {isOwnProfile && editing && (
                <>
                  <button className="avatar-change-btn" onClick={() => fileRef.current.click()}>
                    📷
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
                </>
              )}
              {/* Online dot for other user */}
            </div>

            {/* Username */}
            {editing ? (
              <input
                className="profile-username-input"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Username"
                maxLength={30}
              />
            ) : (
              <h1 className="profile-username">@{profile?.username}</h1>
            )}

            <div className="profile-email">{profile?.email}</div>

            {/* Bio */}
            <div className="profile-bio-wrap">
              {editing ? (
                <textarea
                  className="profile-bio-input"
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Write something about yourself… ✨"
                  maxLength={120}
                  rows={3}
                />
              ) : (
                <p className="profile-bio">
                  {profile?.bio || (isOwnProfile ? <span className="bio-empty">No bio yet — add one!</span> : <span className="bio-empty">No bio</span>)}
                </p>
              )}
              {editing && <div className="bio-count">{bio.length}/120</div>}
            </div>

            {/* Joined */}
            {joinedDate && (
              <div className="profile-joined">
                🗓 Joined {joinedDate}
              </div>
            )}

            {/* Save */}
            {editing && (
              <div className="profile-save-row">
                <button className="profile-cancel-btn" onClick={() => { setEditing(false); setAvatarPreview(null); setAvatarFile(null); }}>
                  Cancel
                </button>
                <button className="profile-save-btn" onClick={handleSave} disabled={saving}>
                  {saving ? <span className="btn-spinner" /> : "Save changes"}
                </button>
              </div>
            )}

            {saveMsg && <div className="profile-save-msg">{saveMsg}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
