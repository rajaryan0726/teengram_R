"use server";

import connectDb from '../app/db/connectDb.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

// Helper to serialize Mongoose documents
const serializeDoc = (doc) => {
    if (!doc) return null;
    return JSON.parse(JSON.stringify(doc));
};

export const registerUser = async (formData) => {
    await connectDb();
    
    const data = Object.fromEntries(formData);
    
    // Check if email or username already exists
    const existingEmail = await User.findOne({ email: data.email }).lean();
    if (existingEmail) return { success: false, error: "Email already registered" };
    
    const existingUsername = await User.findOne({ username: data.username }).lean();
    if (existingUsername) return { success: false, error: "Username already taken" };
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    const userPayload = {
        name: data.name,
        username: data.username,
        password: hashedPassword,
        college_or_school_name: data.college_or_school_name,
        email: data.email,
        age: parseInt(data.age) || null,
        interests: data.interests || "",
        about: data.about || ""
    };

    await User.create(userPayload);
    
    return { success: true, message: "Registration successful. You can now login." };
};
