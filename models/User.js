import mongoose from "mongoose";
const { Schema, model } = mongoose;

const UserSchema = new Schema({
    email: { type: String, required: true, unique: true }, // Added unique constraint
    name: { type: String },
    username: { type: String, required: true, unique: true }, // Added unique constraint
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    age: { type: Number },
    profilepic: { type: String, default: "https://placehold.co/600x400/png" },
    bio: { type: String, maxLength: 150, default: "Hey there! I am using TeenGram." },
    about: { type: String, maxLength: 500 },
    interests: { type: String, maxLength: 200 },
    institute_name: { type: String }, 
    university: { type: String },    
    
    // Verification System Fields
    role: { type: String, enum: ['SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN', 'USER'], default: 'USER' },
    status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
    password: { type: String },
    verification_code: { type: String },
    institution: { type: Schema.Types.ObjectId, ref: 'Institution' },
    academic_info: {
        type: { type: String, enum: ['School', 'College'] },
        standard_class: { type: String },
        course: { type: String },
        year: { type: String },
    },
    id_card_url: { type: String }, // Cloudinary URL
    id_card_file_id: { type: String }, // Cloudinary Public ID
    state: { type: String },
    rejection_reason: { type: String },
    verified_by: { type: Schema.Types.ObjectId, ref: 'User' } // Sub-admin
});
    
    export default mongoose.models.User || model("User",UserSchema)
