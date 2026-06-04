# Drift — Real-time Chat App

A full-stack real-time chat application with React frontend, Node.js/Express backend, MySQL database, and Socket.IO for live messaging.

## Features

- **Auth** — Register & login with JWT
- **Real-time messaging** — Socket.IO powered instant chat
- **User search** — Find users by username or email
- **Online presence** — See who's online live
- **Typing indicators** — Know when the other person is typing
- **Conversation history** — Messages persist in MySQL
- **Mobile responsive** — Works great on all screen sizes
- **Docker ready** — One command deployment

---

## Project Structure

```
chat-app/
├── backend/
│   ├── routes/
│   │   ├── auth.js         # Register / Login
│   │   ├── user.js         # Profile / Search
│   │   ├── conversation.js # Create / List conversations
│   │   └── message.js      # Send / Fetch messages
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── db.js
│   ├── server.js           # Express + Socket.IO
│   ├── schema.sql          # MySQL schema
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── api/axios.js
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   └── SocketContext.jsx
│   │   ├── pages/
│   │   │   ├── AuthPage.jsx
│   │   │   └── ChatPage.jsx
│   │   ├── styles/
│   │   │   ├── auth.css
│   │   │   └── chat.css
│   │   ├── App.jsx
│   │   └── index.js
│   ├── public/index.html
│   ├── nginx.conf
│   └── Dockerfile
│
├── docker-compose.yml
└── .env.example
```

---

## Local Development Setup

### 1. Database
```sql
-- Run schema.sql in MySQL
mysql -u root -p < backend/schema.sql
```

### 2. Backend
```bash
cd backend
cp .env.example .env   # fill in your values
npm install
npm run dev            # starts on :5000
```

### 3. Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm start              # starts on :3000
```

---

## Docker Deployment (Recommended)

```bash
# At project root
cp .env.example .env   # fill in DB_PASSWORD and JWT_SECRET

docker-compose up --build -d
```

App will be live at **http://localhost**

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | — | Register user |
| POST | /api/auth/login | — | Login |
| GET | /api/user/profile | ✓ | Get own profile |
| GET | /api/user/search?q= | ✓ | Search users |
| GET | /api/conversations | ✓ | List conversations |
| POST | /api/conversations | ✓ | Create/get conversation |
| GET | /api/messages/:conv_id | ✓ | Get messages |
| POST | /api/messages | ✓ | Send message |

## Socket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `user_online` | Client→Server | Mark user online |
| `online_users` | Server→Client | Updated online list |
| `join_conversation` | Client→Server | Join chat room |
| `send_message` | Client→Server | Broadcast message |
| `receive_message` | Server→Client | Incoming message |
| `typing` | Client→Server | Start typing |
| `stop_typing` | Client→Server | Stop typing |
| `user_typing` | Server→Client | Other user typing |

---

## Environment Variables

**Backend `.env`**
```
PORT=5000
CLIENT_URL=http://localhost:3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=chat_app
DB_PORT=3306
JWT_SECRET=your_secret_key
```

**Frontend `.env`**
```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```
