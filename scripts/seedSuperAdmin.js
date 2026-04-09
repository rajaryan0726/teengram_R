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

const seedSuperAdmin = async () => {
    try {
        console.log('Connecting to database...', process.env.MONGODB_URI);
        await mongoose.connect(process.env.MONGODB_URI);
        
        const email = process.env.SUPER_ADMIN_EMAIL || 'rajaryanv705@gmail.com';
        const username = process.env.SUPER_ADMIN_USERNAME || 'super_admin_1';
        const passwordPlain = process.env.SUPER_ADMIN_PASSWORD || 'super@123#';
        
        let superAdmin = await User.findOne({ email });

        if (superAdmin) {
            console.log('Super Admin already exists. Updating role and username...');
            superAdmin.role = 'SUPER_ADMIN';
            superAdmin.status = 'verified';
            superAdmin.username = username;
            // Update password if needed
            const salt = await bcrypt.genSalt(10);
            superAdmin.password = await bcrypt.hash(passwordPlain, salt);
            await superAdmin.save();
        } else {
            console.log('Creating new Super Admin...');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(passwordPlain, salt);
            
            await User.create({
                email,
                username,
                name: 'Super Admin',
                password: hashedPassword,
                role: 'SUPER_ADMIN',
                status: 'verified',
                bio: 'Master of TeenGram Verification System'
            });
        }
        
        console.log('Super Admin successfully seeded!');
        process.exit(0);
    } catch (err) {
        console.error('Error seeding Super Admin:', err);
        process.exit(1);
    }
};

seedSuperAdmin();
