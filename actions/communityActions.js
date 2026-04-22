"use server";
import connectDb from "@/app/db/connectDb";
import User from "@/models/User";
import Community from "@/models/Community";
import CommunityMessage from "@/models/CommunityMessage";
import Notification from "@/models/Notification";
import mongoose from "mongoose";

const serializeDoc = (doc) => {
    if (!doc) return null;
    return JSON.parse(JSON.stringify(doc));
};

export const createCommunity = async (userId, data) => {
    await connectDb();
    
    // Validate word count for description
    const wordCount = data.description?.trim().split(/\s+/).length || 0;
    if (wordCount > 30) {
        return { success: false, error: "Description must be 30 words or less." };
    }

    const newCommunity = await Community.create({
        name: data.name,
        description: data.description,
        tagline: data.tagline,
        status: data.status || 'public',
        creator: userId,
        members: [userId], // Creator is automatically a member
        silent: false
    });

    return { success: true, community: serializeDoc(newCommunity) };
};

export const updateCommunity = async (communityId, creatorId, data) => {
    await connectDb();
    const wordCount = data.description?.trim().split(/\s+/).length || 0;
    if (wordCount > 30) {
        return { success: false, error: "Description must be 30 words or less." };
    }

    const c = await Community.findOneAndUpdate(
        { _id: communityId, creator: creatorId },
        { name: data.name, description: data.description, tagline: data.tagline, status: data.status },
        { new: true }
    ).lean();
    
    if (!c) return { success: false, error: "Unauthorized or not found" };
    return { success: true, community: serializeDoc(c) };
};

export const deleteCommunity = async (communityId, creatorId) => {
    await connectDb();
    const c = await Community.findOneAndDelete({ _id: communityId, creator: creatorId });
    if (!c) return { success: false, error: "Unauthorized or not found" };
    
    // Cleanup messages and notifications
    await CommunityMessage.deleteMany({ communityId });
    await Notification.deleteMany({ communityId });
    
    return { success: true };
};

export const getActiveCommunities = async (userId) => {
    await connectDb();
    const communities = await Community.find({ members: userId }).lean();
    return communities.map(serializeDoc);
};

export const getPublicCommunities = async (userId, query = "") => {
    await connectDb();
    const regex = new RegExp(query, 'i');
    const filter = {
        status: 'public',
        members: { $ne: userId } // Don't show communities I am already in
    };
    
    if (query) {
        filter.name = { $regex: regex };
    }
    
    const communities = await Community.find(filter).limit(20).lean();
    return communities.map(serializeDoc);
};

// Creator invites User
export const sendCommunityInvite = async (creatorEmail, recipientEmail, communityId) => {
    await connectDb();
    
    const sender = await User.findOne({ email: creatorEmail }).select('username profilepic _id').lean();
    const community = await Community.findOne({ _id: communityId, creator: sender._id }).lean();
    if (!community) return { success: false, error: "Not authorized or community not found" };

    const existingInvite = await Notification.findOne({
        recipient_email: recipientEmail,
        communityId: communityId,
        type: 'community_invite'
    });
    
    if (existingInvite) return { success: false, error: "Invite already sent" };

    await Notification.create({
        recipient_email: recipientEmail,
        sender_email: creatorEmail,
        sender_username: sender.username,
        sender_profilepic: sender.profilepic,
        type: 'community_invite',
        communityId: communityId.toString(),
        communityName: community.name,
        text: `invited you to join their private community "${community.name}"`
    });
    
    return { success: true };
};

// User requests to join Public Community
export const requestJoinCommunity = async (userId, userEmail, communityId) => {
    await connectDb();
    const user = await User.findOne({ email: userEmail }).select('username profilepic').lean();
    const community = await Community.findById(communityId).lean();
    if (!community || community.status !== 'public') return { success: false, error: "Not a public community" };
    
    if (community.pending_requests?.map(id => id.toString()).includes(userId.toString())) {
        return { success: false, error: "Request already sent" };
    }
    
    await Community.findByIdAndUpdate(communityId, { $addToSet: { pending_requests: userId } });
    
    const creator = await User.findById(community.creator).lean();
    
    await Notification.create({
        recipient_email: creator.email,
        sender_email: userEmail,
        sender_username: user.username,
        sender_profilepic: user.profilepic,
        type: 'community_join_request',
        communityId: communityId.toString(),
        communityName: community.name,
        text: `requested to join your community "${community.name}"`
    });
    
    return { success: true };
};

export const acceptCommunityRequest = async (creatorId, requestingUserEmail, communityId) => {
    await connectDb();
    const reqUser = await User.findOne({ email: requestingUserEmail }).select('_id').lean();
    if (!reqUser) return { success: false };
    
    const community = await Community.findOneAndUpdate(
        { _id: communityId, creator: creatorId },
        { 
            $addToSet: { members: reqUser._id },
            $pull: { pending_requests: reqUser._id }
        },
        { new: true }
    );
    
    if (!community) return { success: false, error: "Unauthorized" };
    
    await Notification.deleteOne({ type: 'community_join_request', sender_email: requestingUserEmail, communityId });
    return { success: true };
};

export const rejectCommunityRequest = async (creatorId, requestingUserEmail, communityId) => {
    await connectDb();
    const reqUser = await User.findOne({ email: requestingUserEmail }).select('_id').lean();
    if (reqUser) {
        await Community.findOneAndUpdate(
            { _id: communityId, creator: creatorId },
            { $pull: { pending_requests: reqUser._id } }
        );
    }
    await Notification.deleteOne({ type: 'community_join_request', sender_email: requestingUserEmail, communityId });
    return { success: true };
};

export const joinInvitedCommunity = async (userId, communityId) => {
    await connectDb();
    const community = await Community.findByIdAndUpdate(
        communityId,
        { $addToSet: { members: userId } },
        { new: true }
    );
    
    if (!community) return { success: false };
    
    const user = await User.findById(userId).lean();
    await Notification.deleteOne({ type: 'community_invite', recipient_email: user.email, communityId });
    return { success: true };
};

export const removeCommunityMember = async (adminId, memberId, communityId) => {
    await connectDb();
    // Cannot remove the creator
    const c = await Community.findOneAndUpdate(
        { _id: communityId, creator: adminId },
        { $pull: { members: memberId } },
        { new: true }
    );
    if (!c) return { success: false, error: "Unauthorized" };
    return { success: true };
};

export const leaveCommunity = async (userId, communityId) => {
    await connectDb();
    const c = await Community.findOne({ _id: communityId }).lean();
    if (c.creator.toString() === userId.toString()) {
        return { success: false, error: "Creator cannot leave the community, you must delete it." };
    }
    
    await Community.findByIdAndUpdate(communityId, { $pull: { members: userId } });
    return { success: true };
};

export const toggleSilentMode = async (creatorId, communityId, silent) => {
    await connectDb();
    const c = await Community.findOneAndUpdate(
        { _id: communityId, creator: creatorId },
        { silent: silent },
        { new: true }
    ).lean();
    if (!c) return { success: false, error: "Unauthorized" };
    return { success: true, silent: c.silent };
};

export const fetchCommunityDetails = async (communityId) => {
    await connectDb();
    const c = await Community.findById(communityId)
        .populate('creator', 'name username profilepic email')
        .populate('members', 'name username profilepic email')
        .populate('pending_requests', 'name username profilepic email')
        .lean();
    return serializeDoc(c);
};

export const fetchCommunityMessages = async (communityId) => {
    await connectDb();
    const messages = await CommunityMessage.find({ communityId }).sort({ createdAt: 1 }).lean();
    return messages.map(serializeDoc);
};

export const sendCommunityMessage = async (userId, communityId, content, mediaUrl = '', mediaType = '') => {
    await connectDb();
    const community = await Community.findById(communityId).lean();
    if (!community) return { success: false, error: "Community not found" };
    
    if (community.silent && community.creator.toString() !== userId.toString()) {
        return { success: false, error: "The community is currently silent. Only the creator can send messages." };
    }
    
    const sender = await User.findById(userId).select('name username profilepic').lean();
    
    const msg = await CommunityMessage.create({
        communityId,
        sender: {
            _id: sender._id,
            name: sender.name,
            username: sender.username,
            profilepic: sender.profilepic
        },
        content: content || '',
        mediaUrl: mediaUrl,
        mediaType: mediaType,
        readBy: [userId]
    });
    
    return { success: true, message: serializeDoc(msg) };
};
