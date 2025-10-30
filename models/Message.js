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
      required: true,
      trim: true,
      maxLength: 1000, 
    },
    // Feature Field
    readBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        // Tracks read receipts for all participants
      },
    ],
  },
  {
    timestamps: true, // Stores the message sending time (createdAt)
  }
);

export default mongoose.models.Message || model("Message", MessageSchema);