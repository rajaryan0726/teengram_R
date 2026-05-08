"use server"

import connectDb from '../app/db/connectDb.js'
import User from '../models/User.js'
import Friends from '../models/Friends.js'
import mongoose from 'mongoose'
import Conversation from '../models/Conversation.js'
import Message from '../models/Message.js'
import Written_Post from '../models/Written_Post.js'
import Moment from '../models/Moment.js'
import Event from '../models/Event.js'
import { getRedisClient } from '../lib/redis.js'

// Helper to serialize Mongoose documents
// Helper to serialize Mongoose documents (deeply)
const serializeDoc = (doc) => {
    if (!doc) return null;
    return JSON.parse(JSON.stringify(doc));
};

export const getUserIdByEmail = async (email) => {
    await connectDb();
    try {
        const user = await User.findOne({ email }).select('_id').lean();
        return user ? user._id.toString() : null;
    } catch (error) {
        console.error("Error finding user by email:", error);
        return null;
    }
};


export const fetchuser = async (email) => {
    await connectDb()
    console.log("connected to db for:", email);
    let u = await User.findOne({ email: email }).lean();
    return serializeDoc(u);
}


export const updateProfile = async (data, oldusername) => {
    await connectDb()
    let ndata = Object.fromEntries(data)
    console.log("Updating profile for", oldusername)
    console.log("Data contains", ndata);

    if (oldusername == ndata.username) {
        //checking if the username is not taken already
        let u = await User.findOne({ username: ndata.username }).lean();
        console.log("profile updating for user different username");

        if (u) {
            return { error: "Username Already taken just like your ex" }
        }
        //update the rest of the information
        await User.updateOne({ email: ndata.email }, ndata)
        console.log("Here is the email we use", ndata.email);
    }
    if (oldusername != ndata.username) {
        //if the username not changed simply change the rest
        console.log("profile updating with same username")
        await User.updateOne({ email: ndata.email }, ndata)
    }
}

// function to find other user - ORIGINAL (Keep for backward compatibility if needed)
export const fetchotheruser = async (email) => {
    await connectDb();
    console.log("fetching all the users");
    let users = await User.find({ 
        email: { $ne: email },
        role: { $nin: ['SUPER_ADMIN', 'HEAD_ADMIN', 'ADMIN', 'SUB_ADMIN'] }
    }).lean();
    return users.map(user => serializeDoc(user));
}

// NEW: Search Users by Name or Username
export const searchUsersAction = async (query, currentUserEmail) => {
    await connectDb();
    if (!query) return [];

    console.log("Searching users for query:", query);
    const regex = new RegExp(query, 'i'); // Case-insensitive regex

    try {
        const users = await User.find({
            $and: [
                { email: { $ne: currentUserEmail } }, // Exclude current user
                {
                    $or: [
                        { username: { $regex: regex } },
                        { name: { $regex: regex } },
                        { email: { $regex: regex } }
                    ]
                }
            ]
        }).limit(20).lean(); // Limit results for performance

        // Convert _id to string for serialization
        return users.map(user => serializeDoc(user));
    } catch (error) {
        console.error("Error searching users:", error);
        return [];
    }
}

//function to make friend first other function to accept frienship
export const makefriend = async (sender_email, reciever_email, sender_profilepic) => {
    await connectDb();
    console.log("making friendship between you and your");

    const existing = await Friends.findOne({
        sender_email: sender_email,
        reciever_email: reciever_email
    }).lean();

    if (existing) {
        console.log("Friend request already exists");
        return { success: false, error: "Already requested or following" };
    }

    const newfriends = await Friends.create({
        sender_email: sender_email,
        reciever_email: reciever_email,
        sender_profilepic: sender_profilepic,
    })
    return { success: true };
}

export const followUserById = async (sender_email, receiver_id, sender_profilepic) => {
    await connectDb();
    const receiver = await User.findById(receiver_id).select('email').lean();
    if (receiver) {
        const existing = await Friends.findOne({
            sender_email: sender_email,
            reciever_email: receiver.email
        }).lean();

        if (existing) {
            return { success: false, error: "Already requested or following" };
        }

        await Friends.create({
            sender_email: sender_email,
            reciever_email: receiver.email,
            sender_profilepic: sender_profilepic,
        });
        return { success: true };
    }
    return { success: false, error: "User not found" };
}

//function to check if the your request is accepted or not 
export const checkfriendstatus = async (useremail, friendemail) => {
    await connectDb()
    console.log("checking the friend status");
    let s = await Friends.findOne({
        sender_email: useremail,
        reciever_email: friendemail,
    }).lean();

    return serializeDoc(s) || false;
}

//function to check if you have accepted the request or not
export const checkuserrequeststatus = async (useremail, friendemail) => {
    await connectDb();
    console.log("checking if you have accepted the request or not");
    let s = await Friends.findOne({
        reciever_email: useremail,
        sender_email: friendemail,
    }).lean();

    return serializeDoc(s) || false;
}

// function to find all the friend request for the user (RECEIVED)
export const fetchfriendrequest = async (useremail) => {
    await connectDb();
    console.log("fetching all the request pending for the user to make friends");

    // 1. Get pending requests
    let u = await Friends.find({ reciever_email: useremail, request_accepted: { $ne: true } }).lean();

    // 2. Extract sender emails
    const emails = u.map(doc => doc.sender_email);

    // 3. Fetch User details
    const users = await User.find({ email: { $in: emails } })
        .select('email username name profilepic')
        .lean();

    // 4. Map and enrich
    return u.map(req => {
        const userDetails = users.find(user => user.email === req.sender_email);
        return {
            ...serializeDoc(req),
            sender_username: userDetails?.username || req.sender_email.split('@')[0],
            sender_name: userDetails?.name,
            sender_profilepic: userDetails?.profilepic || req.sender_profilepic
        };
    });
}

// NEW: Fetch requests SENT by the user
export const fetchSentFriendRequestsAction = async (useremail) => {
    await connectDb();
    console.log("fetching requests sent by user", useremail);
    // Find all documents where I am the sender
    let sent = await Friends.find({ sender_email: useremail }).lean();
    // Convert _id to string
    return sent.map(req => serializeDoc(req));
}

//function to accept the request
export const accept_request = async (id) => {
    await connectDb();
    console.log("In the process to accept the friend request for id", id);
    //query to find user and update accepted_request to true for it

    let u = await Friends.updateOne(
        { _id: id },
        { $set: { request_accepted: true } }
    )
    return { success: true };
}


// NEW: Fetch "Following" (People I sent requests to AND were accepted)
export const fetchFollowingAction = async (useremail) => {
    await connectDb();
    console.log("finding the ones you follow (you sent request & accepted)", useremail);

    // 1. Get the relationships
    let f = await Friends.find({
        sender_email: useremail,
        request_accepted: true,
    }).lean();

    // 2. Extract emails of the people I follow (receivers)
    const emails = f.map(doc => doc.reciever_email);

    // 3. Fetch User details for these emails
    const users = await User.find({ email: { $in: emails } })
        .select('email username name profilepic')
        .lean();

    // 4. Clean up orphans and map valid ones
    const validFriends = [];
    const orphanedIds = [];

    for (const doc of f) {
        const userDetails = users.find(u => u.email === doc.reciever_email);
        if (userDetails) {
            validFriends.push({
                ...serializeDoc(doc),
                sender_username: userDetails.username,
                sender_name: userDetails.name,
                sender_profilepic: userDetails.profilepic
            });
        } else {
            orphanedIds.push(doc._id);
        }
    }

    if (orphanedIds.length > 0) {
        await Friends.deleteMany({ _id: { $in: orphanedIds } });
    }

    return validFriends;
}

// NEW: Fetch "Followers" (People who sent requests to me AND I accepted)
export const fetchFollowersAction = async (useremail) => {
    await connectDb();
    console.log("finding your followers (they sent request & accepted)", useremail);

    // 1. Get the relationships
    let f = await Friends.find({
        reciever_email: useremail,
        request_accepted: true,
    }).lean();

    // 2. Extract emails of my followers (senders)
    const emails = f.map(doc => doc.sender_email);

    // 3. Fetch User details
    const users = await User.find({ email: { $in: emails } })
        .select('email username name profilepic')
        .lean();

    const validFollowers = [];
    const orphanedIds = [];

    for (const doc of f) {
        const userDetails = users.find(u => u.email === doc.sender_email);
        if (userDetails) {
            validFollowers.push({
                ...serializeDoc(doc),
                sender_username: userDetails.username,
                sender_name: userDetails.name,
                sender_profilepic: userDetails.profilepic
            });
        } else {
            orphanedIds.push(doc._id);
        }
    }

    if (orphanedIds.length > 0) {
        await Friends.deleteMany({ _id: { $in: orphanedIds } });
    }

    return validFollowers;
}

//Upload wriiten_post
export const upload_written_post = async (data, user_id, institute_name, university, profilepic, user_name, mediaUrl, mediaType) => {
    await connectDb();
    const fs = require('fs');
    try {
        fs.appendFileSync('server_debug.log', `${new Date().toISOString()} - Uploading post. UserID: ${user_id}, MediaType: ${mediaType}, MediaUrlLength: ${mediaUrl ? mediaUrl.length : 'null'}\n`);
    } catch (e) { console.error("Log error", e); }

    let ndata = Object.fromEntries(data)
    console.log("uploading thought for user_id", user_id);
    console.log("Media Data Types:", { mediaType, hasUrl: !!mediaUrl });

    const newpost = await Written_Post.create({
        user_id: user_id,
        caption: ndata.caption,
        content: ndata.content,
        institute_name: institute_name,
        university_name: university,
        profilepic: profilepic,
        user_name: user_name,
        mediaUrl: mediaUrl, // Use argument
        mediaType: mediaType, // Use argument
    })
    if (newpost) {
        return true
    }
    return false
}

// Delete a post by its ID (only the owner can delete)
export const deletePost = async (postId, userId) => {
    await connectDb();
    try {
        const post = await Written_Post.findById(postId);
        if (!post) return { success: false, message: "Post not found." };
        if (post.user_id !== userId) return { success: false, message: "Unauthorized." };

        await Written_Post.findByIdAndDelete(postId);
        return { success: true, message: "Post deleted successfully." };
    } catch (err) {
        console.error("Error deleting post:", err);
        return { success: false, message: "Failed to delete post." };
    }
}

//fetch the writtenpost for the user
export const fetchpost = async (user_id) => {
    await connectDb();
    console.log("fetching the post for the user", user_id);
    let p = await Written_Post.find({ user_id: user_id }).lean();
    console.log(p);

    return p.map(doc => serializeDoc(doc));
}


export const checkUnreadMessages = async (userId) => {
    await connectDb();
    
    // 1. Get all conversations the user is a part of
    const userConversations = await Conversation.find({
        participants: userId
    }).select('_id').lean();
    
    const conversationIds = userConversations.map(c => c._id);
    
    if (conversationIds.length === 0) return false;

    // 2. Count unread messages strictly in these specific conversations
    const count = await Message.countDocuments({
        conversationId: { $in: conversationIds },
        sender: { $ne: userId },
        readBy: { $nin: [userId] },
        deletedBy: { $ne: userId } 
    });
    
    return count > 0;
};

//Retrieves all conversations a user is part of, with key related data populated.
// NOTE: Deep population needs careful serialization if using .lean() with complex types
export const getConversationsForUser = async (userId) => {
    try {
        const conversations = await Conversation.find({
            participants: userId,
        })
            .sort({ updatedAt: -1 }) // Sort by recent activity (most useful for chat list)
            .populate({
                path: 'lastMessage',
                model: 'Message',
                select: 'content sender createdAt readBy', // Added readBy for frontend unread calculation
            })
            .populate({
                path: 'participants',
                model: 'User',
                select: 'name username profilepic', // Get participant details
            })
            .lean() // Returns plain JavaScript objects for efficiency
            .exec();

        // Fetch unread count for each conversation
        const convsWithUnread = await Promise.all(conversations.map(async (chat) => {
            const unreadCount = await Message.countDocuments({
                conversationId: chat._id,
                sender: { $ne: userId },
                readBy: { $nin: [userId] }
            });

            const { _id, lastMessage, participants, ...rest } = chat;
            return {
                ...rest,
                _id: _id.toString(),
                unreadCount: unreadCount,
                lastMessage: lastMessage ? {
                    ...lastMessage,
                    _id: lastMessage._id.toString(),
                    sender: lastMessage.sender ? lastMessage.sender.toString() : null, // or populate sender?
                    readBy: lastMessage.readBy ? lastMessage.readBy.map(id => id.toString()) : []
                } : null,
                participants: participants.map(p => ({
                    ...p,
                    _id: p._id.toString()
                }))
            };
        }));

        return convsWithUnread;

    } catch (error) {
        console.error("Error fetching conversations:", error);
        throw new Error("Could not retrieve conversation list.");
    }
};


export const getMessagesForConversation = async (conversationId, userId) => {
    try {
        const client = await getRedisClient();
        const cacheKey = `chat:messages:${conversationId}`;

        // 1. Try to fetch from Redis Cache
        const cachedMessages = await client.get(cacheKey);

        // --- CRUD OPERATION: Mark as Read (Best done on the server) ---
        // Do this asynchronously to not block the fast read
        Message.updateMany(
            {
                conversationId: conversationId,
                sender: { $ne: userId },
                readBy: { $nin: [userId] }
            },
            {
                $addToSet: { readBy: userId }
            }
        ).catch(err => console.error("Error updating read status:", err));

        if (cachedMessages) {
            console.log(`[Redis] Cache Hit for messages: ${cacheKey}`);
            const parsed = JSON.parse(cachedMessages);
            return parsed.filter(msg => !(msg.deletedBy && msg.deletedBy.includes(userId)));
        }

        console.log(`[Redis] Cache Miss for messages: ${cacheKey}, fetching from MongoDB`);

        // --- CRUD OPERATION: Retrieve Messages ---
        const messages = await Message.find({ 
            conversationId: conversationId,
            deletedBy: { $ne: userId }
        })
            .sort({ createdAt: 1 }) // Retrieve in chronological order
            .populate('sender', 'name username profilepic') // Get sender details
            .lean() // Returns plain JavaScript objects
            .exec();

        // Return the clean array for frontend processing
        const formattedMessages = messages.map(msg => ({
            ...msg,
            _id: msg._id.toString(),
            conversationId: msg.conversationId.toString(),
            sender: msg.sender ? {
                ...msg.sender,
                _id: msg.sender._id.toString()
            } : null,
            readBy: msg.readBy ? msg.readBy.map(id => id.toString()) : []
        }));

        // Store fetched messages in Redis and expire after 1 hour (3600 seconds)
        await client.setEx(cacheKey, 3600, JSON.stringify(formattedMessages));

        return formattedMessages;

    } catch (error) {
        console.error("Error fetching message history:", error);
        throw new Error("Could not retrieve message history.");
    }
};


export const saveMessageAndGetDetails = async (senderId, recipientOrConversationId, content, mediaUrl = '', mediaType = '') => {
    await connectDb();

    // 1. Prepare ObjectIds
    const sender = new mongoose.Types.ObjectId(senderId);
    let conversationId;
    let conversation;

    // --- LOGIC TO FIND OR CREATE CONVERSATION ---
    if (recipientOrConversationId.length === 24) { 
        conversation = await Conversation.findById(recipientOrConversationId).lean();
    }

    if (!conversation) {
        const recipient = new mongoose.Types.ObjectId(recipientOrConversationId);
        conversation = await Conversation.findOne({
            isGroup: false,
            participants: { $all: [sender, recipient] }
        }).lean();

        if (!conversation) {
            conversation = await Conversation.create({
                participants: [sender, recipient],
                isGroup: false,
            });
        }
    }

    if (!conversation) {
        throw new Error("Invalid conversation or recipient ID.");
    }

    conversationId = conversation._id;

    // 🚨 2. ADMIN-ONLY MESSAGE CHECK 
    if (conversation.adminOnly && conversation.admin && conversation.admin.toString() !== senderId) {
        throw new Error("Unauthorized: Only the conversation admin can send messages.");
    }

    // 3. Prepare the new Message immediately in-memory for blazingly fast response
    const messageId = new mongoose.Types.ObjectId();
    const now = new Date();

    // Fetch Sender Info minimally
    const senderInfo = await User.findById(senderId).select('name username profilepic').lean();

    const formattedMessage = {
        _id: messageId.toString(),
        conversationId: conversationId.toString(),
        content: content,
        sender: {
            _id: senderInfo._id.toString(),
            name: senderInfo.name,
            username: senderInfo.username,
            profilepic: senderInfo.profilepic
        },
        mediaUrl: mediaUrl,
        mediaType: mediaType,
        readBy: [senderId],
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
    };

    // 4. Asynchronously Create the new Message document
    Message.create({
        _id: messageId,
        conversationId: conversationId,
        sender: sender,
        content: content || '',
        mediaUrl: mediaUrl,
        mediaType: mediaType,
        readBy: [sender],
        createdAt: now,
        updatedAt: now
    }).catch(err => console.error("Error backing up message to MongoDB:", err));

    // 5. Asynchronously Update the Conversation
    Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: messageId,
        updatedAt: now,
    }).catch(err => console.error("Error updating conversation in MongoDB:", err));

    // 6. Push to Redis Cache Instantly
    try {
        const client = await getRedisClient();
        const cacheKey = `chat:messages:${conversationId.toString()}`;
        const cached = await client.get(cacheKey);
        
        let messages = [];
        if (cached) {
            messages = JSON.parse(cached);
            messages.push(formattedMessage);
            await client.setEx(cacheKey, 3600, JSON.stringify(messages));
            console.log(`[Redis] Pushed new message to cache: ${cacheKey}`);
        }
    } catch (redisErr) {
        console.error("Redis caching error:", redisErr);
    }

    return formattedMessage;
};

export const findOrCreateConversation = async (userId1, userId2) => {
    // 1. Prepare ObjectIds
    const user1 = new mongoose.Types.ObjectId(userId1);
    const user2 = new mongoose.Types.ObjectId(userId2);

    // 2. Find existing conversation (using $all for order independence)
    let conversation = await Conversation.findOne({
        isGroup: false,
        participants: { $all: [user1, user2] }
    }).lean();

    if (conversation) {
        return conversation._id.toString();
    }

    // 3. If not found, create a new conversation
    const newConversation = await Conversation.create({
        participants: [user1, user2],
        isGroup: false,
    });

    return newConversation._id.toString();
};

// --- SOCIAL FEATURES (Likes, Comments, Notifications) ---
import Notification from '../models/Notification.js';

export const toggleLikePost = async (postId, userId, userEmail, userName, userPic) => {
    await connectDb();
    const post = await Written_Post.findById(postId);
    if (!post) return { success: false, message: "Post not found" };

    if (post.user_id === userId) {
        return { success: false, message: "You cannot like your own post" };
    }

    const isLiked = post.likes.includes(userId);
    let action = '';

    if (isLiked) {
        // Unlike
        post.likes = post.likes.filter(id => id !== userId);
        action = 'unliked';
    } else {
        // Like
        post.likes.push(userId);
        action = 'liked';

        // Create Notification (if not liking own post)
        if (post.user_id !== userId) {
            // Find post owner's email (assuming we might need to fetch user if not stored in post)
            // But wait, Written_Post stores user_id. We need the email for Notification schema I designed.
            // Let's fetch the post owner details.
            const postOwner = await User.findById(post.user_id).lean();
            if (postOwner) {
                await Notification.create({
                    recipient_email: postOwner.email,
                    sender_email: userEmail,
                    sender_username: userName,
                    sender_profilepic: userPic,
                    type: 'like',
                    postId: postId,
                    text: `${userName} liked your post.`,
                });
            }
        }
    }

    await post.save();
    // Return updated likes array
    return { success: true, action, likes: post.likes };
};

export const addComment = async (postId, userId, userEmail, userName, userPic, text) => {
    await connectDb();
    const post = await Written_Post.findById(postId);
    if (!post) return { success: false, message: "Post not found" };

    const newComment = {
        user_id: userId,
        user_name: userName,
        profilepic: userPic,
        text: text,
        createdAt: new Date()
    };

    post.comments.push(newComment);
    await post.save();

    // Create Notification
    if (post.user_id !== userId) {
        const postOwner = await User.findById(post.user_id).lean();
        if (postOwner) {
            await Notification.create({
                recipient_email: postOwner.email,
                sender_email: userEmail,
                sender_username: userName,
                sender_profilepic: userPic,
                type: 'comment',
                postId: postId,
                text: `${userName} commented: "${text.substring(0, 20)}${text.length > 20 ? '...' : ''}"`,
            });
        }
    }

    // Return the newly created comment (last one in array)
    // We need to re-fetch or just return the obj we pushed + serialize
    const savedPost = await Written_Post.findById(postId).lean();
    const addedComment = savedPost.comments[savedPost.comments.length - 1];

    return { success: true, comment: { ...addedComment, _id: addedComment._id.toString() } };
};

export const replyToComment = async (postId, commentId, userId, userEmail, userName, userPic, text) => {
    await connectDb();
    const post = await Written_Post.findById(postId);
    if (!post) return { success: false, message: "Post not found" };

    if (post.user_id !== userId) {
        return { success: false, message: "Only the post author can reply to comments." };
    }

    const comment = post.comments.id(commentId);
    if (!comment) return { success: false, message: "Comment not found" };

    const newReply = {
        user_id: userId,
        user_name: userName,
        profilepic: userPic,
        text: text,
        createdAt: new Date()
    };

    comment.replies.push(newReply);
    await post.save();

    // Create Notification
    if (comment.user_id !== userId) {
        const commentAuthor = await User.findById(comment.user_id).lean();
        if (commentAuthor) {
            await Notification.create({
                recipient_email: commentAuthor.email,
                sender_email: userEmail,
                sender_username: userName,
                sender_profilepic: userPic,
                type: 'reply',
                postId: postId,
                text: `${userName} replied to your comment: "${text.substring(0, 20)}${text.length > 20 ? '...' : ''}"`,
            });
        }
    }

    const savedPost = await Written_Post.findById(postId).lean();
    const savedComment = savedPost.comments.find(c => c._id.toString() === commentId.toString());
    const addedReply = savedComment.replies[savedComment.replies.length - 1];

    return { success: true, reply: { ...addedReply, _id: addedReply._id.toString() } };
};

export const fetchNotifications = async (userEmail) => {
    await connectDb();
    // Get real notifications
    const realNotifs = await Notification.find({ recipient_email: userEmail })
        .sort({ createdAt: -1 })
        .lean();

    return realNotifs.map(doc => serializeDoc(doc));
};

export const checkUnreadNotifications = async (userEmail) => {
    await connectDb();

    // Check for unread notifications (likes, comments, replies)
    const unreadNotifCount = await Notification.countDocuments({
        recipient_email: userEmail,
        read: false
    });

    // Check for pending friend requests
    const pendingRequestCount = await Friends.countDocuments({
        reciever_email: userEmail,
        request_accepted: { $ne: true }
    });

    return (unreadNotifCount + pendingRequestCount) > 0;
};

export const markNotificationsRead = async (userEmail) => {
    await connectDb();
    await Notification.updateMany(
        { recipient_email: userEmail, read: false },
        { $set: { read: true } }
    );
    return { success: true };
};

export const deleteMessagesAction = async (conversationId, messageIds, userId, deleteForEveryone = false) => {
    await connectDb();
    
    // 5 hour deletion limit (server-side enforcement)
    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);

    let modifiedOrDeletedCount = 0;

    if (deleteForEveryone) {
        // Physical hard delete (Only if the user is the original sender)
        const deleteResult = await Message.deleteMany({
            _id: { $in: messageIds },
            conversationId: conversationId,
            sender: userId, // enforce sender access
            createdAt: { $gte: fiveHoursAgo }
        });
        modifiedOrDeletedCount = deleteResult.deletedCount;
    } else {
        // Soft delete (Hide from me)
        const updateResult = await Message.updateMany({
            _id: { $in: messageIds },
            conversationId: conversationId,
            createdAt: { $gte: fiveHoursAgo }
        }, {
            $addToSet: { deletedBy: userId }
        });
        modifiedOrDeletedCount = updateResult.modifiedCount;
    }

    if (modifiedOrDeletedCount > 0) {
        // Update Redis cache
        try {
            const client = await getRedisClient();
            const cacheKey = `chat:messages:${conversationId}`;
            const cached = await client.get(cacheKey);
            if (cached) {
                let messages = JSON.parse(cached);
                
                if (deleteForEveryone) {
                    messages = messages.filter(msg => !messageIds.includes(msg._id));
                } else {
                    // Update cache to reflect soft-delete tracking dynamically
                    messages = messages.map(msg => {
                        if (messageIds.includes(msg._id)) {
                            return { ...msg, deletedBy: [...(msg.deletedBy || []), userId] }
                        }
                        return msg;
                    });
                }
                
                await client.setEx(cacheKey, 3600, JSON.stringify(messages));
                console.log(`[Redis] Updated messages in cache for deletion: ${cacheKey}`);
            }
        } catch (e) {
            console.error("Redis caching error during deletion:", e);
        }

        // Fix last message if it was deleted (Only strictly necessary on hard deletes, but good to run)
        const lastMsg = await Message.findOne({ conversationId }).sort({ createdAt: -1 }).select('_id');
        await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: lastMsg ? lastMsg._id : null
        });

        return { success: true, count: modifiedOrDeletedCount, deleteForEveryone };
    }
    
    return { success: false, message: "No messages deleted." };
}

export const clearFullChatAction = async (conversationId, userId) => {
    await connectDb();
    
    // Soft delete all messages in this conversation for the user
    // This removes the 5-hour restriction for purely clearing your own view
    const updateResult = await Message.updateMany({
        conversationId: conversationId
    }, {
        $addToSet: { deletedBy: userId }
    });

    if (updateResult.modifiedCount > 0) {
        try {
            const client = await getRedisClient();
            const cacheKey = `chat:messages:${conversationId}`;
            const cached = await client.get(cacheKey);
            if (cached) {
                let messages = JSON.parse(cached);
                // Dynamically mark all as deleted for this user in cache
                messages = messages.map(msg => ({
                    ...msg,
                    deletedBy: [...(msg.deletedBy || []), userId]
                }));
                await client.setEx(cacheKey, 3600, JSON.stringify(messages));
                console.log(`[Redis] Updated messages in cache for full chat clear: ${cacheKey}`);
            }
        } catch (e) {
            console.error("Redis caching error during full chat clear:", e);
        }

        return { success: true, count: updateResult.modifiedCount };
    }

    return { success: false, message: "No messages found to clear." };
}

// ==========================================
// NEW: MOMENTS & HOME FEED ACTIONS
// ==========================================

export const uploadMoment = async (userId, userName, profilepic, mediaUrl, mediaType, caption) => {
    await connectDb();
    const newMoment = await Moment.create({
        user_id: userId,
        user_name: userName,
        profilepic: profilepic,
        mediaUrl: mediaUrl,
        mediaType: mediaType,
        caption: caption
    });
    return serializeDoc(newMoment);
};

export const fetchFeedMoments = async (userEmail, userId) => {
    await connectDb();
    
    // 1. Get Following Users
    let followingDocs = await Friends.find({ sender_email: userEmail, request_accepted: true }).lean();
    const followingEmails = followingDocs.map(d => d.reciever_email);
    const followingUsers = await User.find({ email: { $in: followingEmails } }).select('_id').lean();
    const followingIds = followingUsers.map(u => u._id.toString());
    
    const targetIds = [...followingIds, userId];
    
    // Fetch moments created within 24 hours (TTL handles deletion, but double check in query)
    let moments = await Moment.find({ user_id: { $in: targetIds } }).sort({ createdAt: -1 }).lean();
    return moments.map(serializeDoc);
};

export const markMomentViewed = async (momentId, userId, username, profilepic) => {
    await connectDb();
    const moment = await Moment.findById(momentId);
    if (!moment) return { success: false };

    // Check if already viewed
    const alreadyViewed = moment.viewers.some(v => v.user_id === userId);
    if (!alreadyViewed) {
        moment.viewers.push({
            user_id: userId,
            username: username,
            profilepic: profilepic
        });
        await moment.save();
    }
    return { success: true };
};

export const fetchHomeFeed = async (userEmail, userId) => {
    await connectDb();
    
    // 1. Get Following
    let followingDocs = await Friends.find({ sender_email: userEmail, request_accepted: true }).lean();
    const followingEmails = followingDocs.map(d => d.reciever_email);
    const followingUsers = await User.find({ email: { $in: followingEmails } }).select('_id').lean();
    const followingIds = followingUsers.map(u => u._id.toString());
    
    // 2. Get Followers
    let followerDocs = await Friends.find({ reciever_email: userEmail, request_accepted: true }).lean();
    const followerEmails = followerDocs.map(d => d.sender_email);
    const followerUsers = await User.find({ email: { $in: followerEmails } }).select('_id').lean();
    const followerIds = followerUsers.map(u => u._id.toString());
    
    // 3. Get all posts excluding current user's
    let allPosts = await Written_Post.find({ user_id: { $ne: userId } }).sort({ createdAt: -1 }).lean();
    
    // 4. Categorize and Sort
    let tier1 = []; // Followings
    let tier2 = []; // Followers
    let tier3 = []; // Others
    
    allPosts.forEach(post => {
        const pUserId = post.user_id;
        
        if (followingIds.includes(pUserId)) {
            tier1.push(post);
        } else if (followerIds.includes(pUserId)) {
            tier2.push(post);
        } else {
            tier3.push(post);
        }
    });
    
    const sortedFeed = [...tier1, ...tier2, ...tier3];
    
    // Populate user details for all posts to ensure missing user names are handled
    const userIdsInFeed = [...new Set(sortedFeed.map(p => p.user_id))];
    const feedUsers = await User.find({ _id: { $in: userIdsInFeed } }).select('name username profilepic email').lean();
    const userMap = {};
    feedUsers.forEach(u => userMap[u._id.toString()] = u);

    const populatedFeed = sortedFeed.map(post => {
        const u = userMap[post.user_id];
        if (u) {
            post.user_name = u.name || u.username || post.user_name;
            post.profilepic = u.profilepic || post.profilepic;
            post.user_email = u.email;
        }
        return serializeDoc(post);
    });

    return populatedFeed;
};

// ==========================================
// NEW: SHORTS ACTIONS
// ==========================================

export const uploadShort = async (userId, userEmail, userName, profilepic, institute_name, university_name, caption, mediaUrl) => {
    await connectDb();
    
    const newShort = await Written_Post.create({
        user_id: userId,
        user_name: userName,
        profilepic: profilepic,
        institute_name: institute_name,
        university_name: university_name,
        content: `Short by ${userName}`, // Defaulting required field
        caption: caption,
        mediaUrl: mediaUrl,
        mediaType: 'video',
        isShort: true
    });
    
    return serializeDoc(newShort);
};

export const fetchShortsFeed = async (userEmail, userId) => {
    await connectDb();
    
    let followingDocs = await Friends.find({ sender_email: userEmail, request_accepted: true }).lean();
    const followingEmails = followingDocs.map(d => d.reciever_email);
    const followingUsers = await User.find({ email: { $in: followingEmails } }).select('_id').lean();
    const followingIds = followingUsers.map(u => u._id.toString());
    
    let followerDocs = await Friends.find({ reciever_email: userEmail, request_accepted: true }).lean();
    const followerEmails = followerDocs.map(d => d.sender_email);
    const followerUsers = await User.find({ email: { $in: followerEmails } }).select('_id').lean();
    const followerIds = followerUsers.map(u => u._id.toString());
    
    let allShorts = await Written_Post.find({ isShort: true, mediaType: 'video', user_id: { $ne: userId } }).sort({ createdAt: -1 }).lean();
    
    let tier1 = []; 
    let tier2 = []; 
    let tier3 = []; 
    
    allShorts.forEach(post => {
        const pUserId = post.user_id;
        
        if (followingIds.includes(pUserId)) {
            tier1.push(post);
        } else if (followerIds.includes(pUserId)) {
            tier2.push(post);
        } else {
            tier3.push(post);
        }
    });
    
    const sortedFeed = [...tier1, ...tier2, ...tier3];
    
    // Populate user details for all shorts
    const userIdsInFeed = [...new Set(sortedFeed.map(p => p.user_id))];
    const feedUsers = await User.find({ _id: { $in: userIdsInFeed } }).select('name username profilepic email').lean();
    const userMap = {};
    feedUsers.forEach(u => userMap[u._id.toString()] = u);

    const populatedFeed = sortedFeed.map(post => {
        const u = userMap[post.user_id];
        if (u) {
            post.user_name = u.name || u.username || post.user_name;
            post.profilepic = u.profilepic || post.profilepic;
            post.user_email = u.email;
        }
        return serializeDoc(post);
    });

    return populatedFeed;
};

// ==========================================
// NEW: EXPLORE FEED ACTIONS
// ==========================================

export const fetchExploreFeed = async (userEmail, userId) => {
    await connectDb();
    
    // 1. Get Following Users
    let followingDocs = await Friends.find({ sender_email: userEmail, request_accepted: true }).lean();
    const followingEmails = followingDocs.map(d => d.reciever_email);
    const followingUsers = await User.find({ email: { $in: followingEmails } }).select('_id').lean();
    const followingIds = followingUsers.map(u => u._id.toString());
    
    // 2. Query All Written Posts (Posts and Shorts)
    let allPosts = await Written_Post.find({}).sort({ createdAt: -1 }).lean();
    let normalizedPosts = allPosts.map(post => ({
        ...post,
        _id: post._id.toString(),
        feedType: post.isShort ? 'short' : 'post',
        authorId: post.user_id?.toString()
    }));

    // 3. Query All Events (Arena)
    let allEvents = await Event.find({}).sort({ createdAt: -1 }).lean();
    let creatorIds = allEvents.map(e => e.creatorId);
    let eventCreators = await User.find({ _id: { $in: creatorIds } }).select('_id name username profilepic').lean();
    const creatorMap = {};
    eventCreators.forEach(u => { creatorMap[u._id.toString()] = u; });

    let normalizedEvents = allEvents.map(event => ({
        ...event,
        _id: event._id.toString(),
        feedType: 'event',
        authorId: event.creatorId?.toString(),
        user_name: creatorMap[event.creatorId?.toString()]?.username || 'Unknown',
        profilepic: creatorMap[event.creatorId?.toString()]?.profilepic || "https://placehold.co/600x400/png"
    }));

    // 4. Combine and Sort by Following Status (Tier 1 & Tier 2)
    const combinedContent = [...normalizedPosts, ...normalizedEvents];

    let tier1 = []; // Followed Users
    let tier2 = []; // Others

    combinedContent.forEach(item => {
        // Exclude current user's content from the explore feed
        if (item.authorId === userId) return;

        if (followingIds.includes(item.authorId)) {
            tier1.push(item);
        } else {
            tier2.push(item);
        }
    });

    tier1.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    tier2.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const exploreFeed = [...tier1, ...tier2];
    
    // Populate user details for explore feed
    const userIdsInFeed = [...new Set(exploreFeed.map(p => p.user_id))];
    const feedUsers = await User.find({ _id: { $in: userIdsInFeed } }).select('name username profilepic email').lean();
    const userMap = {};
    feedUsers.forEach(u => userMap[u._id.toString()] = u);

    const populatedFeed = exploreFeed.map(post => {
        const u = userMap[post.user_id];
        if (u) {
            post.user_name = u.name || u.username || post.user_name;
            post.profilepic = u.profilepic || post.profilepic;
            post.user_email = u.email;
        }
        return serializeDoc(post);
    });

    return populatedFeed;
};