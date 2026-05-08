import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const resetDb = async () => {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/teengram';
        await mongoose.connect(uri);
        console.log("Connected to DB: " + uri);

        const db = mongoose.connection.db;

        // Try dropping collections if they exist
        const collections = await db.listCollections().toArray();
        const colNames = collections.map(c => c.name);

        if (colNames.includes('users')) {
            await db.dropCollection('users');
            console.log('Dropped users collection.');
        }
        if (colNames.includes('subadmins')) {
            await db.dropCollection('subadmins');
            console.log('Dropped subadmins collection.');
        }
        if (colNames.includes('institutions')) {
            await db.dropCollection('institutions');
            console.log('Dropped institutions collection.');
        }
        if (colNames.includes('verificationcodes')) {
            await db.dropCollection('verificationcodes');
            console.log('Dropped verificationcodes collection.');
        }

        console.log("Database reset complete.");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

resetDb();
