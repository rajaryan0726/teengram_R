import mongoose from "mongoose";
const { Schema, model } = mongoose;

const Written_PostSchema=new Schema({
    user_id:{type:String,required:true},
    caption:{type:String},
    content:{type:String,required:true},
    institute_name:{type:String},
    university_name:{type:String},
    user_name:{type:String},
    profilepic:{type:String},
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    
})
export default mongoose.models.Written_Post || model("Written_Post",Written_PostSchema)
