# Drift — Real-time Chat App

A full-stack real-time chat application built with React, Node.js/Express, MySQL, and Socket.IO.

**Live stack:** Vercel (frontend) · Render (backend) · Aiven (MySQL)

---

## Features

- **Auth** — Register & login with JWT
- **Real-time messaging** — Socket.IO powered instant chat
- **Group chats** — Create group conversations
- **User search** — Find users by username or email
- **Online presence** — See who's online live
- **Typing indicators** — Know when someone is typing
- **Reactions** — React to messages with emojis
- **Read receipts** — See when messages are read
- **File & image sharing** — Send photos and files
- **Message deletion** — Delete your own messages
- **Profile editing** — Update avatar, username, and bio
- **Conversation history** — Messages persist in MySQL
- **Mobile responsive** — Works on all screen sizes

---

## Project Structure

```
chat-app/
├── backend/
│   ├── routes/
│   │   ├── auth.js             # Register / Login
│   │   ├── user.js             # Profile / Search / Avatar upload
│   │   ├── conversation.js     # DMs + Group conversations
│   │   └── message.js          # Send / Fetch / Delete / React / Upload
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── uploads/                # Uploaded avatars & files (persisted)
│   ├── db.js                   # MySQL pool with SSL (Aiven compatible)
│   ├── server.js               # Express + Socket.IO
│   ├── schema.sql              # Full MySQL schema
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
│   │   │   ├── ChatPage.jsx
│   │   │   └── ProfilePage.jsx
│   │   ├── styles/
│   │   │   ├── auth.css
│   │   │   ├── chat.css
│   │   │   └── profile.css
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

## Deployment Setup (Render + Vercel + Aiven)

This is the recommended production setup. No Docker needed.

### Step 1 — Aiven (MySQL Database)

1. Go to [aiven.io](https://aiven.io) and create a **MySQL** service (free tier works)
2. Once running, open the service and go to the **Overview** tab
3. Copy these values — you'll need them for the backend env:
   - **Host** → `DB_HOST`
   - **Port** → `DB_PORT`
   - **User** → `DB_USER`
   - **Password** → `DB_PASSWORD`
   - **Database** → `DB_NAME` (default is usually `defaultdb`)
4. Run the schema against your Aiven DB. You can use any MySQL client (TablePlus, DBeaver, or CLI):
   ```bash
   mysql -u <DB_USER> -p<DB_PASSWORD> -h <DB_HOST> -P <DB_PORT> --ssl-mode=REQUIRED < backend/schema.sql
   ```

> Aiven requires SSL. The `db.js` already handles this with `rejectUnauthorized: false`.

---

### Step 2 — Render (Backend)

1. Go to [render.com](https://render.com) → **New → Web Service**
2. Connect your GitHub repo and select the **`backend`** folder as root directory
   - **Build command:** `npm install`
   - **Start command:** `node server.js`
   - **Node version:** 18+
3. Add the following **Environment Variables** in Render dashboard:

```
PORT=5000
CLIENT_URL=https://your-vercel-app.vercel.app

DB_HOST=your-aiven-host.aivencloud.com
DB_PORT=your-aiven-port
DB_USER=avnadmin
DB_PASSWORD=your-aiven-password
DB_NAME=defaultdb

JWT_SECRET=a_long_random_secret_string
```

4. Deploy. Once live, copy your Render URL — e.g. `https://drift-api.onrender.com`

> **Note:** Render free tier spins down after inactivity. The first request after sleep takes ~30s to wake up.

---

### Step 3 — Vercel (Frontend)

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repo, set the **root directory** to `frontend`
3. Vercel auto-detects Create React App — no build config needed
4. Add these **Environment Variables** in Vercel project settings:

```
REACT_APP_API_URL=https://your-render-app.onrender.com/api
REACT_APP_SOCKET_URL=https://your-render-app.onrender.com
```

5. Deploy. Your app will be live at `https://your-app.vercel.app`

6. Go back to your **Render** service and update `CLIENT_URL` to your Vercel URL, then redeploy.

---

### Step 4 — Verify Everything Works

- [ ] Frontend loads at your Vercel URL
- [ ] Register / Login works
- [ ] Messages send and receive in real-time
- [ ] Avatars display correctly
- [ ] Online status updates

---

## Local Development Setup

### 1. Database

```bash
# Run schema against local MySQL
mysql -u root -p < backend/schema.sql
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # fill in your local values
npm install
npm run dev            # starts on :5000
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env   # set API URLs to localhost
npm install
npm start              # starts on :3000
```

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `CLIENT_URL` | Frontend URL for CORS | `https://your-app.vercel.app` |
| `DB_HOST` | MySQL host | `mysql-xxx.aivencloud.com` |
| `DB_PORT` | MySQL port | `12345` |
| `DB_USER` | MySQL username | `avnadmin` |
| `DB_PASSWORD` | MySQL password | `your_password` |
| `DB_NAME` | Database name | `defaultdb` |
| `JWT_SECRET` | JWT signing secret | `long_random_string` |

### Frontend (`frontend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `REACT_APP_API_URL` | Backend API base URL | `https://your-api.onrender.com/api` |
| `REACT_APP_SOCKET_URL` | Backend socket URL | `https://your-api.onrender.com` |

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | — | Register user |
| POST | `/api/auth/login` | — | Login |
| GET | `/api/user/profile` | ✓ | Get own profile |
| PUT | `/api/user/profile` | ✓ | Update profile / avatar |
| GET | `/api/user/profile/:id` | ✓ | Get another user's profile |
| GET | `/api/user/search?q=` | ✓ | Search users |
| GET | `/api/conversations` | ✓ | List conversations |
| POST | `/api/conversations` | ✓ | Create / get DM |
| POST | `/api/conversations/group` | ✓ | Create group chat |
| GET | `/api/messages/:conv_id` | ✓ | Get messages (paginated) |
| POST | `/api/messages` | ✓ | Send text message |
| POST | `/api/messages/upload` | ✓ | Send file / image |
| DELETE | `/api/messages/:id` | ✓ | Delete own message |
| POST | `/api/messages/:id/react` | ✓ | React to message |
| POST | `/api/messages/read` | ✓ | Mark messages as read |

---

## Socket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `user_online` | Client → Server | Mark user as online |
| `online_users` | Server → Client | Updated online users list |
| `join_conversation` | Client → Server | Join a chat room |
| `leave_conversation` | Client → Server | Leave a chat room |
| `send_message` | Client → Server | Broadcast new message |
| `receive_message` | Server → Client | Incoming message |
| `typing` | Client → Server | Start typing |
| `stop_typing` | Client → Server | Stop typing |
| `user_typing` | Server → Client | Other user is typing |
| `user_stop_typing` | Server → Client | Other user stopped typing |
| `react_message` | Client → Server | Send a reaction |
| `reaction_updated` | Server → Client | Reaction changed |
| `message_deleted` | Client ↔ Server | Message was deleted |
| `messages_read` | Client ↔ Server | Messages marked as read |
