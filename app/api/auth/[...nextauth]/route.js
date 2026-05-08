import connectDb from "@/app/db/connectDb";
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import User from "@/models/User";
import bcrypt from "bcryptjs";

// Handle ESM/CJS interop for providers
const GoogleProviderFunction = GoogleProvider.default || GoogleProvider;
const CredentialsProviderFunction = CredentialsProvider.default || CredentialsProvider;

export const authOptions = {
    providers: [
        GoogleProviderFunction({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET
        }),
        CredentialsProviderFunction({
            name: "Credentials Login",
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                await connectDb();
                if (!credentials.username || !credentials.password) {
                    throw new Error("Please enter username and password");
                }
                
                let user = await User.findOne({
                    $or: [
                        { username: credentials.username },
                        { email: credentials.username }
                    ]
                });
                
                if (!user) {
                    throw new Error("Invalid username/email or password");
                }
                
                if (!user.password) {
                    throw new Error("Please log in with Google");
                }

                const isPasswordMatch = await bcrypt.compare(credentials.password, user.password);
                if (!isPasswordMatch) {
                    throw new Error("Invalid username or password");
                }

                return { 
                    id: user._id.toString(), 
                    email: user.email, 
                    name: user.name, 
                    image: user.profilepic
                };
            }
        }),
    ],
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async signIn({ user, account, profile, email, credentials }) {
            if (account.provider === "google") {
                await connectDb();
                let currentUser = await User.findOne({ email: user.email });

                if (!currentUser) {
                    // Block sign in for unregistered users by returning a custom error URL
                    return "/login?error=not_registered";
                }
                user.id = currentUser._id.toString();
                user.name = currentUser.username;
                return true;
            }
            return true;
        },

        async jwt({ token, user }) {
            // Only hits on initial sign in
            if (user) {
                token.id = user.id;
                token.name = user.name;
            }
            return token;
        },

        async session({ session, token }) {
            if (token) {
                session.user = session.user || {};
                session.user.id = token.id;
                session.user.name = token.name;
            }
            return session;
        },
    }
}

const NextAuthFunction = NextAuth.default || NextAuth;
const handler = NextAuthFunction(authOptions);
export { handler as GET, handler as POST };