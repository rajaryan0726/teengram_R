"use server"

import connectDb from '@/app/db/connectDb'
import User from '@/models/User'

export const fetchuser=async (email) => {
    await connectDb()
    console.log("connected to db for:",email);
    let u=await User.findOne({email:email})
    let user=u.toObject({flattenObjectIds:true})
    return user
}

export const updateProfile=async (data,oldusername) => {
    await connectDb()
    let ndata=Object.fromEntries(data)
    console.log("Updating profile for",oldusername)
    console.log("Data contains",ndata);
    
    if(oldusername!=ndata.username){
        //checking if the username is not taken already
        let u=await User.findOne({username:ndata.username})
        console.log("profile updating for user different username");
        
        if(u){
            return {error:"Username Already taken just like your ex"}
        }
        //update the rest of the information
        await User.updateOne({email:ndata.email},ndata)
        console.log("Here is the email we use",ndata.email);
        
        
    }else{
        //if the username not changed simply change the rest
        console.log("profile updating with same username")
        await User.updateOne({email:ndata.email},ndata)
    }
    
}