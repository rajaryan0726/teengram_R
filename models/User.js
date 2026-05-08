import mongoose from "mongoose";
const { Schema, model } = mongoose;

const UserSchema = new Schema({
    email: { type: String, required: true, unique: true },
    name: { type: String },
    username: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    age: { type: Number },
    profilepic: { type: String, default: "https://placehold.co/600x400/png" },
    bio: { type: String, maxLength: 150, default: "Hey there! I am using TeenGram." },
    about: { type: String, maxLength: 500 },
    interests: { type: String, maxLength: 200 },
    college_or_school_name: { type: String },
    password: { type: String }
});
    
export default mongoose.models.User || model("User",UserSchema)
