import mongoose from "mongoose";
const { Schema, model } = mongoose;

const MomentSchema = new Schema({
    user_id: { type: String, required: true },
    user_name: { type: String },
    profilepic: { type: String },
    mediaUrl: { type: String, required: true }, // base64 string or url
    mediaType: { type: String, required: true }, // 'image' or 'video'
    caption: { type: String },
    viewers: [{
        user_id: { type: String },
        username: { type: String },
        profilepic: { type: String },
        viewedAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now, expires: 86400 }, // TTL index: auto delete after 24 hours (86400 seconds)
});

// Delete existing model to force schema refresh (Dev Only Fix)
if (mongoose.models.Moment) {
    delete mongoose.models.Moment;
}

export default mongoose.models.Moment || model("Moment", MomentSchema);
