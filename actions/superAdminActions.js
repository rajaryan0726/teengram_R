"use server";

import connectDb from '../app/db/connectDb.js';
import Institution from '../models/Institution.js';
import User from '../models/User.js';
import { sendNotificationEmail } from '../lib/email.js';

const serializeDoc = (doc) => doc ? JSON.parse(JSON.stringify(doc)) : null;

export const getPendingInstitutions = async () => {
    await connectDb();
    const insts = await Institution.find({ status: 'pending' }).populate('admin', 'email').lean();
    return insts.map(serializeDoc);
};

export const getVerifiedInstitutions = async () => {
    await connectDb();
    const insts = await Institution.find({ status: 'verified' }).populate('admin', 'email').lean();
    return insts.map(serializeDoc);
};

export const getRejectedInstitutions = async () => {
    await connectDb();
    const insts = await Institution.find({ status: 'rejected' }).populate('admin', 'email').lean();
    return insts.map(serializeDoc);
};

export const verifyInstitution = async (institutionId, superAdminId) => {
    await connectDb();
    
    const inst = await Institution.findByIdAndUpdate(institutionId, { 
        status: 'verified',
        verified_by: superAdminId
    }).populate('admin');
    
    if (!inst) return { success: false, error: "Institution not found" };
    
    // Upgrade Admin User Role
    await User.findByIdAndUpdate(inst.admin._id, { 
        role: 'ADMIN',
        status: 'verified' 
    });
    
    // Send email
    await sendNotificationEmail(
        inst.admin.email,
        "TeenGram Institution Verified",
        `<p>Congratulations! Your institution <b>${inst.institution_name}</b> has been verified. You can now access the Admin Panel.</p>`
    );
    
    return { success: true };
};

export const rejectInstitution = async (institutionId, reason, superAdminId) => {
    await connectDb();
    
    const inst = await Institution.findByIdAndUpdate(institutionId, { 
        status: 'rejected',
        rejection_reason: reason,
        verified_by: superAdminId
    }).populate('admin');
    
    if (!inst) return { success: false, error: "Institution not found" };
    
    await User.findByIdAndUpdate(inst.admin._id, { status: 'rejected' });
    
    // Send email
    await sendNotificationEmail(
        inst.admin.email,
        "TeenGram Institution Rejected",
        `<p>Your institution application for <b>${inst.institution_name}</b> was rejected.</p><p>Reason: ${reason}</p><p>You may re-apply after 24 hours.</p>`
    );
    
    return { success: true };
};

export const getInstitutionDetails = async (institutionId) => {
    await connectDb();
    const inst = await Institution.findById(institutionId).populate('admin', 'email name').lean();
    return serializeDoc(inst);
};
