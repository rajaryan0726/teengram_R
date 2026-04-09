import connectDb from "@/app/db/connectDb";
import NextAuth from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import User from "@/models/User";
import VerificationCode from "@/models/VerificationCode";
import bcrypt from "bcryptjs";

// Handle ESM/CJS interop for providers
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
            name: "Credentials Login",
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" },
                code: { label: "Verification Code", type: "text" }
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
                    throw new Error("Please log in with Google/GitHub");
                }

                const isPasswordMatch = await bcrypt.compare(credentials.password, user.password);
                if (!isPasswordMatch) {
                    throw new Error("Invalid username or password");
                }

                if (user.role === 'SUB_ADMIN') {
                    if (!credentials.code) {
                        throw new Error("Verification Code Required");
                    }
                    const codeDoc = await VerificationCode.findOne({ sub_admin: user._id, code: credentials.code, is_active: true });
                    if (!codeDoc) {
                        throw new Error("Invalid Verification Code");
                    }
                }
                
                return { 
                    id: user._id.toString(), 
                    email: user.email, 
                    name: user.name, 
                    image: user.profilepic,
                    role: user.role,
                    status: user.status,
                    institution: user.institution
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
            if (account.provider === "github" || account.provider === "google") {
                await connectDb();
                let currentUser = await User.findOne({ email: user.email });

                if (!currentUser) {
                    const newUser = await User.create({
                        email: user.email,
                        // Ensure unique username
                        username: user.email.split("@")[0] + "_" + Date.now().toString().slice(-4),
                        name: user.name,
                        profilepic: user.image,
                        status: 'pending',
                        role: 'USER'
                    });
                }
                return true;
            }
            return true;
        },

        async jwt({ token, user }) {
            await connectDb();
            if (token?.email) {
                const dbUser = await User.findOne({ email: token.email }).lean();
                if (dbUser) {
                    token.id = dbUser._id.toString();
                    token.role = dbUser.role;
                    token.status = dbUser.status;
                } else {
                    token.status = "deleted";
                }
            }
            return token;
        },

        async session({ session, token }) {
            await connectDb(); 
            if (session.user?.email) {
                const dbUser = await User.findOne({ email: session.user.email }).lean();
                if (dbUser) {
                    session.user.name = dbUser.username;
                    session.user.id = dbUser._id.toString(); 
                    session.user.role = dbUser.role;
                    session.user.status = dbUser.status;
                    session.user.institution = dbUser.institution ? dbUser.institution.toString() : null;
                }
            }
            return session;
        },
    }
}

const NextAuthFunction = NextAuth.default || NextAuth;
const handler = NextAuthFunction(authOptions);
export { handler as GET, handler as POST };