import connectDb from "@/app/db/connectDb";
import NextAuth from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import User from "@/models/User";

export const authoptions=NextAuth({
    providers:[
        GitHubProvider({
            clientId: process.env.GITHUB_ID,
            clientSecret: process.env.GITHUB_SECRET
        }),
    ],
    callbacks:{
        async signIn({user,account,profile,email,credentials}){
            console.log("data you asked for",user,account,email,profile);
            if(account.provider==="github"){
                await connectDb();
                let currentUser=await User.findOne({email:user.email});
                console.log("Email of the User:",user.email);
                if(!currentUser){
                    console.log("Creating new user");
                    const newUser=await User.create({
                        email:user.email,
                        username:user.email.split("@")[0],
                })
                }
                console.log("NO need to create new user")
                return true;
    }
},
    
    async session({ session,user,token}){
            const dbUser=await User.findOne({email:session.user.email})
            session.user.name=dbUser.username
            return session
        },
    }
})
export {authoptions as GET, authoptions as POST};