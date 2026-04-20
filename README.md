# TeenGram 🚀

**TeenGram** is an exclusive, safe, and engaging web-based social media platform designed specifically for students under the age of 18. The platform ensures a secure environment for teenagers to connect, share content, communicate in real-time, and participate in school-based competitions.

## 🌟 Key Features

### 🔐 Authentication & Security
- Secure registration and login flow specifically regulated for underage users.
- Email verification system using `nodemailer`.
- Advanced authentication and session management using `NextAuth`.
- Secure password hashing using `bcryptjs`.

### 📱 Social Feed & Content Creation
- **Feed:** A dynamic timeline showing posts from friends and followed users.
- **Content Creation:** Tools to create new posts with images and text.
- **Shorts:** A dedicated feature for discovering and sharing short-form vertical video content, similar to modern video reels.
- **Media Management:** Efficient image and media uploading via `cloudinary`.

### 💬 Real-Time Communication
- **Live Chat:** Real-time, instant messaging between users powered by `Socket.io` and `Redis`.
- **Friends System:** Send requests, accept friends, and manage your followers and following lists.
- **Notifications:** Real-time alerts for incoming friend requests, messages, and interactions.

### 🏆 Events & Competitions
- **School Competitions:** Dedicated spaces for schools to host virtual contests, quizzes, and competitions.
- **Teen Arena:** A community engagement arena with leaderboards, challenges, and specialized events.

### ⚙️ Multi-Tiered Administration Setup
TeenGram employs a hierarchical administrative panel to securely manage user data, credentials, and platform moderation:
- **Super Admin & Head Admin:** Oversees the platform's overarching metrics and top-level user management.
- **Admin & Sub-Admin Panels:** Allows designated moderators (e.g., school officials) to verify accounts, manage student credentials, and generate structured reports / credential PDFs utilizing `jspdf` and `jspdf-autotable`.

### 🔍 Search & Discoverability
- Powerful built-in search engine to easily find friends, posts, and ongoing events.

---

## 🛠️ Technology Stack

**Frontend:**
- [Next.js (App Router)](https://nextjs.org/) - React framework for production
- [React 19](https://reactjs.org/)
- [Tailwind CSS v4](https://tailwindcss.com/) - Utility-first styling
- [Framer Motion](https://www.framer.com/motion/) - For liquid-smooth UI animations
- [Lucide React](https://lucide.dev/) - Iconography

**Backend & Database:**
- [Node.js](https://nodejs.org/en/) & [Express](https://expressjs.com/)
- [MongoDB](https://www.mongodb.com/) via [Mongoose](https://mongoosejs.com/) - Database ORM
- [Redis](https://redis.io/) - Fast in-memory data store for caching and live data
- [Socket.io](https://socket.io/) - Bidirectional real-time event communication

**Utilities & Integrations:**
- **AI integration:** OpenAI integration for smart moderation and recommendations.
- **Asset generation:** jsPDF and html2canvas for extracting tabular credential data.

---

## 🚀 Getting Started

Follow these instructions to set up the project locally.

### Prerequisites
- Node.js (v18.x or later)
- MongoDB running locally or a MongoDB Atlas URI
- Redis server running locally or via a cloud provider
- Cloudinary Account
- SMTP Email Credentials

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/krishnadoes/teengram.git
cd teengram
```

2. **Install dependencies:**
```bash
npm install
# or
yarn install
```

3. **Configure Environment Variables:**
Create a `.env` file in the root directory and populate it with your corresponding keys for MongoDB, Redis, JWT Secrets, NextAuth URLs, Cloudinary URIs, etc.

4. **Run the development server:**
```bash
npm run dev
```
Alternatively, for the full custom Node.js server (required for WebSockets/Socket.io):
```bash
npm run dev:full
```

5. **Open the App:**
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🤝 Contribution & Links

- **Repository:** https://github.com/krishnadoes/teengram
- **Bug tracker:** https://github.com/krishnadoes/teengram/issues

Feel free to raise issues or submit pull requests.