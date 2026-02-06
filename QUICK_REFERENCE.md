# TeenGram - Quick Reference Guide

## 🎯 What is TeenGram?
A **safe social media platform for teenagers under 18** with real-time chat, AI-powered content, and school competitions.

---

## 🏗️ Tech Stack at a Glance

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, React 19, Tailwind CSS 4 |
| **Backend** | Next.js API Routes, Custom Node.js Server |
| **Database** | MongoDB (Mongoose ODM) |
| **Real-time** | Socket.IO 4.8 |
| **Auth** | NextAuth.js (GitHub OAuth) |
| **AI** | OpenAI GPT-3.5-turbo |
| **Animations** | Framer Motion |

---

## 📁 Key Directories

```
teengram/
├── actions/           → Server-side database operations
├── app/
│   ├── api/          → API routes (auth, chat, AI)
│   ├── Components/   → Reusable UI components
│   ├── Chat/         → Real-time messaging
│   ├── User/         → User profiles
│   ├── friends/      → Friend discovery
│   └── ...
├── models/           → MongoDB schemas (User, Friends, Message, etc.)
├── lib/              → Socket.IO client
├── socketHandlers/   → WebSocket event handlers
└── utils/            → Helper functions
```

---

## 🗄️ Database Models (5 Core)

| Model | Purpose | Key Fields |
|-------|---------|------------|
| **User** | User profiles | email, username, age, institute, verified |
| **Friends** | Friend connections | sender_email, receiver_email, request_accepted |
| **Written_Post** | Text posts | user_id, content, caption (AI-generated) |
| **Conversation** | Chat rooms | participants[], isGroup, lastMessage |
| **Message** | Chat messages | conversationId, sender, content, readBy[] |

---

## 🔑 Core Features

### ✅ Fully Implemented
- GitHub OAuth authentication
- User profiles (bio, institute, university)
- Friend requests (send, accept, pending)
- Real-time 1-on-1 chat
- Typing indicators & read receipts
- Text posts with AI captions
- School competitions listing
- Followers/following system

### ⚠️ Partially Implemented
- Social feed (page exists, empty)
- Search (route exists, no logic)
- Notifications (placeholder)
- Profile verification (placeholder)
- Group chats (backend ready, no UI)

### ❌ Not Implemented
- Post comments/likes
- Image/video uploads
- Content moderation
- Admin panel
- Email notifications

---

## 🔄 Key Workflows

### 1️⃣ Authentication Flow
```
Login → GitHub OAuth → Create/Find User → Session → Redirect to Feed
```

### 2️⃣ Friend Request Flow
```
View Profile → Send Request → Friend Receives → Accept → Friends!
```

### 3️⃣ Real-Time Chat Flow
```
Open Chat → Join Room → Fetch History → Send Message → Broadcast to Room
```

### 4️⃣ AI Caption Generation Flow
```
Write Post → Click Generate → Call OpenAI API → Auto-fill Caption → Submit
```

---

## 📂 Important Files Explained

| File | Purpose |
|------|---------|
| `server.cjs` | Custom server combining Next.js + Socket.IO |
| `actions/useractions.js` | All database operations (358 lines) |
| `app/api/auth/[...nextauth]/route.js` | GitHub OAuth configuration |
| `socketHandlers/chat.js` | WebSocket event handlers (join, send, typing) |
| `app/Components/ChatView.js` | Real-time chat UI (244 lines) |
| `app/User/page.js` | User profile with posts & AI generation (372 lines) |
| `app/ViewFriends/page.js` | Friend profile with request logic (133 lines) |
| `models/User.js` | User schema (email, username, age, etc.) |
| `lib/socket.js` | Socket.IO client singleton |
| `utils/sendPrompt.js` | OpenAI API utility |

---

## 🚀 Running the Project

### Development
```bash
npm install
npm run dev
```
Runs on `http://localhost:3000`

### Environment Variables Needed
```env
GITHUB_ID=your_github_client_id
GITHUB_SECRET=your_github_client_secret
OPENAI_API_KEY=your_openai_api_key
NEXTAUTH_SECRET=random_secret_string
NEXTAUTH_URL=http://localhost:3000
```

### Database
- MongoDB running on `mongodb://localhost:27017/teengram`
- Start MongoDB: `mongod`

---

## 🎨 UI Components

| Component | Location | Purpose |
|-----------|----------|---------|
| **Sidebar** | `app/Components/Sidebar.js` | Main navigation menu |
| **ChatView** | `app/Components/ChatView.js` | Real-time chat interface |
| **ChatList** | `app/Components/ChatList.js` | Conversation list |
| **SessionWrapper** | `app/Components/SessionWrapper.js` | Auth provider wrapper |
| **Landingpage** | `app/Components/Landingpage.js` | Home content |

---

## 🔐 Security Notes

### ✅ Good Practices
- GitHub OAuth for authentication
- Server-side session validation
- API key in environment variables
- Mongoose for SQL injection prevention

### ⚠️ Needs Improvement
- No input sanitization (XSS risk)
- No Socket.IO authentication
- No rate limiting on AI endpoint
- No file upload validation
- Age verification not enforced

---

## 📊 Database Relationships

```
User ←→ Friends (sender/receiver)
User → Written_Post (author)
User ←→ Conversation (participants)
User → Message (sender)
Conversation → Message (many)
Conversation → Message (lastMessage, one)
```

---

## 🎯 API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/[...nextauth]` | GET/POST | GitHub OAuth |
| `/api/ai` | POST | OpenAI caption generation |
| `/api/chat/conversations` | GET | Fetch user conversations |
| `/api/chat/history/[id]` | GET | Fetch message history |

---

## 🔌 Socket.IO Events

### Client → Server
- `join_chat(conversationId)` - Join conversation room
- `send_message({ senderId, recipientOrConversationId, content })` - Send message
- `typing_status({ conversationId, username, isTyping })` - Typing indicator

### Server → Client
- `receive_message(message)` - New message broadcast
- `typing({ username, isTyping })` - Typing status update
- `chat_error({ message, status })` - Error notification

---

## 🎨 Color Scheme

- **Primary**: Teal/Sky gradient (`from-teal-400 to-sky-500`)
- **Accent**: Indigo (`bg-indigo-500`)
- **Secondary**: Purple/Pink gradients
- **Success**: Green
- **Error**: Red

---

## 🚧 Known Issues

1. **README.md** has Git merge conflict markers
2. Lots of commented-out code
3. Many placeholder pages (feed, search, notifications)
4. File upload UI without backend
5. Non-functional buttons (e.g., competition "View Details")

---

## 📈 Next Steps (Recommended)

### High Priority
1. Fix security vulnerabilities (input validation, Socket.IO auth)
2. Complete social feed functionality
3. Implement content moderation
4. Add image/video upload support

### Medium Priority
5. Build notifications system
6. Implement profile verification
7. Add search functionality
8. Create admin panel

### Low Priority
9. Add analytics dashboard
10. Implement gamification features
11. Build mobile app (React Native)

---

## 📚 Key Server Actions

### User Management
- `fetchuser(email)` - Get user by email
- `updateProfile(data, oldusername)` - Update profile
- `fetchotheruser(email)` - Get all users except current

### Friend System
- `makefriend(sender, receiver, profilepic)` - Send request
- `accept_request(id)` - Accept request
- `checkfriendstatus(user, friend)` - Check request status
- `find_following(email)` - Get accepted friends

### Posts
- `upload_written_post(...)` - Create post
- `fetchpost(user_id)` - Get user's posts

### Chat
- `getConversationsForUser(userId)` - Get conversations
- `getMessagesForConversation(convId, userId)` - Get messages + mark read
- `saveMessageAndGetDetails(sender, recipient, content)` - Save message
- `findOrCreateConversation(user1, user2)` - Get/create chat

---

## 🎓 Learning Outcomes

This project demonstrates:
- ✅ Full-stack JavaScript development
- ✅ Real-time WebSocket communication
- ✅ MongoDB database design
- ✅ OAuth authentication
- ✅ AI API integration
- ✅ Modern React patterns
- ✅ Responsive UI design
- ✅ Server-side rendering (SSR)

---

## 📞 Quick Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Start custom server (Socket.IO)
node server.cjs
```

---

## 🔗 Important URLs

- **Home**: `http://localhost:3000/`
- **Login**: `http://localhost:3000/login`
- **Profile**: `http://localhost:3000/User`
- **Friends**: `http://localhost:3000/friends`
- **Chat**: `http://localhost:3000/Chat`
- **Competitions**: `http://localhost:3000/schoolCompetitions`

---

## 💡 Pro Tips

1. **Socket.IO**: Custom server required, can't deploy to Vercel
2. **AI Captions**: Uses prompt engineering for teen-friendly content
3. **Friend Requests**: Complex conditional logic in ViewFriends page
4. **Chat**: Automatically creates conversation if doesn't exist
5. **Read Receipts**: Implemented via `readBy[]` array in messages

---

*Quick Reference for TeenGram Project*
*Last Updated: February 6, 2026*
