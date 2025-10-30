import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authoptions } from "@/app/api/auth/[...nextauth]/route";
import { getUserIdByEmail,getMessagesForConversation } from "@/actions/useractions";
import connectDb from "@/app/db/connectDb";

export async function GET(request, context) {
    await connectDb();

    // 1. 🔑 SECURE AUTHENTICATION: Get Session and Email
    const session = await getServerSession(authoptions);
    
    if (!session) {
        return NextResponse.json({ error: "Authentication required to view history." }, { status: 401 });
    }
    
    const userEmail = session.user.email;
    const conversationId = context.params.conversationId;

    if (!conversationId) {
        return NextResponse.json({ error: "Conversation ID is missing." }, { status: 400 });
    }

    // 2. Map Email to MongoDB User ID
    const userId = await getUserIdByEmail(userEmail); 
    if (!userId) {
        return NextResponse.json({ error: "User not found in database." }, { status: 404 });
    }

    try {
        // 3. Call the backend action to fetch history and mark messages as read.
        // NOTE: The action automatically validates if the user is a participant 
        // by attempting the read update, which serves as an authorization check.
        const messages = await getMessagesForConversation(conversationId, userId);

        // 4. Success Response
        return NextResponse.json(messages, { status: 200 });
        
    } catch (error) {
        console.error("API Error fetching chat history:", error.message);
        // Ensure you don't leak internal error details
        return NextResponse.json({ error: "Failed to retrieve chat history due to server error." }, { status: 500 });
    }
}