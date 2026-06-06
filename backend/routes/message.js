const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// ── File upload setup ──────────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|pdf|doc|docx|txt|mp4|mp3/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext || mime) cb(null, true);
    else cb(new Error("File type not allowed"));
  }
});

// ── Helper: verify user is in conversation ─────────────────────────────────────
function verifyMember(conversation_id, user_id, cb) {
  db.query(
    `SELECT cm.id FROM conversation_members cm WHERE cm.conversation_id = ? AND cm.user_id = ?
     UNION
     SELECT id FROM conversations WHERE id = ? AND (user1_id = ? OR user2_id = ?)`,
    [conversation_id, user_id, conversation_id, user_id, user_id],
    (err, result) => {
      if (err) return cb(err);
      cb(null, result.length > 0);
    }
  );
}

// ── Send text message ──────────────────────────────────────────────────────────
router.post("/", authMiddleware, (req, res) => {
  const { conversation_id, content } = req.body;
  const sender_id = req.user.id;

  if (!conversation_id || !content?.trim()) {
    return res.status(400).json({ success: false, message: "conversation_id and content are required" });
  }

  verifyMember(conversation_id, sender_id, (err, isMember) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (!isMember) return res.status(403).json({ success: false, message: "Access denied" });

    db.query(
      "INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)",
      [conversation_id, sender_id, content.trim()],
      (err, result) => {
        if (err) return res.status(500).json({ success: false, message: err.message });

        db.query(
          `SELECT m.id, m.conversation_id, m.sender_id, m.content, m.file_url, m.file_type,
                  m.file_name, m.is_deleted, m.created_at,
                  u.username AS sender_username, u.avatar AS sender_avatar
           FROM messages m JOIN users u ON u.id = m.sender_id WHERE m.id = ?`,
          [result.insertId],
          (err, rows) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.status(201).json({ success: true, message: { ...rows[0], reactions: [], read_by: [] } });
          }
        );
      }
    );
  });
});

// ── Upload file/image message ──────────────────────────────────────────────────
router.post("/upload", authMiddleware, upload.single("file"), (req, res) => {
  const { conversation_id } = req.body;
  const sender_id = req.user.id;

  if (!conversation_id || !req.file) {
    return res.status(400).json({ success: false, message: "conversation_id and file required" });
  }

  verifyMember(conversation_id, sender_id, (err, isMember) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (!isMember) return res.status(403).json({ success: false, message: "Access denied" });

    const fileUrl = `/uploads/${req.file.filename}`;
    const fileType = req.file.mimetype.startsWith("image/") ? "image" : "file";
    const fileName = req.file.originalname;

    db.query(
      "INSERT INTO messages (conversation_id, sender_id, content, file_url, file_type, file_name) VALUES (?, ?, ?, ?, ?, ?)",
      [conversation_id, sender_id, null, fileUrl, fileType, fileName],
      (err, result) => {
        if (err) return res.status(500).json({ success: false, message: err.message });

        db.query(
          `SELECT m.id, m.conversation_id, m.sender_id, m.content, m.file_url, m.file_type,
                  m.file_name, m.is_deleted, m.created_at,
                  u.username AS sender_username, u.avatar AS sender_avatar
           FROM messages m JOIN users u ON u.id = m.sender_id WHERE m.id = ?`,
          [result.insertId],
          (err, rows) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.status(201).json({ success: true, message: { ...rows[0], reactions: [], read_by: [] } });
          }
        );
      }
    );
  });
});

// ── Get messages (with search support) ────────────────────────────────────────
router.get("/:conversation_id", authMiddleware, (req, res) => {
  const { conversation_id } = req.params;
  const userId = req.user.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  const search = req.query.search?.trim();

  verifyMember(conversation_id, userId, (err, isMember) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (!isMember) return res.status(403).json({ success: false, message: "Access denied" });

    let query = `
      SELECT m.id, m.conversation_id, m.sender_id, m.content, m.file_url, m.file_type,
             m.file_name, m.is_deleted, m.created_at,
             u.username AS sender_username, u.avatar AS sender_avatar
      FROM messages m JOIN users u ON u.id = m.sender_id
      WHERE m.conversation_id = ?`;
    const params = [conversation_id];

    if (search) {
      query += ` AND m.content LIKE ?`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY m.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    db.query(query, params, (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: err.message });

      const messages = rows.reverse();
      if (messages.length === 0) return res.json({ success: true, messages: [] });

      const messageIds = messages.map(m => m.id);

      // Fetch reactions
      db.query(
        `SELECT message_id, user_id, emoji FROM message_reactions WHERE message_id IN (?)`,
        [messageIds],
        (err, reactions) => {
          if (err) return res.status(500).json({ success: false, message: err.message });

          // Fetch read receipts
          db.query(
            `SELECT message_id, user_id FROM message_reads WHERE message_id IN (?)`,
            [messageIds],
            (err, reads) => {
              if (err) return res.status(500).json({ success: false, message: err.message });

              const reactionMap = {};
              reactions.forEach(r => {
                if (!reactionMap[r.message_id]) reactionMap[r.message_id] = [];
                reactionMap[r.message_id].push(r);
              });

              const readMap = {};
              reads.forEach(r => {
                if (!readMap[r.message_id]) readMap[r.message_id] = [];
                readMap[r.message_id].push(r.user_id);
              });

              const enriched = messages.map(m => ({
                ...m,
                reactions: reactionMap[m.id] || [],
                read_by: readMap[m.id] || []
              }));

              res.json({ success: true, messages: enriched });
            }
          );
        }
      );
    });
  });
});

// ── Delete message ─────────────────────────────────────────────────────────────
router.delete("/:id", authMiddleware, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  db.query("SELECT * FROM messages WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (result.length === 0) return res.status(404).json({ success: false, message: "Message not found" });

    const msg = result[0];
    if (msg.sender_id !== userId) {
      return res.status(403).json({ success: false, message: "Cannot delete someone else's message" });
    }

    db.query(
      "UPDATE messages SET is_deleted = 1, content = NULL, file_url = NULL WHERE id = ?",
      [id],
      (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, messageId: parseInt(id) });
      }
    );
  });
});

// ── Mark messages as read ──────────────────────────────────────────────────────
router.post("/read", authMiddleware, (req, res) => {
  const { conversation_id } = req.body;
  const userId = req.user.id;

  if (!conversation_id) return res.status(400).json({ success: false, message: "conversation_id required" });

  // Get all unread messages in this conversation not sent by the user
  db.query(
    `SELECT id FROM messages
     WHERE conversation_id = ? AND sender_id != ? AND is_deleted = 0
     AND id NOT IN (SELECT message_id FROM message_reads WHERE user_id = ?)`,
    [conversation_id, userId, userId],
    (err, unread) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      if (unread.length === 0) return res.json({ success: true, marked: 0 });

      const values = unread.map(m => [m.id, userId]);
      db.query(
        "INSERT IGNORE INTO message_reads (message_id, user_id) VALUES ?",
        [values],
        (err) => {
          if (err) return res.status(500).json({ success: false, message: err.message });
          res.json({ success: true, marked: unread.length, messageIds: unread.map(m => m.id) });
        }
      );
    }
  );
});

// ── React to message ──────────────────────────────────────────────────────────
router.post("/:id/react", authMiddleware, (req, res) => {
  const messageId = req.params.id;
  const userId = req.user.id;
  const { emoji } = req.body;

  if (!emoji) return res.status(400).json({ success: false, message: "emoji required" });

  // Toggle: if exists remove, if not add
  db.query(
    "SELECT id FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?",
    [messageId, userId, emoji],
    (err, existing) => {
      if (err) return res.status(500).json({ success: false, message: err.message });

      const done = () => {
        db.query(
          "SELECT user_id, emoji FROM message_reactions WHERE message_id = ?",
          [messageId],
          (err, reactions) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.json({ success: true, reactions });
          }
        );
      };

      if (existing.length > 0) {
        db.query("DELETE FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?",
          [messageId, userId, emoji], (err) => { if (err) return res.status(500).json({ success: false }); done(); });
      } else {
        db.query("INSERT INTO message_reactions (message_id, user_id, emoji) VALUES (?, ?, ?)",
          [messageId, userId, emoji], (err) => { if (err) return res.status(500).json({ success: false }); done(); });
      }
    }
  );
});

module.exports = router;
