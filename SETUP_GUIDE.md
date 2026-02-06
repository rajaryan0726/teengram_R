# TeenGram - Setup & Run Guide

## 🚀 Quick Start

Follow these steps to run the TeenGram project locally.

---

## ✅ Prerequisites

Before running the project, ensure you have:

1. **Node.js** (v18 or higher)
   - Check: `node --version`
   - Download: https://nodejs.org/

2. **MongoDB** (Community Edition)
   - Check: `mongod --version`
   - Download: https://www.mongodb.com/try/download/community
   - **Windows**: Make sure MongoDB is added to PATH or use MongoDB Compass

3. **Git** (for GitHub OAuth)
   - Check: `git --version`

4. **GitHub Account** (for OAuth login)

5. **OpenAI API Key** (for AI caption generation)
   - Get from: https://platform.openai.com/api-keys

---

## 📦 Step 1: Install Dependencies

Open terminal in the project directory and run:

```bash
cd C:\rajaryan\teengram\teengram
npm install
```

This will install all required packages (~200MB).

---

## 🗄️ Step 2: Setup MongoDB

### Option A: MongoDB Service (Recommended)

1. **Start MongoDB Service:**
   ```bash
   # Windows (as Administrator)
   net start MongoDB
   ```

2. **Verify it's running:**
   ```bash
   # Should connect without errors
   mongosh
   ```

### Option B: MongoDB Compass (GUI)

1. Download and install **MongoDB Compass**
2. Connect to: `mongodb://localhost:27017`
3. Create database: `teengram`

### Option C: Manual Start

```bash
# Start MongoDB manually
mongod --dbpath C:\data\db
```

---

## 🔑 Step 3: Setup GitHub OAuth

1. **Go to GitHub Developer Settings:**
   - Visit: https://github.com/settings/developers
   - Click "New OAuth App"

2. **Fill in the details:**
   - **Application name**: TeenGram Local
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`

3. **Get credentials:**
   - Copy **Client ID**
   - Generate and copy **Client Secret**

---

## 🔐 Step 4: Create Environment Variables

1. **Copy the example file:**
   ```bash
   cp .env.local.example .env.local
   ```

2. **Edit `.env.local` with your values:**

   ```env
   # GitHub OAuth (from Step 3)
   GITHUB_ID=your_actual_github_client_id
   GITHUB_SECRET=your_actual_github_client_secret

   # NextAuth Secret (generate random string)
   NEXTAUTH_SECRET=any_random_string_at_least_32_characters_long
   NEXTAUTH_URL=http://localhost:3000

   # OpenAI API Key (optional, for AI features)
   OPENAI_API_KEY=sk-your_actual_openai_api_key

   # MongoDB (keep as is for local)
   MONGODB_URI=mongodb://localhost:27017/teengram
   ```

3. **Generate NEXTAUTH_SECRET:**
   ```bash
   # Option 1: Use Node.js
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

   # Option 2: Use OpenSSL
   openssl rand -base64 32
   ```

---

## 🎯 Step 5: Run the Project

### Development Mode (Recommended)

```bash
npm run dev
```

This starts:
- Next.js development server
- Socket.IO server for real-time chat
- Hot reload on file changes

**Access at:** http://localhost:3000

### Production Mode

```bash
# Build the project
npm run build

# Start production server
npm start
```

### Using Custom Server (Socket.IO)

```bash
# This is the same as npm run dev
node server.cjs
```

---

## 🌐 Step 6: Access the Application

1. **Open browser:** http://localhost:3000

2. **You'll see the login page**

3. **Click "Sign up Here"** → Redirects to GitHub

4. **Authorize the app** → Creates your account

5. **Redirected to feed** → Start using TeenGram!

---

## 🧪 Testing the Features

### Test Authentication
1. Visit: http://localhost:3000/login
2. Click "Sign up Here"
3. Authorize with GitHub
4. Should redirect to /feed

### Test Profile
1. Visit: http://localhost:3000/User
2. Click "Edit Profile"
3. Update your information
4. Click "Post Now!" to create a post

### Test AI Caption
1. Go to your profile
2. Click "Post Now!"
3. Write some content
4. Click "Generate" (requires OpenAI API key)
5. AI generates a caption

### Test Friends
1. Visit: http://localhost:3000/friends
2. Click on a username
3. Send friend request
4. (Use another account to accept)

### Test Chat
1. Visit a friend's profile
2. Click "Message [username]"
3. Opens real-time chat
4. Type and send messages

---

## 🐛 Troubleshooting

### Issue: "Cannot connect to MongoDB"

**Solution:**
```bash
# Check if MongoDB is running
mongosh

# If not, start it:
net start MongoDB  # Windows
brew services start mongodb-community  # Mac
sudo systemctl start mongod  # Linux
```

### Issue: "GitHub OAuth not working"

**Solution:**
- Verify callback URL is exactly: `http://localhost:3000/api/auth/callback/github`
- Check GITHUB_ID and GITHUB_SECRET in `.env.local`
- Restart the dev server after changing `.env.local`

### Issue: "AI caption generation fails"

**Solution:**
- Verify OPENAI_API_KEY is correct
- Check you have credits in your OpenAI account
- Check browser console for errors

### Issue: "Port 3000 already in use"

**Solution:**
```bash
# Find and kill the process
netstat -ano | findstr :3000  # Windows
lsof -ti:3000 | xargs kill  # Mac/Linux

# Or use a different port
PORT=3001 npm run dev
```

### Issue: "Module not found" errors

**Solution:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue: "Socket.IO not connecting"

**Solution:**
- Make sure you're using `npm run dev` or `node server.cjs`
- Don't use `next dev` (doesn't include Socket.IO)
- Check browser console for WebSocket errors

---

## 📁 Project Structure

```
teengram/
├── .env.local          ← Your environment variables (create this)
├── server.cjs          ← Custom server with Socket.IO
├── package.json        ← Dependencies and scripts
├── app/                ← Next.js pages and components
├── models/             ← MongoDB schemas
├── actions/            ← Server actions
└── public/             ← Static assets
```

---

## 🔧 Available Scripts

```bash
# Development server (with Socket.IO)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

---

## 🌟 First-Time Setup Checklist

- [ ] Node.js installed
- [ ] MongoDB installed and running
- [ ] Dependencies installed (`npm install`)
- [ ] GitHub OAuth app created
- [ ] `.env.local` file created with all values
- [ ] OpenAI API key added (optional)
- [ ] Dev server started (`npm run dev`)
- [ ] Accessed http://localhost:3000
- [ ] Logged in with GitHub
- [ ] Profile created successfully

---

## 🎓 Next Steps

After successful setup:

1. **Explore Features:**
   - Update your profile
   - Create posts with AI captions
   - Find and add friends
   - Start chatting in real-time

2. **Customize:**
   - Modify components in `app/Components/`
   - Update styles in `app/globals.css`
   - Add new features

3. **Deploy:**
   - See `DEPLOYMENT_GUIDE.md` (if available)
   - Consider Railway, Render, or DigitalOcean
   - Cannot use Vercel (custom server required)

---

## 📞 Need Help?

- Check the main documentation: `PROJECT_ANALYSIS.md`
- Review architecture: `ARCHITECTURE.md`
- Quick reference: `QUICK_REFERENCE.md`

---

## 🔐 Security Notes

- **Never commit `.env.local`** to Git (already in `.gitignore`)
- Keep your API keys secret
- Use strong NEXTAUTH_SECRET in production
- Enable 2FA on your GitHub account

---

## ✅ Success Indicators

You'll know everything is working when:

1. ✅ Server starts without errors
2. ✅ MongoDB connection successful (check console)
3. ✅ Can access http://localhost:3000
4. ✅ GitHub login works
5. ✅ Profile page loads with your data
6. ✅ Can create posts
7. ✅ Real-time chat works
8. ✅ No errors in browser console

---

**Happy Coding! 🚀**

*Last Updated: February 6, 2026*
