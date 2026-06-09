const db = require("./db");
require("dotenv").config();
console.log("DB_HOST =", process.env.DB_HOST);
console.log("DB_USER =", process.env.DB_USER);
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const conversationRoutes = require("./routes/conversation");
const messageRoutes = require("./routes/message");

require("./db");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json());

// Serve uploaded files
const path = require("path");
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);

app.get("/", (req, res) => {
  res.json({ success: true, message: "Chat API Running 🚀" });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Socket.io
const onlineUsers = new Map(); // userId -> socketId

io.on("connection", (socket) => {
  console.log("🔌 New socket connected:", socket.id);

  // User comes online
  socket.on("user_online", (userId) => {
    onlineUsers.set(String(userId), socket.id);
    io.emit("online_users", Array.from(onlineUsers.keys()));
    console.log(`✅ User ${userId} online`);
  });

  // Join a conversation room
  socket.on("join_conversation", (conversationId) => {
    socket.join(`conversation_${conversationId}`);
  });

  // Leave a conversation room
  socket.on("leave_conversation", (conversationId) => {
    socket.leave(`conversation_${conversationId}`);
  });

  // Send message
  socket.on("send_message", (data) => {
    // Broadcast to everyone in the conversation room except sender
    socket.to(`conversation_${data.conversation_id}`).emit("receive_message", data);
  });

  // Typing indicator
  socket.on("typing", ({ conversationId, userId, username }) => {
    socket.to(`conversation_${conversationId}`).emit("user_typing", { userId, username });
  });

  socket.on("stop_typing", ({ conversationId, userId }) => {
    socket.to(`conversation_${conversationId}`).emit("user_stop_typing", { userId });
  });

  // Reactions
  socket.on("react_message", ({ messageId, reactions, conversationId }) => {
    socket.to(`conversation_${conversationId}`).emit("reaction_updated", { messageId, reactions });
  });

  // Message deleted
  socket.on("message_deleted", ({ messageId, conversationId }) => {
    socket.to(`conversation_${conversationId}`).emit("message_deleted", { messageId });
  });

  // Messages read
  socket.on("messages_read", ({ conversationId, userId, messageIds }) => {
    socket.to(`conversation_${conversationId}`).emit("messages_read", { userId, messageIds });
  });

  // Disconnect
socket.on("disconnect", () => {
  for (const [userId, socketId] of onlineUsers.entries()) {
    if (socketId === socket.id) {

      db.query(
        "UPDATE users SET last_seen = NOW() WHERE id = ?",
        [userId],
        (err) => {
          if (err) console.error("Failed to update last_seen:", err);
        }
      );

      onlineUsers.delete(userId);
      break;
    }
  }

  io.emit("online_users", Array.from(onlineUsers.keys()));
  console.log("❌ Socket disconnected:", socket.id);
});
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
