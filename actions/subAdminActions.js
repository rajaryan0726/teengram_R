"use server";

import connectDb from '../app/db/connectDb.js';
import User from '../models/User.js';
import SubAdmin from '../models/SubAdmin.js';
import VerificationCode from '../models/VerificationCode.js';
import { sendNotificationEmail } from '../lib/email.js';

const serializeDoc = (doc) => doc ? JSON.parse(JSON.stringify(doc)) : null;

export const getPendingUsers = async (subAdminId) => {
    await connectDb();
    
    const codes = await VerificationCode.find({ sub_admin: subAdminId }).lean();
    const codeStrings = codes.map(c => c.code);
    
    const users = await User.find({ 
        status: 'pending',
        verification_code: { $in: codeStrings }
    }).lean();
    
    return users.map(serializeDoc);
};

export const getSubAdminData = async (userId) => {
    await connectDb();
    const sa = await SubAdmin.findOne({ user: userId }).lean();
    if(!sa) return null;
    const codeRec = await VerificationCode.findOne({ sub_admin: userId, is_active: true }).lean();
    return {
        ...serializeDoc(sa),
        verification_code: codeRec ? codeRec.code : null
    };
};

export const getVerifiedUsers = async (subAdminId) => {
    await connectDb();
    // Users verified by this specific sub admin
    const users = await User.find({ 
        status: 'verified',
        verified_by: subAdminId,
        role: 'USER'
    }).lean();
    
    return users.map(serializeDoc);
};

export const getRejectedUsers = async (subAdminId) => {
    await connectDb();
    const users = await User.find({ 
        status: 'rejected',
        verified_by: subAdminId,
        role: 'USER'
    }).lean();
    
    return users.map(serializeDoc);
};

export const verifyUser = async (userId, subAdminId) => {
    await connectDb();
    const user = await User.findByIdAndUpdate(userId, {
        status: 'verified',
        verified_by: subAdminId
    });
    
    if(user && user.email && !user.email.includes('.edu')) {
         await sendNotificationEmail(
            user.email,
            "TeenGram Account Verified",
            `<p>Hi ${user.name}, your account has been verified by your institution! Welcome to TeenGram.</p>`
        );
    }
    
    return { success: true };
};

export const rejectUser = async (userId, reason, subAdminId) => {
    await connectDb();
    const user = await User.findByIdAndUpdate(userId, {
        status: 'rejected',
        rejection_reason: reason,
        verified_by: subAdminId
    });
    
     if(user && user.email && !user.email.includes('.edu')) {
         await sendNotificationEmail(
            user.email,
            "TeenGram Account Verification Failed",
            `<p>Hi ${user.name}, your account verification was rejected.</p><p>Reason: ${reason}</p>`
        );
    }
    
    return { success: true };
};

export const deleteUser = async (userId) => {
    await connectDb();
    await User.findByIdAndDelete(userId);
    return { success: true };
};
