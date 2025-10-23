import mongoose from "mongoose";
const {Schema, model}= mongoose;

const UserSchema= new Schema({
    email:{type:String,required:true},
    name:{type:String},
    username:{type:String, required:true},
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    age:{type:Number},
    profilepic:{type:String, default:"https://placehold.co/600x400/png"},
    bio:{type:String, maxLength:150, default:"Hey there! I am using TeenGram."},
    // followers:{type:Number,default:0},
    // following:{type:Number,default:0}, 
    // post:{type:Number,default:0}
})

export default mongoose.models.User || model("User",UserSchema)