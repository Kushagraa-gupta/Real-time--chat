# Chatify: Real-Time Messaging Platform

Chatify is a modern, premium full-stack real-time chat application inspired by the interfaces of Discord and WhatsApp Web. It features secure JWT authentication, real-time messaging, typing indicators, presence synchronizations (online/offline/last seen indicators), message seen receipts, and local file attachment sharing.

---

## 🚀 Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand
- **Caching & Fetching**: TanStack Query (React Query)
- **Websocket Client**: Socket.io-client
- **Icons**: Lucide React

### Backend
- **Framework**: Node.js + Express
- **Real-Time Layer**: Socket.io
- **Database ORM**: Prisma (PostgreSQL)
- **Authentication**: JWT + bcryptjs
- **Validation**: Zod
- **File Uploads**: Multer (Local Storage)

---

## 📂 Project Structure

```
chatbot/
├── backend/
│   ├── src/
│   │   ├── controllers/      # Route controllers (auth, user, chat, message)
│   │   ├── routes/           # Express router files
│   │   ├── middleware/       # Auth validation, error handler middlewares
│   │   ├── socket/           # Real-time event gateway
│   │   ├── lib/              # Prisma client, Zod schemas
│   │   └── index.ts          # Starts HTTP & WebSocket servers
│   ├── prisma/
│   │   └── schema.prisma     # Prisma database schemas
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js page views & layouts
│   │   ├── components/       # Custom React widgets (chat feed, settings)
│   │   ├── hooks/            # Store bindings & client integrations
│   │   ├── services/         # Axios API clients
│   │   ├── store/            # Zustand global caches (auth/chat status)
│   │   └── socket/           # Context gateway for Socket.io
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml        # Multi-service database & node container orchestrator
└── README.md
```

---

## ⚙️ Setup Instructions

### Prerequisites
- **Node.js**: v18 or later
- **npm** or **yarn**
- **Docker** (optional, recommended for database setup)

---

### Method A: Run Everything via Docker Compose (Recommended)

To run the database, backend, and frontend concurrently without local Node setups, run:

```bash
docker-compose up --build
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Postgres Database**: port `5432` inside container

---

### Method B: Run Locally

#### 1. Spin up the Database
If you do not want to run backend/frontend in Docker, you can still start only the PostgreSQL container:
```bash
docker compose up -d db
```
This spins up PostgreSQL on `localhost:5432` with username/password: `postgres`/`postgres`.

#### 2. Configure Backend
1. Open the `/backend` folder.
2. Edit `.env` file:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/chatbot_db?schema=public"
   PORT=5000
   JWT_SECRET="supersecretkeythatisverylongandsecure"
   JWT_EXPIRES_IN="7d"
   FRONTEND_URL="http://localhost:3000"
   ```
3. Install dependencies and build Prisma client:
   ```bash
   cd backend
   npm install
   npm run prisma:generate
   ```
4. Run migrations to initialize the database:
   ```bash
   npm run prisma:migrate
   ```
5. Start development API:
   ```bash
   npm run dev
   ```

#### 3. Configure Frontend
1. Open the `/frontend` folder.
2. Edit `.env.local` file:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000
   ```
3. Install dependencies:
   ```bash
   cd ../frontend
   npm install
   ```
4. Start Next.js development server:
   ```bash
   npm run dev
   ```
5. Open http://localhost:3000 in your browser. Open multiple windows/private tabs to test real-time chat between different users!

---

## 📡 Socket.io Events Reference

| Event Name | Type | Payload | Description |
| :--- | :--- | :--- | :--- |
| `setup` | Emit | `userId (string)` | Binds socket instance to active user ID and sets user online |
| `join-chat` | Emit | `conversationId (string)` | Joins the room for that conversation |
| `leave-chat` | Emit | `conversationId (string)` | Leaves the conversation room |
| `typing` | Emit/Listen | `{ conversationId, userId, username }` | Notifies recipients that user is typing |
| `stop-typing` | Emit/Listen | `{ conversationId, userId }` | Notifies recipients that user stopped typing |
| `message-seen` | Emit | `{ conversationId, userId }` | Marks unseen messages read for the participant |
| `messages-marked-seen`| Listen | `{ conversationId, userId }` | Updates UI to show seen checkmarks (`CheckCheck`) |
| `message-received` | Listen | `Message object` | Real-time message receiver for chats |
| `conversation-created`| Listen | `Conversation object` | Appends a newly created group/direct chat in sidebar |

---

## 🔒 Security Highlights
- **Passwords**: Hashed using `bcryptjs` before insertion.
- **APIs**: Routes like search, profile, and messaging are guarded by JWT validation headers.
- **ORM**: Prisma prevents standard SQL injection attacks automatically.
