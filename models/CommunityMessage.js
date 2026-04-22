import mongoose from "mongoose";
const { Schema, model } = mongoose;

const CommunityMessageSchema = new Schema({
    communityId: { type: Schema.Types.ObjectId, ref: "Community", required: true },
    sender: {
        _id: { type: Schema.Types.ObjectId, ref: "User", required: true },
        name: { type: String, required: true },
        username: { type: String, required: true },
        profilepic: { type: String }
    },
    content: { type: String, required: false },
    mediaUrl: { type: String }, // Base64 or external URL
    mediaType: { type: String }, // 'image' or 'video'
    readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
}, { timestamps: true });

if (mongoose.models.CommunityMessage) {
    delete mongoose.models.CommunityMessage;
}

export default mongoose.models.CommunityMessage || model("CommunityMessage", CommunityMessageSchema);
