"use server"

import connectDb from '../app/db/connectDb.js'
import User from '../models/User.js'
import Friends from '../models/Friends.js'
import mongoose from 'mongoose'
import Conversation from '../models/Conversation.js'
import Message from '../models/Message.js'
import Written_Post from '../models/Written_Post.js'

export const getUserIdByEmail = async (email) => {
    await connectDb();
    try {
        // Find the user but only retrieve the _id field
        const user = await User.findOne({ email }).select('_id').lean();

        // Return the _id as a string, which is needed for Mongoose functions
        return user ? user._id.toString() : null;
    } catch (error) {
        console.error("Error finding user by email:", error);
        return null;
    }
};


export const fetchuser = async (email) => {
    await connectDb()
    console.log("connected to db for:", email);
    let u = await User.findOne({ email: email })
    let user = u.toObject({ flattenObjectIds: true })
    return user
}


export const updateProfile = async (data, oldusername) => {
    await connectDb()
    let ndata = Object.fromEntries(data)
    console.log("Updating profile for", oldusername)
    console.log("Data contains", ndata);

    if (oldusername == ndata.username) {
        //checking if the username is not taken already
        let u = await User.findOne({ username: ndata.username })
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

// function to find other user
export const fetchotheruser = async (email) => {
    await connectDb();
    console.log("fetching all the users");
    //the below query will find all the user except the one whose email is mentioned in $ne
    let u = await User.find({ email: { $ne: email } });
    return u;
}

//function to make friend first other function to accept frienship
export const makefriend = async (sender_email, reciever_email, sender_profilepic) => {
    await connectDb();
    console.log("making friendship between you and your");
    const newfriends = await Friends.create({
        sender_email: sender_email,
        reciever_email: reciever_email,
        sender_profilepic: sender_profilepic,

    })
}
//function to check if the your request is accepted or not 
export const checkfriendstatus = async (useremail, friendemail) => {
    await connectDb()
    console.log("checking the friend status");
    let s = await Friends.findOne({
        sender_email: useremail,
        reciever_email: friendemail,
    })
    if (s) {
        let status = s.toObject({ flattenObjectIds: true })
        return status
    }
    return false
}

//function to check if you have accepted the request or not
export const checkuserrequeststatus = async (useremail, friendemail) => {
    await connectDb();
    console.log("checking if you have accepted the request or not");
    let s = await Friends.findOne({
        reciever_email: useremail,
        sender_email: friendemail,
    })
    if (s) {
        let status = s.toObject({ flattenObjectIds: true })
        return status
    }
    return false;
}

// function to find all the friend request for the user
export const fetchfriendrequest = async (useremail) => {
    await connectDb();
    console.log("fetching all the request pending for the user to make friends");
    //query to find all friend request where request_accepted is false
    // let u=await Friends.find({reciever_email:useremail,request_accepted:false});
    let u = await Friends.find({ reciever_email: useremail });

    return u;
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
}


//function to check the no of following,the ones you follow means request is accepted
export const find_following = async (useremail) => {
    await connectDb();
    console.log("finding the ones you follow", useremail);
    let f = await Friends.find({
        reciever_email: useremail,
        request_accepted: true,
    })

    return f;
}
// user_id:{type:String,required:true},
//     caption:{type:String},
//     institute_name:{type:String},
//     university_name:{type:String},  institute_name, form.university_name

//Upload wriiten_post
export const upload_written_post = async (data, user_id, institute_name, university, profilepic, user_name) => {
    await connectDb();
    let ndata = Object.fromEntries(data)
    console.log("uploading thought for user_id", user_id);

    const newpost = await Written_Post.create({
        user_id: user_id,
        caption: ndata.caption,
        content: ndata.content,
        institute_name: institute_name,
        university_name: university,
        profilepic: profilepic,
        user_name: user_name,
    })
    if (newpost) {
        return true
    }
    return false
}


// await connectDb();
//     console.log("fetching all the users");
//     //the below query will find all the user except the one whose email is mentioned in $ne
//     let u=await User.find({email:{$ne:email}});
//     return u;
//  let u=await Friends.find({reciever_email:useremail});

//     return u;
//fetch the writtenpost for the user
export const fetchpost = async (user_id) => {
    await connectDb();
    console.log("fetching the post for the user", user_id);
    let p = await Written_Post.find({ user_id: user_id });
    console.log(p);

    return p;

}

//verification


//chat related query4
//Retrieves all conversations a user is part of, with key related data populated.
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
                select: 'name username profilePic', // Get participant details
            })
            .lean() // Returns plain JavaScript objects for efficiency
            .exec();

        // Return the clean array for frontend processing
        return conversations;

    } catch (error) {
        console.error("Error fetching conversations:", error);
        throw new Error("Could not retrieve conversation list.");
    }
};


//Thi code, getMessagesForConversation, is responsible for two critical back-end tasks when a user opens a chat: marking the messages as read (a necessary update operation) and then fetching the message history (a find operation) for the chat window.
export const getMessagesForConversation = async (conversationId, userId) => {
    try {
        // --- CRUD OPERATION: Mark as Read (Best done on the server) ---
        await Message.updateMany(
            {
                conversationId: conversationId,
                sender: { $ne: userId },
                readBy: { $nin: [userId] }
            },
            //             sender: { $ne: userId }: Filters out messages sent by the current user. 

            // readBy: { $nin: [userId] }: Filters out messages that the user has already read. ($nin means "not in.")

            // field1: { $ne: value1 }: This is the first condition. It selects documents where the value of field1 is not equal to value1.
            // field2: { $nin: [valueA, valueB, valueC] }: This is the second condition. It selects documents where the value of field2 is not present in the provided array [valueA, valueB, valueC]. This also includes documents where field2 does not exist.
            {
                $addToSet: { readBy: userId }
            }
        );

        // --- CRUD OPERATION: Retrieve Messages ---
        const messages = await Message.find({ conversationId: conversationId })
            .sort({ createdAt: 1 }) // Retrieve in chronological order
            .populate('sender', 'name username profilePic') // Get sender details
            .lean() // Returns plain JavaScript objects
            .exec();

        // Return the clean array for frontend processing
        return messages;

    } catch (error) {
        console.error("Error fetching message history:", error);
        throw new Error("Could not retrieve message history.");
    }
};


export const saveMessageAndGetDetails = async (senderId, recipientOrConversationId, content) => {
    await connectDb();

    // 1. Prepare ObjectIds
    const sender = new mongoose.Types.ObjectId(senderId);
    let conversationId;
    let conversation;

    // --- LOGIC TO FIND OR CREATE CONVERSATION ---

    // A. Check if the input is already a known Conversation ID (e.g., from a group chat UI)
    // We assume if the ID is not the current user's ID, it is either a recipient ID or a conversation ID.
    if (recipientOrConversationId.length === 24) { // Basic check for ObjectId length
        conversation = await Conversation.findById(recipientOrConversationId);
    }

    // B. If not found or if the input was a Recipient ID, search for a 1-on-1 chat
    if (!conversation) {
        const recipient = new mongoose.Types.ObjectId(recipientOrConversationId);

        // Search for existing 1-on-1 conversation
        conversation = await Conversation.findOne({
            isGroup: false,
            participants: { $all: [sender, recipient] }
        });

        if (!conversation) {
            // If no 1-on-1 chat exists, create a new one
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


    // 🚨 2. ADMIN-ONLY MESSAGE CHECK (Verification based on your schema) 🚨
    if (conversation.adminOnly && conversation.admin.toString() !== senderId) {
        throw new Error("Unauthorized: Only the conversation admin can send messages.");
    }

    // 3. Create the new Message document
    const newMessage = await Message.create({
        conversationId: conversationId,
        sender: sender,
        content: content,
        readBy: [sender], // Sender has read it by default
    });

    // 4. Update the Conversation for sorting the chat list
    // Use the conversation object we already fetched/created
    await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: newMessage._id,
        updatedAt: Date.now(),
    });

    // 5. Populate Sender Details for Real-Time Broadcast
    const populatedMessage = await Message.findById(newMessage._id)
        .populate('sender', 'name username profilePic')
        .lean();

    // Return the clean, populated message object
    return populatedMessage;
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