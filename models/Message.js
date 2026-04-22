import mongoose from "mongoose";
const { Schema, model } = mongoose;

const MessageSchema = new Schema({
    conversationId: {
      type: Schema.Types.ObjectId,ref: "Conversation",required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,ref: "User",required: true,
    },
    content: {
      type: String,
      required: false,
      trim: true,
      maxLength: 1000, 
    },
    mediaUrl: { type: String }, // Base64 or external URL
    mediaType: { type: String }, // 'image' or 'video'
    // Feature Field
    readBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        // Tracks read receipts for all participants
      },
    ],
    // Two-Way Deletion Tracker
    deletedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User"
      }
    ],
  },
  {
    timestamps: true, // Stores the message sending time (createdAt)
  }
);

export default mongoose.models.Message || model("Message", MessageSchema);