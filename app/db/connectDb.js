import mongoose, { mongo } from "mongoose";

const connectDb = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || `mongodb://localhost:27017/teengram`, {
            useNewUrlParser: true,
        });
        console.log("MongoDb connected: " + conn.connection.host);

    } catch (error) {
        console.log(error.message);
        process.exit(1);
    }
}
export default connectDb