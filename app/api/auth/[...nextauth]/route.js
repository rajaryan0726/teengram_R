import connectDb from "@/app/db/connectDb";
import NextAuth from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import User from "@/models/User";

import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

// Handle ESM/CJS interop for GitHubProvider
const GithubProviderFunction = GitHubProvider.default || GitHubProvider;
const GoogleProviderFunction = GoogleProvider.default || GoogleProvider;
const CredentialsProviderFunction = CredentialsProvider.default || CredentialsProvider;

export const authOptions = {
    providers: [
        GithubProviderFunction({
            clientId: process.env.GITHUB_ID,
            clientSecret: process.env.GITHUB_SECRET
        }),
        GoogleProviderFunction({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET
        }),
        CredentialsProviderFunction({
            name: "Testing Login",
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                await connectDb();
                if (!credentials.username) return null;
                
                let user = await User.findOne({ username: credentials.username });
                if (!user) {
                    // Auto-provision a fake account for friends testing via tunnel
                    user = await User.create({
                        email: `${credentials.username.toLowerCase().replace(/\s/g, '')}@testing.com`,
                        username: credentials.username.toLowerCase().replace(/\s/g, ''),
                        name: credentials.username,
                        profilepic: '/landing.png'
                    });
                }
                return { id: user._id.toString(), email: user.email, name: user.name, image: user.profilepic };
            }
        }),
    ],
    secret: process.env.NEXTAUTH_SECRET,
    callbacks: {
        async signIn({ user, account, profile, email, credentials }) {
            console.log("data you asked for", user, account, email, profile);

            if (account.provider === "github" || account.provider === "google") {
                await connectDb();
                let currentUser = await User.findOne({ email: user.email });
                console.log("Email of the User:", user.email);

                if (!currentUser) {
                    console.log("Creating new user");
                    const newUser = await User.create({
                        email: user.email,
                        username: user.email.split("@")[0],
                        name: user.name,
                        profilepic: user.image
                    })
                }
                console.log("NO need to create new user")
                return true;
            }
            return true;
        },

        async session({ session, user, token }) {
            await connectDb(); // Ensure DB is connected
            const dbUser = await User.findOne({ email: session.user.email })
            if (dbUser) {
                session.user.name = dbUser.username
                session.user.id = dbUser._id.toString(); // Useful to have ID in session
            }
            return session
        },
    }
}

// Handle ESM/CJS interop for NextAuth
const NextAuthFunction = NextAuth.default || NextAuth;

const handler = NextAuthFunction(authOptions);
export { handler as GET, handler as POST };