import mongoose from "mongoose";

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDb = async () => {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false, // Disable Mongoose buffering
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of hanging
        };

        cached.promise = mongoose.connect(process.env.MONGODB_URI || `mongodb://localhost:27017/teengram`, opts).then((mongoose) => {
            console.log("MongoDb connected: " + mongoose.connection.host);
            return mongoose;
        });
    }
    
    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        console.error("MongoDb connection error:", e.message);
        throw new Error("Database connection failed");
    }

    return cached.conn;
}

export default connectDb;