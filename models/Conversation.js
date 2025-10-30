import mongoose from "mongoose";
const { Schema, model } = mongoose;

const ConversationSchema = new Schema({
    participants: [{
        type: Schema.Types.ObjectId,
        ref: "User", // Links to existing User model
        required: true,},],
    
    isGroup: { type: Boolean,  default: false,}, 
    name: {type: String,trim: true, // Name of the group (optional for 1-on-1 chats),
        }, 
    admin: { 
        type: Schema.Types.ObjectId, 
        ref: "User", 
        // ID of the group creator/admin
    },
    adminOnly: {
        type: Boolean,
        default: false,
        // If true, only the 'admin' user can send messages
    },
    // Efficiency/Display Fields
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: "Message",
    },
  },
  {
    timestamps: true, // Creates 'createdAt' and 'updatedAt' for sorting
  }
);

export default mongoose.models.Conversation ||
  model("Conversation", ConversationSchema);