const express = require("express");
const db = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// ── Create DM or get existing ──────────────────────────────────────────────────
router.post("/", authMiddleware, (req, res) => {
  const { user2_id } = req.body;
  const user1_id = req.user.id;

  if (!user2_id) return res.status(400).json({ success: false, message: "user2_id is required" });
  if (user1_id === parseInt(user2_id)) return res.status(400).json({ success: false, message: "Cannot chat with yourself" });

  db.query(
    `SELECT id FROM conversations WHERE is_group = 0
     AND ((user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?))`,
    [user1_id, user2_id, user2_id, user1_id],
    (err, result) => {
      if (err) return res.status(500).json({ success: false, message: err.message });

      if (result.length > 0) {
        return res.json({ success: true, conversation_id: result[0].id, already_exists: true });
      }

      db.query(
        "INSERT INTO conversations (user1_id, user2_id, is_group) VALUES (?, ?, 0)",
        [user1_id, user2_id],
        (err, result) => {
          if (err) return res.status(500).json({ success: false, message: err.message });
          res.status(201).json({ success: true, conversation_id: result.insertId, already_exists: false });
        }
      );
    }
  );
});

// ── Create group chat ──────────────────────────────────────────────────────────
router.post("/group", authMiddleware, (req, res) => {
  const { name, member_ids } = req.body;
  const creatorId = req.user.id;

  if (!name?.trim()) return res.status(400).json({ success: false, message: "Group name required" });
  if (!member_ids || member_ids.length < 2) return res.status(400).json({ success: false, message: "Add at least 2 members" });

  db.query(
    "INSERT INTO conversations (name, is_group, created_by) VALUES (?, 1, ?)",
    [name.trim(), creatorId],
    (err, result) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      const convId = result.insertId;
      const allMembers = [...new Set([creatorId, ...member_ids.map(Number)])];
      const values = allMembers.map(uid => [convId, uid]);

      db.query("INSERT INTO conversation_members (conversation_id, user_id) VALUES ?", [values], (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.status(201).json({ success: true, conversation_id: convId });
      });
    }
  );
});

// ── Get all conversations for user ────────────────────────────────────────────
router.get("/", authMiddleware, (req, res) => {
  const userId = req.user.id;

  db.query(
    `(
      -- DMs
      SELECT
        c.id, c.is_group, c.name AS group_name,
        u.id AS other_user_id,
        u.username AS other_username,
        u.avatar AS other_avatar,
        m.content AS last_message,
        m.file_type AS last_message_type,
        m.created_at AS last_message_time,
        m.sender_id AS last_message_sender,
        NULL AS member_count
      FROM conversations c
      JOIN users u ON (CASE WHEN c.user1_id = ? THEN c.user2_id ELSE c.user1_id END = u.id)
      LEFT JOIN messages m ON m.id = (
        SELECT id FROM messages WHERE conversation_id = c.id AND is_deleted = 0 ORDER BY created_at DESC LIMIT 1
      )
      WHERE c.is_group = 0 AND (c.user1_id = ? OR c.user2_id = ?)
    )
    UNION ALL
    (
      -- Groups
      SELECT
        c.id, c.is_group, c.name AS group_name,
        NULL AS other_user_id,
        NULL AS other_username,
        NULL AS other_avatar,
        m.content AS last_message,
        m.file_type AS last_message_type,
        m.created_at AS last_message_time,
        m.sender_id AS last_message_sender,
        (SELECT COUNT(*) FROM conversation_members WHERE conversation_id = c.id) AS member_count
      FROM conversations c
      JOIN conversation_members cm ON cm.conversation_id = c.id AND cm.user_id = ?
      LEFT JOIN messages m ON m.id = (
        SELECT id FROM messages WHERE conversation_id = c.id AND is_deleted = 0 ORDER BY created_at DESC LIMIT 1
      )
      WHERE c.is_group = 1
    )
    ORDER BY COALESCE(last_message_time, '1970-01-01') DESC`,
    [userId, userId, userId, userId],
    (err, result) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, conversations: result });
    }
  );
});

// ── Get group members ──────────────────────────────────────────────────────────
router.get("/:id/members", authMiddleware, (req, res) => {
  db.query(
    `SELECT u.id, u.username, u.avatar FROM conversation_members cm
     JOIN users u ON u.id = cm.user_id
     WHERE cm.conversation_id = ?`,
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, members: result });
    }
  );
});

module.exports = router;
