import mongoose from "mongoose";
const { Schema, model } = mongoose;

const NotificationSchema = new Schema({
    recipient_email: { type: String, required: true }, // Who gets the notification
    sender_email: { type: String, required: true },    // Who triggered it
    sender_username: { type: String },
    sender_profilepic: { type: String },
    type: { type: String, required: true, enum: ['like', 'comment', 'friend_request', 'follow', 'community_invite', 'community_join_request'] },
    postId: { type: String }, // Optional, for likes/comments
    communityId: { type: String }, // Optional, for community invites/requests
    communityName: { type: String }, // Optional, for UI rendering
    text: { type: String },   // Display text
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

// Delete existing model to force schema refresh (Dev Only Fix)
if (mongoose.models.Notification) {
    delete mongoose.models.Notification;
}

export default mongoose.models.Notification || model("Notification", NotificationSchema);
