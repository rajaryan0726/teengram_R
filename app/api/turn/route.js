// app/api/turn/route.js
// Returns ICE server configuration for WebRTC connections.
// Supports custom TURN servers via environment variables for production use.

import { NextResponse } from "next/server";

export async function GET() {
  const iceServers = [
    // Google STUN (free, always works for NAT discovery)
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ];

  // If user configured their own TURN server (e.g., from metered.ca, Twilio, Xirsys)
  if (process.env.TURN_SERVER_URL) {
    iceServers.push({
      urls: process.env.TURN_SERVER_URL,
      username: process.env.TURN_USERNAME || "",
      credential: process.env.TURN_CREDENTIAL || "",
    });
  }

  // If user configured a Metered.ca API key, fetch dynamic credentials
  if (process.env.METERED_API_KEY) {
    try {
      const response = await fetch(
        `https://teengram.metered.live/api/v1/turn/credentials?apiKey=${process.env.METERED_API_KEY}`
      );
      if (response.ok) {
        const turnServers = await response.json();
        iceServers.push(...turnServers);
      }
    } catch (e) {
      console.error("[TURN] Failed to fetch Metered.ca credentials:", e);
    }
  }

  // Fallback free TURN servers (may be unreliable but better than nothing)
  // These are community/testing servers - for production, use a paid service
  iceServers.push(
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:numb.viagenie.ca",
      username: "webrtc@live.com",
      credential: "muazkh",
    }
  );

  return NextResponse.json({ iceServers, iceCandidatePoolSize: 10 });
}
