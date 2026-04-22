import mongoose from "mongoose";
const { Schema, model } = mongoose;

const CommunitySchema = new Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    tagline: { type: String },
    status: { type: String, enum: ['public', 'private'], default: 'public' },
    creator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    pending_requests: [{ type: Schema.Types.ObjectId, ref: 'User' }], 
    silent: { type: Boolean, default: false } 
}, { timestamps: true });

if (mongoose.models.Community) {
    delete mongoose.models.Community;
}

export default mongoose.models.Community || model("Community", CommunitySchema);
