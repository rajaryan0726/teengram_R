import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

const Written_PostSchema = new mongoose.Schema({
    user_id: { type: String, required: true },
    caption: { type: String },
    content: { type: String, required: true },
    mediaUrl: { type: String },
    mediaType: { type: String },
    createdAt: { type: Date, default: Date.now },
});

// Handle model compilation check
const Written_Post = mongoose.models.Written_Post || mongoose.model("Written_Post", Written_PostSchema);

async function checkPosts() {
    // Manually load .env.local
    try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        if (fs.existsSync(envPath)) {
            const envConfig = fs.readFileSync(envPath, 'utf8');
            for (const line of envConfig.split('\n')) {
                const parts = line.split('=');
                if (parts.length >= 2) {
                    const key = parts[0].trim();
                    const value = parts.slice(1).join('=').trim();
                    if (key && value && !key.startsWith('#')) {
                        process.env[key] = value;
                    }
                }
            }
        }
    } catch (e) {
        console.log("Could not read .env.local", e);
    }

    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error("MONGODB_URI is not defined in .env.local");
        process.exit(1);
    }

    try {
        await mongoose.connect(uri);
        console.log("Connected to DB");

        const posts = await Written_Post.find().sort({ createdAt: -1 }).limit(5).lean();

        console.log("Recent 5 Posts:");
        posts.forEach(p => {
            console.log(`ID: ${p._id}`);
            console.log(`Content: ${p.content}`);
            console.log(`Media Type: ${p.mediaType}`);
            console.log(`Media URL Length: ${p.mediaUrl ? p.mediaUrl.length : 'NULL'}`);
            console.log('---');
        });

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.disconnect();
    }
}

checkPosts();
