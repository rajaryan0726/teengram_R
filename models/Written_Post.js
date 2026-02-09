import mongoose from "mongoose";
const { Schema, model } = mongoose;

const Written_PostSchema = new Schema({
    user_id: { type: String, required: true },
    caption: { type: String },
    content: { type: String, required: true },
    institute_name: { type: String },
    university_name: { type: String },
    user_name: { type: String },
    profilepic: { type: String },
    mediaUrl: { type: String }, // URL or Base64 string
    mediaType: { type: String }, // 'image' or 'video'
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },

})

// Delete existing model to force schema refresh (Dev Only Fix)
if (mongoose.models.Written_Post) {
    delete mongoose.models.Written_Post;
}

export default mongoose.models.Written_Post || model("Written_Post", Written_PostSchema)
