import mongoose,{mongo} from "mongoose";

const connectDb = async()=>{
    try{
        const conn=await mongoose.connect(`mongodb://localhost:27017/teengram`,{
        usenewUrlParser:true,
        });
        console.log("MongoDb connected",+conn.connection.host);
        
    } catch (error) {
        console.log(error.message);
        process.exit(1);
    }
}
 export default connectDb