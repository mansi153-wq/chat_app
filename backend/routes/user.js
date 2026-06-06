const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `avatar-${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Get own profile
router.get("/profile", authMiddleware, (req, res) => {
  db.query("SELECT id, username, email, avatar, bio, created_at FROM users WHERE id = ?",
    [req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      if (result.length === 0) return res.status(404).json({ success: false, message: "User not found" });
      res.json({ success: true, user: result[0] });
    }
  );
});

// Get other user's profile
router.get("/profile/:id", authMiddleware, (req, res) => {
  db.query("SELECT id, username, email, avatar, bio, created_at FROM users WHERE id = ?",
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      if (result.length === 0) return res.status(404).json({ success: false, message: "User not found" });
      res.json({ success: true, user: result[0] });
    }
  );
});

// Update own profile
router.put("/profile", authMiddleware, upload.single("avatar"), (req, res) => {
  const { bio, username } = req.body;
  const userId = req.user.id;
  const avatarUrl = req.file ? `/uploads/${req.file.filename}` : null;

  let query = "UPDATE users SET bio = ?";
  const params = [bio || null];

  if (username?.trim()) { query += ", username = ?"; params.push(username.trim()); }
  if (avatarUrl) { query += ", avatar = ?"; params.push(avatarUrl); }

  query += " WHERE id = ?";
  params.push(userId);

  db.query(query, params, (err) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    db.query("SELECT id, username, email, avatar, bio, created_at FROM users WHERE id = ?", [userId], (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, user: rows[0] });
    });
  });
});

// Search users
router.get("/search", authMiddleware, (req, res) => {
  const { q } = req.query;
  if (!q?.trim()) return res.status(400).json({ success: false, message: "Search query required" });
  const search = `%${q.trim()}%`;
  db.query(
    "SELECT id, username, email, avatar FROM users WHERE (username LIKE ? OR email LIKE ?) AND id != ?",
    [search, search, req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, users: result });
    }
  );
});

module.exports = router;
