import connectDb from "@/app/db/connectDb";
import NextAuth from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import User from "@/models/User";

// Handle ESM/CJS interop for GitHubProvider
const GithubProviderFunction = GitHubProvider.default || GitHubProvider;

export const authOptions = {
    providers: [
        GithubProviderFunction({
            clientId: process.env.GITHUB_ID,
            clientSecret: process.env.GITHUB_SECRET
        }),
    ],
    secret: process.env.NEXTAUTH_SECRET,
    callbacks: {
        async signIn({ user, account, profile, email, credentials }) {
            console.log("data you asked for", user, account, email, profile);
            if (account.provider === "github") {
                await connectDb();
                let currentUser = await User.findOne({ email: user.email });
                console.log("Email of the User:", user.email);
                if (!currentUser) {
                    console.log("Creating new user");
                    const newUser = await User.create({
                        email: user.email,
                        username: user.email.split("@")[0],
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