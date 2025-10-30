// app/api/chat/conversations/route.js
import { NextResponse } from 'next/server';
import { getConversationsForUser } from '@/actions/useractions';
import connectDb from '@/app/db/connectDb';
import { authoptions } from '../../auth/[...nextauth]/route';
import { getUserIdByEmail } from '@/actions/useractions';
import { getServerSession } from 'next-auth';

export async function GET(request) {
    // 1. Database Connection Check
    await connectDb();
//the below code is written to get the emailid from the session ,we could use the usession because it is for client side only for server we are using authoptions
    const session = await getServerSession(authoptions)

    if(!session){
        return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const userEmail = session.user.email;

    //now we need the userid to get the chat because id is fast to compare and find the chat instead of email
    const userId=await getUserIdByEmail(userEmail)


    if (!userId) {
        return NextResponse.json({ error: "User not found in database." }, { status: 404 });
    }
    
   try {
        const conversations = await getConversationsForUser(userId);
        return NextResponse.json(conversations, { status: 200 });
        
    } catch (error) {
        console.error("API Error fetching conversation list:", error.message);
        return NextResponse.json({ error: "Failed to retrieve conversation list." }, { status: 500 });
    }
}