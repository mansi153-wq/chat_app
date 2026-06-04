const express = require("express");
const db = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Create or get existing conversation
router.post("/", authMiddleware, (req, res) => {
  const { user2_id } = req.body;
  const user1_id = req.user.id;

  if (!user2_id) {
    return res.status(400).json({ success: false, message: "user2_id is required" });
  }

  if (user1_id === user2_id) {
    return res.status(400).json({ success: false, message: "Cannot create conversation with yourself" });
  }

  // Check if conversation already exists
  db.query(
    `SELECT c.id FROM conversations c
     WHERE (c.user1_id = ? AND c.user2_id = ?) OR (c.user1_id = ? AND c.user2_id = ?)`,
    [user1_id, user2_id, user2_id, user1_id],
    (err, result) => {
      if (err) return res.status(500).json({ success: false, message: err.message });

      if (result.length > 0) {
        return res.json({
          success: true,
          message: "Conversation already exists",
          conversation_id: result[0].id,
          already_exists: true
        });
      }

      db.query(
        "INSERT INTO conversations (user1_id, user2_id) VALUES (?, ?)",
        [user1_id, user2_id],
        (err, result) => {
          if (err) return res.status(500).json({ success: false, message: err.message });

          res.status(201).json({
            success: true,
            message: "Conversation created",
            conversation_id: result.insertId,
            already_exists: false
          });
        }
      );
    }
  );
});

// Get all conversations for logged in user
router.get("/", authMiddleware, (req, res) => {
  const userId = req.user.id;

  db.query(
    `SELECT 
      c.id,
      c.created_at,
      u.id AS other_user_id,
      u.username AS other_username,
      u.avatar AS other_avatar,
      m.content AS last_message,
      m.created_at AS last_message_time,
      m.sender_id AS last_message_sender
    FROM conversations c
    JOIN users u ON (
      CASE WHEN c.user1_id = ? THEN c.user2_id ELSE c.user1_id END = u.id
    )
    LEFT JOIN messages m ON m.id = (
      SELECT id FROM messages
      WHERE conversation_id = c.id
      ORDER BY created_at DESC
      LIMIT 1
    )
    WHERE c.user1_id = ? OR c.user2_id = ?
    ORDER BY COALESCE(m.created_at, c.created_at) DESC`,
    [userId, userId, userId],
    (err, result) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, conversations: result });
    }
  );
});

// Get single conversation info
router.get("/:id", authMiddleware, (req, res) => {
  const userId = req.user.id;
  const convId = req.params.id;

  db.query(
    `SELECT 
      c.id,
      u.id AS other_user_id,
      u.username AS other_username,
      u.avatar AS other_avatar
    FROM conversations c
    JOIN users u ON (
      CASE WHEN c.user1_id = ? THEN c.user2_id ELSE c.user1_id END = u.id
    )
    WHERE c.id = ? AND (c.user1_id = ? OR c.user2_id = ?)`,
    [userId, convId, userId, userId],
    (err, result) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      if (result.length === 0) return res.status(404).json({ success: false, message: "Conversation not found" });
      res.json({ success: true, conversation: result[0] });
    }
  );
});

module.exports = router;
