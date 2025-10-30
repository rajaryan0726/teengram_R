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
    institute_name: { type: String }, 
    university: { type: String },    
    verified:{type:Boolean},
});
    
    export default mongoose.models.User || model("User",UserSchema)
