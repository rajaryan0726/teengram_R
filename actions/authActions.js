"use server";

import connectDb from '../app/db/connectDb.js';
import User from '../models/User.js';
import VerificationCode from '../models/VerificationCode.js';
import SubAdmin from '../models/SubAdmin.js';
import Institution from '../models/Institution.js';
import cloudinary from '../lib/cloudinary.js';
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
    let isPendingStub = false;
    if (existingEmail) {
        if (existingEmail.status === 'pending' && !existingEmail.password) {
            // It's an incomplete Google-Auth stub. We can overwrite it with this full registration.
            isPendingStub = true;
        } else {
            return { success: false, error: "Email already registered" };
        }
    }
    
    const existingUsername = await User.findOne({ username: data.username }).lean();
    if (existingUsername) return { success: false, error: "Username already taken" };
    
    // Validate Verification Code
    const codeRecord = await VerificationCode.findOne({ 
        code: data.verification_code,
        is_active: true
    }).populate('institution').populate('sub_admin').lean();
    
    if (!codeRecord) return { success: false, error: "Invalid or inactive verification code" };
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);
    
    // Construct Academic Info
    const academic_info = {
        type: data.academic_type, // 'School' or 'College'
    };
    if (data.academic_type === 'School') {
        academic_info.standard_class = data.standard_class;
    } else {
        academic_info.course = data.course;
        academic_info.year = data.year;
    }
    
    // Process Cloudinary Upload if Base64 ID card is provided
    let uploaded_id_card_url = data.id_card_url || null;
    let uploaded_id_card_id = data.id_card_file_id || null;

    if (data.id_card_base64 && data.id_card_base64.startsWith('data:image')) {
        try {
            const uploadResponse = await cloudinary.uploader.upload(data.id_card_base64, {
                folder: 'teengram_ids'
            });
            uploaded_id_card_url = uploadResponse.secure_url;
            uploaded_id_card_id = uploadResponse.public_id;
        } catch (error) {
            console.error("Cloudinary upload failed", error);
            // Non-fatal if missing, or we can reject. Let's allow fallback.
        }
    }

    const userPayload = {
        email: data.email,
        username: data.username,
        name: data.name,
        password: hashedPassword,
        age: parseInt(data.age) || null,
        state: data.state,
        institute_name: data.institute_name,
        university: data.university_name,
        verification_code: data.verification_code,
        institution: codeRecord.institution._id,
        academic_info: academic_info,
        status: 'pending',
        role: 'USER',
        id_card_url: uploaded_id_card_url,           // Fixed
        id_card_file_id: uploaded_id_card_id         // Fixed
    };

    if (isPendingStub) {
        // Update the existing stub
        await User.findByIdAndUpdate(existingEmail._id, userPayload);
    } else {
        // Create new user with pending status
        await User.create(userPayload);
    }
    
    return { success: true, message: "Registration submitted successfully. Waiting for verification." };
};

export const validateVerificationCode = async (code, teacherName) => {
    await connectDb();
    
    if(!teacherName) return { success: false, error: "Teacher's name is required to verify the code." };

    const codeRecord = await VerificationCode.findOne({ 
        code: code,
        is_active: true
    }).populate('institution').populate('sub_admin').lean();
    
    if (!codeRecord) return { success: false, error: "Invalid verification code" };
    
    // Strict Match on Teacher's Name allowing case-insensitivity and trimming
    if (codeRecord.sub_admin && codeRecord.sub_admin.name.toLowerCase().trim() !== teacherName.toLowerCase().trim()) {
        return { success: false, error: "Verification Code does not match the provided Teacher's Name. Please check spelling." };
    }
    
    return { 
        success: true, 
        institutionId: codeRecord.institution._id.toString(),
        institutionName: codeRecord.institution.institution_name,
        subAdminId: codeRecord.sub_admin.toString()
    };
};
