"use server";

import connectDb from '../app/db/connectDb.js';
import User from '../models/User.js';
import Institution from '../models/Institution.js';
import SubAdmin from '../models/SubAdmin.js';
import VerificationCode from '../models/VerificationCode.js';
import { generateVerificationCode } from '../lib/generateCode.js';
import { sendNotificationEmail } from '../lib/email.js';
import cloudinary from '../lib/cloudinary.js';
import bcrypt from 'bcryptjs';

const serializeDoc = (doc) => doc ? JSON.parse(JSON.stringify(doc)) : null;

export const registerInstitution = async (data, adminEmail) => {
    await connectDb();
    
    // Check if user already exists
    let adminUser = await User.findOne({ email: adminEmail });
    if (!adminUser) {
        // Create the user if coming from Google Auth for the first time
        adminUser = await User.create({
            email: adminEmail,
            username: `admin_${Date.now()}`,
            name: data.representative.name,
            role: 'USER', // Will be upgraded to ADMIN upon verification
            status: 'pending'
        });
    }

    // Check if user already registered an institution
    const existingInst = await Institution.findOne({ admin: adminUser._id });
    if (existingInst) return { success: false, error: "You have already registered an institution." };
    
    // Process base64 strings to actual cloudinary uploads
    let uploadedMandatory = [];
    if (data.mandatory_documents && data.mandatory_documents.length > 0) {
        for (let docObj of data.mandatory_documents) {
            const base64String = typeof docObj === 'string' ? docObj : docObj?.data;
            if (base64String && typeof base64String === 'string' && base64String.startsWith('data:')) {
                try {
                    const res = await cloudinary.uploader.upload(base64String, { folder: 'teengram_institutions' });
                    uploadedMandatory.push({ name: docObj.name || 'Mandatory', file_url: res.secure_url, file_id: res.public_id });
                } catch (err) {
                    console.error("Cloudinary upload failed for mandatory document", err);
                }
            } else if (docObj && docObj.file_url) {
                uploadedMandatory.push(docObj);
            }
        }
    }
    
    let uploadedSupporting = [];
    if (data.supporting_documents && data.supporting_documents.length > 0) {
        for (let docObj of data.supporting_documents) {
            const base64String = typeof docObj === 'string' ? docObj : docObj?.data;
            if (base64String && typeof base64String === 'string' && base64String.startsWith('data:')) {
                try {
                    const res = await cloudinary.uploader.upload(base64String, { folder: 'teengram_institutions' });
                    uploadedSupporting.push({ name: docObj.name || 'Supporting', file_url: res.secure_url, file_id: res.public_id });
                } catch (err) {
                    console.error("Cloudinary upload failed for supporting document", err);
                }
            } else if (docObj && docObj.file_url) {
                uploadedSupporting.push(docObj);
            }
        }
    }

    // Create Institution
    const newInst = await Institution.create({
        ...data,
        mandatory_documents: uploadedMandatory,
        supporting_documents: uploadedSupporting,
        admin: adminUser._id,
        status: 'pending'
    });
    
    // Update User's institution reference
    await User.findByIdAndUpdate(adminUser._id, { institution: newInst._id });
    
    // Send email to super admin about new registration
    await sendNotificationEmail(
        process.env.SUPER_ADMIN_EMAIL,
        "New Institution Registration Pending",
        `<p>A new institution <b>${data.institution_name}</b> has registered and is pending verification.</p>`
    );
    
    return { success: true, message: "Institution registration submitted. Waiting for verification within 12-24 hours." };
};

export const getAdminInstitution = async (userId) => {
    await connectDb();
    const inst = await Institution.findOne({ admin: userId }).lean();
    return serializeDoc(inst);
};

export const createSubAdmin = async (data, institutionId, adminUserId) => {
    await connectDb();
    
    const existingUsername = await User.findOne({ username: data.username }).lean();
    if (existingUsername) return { success: false, error: "Username already exists. Choose another." };

    const existingEmail = await User.findOne({ email: data.email }).lean();
    if (existingEmail) return { success: false, error: "Email already registered in the system. Use a strictly dedicated email." };
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);
    
    // Create User record for subadmin
    const newUser = await User.create({
        email: data.email.toLowerCase().trim(),
        username: data.username,
        name: data.name,
        password: hashedPassword,
        role: 'SUB_ADMIN',
        status: 'verified', // Sub-admins are verified by default
        institution: institutionId
    });
    
    // Create SubAdmin record linking user to institution
    const newSubAdmin = await SubAdmin.create({
        user: newUser._id,
        institution: institutionId,
        name: data.name,
        assigned_class_department: data.assigned_class_department,
        username: data.username,
        plain_password: data.password // Saving specifically for PDF exporting
    });
    
    // Generate Verification Code
    const inst = await Institution.findById(institutionId).lean();
    const code = generateVerificationCode(inst.institution_type);
    
    await VerificationCode.create({
        code: code,
        institution: institutionId,
        sub_admin: newUser._id,
        created_by: adminUserId
    });
    
    return { success: true, subAdmin: serializeDoc(newSubAdmin) };
};

export const getSubAdmins = async (institutionId) => {
    await connectDb();
    const subAdmins = await SubAdmin.find({ institution: institutionId }).populate('user', 'email status').lean();
    
    // Fetch codes for these subadmins
    const subAdminUserIds = subAdmins.map(sa => sa.user._id);
    const codes = await VerificationCode.find({ sub_admin: { $in: subAdminUserIds }, is_active: true }).lean();
    
    // Fetch verified users count
    const verifiedUsersList = await User.find({ 
        verified_by: { $in: subAdminUserIds }, 
        status: 'verified' 
    }).select('verified_by').lean();
    
    // Filter out any super-admin who might be mis-classified
    const filteredSubAdmins = subAdmins.filter(sa => sa.user?.role !== 'SUPER_ADMIN');

    return filteredSubAdmins.map(sa => {
        const codeRec = codes.find(c => c.sub_admin.toString() === sa.user._id.toString());
        const count = verifiedUsersList.filter(u => u.verified_by.toString() === sa.user._id.toString()).length;
        
        return {
            ...serializeDoc(sa),
            verification_code: codeRec ? codeRec.code : null,
            verified_users_count: count
        };
    });
};

export const getVerifiedUsersBySubAdmin = async (subAdminUserId) => {
    await connectDb();
    const users = await User.find({
        verified_by: subAdminUserId,
        status: 'verified'
    }).select('name username email').lean();
    return users.map(serializeDoc);
};

export const deleteSubAdmin = async (subAdminId) => {
    await connectDb();
    const sa = await SubAdmin.findById(subAdminId).lean();
    if(!sa) return { success: false };
    
    // Delete Subadmin record
    await SubAdmin.findByIdAndDelete(subAdminId);
    
    // Disable active codes for this subadmin
    await VerificationCode.updateMany(
        { sub_admin: sa.user, is_active: true },
        { is_active: false }
    );
    
    // Soft delete the user or leave them without role
    await User.findByIdAndUpdate(sa.user, { role: 'USER', status: 'rejected' });
    
    return { success: true };
};

export const updateSubAdmin = async (subAdminId, data) => {
    await connectDb();
    const sa = await SubAdmin.findById(subAdminId).populate('user');
    if(!sa) return { success: false, error: "SubAdmin not found" };
    
    if (data.username !== sa.username) {
        const existing = await User.findOne({ username: data.username }).lean();
        if (existing) return { success: false, error: "Username already in use." };
    }

    if (data.email && data.email !== sa.user.email) {
        const existingE = await User.findOne({ email: data.email }).lean();
        if (existingE) return { success: false, error: "Email already registered in the system." };
    }
    
    sa.name = data.name;
    sa.username = data.username;
    sa.assigned_class_department = data.assigned_class_department;

    const user = await User.findById(sa.user._id);
    if(user) {
        user.name = data.name;
        user.username = data.username;
        if(data.email) user.email = data.email.toLowerCase().trim();
        
        if (data.password && data.password.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(data.password, salt);
            sa.plain_password = data.password;
        }
        await user.save();
    }
    
    await sa.save();
    return { success: true };
};
