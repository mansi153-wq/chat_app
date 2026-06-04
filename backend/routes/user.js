const express = require("express");
const db = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Get own profile
router.get("/profile", authMiddleware, (req, res) => {
  db.query("SELECT id, username, email, avatar, created_at FROM users WHERE id = ?",
    [req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      if (result.length === 0) return res.status(404).json({ success: false, message: "User not found" });
      res.json({ success: true, user: result[0] });
    }
  );
});

// Search users by username or email
router.get("/search", authMiddleware, (req, res) => {
  const { q } = req.query;

  if (!q || q.trim().length < 1) {
    return res.status(400).json({ success: false, message: "Search query required" });
  }

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
