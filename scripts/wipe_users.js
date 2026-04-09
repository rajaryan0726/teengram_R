import mongoose from 'mongoose';

async function deleteAllUsers() {
    try {
        await mongoose.connect('mongodb://localhost:27017/teengram');
        console.log("Connected to DB.");

        const result = await mongoose.connection.db.collection('users').deleteMany({ role: { $ne: 'SUPER_ADMIN' } });
        console.log(`Deleted ${result.deletedCount} users from the database.`);
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await mongoose.disconnect();
    }
}

deleteAllUsers();
