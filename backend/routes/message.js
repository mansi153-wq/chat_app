const express = require("express");
const db = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Send a message
router.post("/", authMiddleware, (req, res) => {
  const { conversation_id, content } = req.body;
  const sender_id = req.user.id;

  if (!conversation_id || !content || !content.trim()) {
    return res.status(400).json({ success: false, message: "conversation_id and content are required" });
  }

  // Verify user is part of conversation
  db.query(
    "SELECT id FROM conversations WHERE id = ? AND (user1_id = ? OR user2_id = ?)",
    [conversation_id, sender_id, sender_id],
    (err, result) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      if (result.length === 0) return res.status(403).json({ success: false, message: "Access denied" });

      db.query(
        "INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)",
        [conversation_id, sender_id, content.trim()],
        (err, result) => {
          if (err) return res.status(500).json({ success: false, message: err.message });

          const messageId = result.insertId;

          db.query(
            `SELECT m.id, m.conversation_id, m.sender_id, m.content, m.created_at,
                    u.username AS sender_username, u.avatar AS sender_avatar
             FROM messages m
             JOIN users u ON u.id = m.sender_id
             WHERE m.id = ?`,
            [messageId],
            (err, rows) => {
              if (err) return res.status(500).json({ success: false, message: err.message });
              res.status(201).json({ success: true, message: rows[0] });
            }
          );
        }
      );
    }
  );
});

// Get messages for a conversation (with pagination)
router.get("/:conversation_id", authMiddleware, (req, res) => {
  const { conversation_id } = req.params;
  const userId = req.user.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;

  // Verify user is part of conversation
  db.query(
    "SELECT id FROM conversations WHERE id = ? AND (user1_id = ? OR user2_id = ?)",
    [conversation_id, userId, userId],
    (err, result) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      if (result.length === 0) return res.status(403).json({ success: false, message: "Access denied" });

      // Mark messages from the other user as read
      db.query(
        `UPDATE messages
         SET is_read = TRUE
         WHERE conversation_id = ?
         AND sender_id != ?`,
        [conversation_id, userId]
      );

      db.query(
        `SELECT m.id, m.conversation_id, m.sender_id, m.content, m.created_at,
                u.username AS sender_username, u.avatar AS sender_avatar
         FROM messages m
         JOIN users u ON u.id = m.sender_id
         WHERE m.conversation_id = ?
         ORDER BY m.created_at DESC
         LIMIT ? OFFSET ?`,
        [conversation_id, limit, offset],
        (err, rows) => {
          if (err) return res.status(500).json({ success: false, message: err.message });
          res.json({ success: true, messages: rows.reverse() });
        }
      );
    }
  );
});

module.exports = router;