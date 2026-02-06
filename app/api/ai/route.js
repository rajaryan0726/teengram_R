// app/api/ai/route.js

import OpenAI from 'openai';
import { NextResponse } from 'next/server';

// Initialize OpenAI client using the environment variable
// The SDK automatically looks for OPENAI_API_KEY in the environment.
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Handles POST requests from the frontend to generate a caption.
 * It receives the constructed prompt (which includes the system instructions).
 * * @param {Request} req - The incoming request object.
 * @returns {NextResponse} - JSON response with the generated 'reply' or an error.
 */
export async function POST(req) {
    if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json({ error: "OpenAI API key not configured on the server." }, { status: 500 });
    }

    try {
        // The frontend (sendCaption utility) will send { prompt: 'your generated prompt string' }
        const { prompt } = await req.json(); 

        if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }
        
        // 1. Execute the AI model call
        const completion = await openai.chat.completions.create({
            // Ensure you use the model that best fits your needs (gpt-3.5-turbo is fast and cheap)
            model: 'gpt-3.5-turbo', 
            // The prompt contains all the system and user instructions in one string
            messages: [
                { role: 'user', content: prompt }
            ],
            temperature: 0.8,
            max_tokens: 60,
        });

        // 2. Extract the generated text
        const reply = completion.choices[0].message.content;

        // 3. Return the clean response to the frontend
        return NextResponse.json({ reply });

    } catch (error) {
        console.error('OpenAI API Error:', error.message);
        // Return a generic server error to the client
        return NextResponse.json({ error: 'Something went wrong while generating the caption.' }, { status: 500 });
    }
}