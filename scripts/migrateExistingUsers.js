import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

import User from '../models/User.js';

const migrateExistingUsers = async () => {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI);
        
        // Find existing users who don't have the new verification system fields set
        // Or just map all existing standard users to verified and give them a password
        const users = await User.find({ status: { $exists: false } });
        console.log(`Found ${users.length} users to migrate.`);
        
        for (const user of users) {
             // Default password strategy: username + 1234 as requested
             const passwordPlain = `${user.username}1234`;
             const salt = await bcrypt.genSalt(10);
             const hashedPassword = await bcrypt.hash(passwordPlain, salt);
             
             await User.findByIdAndUpdate(user._id, {
                 status: 'verified', 
                 role: 'USER',
                 password: hashedPassword
             });
             
             console.log(`Migrated user: ${user.username} (Password: ${passwordPlain})`);
        }
        
        console.log('Migration complete!');
        process.exit(0);
    } catch (err) {
        console.error('Error migrating users:', err);
        process.exit(1);
    }
};

migrateExistingUsers();
