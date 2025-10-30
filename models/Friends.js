import mongoose from "mongoose";
const {Schema, model}=mongoose;

const FriendsSchema=new Schema({
    sender_email:{type:String,required:true},
    reciever_email:{type:String,required:true},
    request_accepted:{type: Boolean,default:false},
    sender_profilepic:{type:String},
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
})

export default mongoose.models.Friends || model("Friends",FriendsSchema)