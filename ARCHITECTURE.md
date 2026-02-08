# TeenGram - System Architecture Diagram

## 🏛️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT BROWSER                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Next.js Frontend (React 19)                  │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐         │  │
│  │  │  Pages     │  │ Components │  │   Styles   │         │  │
│  │  │  (App      │  │ (Sidebar,  │  │ (Tailwind, │         │  │
│  │  │  Router)   │  │  ChatView) │  │  Framer)   │         │  │
│  │  └────────────┘  └────────────┘  └────────────┘         │  │
│  └──────────────────────────────────────────────────────────┘  │
│         │                    │                    │              │
│         │ HTTP/HTTPS         │ WebSocket          │              │
│         ▼                    ▼                    │              │
└─────────────────────────────────────────────────────────────────┘
          │                    │                    │
          │                    │                    │
┌─────────────────────────────────────────────────────────────────┐
│                    CUSTOM NODE.JS SERVER                         │
│                      (server.cjs)                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   Next.js Handler                         │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐         │  │
│  │  │ API Routes │  │   Server   │  │   Static   │         │  │
│  │  │ (/api/*)   │  │  Actions   │  │   Assets   │         │  │
│  │  └────────────┘  └────────────┘  └────────────┘         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Socket.IO Server (/api/socket)               │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐         │  │
│  │  │   Rooms    │  │  Handlers  │  │  Broadcast │         │  │
│  │  │ Management │  │ (chat.js)  │  │   Events   │         │  │
│  │  └────────────┘  └────────────┘  └────────────┘         │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
          │                    │                    │
          │                    │                    │
          ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   MongoDB       │  │  NextAuth.js    │  │   OpenAI API    │
│   Database      │  │  (GitHub OAuth) │  │  (GPT-3.5)      │
│                 │  │                 │  │                 │
│  • Users        │  │  • Sessions     │  │  • Caption      │
│  • Friends      │  │  • Tokens       │  │    Generation   │
│  • Posts        │  │  • Callbacks    │  │                 │
│  • Messages     │  │                 │  │                 │
│  • Conversations│  │                 │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## 🔄 Request Flow Diagrams

### 1. Page Load (SSR)

```
User Browser                Next.js Server              MongoDB
     │                            │                        │
     │──── GET /User ────────────▶│                        │
     │                            │                        │
     │                            │──── getServerSession ──│
     │                            │◀─────────────────────  │
     │                            │                        │
     │                            │──── fetchuser() ──────▶│
     │                            │◀───── User Data ───────│
     │                            │                        │
     │                            │──── fetchpost() ───────▶│
     │                            │◀───── Posts[] ─────────│
     │                            │                        │
     │◀─── HTML with Data ────────│                        │
     │                            │                        │
     │──── Hydrate React ────────▶│                        │
     │                            │                        │
```

### 2. Real-Time Chat Message

```
User A Browser        Socket.IO Server      MongoDB        User B Browser
     │                       │                 │                 │
     │─ send_message ───────▶│                 │                 │
     │                       │                 │                 │
     │                       │─ saveMessage ──▶│                 │
     │                       │◀─ Message ──────│                 │
     │                       │                 │                 │
     │                       │─ io.to(room) ───┼────────────────▶│
     │◀─ receive_message ────│                 │                 │
     │                       │                 │─ receive_msg ──▶│
     │                       │                 │                 │
     │─ Update UI ───────────│                 │─ Update UI ────▶│
     │                       │                 │                 │
```

### 3. AI Caption Generation

```
User Browser          Next.js API         OpenAI API
     │                     │                   │
     │─ Click Generate ───▶│                   │
     │                     │                   │
     │                     │─ POST /api/ai ───▶│
     │                     │  { prompt }       │
     │                     │                   │
     │                     │                   │─ GPT-3.5 ───┐
     │                     │                   │             │
     │                     │                   │◀────────────┘
     │                     │◀─ { reply } ──────│
     │                     │                   │
     │◀─ Caption Text ─────│                   │
     │                     │                   │
     │─ Update Input ─────▶│                   │
     │                     │                   │
```

### 4. Friend Request Flow

```
User A                Server Actions           MongoDB              User B
  │                         │                     │                   │
  │─ Send Request ─────────▶│                     │                   │
  │                         │                     │                   │
  │                         │─ makefriend() ─────▶│                   │
  │                         │  (sender: A,        │                   │
  │                         │   receiver: B,      │                   │
  │                         │   accepted: false)  │                   │
  │                         │◀────────────────────│                   │
  │◀─ "Pending" ────────────│                     │                   │
  │                         │                     │                   │
  │                         │                     │◀─ View Profile ───│
  │                         │                     │                   │
  │                         │◀─ fetchfriendreq ───│                   │
  │                         │  (receiver: B)      │                   │
  │                         │────────────────────▶│                   │
  │                         │                     │─ "Accept Req" ───▶│
  │                         │                     │                   │
  │                         │◀─ accept_request ───│◀──────────────────│
  │                         │  (id, accepted:true)│                   │
  │                         │────────────────────▶│                   │
  │                         │                     │                   │
  │◀─ "Friends" ────────────│                     │─ "Friends" ───────▶│
  │                         │                     │                   │
```

---

## 🗂️ File Structure with Dependencies

```
teengram/
│
├── server.cjs ──────────────┐ (Custom Server)
│   ├── requires: next       │
│   ├── requires: http       │
│   ├── requires: socket.io  │
│   └── imports: socketHandlers/chat.js
│
├── app/
│   ├── layout.js ───────────┐ (Root Layout)
│   │   ├── imports: globals.css
│   │   ├── imports: SessionWrapper
│   │   └── uses: Geist fonts
│   │
│   ├── page.js ─────────────┐ (Home Page)
│   │   ├── imports: Sidebar
│   │   ├── imports: Landingpage
│   │   └── uses: useSession, useRouter
│   │
│   ├── api/
│   │   ├── auth/[...nextauth]/route.js ──┐ (NextAuth)
│   │   │   ├── imports: connectDb
│   │   │   ├── imports: User model
│   │   │   └── uses: GitHub OAuth
│   │   │
│   │   ├── ai/route.js ──────────────────┐ (OpenAI)
│   │   │   ├── imports: openai
│   │   │   └── uses: OPENAI_API_KEY
│   │   │
│   │   └── chat/
│   │       ├── conversations/route.js
│   │       └── history/[conversationId]/route.js
│   │
│   ├── Components/
│   │   ├── Sidebar.js ───────────────────┐ (Navigation)
│   │   │   ├── imports: lucide-react
│   │   │   └── imports: Link
│   │   │
│   │   ├── ChatView.js ──────────────────┐ (Chat UI)
│   │   │   ├── imports: socket (lib/socket.js)
│   │   │   ├── uses: useState, useEffect
│   │   │   └── emits: join_chat, send_message, typing_status
│   │   │
│   │   ├── ChatList.js
│   │   ├── SessionWrapper.js ────────────┐ (Auth Provider)
│   │   │   └── imports: SessionProvider
│   │   │
│   │   └── Landingpage.js
│   │
│   ├── User/page.js ─────────────────────┐ (Profile Page)
│   │   ├── imports: Sidebar
│   │   ├── imports: useractions
│   │   ├── imports: sendPrompt
│   │   ├── imports: framer-motion
│   │   └── uses: useSession, useState
│   │
│   ├── Chat/
│   │   ├── page.js ──────────────────────┐ (Chat Server)
│   │   │   ├── imports: getServerSession
│   │   │   ├── imports: useractions
│   │   │   └── renders: ClientChatWrapper
│   │   │
│   │   └── ClientChatWrapper.js ─────────┐ (Chat Client)
│   │       └── renders: ChatView + ChatList
│   │
│   ├── friends/page.js ──────────────────┐ (Find Friends)
│   │   ├── imports: Sidebar
│   │   ├── imports: fetchotheruser
│   │   └── uses: useSession
│   │
│   ├── ViewFriends/page.js ──────────────┐ (Friend Profile)
│   │   ├── imports: Sidebar
│   │   ├── imports: useractions (all friend functions)
│   │   └── uses: useSearchParams
│   │
│   └── schoolCompetitions/page.js ───────┐ (Competitions)
│       ├── imports: lucide-react
│       └── imports: Sidebar
│
├── actions/
│   └── useractions.js ───────────────────┐ (Server Actions)
│       ├── imports: connectDb
│       ├── imports: All models
│       └── exports: 15+ functions
│
├── models/
│   ├── User.js ──────────────────────────┐ (User Schema)
│   ├── Friends.js ───────────────────────┐ (Friends Schema)
│   ├── Written_Post.js ──────────────────┐ (Post Schema)
│   ├── Conversation.js ──────────────────┐ (Conversation Schema)
│   ├── Message.js ───────────────────────┐ (Message Schema)
│   └── Comment.js ───────────────────────┐ (Comment Schema)
│
├── lib/
│   └── socket.js ────────────────────────┐ (Socket Client)
│       └── imports: socket.io-client
│
├── socketHandlers/
│   └── chat.js ──────────────────────────┐ (Socket Handlers)
│       ├── imports: useractions
│       └── exports: default handler
│
└── utils/
    └── sendPrompt.js ────────────────────┐ (AI Utility)
        └── calls: /api/ai
```

---

## 🔐 Authentication Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                           │
└─────────────────────────────────────────────────────────────────┘

User                Login Page           NextAuth          GitHub        MongoDB
 │                      │                    │                │              │
 │─ Visit /login ──────▶│                    │                │              │
 │                      │                    │                │              │
 │◀─ Render Form ───────│                    │                │              │
 │                      │                    │                │              │
 │─ Click "Sign up" ───▶│                    │                │              │
 │                      │                    │                │              │
 │                      │─ signIn("github") ▶│                │              │
 │                      │                    │                │              │
 │                      │                    │─ Redirect ────▶│              │
 │◀──────────────────────────────────────────────────────────│              │
 │                      │                    │                │              │
 │─ Authorize App ──────────────────────────────────────────▶│              │
 │                      │                    │                │              │
 │                      │                    │◀─ Auth Code ───│              │
 │                      │                    │                │              │
 │                      │                    │─ Exchange ────▶│              │
 │                      │                    │                │              │
 │                      │                    │◀─ Access Token │              │
 │                      │                    │                │              │
 │                      │                    │─ Get Profile ─▶│              │
 │                      │                    │                │              │
 │                      │                    │◀─ User Data ───│              │
 │                      │                    │                │              │
 │                      │                    │─ signIn callback              │
 │                      │                    │──────────────────────────────▶│
 │                      │                    │  User.findOne({ email })      │
 │                      │                    │                               │
 │                      │                    │  if (!exists):                │
 │                      │                    │    User.create({ email, ... })│
 │                      │                    │                               │
 │                      │                    │◀──────────────────────────────│
 │                      │                    │                               │
 │                      │                    │─ session callback             │
 │                      │                    │──────────────────────────────▶│
 │                      │                    │  User.findOne({ email })      │
 │                      │                    │                               │
 │                      │                    │◀─ dbUser ─────────────────────│
 │                      │                    │                               │
 │                      │                    │  session.user.name = dbUser.username
 │                      │                    │                               │
 │◀─ Redirect to /feed ─────────────────────│                               │
 │                      │                    │                               │
 │─ Access Protected ──▶│                    │                               │
 │   Pages              │                    │                               │
 │                      │                    │                               │
```

---

## 💬 Real-Time Chat Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  SOCKET.IO CHAT SYSTEM                           │
└─────────────────────────────────────────────────────────────────┘

Client A                 Socket.IO Server              MongoDB         Client B
   │                            │                         │                │
   │─ socket.connect() ────────▶│                         │                │
   │                            │                         │                │
   │                            │─ 'connection' event     │                │
   │                            │   socket.id assigned    │                │
   │                            │                         │                │
   │─ join_chat(convId) ───────▶│                         │                │
   │                            │                         │                │
   │                            │─ socket.join(convId)    │                │
   │                            │   (Room created/joined) │                │
   │                            │                         │                │
   │                            │                         │◀─ join_chat ───│
   │                            │◀────────────────────────┼────────────────│
   │                            │                         │                │
   │─ typing_status ───────────▶│                         │                │
   │   { convId, user, true }   │                         │                │
   │                            │                         │                │
   │                            │─ socket.to(convId) ─────┼───────────────▶│
   │                            │   emit('typing')        │─ 'typing' ────▶│
   │                            │                         │                │
   │─ send_message ────────────▶│                         │                │
   │   { sender, recipient,     │                         │                │
   │     content }              │                         │                │
   │                            │                         │                │
   │                            │─ saveMessageAndGetDetails()              │
   │                            │────────────────────────▶│                │
   │                            │   • Find/create conv    │                │
   │                            │   • Create message      │                │
   │                            │   • Update lastMessage  │                │
   │                            │   • Populate sender     │                │
   │                            │                         │                │
   │                            │◀─ populatedMessage ─────│                │
   │                            │                         │                │
   │                            │─ io.to(convId) ─────────┼───────────────▶│
   │◀─ receive_message ─────────│   emit('receive_msg')   │                │
   │                            │                         │─ receive_msg ─▶│
   │                            │                         │                │
   │─ Append to UI ────────────▶│                         │─ Append UI ───▶│
   │                            │                         │                │
   │                            │                         │                │
   │─ disconnect ──────────────▶│                         │                │
   │                            │                         │                │
   │                            │─ 'disconnect' event     │                │
   │                            │   socket.leave(all)     │                │
   │                            │                         │                │
```

---

## 🗃️ Database Schema Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                   DATABASE RELATIONSHIPS                         │
└─────────────────────────────────────────────────────────────────┘

                            ┌──────────────┐
                            │     User     │
                            │──────────────│
                            │ _id          │◀────────┐
                            │ email (UQ)   │         │
                            │ username (UQ)│         │
                            │ age          │         │
                            │ profilepic   │         │
                            │ bio          │         │
                            │ institute    │         │
                            │ university   │         │
                            │ verified     │         │
                            └──────────────┘         │
                                   │                 │
                    ┌──────────────┼──────────────┐  │
                    │              │              │  │
                    ▼              ▼              ▼  │
         ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
         │   Friends    │  │ Written_Post │  │ Conversation │
         │──────────────│  │──────────────│  │──────────────│
         │ sender_email │  │ user_id ─────┼──│ participants[]──┘
         │ receiver_email  │ content      │  │ isGroup      │
         │ accepted     │  │ caption      │  │ name         │
         │ sender_pic   │  │ institute    │  │ admin ───────┼──┐
         └──────────────┘  │ university   │  │ adminOnly    │  │
                           │ user_name    │  │ lastMessage ─┼──┼─┐
                           │ profilepic   │  └──────────────┘  │ │
                           └──────────────┘         │          │ │
                                                    │          │ │
                                                    ▼          │ │
                                            ┌──────────────┐   │ │
                                            │   Message    │   │ │
                                            │──────────────│   │ │
                                            │ conversationId──┘ │
                                            │ sender ───────────┘
                                            │ content      │
                                            │ readBy[]     │
                                            │ createdAt    │
                                            └──────────────┘

Legend:
  ─── : One-to-Many relationship
  ──▶ : Foreign Key reference
  UQ  : Unique constraint
  []  : Array field
```

---

## 🎯 Component Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                     COMPONENT TREE                               │
└─────────────────────────────────────────────────────────────────┘

RootLayout (app/layout.js)
│
└── SessionWrapper
    │
    ├── Home Page (app/page.js)
    │   ├── Sidebar
    │   └── Landingpage
    │
    ├── Login Page (app/login/page.js)
    │   └── GitHub OAuth Button
    │
    ├── User Profile (app/User/page.js)
    │   ├── Sidebar
    │   ├── Profile Header
    │   │   ├── Avatar
    │   │   ├── Stats (posts, followers, following)
    │   │   ├── Edit Button → /Updateuser
    │   │   └── Verify Button → /verify
    │   │
    │   ├── Post Creation Form (conditional)
    │   │   ├── Content Textarea
    │   │   ├── Caption Input
    │   │   ├── Generate Button (AI)
    │   │   └── Submit Button
    │   │
    │   └── Content Display
    │       ├── Posts Section (Framer Motion)
    │       └── Friends Section (toggle)
    │           ├── Followers Grid
    │           └── Following Grid
    │
    ├── Update Profile (app/Updateuser/page.js)
    │   └── Edit Form
    │       ├── Profile Pic Upload
    │       ├── Username Input
    │       ├── Name Input
    │       ├── Bio Input
    │       ├── Age Input
    │       ├── Institute Input
    │       └── University Input
    │
    ├── Friends Discovery (app/friends/page.js)
    │   ├── Sidebar
    │   └── User Grid
    │       └── User Cards (map)
    │           ├── Avatar
    │           ├── Username (Link to ViewFriends)
    │           └── University
    │
    ├── Friend Profile (app/ViewFriends/page.js)
    │   ├── Sidebar
    │   ├── Profile Header
    │   │   ├── Avatar
    │   │   ├── Username
    │   │   ├── Friend Request Button (conditional)
    │   │   └── Message Button → /Chat
    │   │
    │   └── Stats
    │       ├── Posts Count
    │       ├── Followers Count
    │       └── Following Count
    │
    ├── Chat (app/Chat/page.js - Server Component)
    │   └── ClientChatWrapper
    │       ├── ChatList (sidebar)
    │       │   └── Conversation Cards (map)
    │       │       ├── Avatar
    │       │       ├── Name
    │       │       └── Last Message
    │       │
    │       └── ChatView (main)
    │           ├── Chat Header
    │           │   ├── Partner Avatar
    │           │   ├── Partner Name
    │           │   └── Typing Indicator
    │           │
    │           ├── Message Area (scrollable)
    │           │   └── Message Bubbles (map)
    │           │       ├── Sender Name (if group)
    │           │       ├── Content
    │           │       └── Timestamp
    │           │
    │           └── Input Footer
    │               ├── Attachment Button
    │               ├── Text Input
    │               └── Send Button
    │
    ├── School Competitions (app/schoolCompetitions/page.js)
    │   ├── Header
    │   └── Competition Grid
    │       └── Competition Cards (map)
    │           ├── Category Icon
    │           ├── Title
    │           ├── Description
    │           ├── Date
    │           ├── Category Badge
    │           └── View Details Button
    │
    └── Feed (app/feed/page.js)
        └── Sidebar
            └── (Empty content area)
```

---

## 🔄 State Management Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    STATE MANAGEMENT                              │
└─────────────────────────────────────────────────────────────────┘

Global State (NextAuth Session)
│
├── session.user.email
├── session.user.name (from DB)
└── session.user.image

Component-Level State (useState)
│
├── User Profile Page
│   ├── form (user data)
│   ├── followers[]
│   ├── following[]
│   ├── written_post[]
│   ├── post (boolean - show form)
│   ├── seefollower (boolean - toggle)
│   ├── Written_form (post content)
│   ├── isGenerating (boolean - AI)
│   └── captionError (string)
│
├── ChatView Component
│   ├── messages[]
│   ├── inputContent (string)
│   ├── typingUser (string | null)
│   └── chatError (string | null)
│
├── ViewFriends Page
│   ├── Friend (user object)
│   ├── requestinfo (friend request)
│   ├── approvalinfo (friend request)
│   ├── follower[]
│   └── following[]
│
└── Friends Page
    └── friends[] (all users)

Server State (MongoDB)
│
├── Users Collection
├── Friends Collection
├── Written_Post Collection
├── Conversation Collection
└── Message Collection

Real-Time State (Socket.IO)
│
├── Connected Sockets
├── Room Memberships
└── Active Conversations
```

---

*System Architecture Documentation for TeenGram*
*Last Updated: February 6, 2026*
./././.
/\/\/\/\/