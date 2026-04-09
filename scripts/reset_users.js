import mongoose from 'mongoose';

async function fixSuperAdmin() {
    await mongoose.connect('mongodb://localhost:27017/teengram');
    
    const result = await mongoose.connection.db.collection('users').updateOne(
        { role: 'SUPER_ADMIN' },
        { $set: { status: 'verified' } }
    );
    
    console.log(`Re-verified ${result.modifiedCount} SUPER_ADMIN user(s)`);
    
    const users = await mongoose.connection.db.collection('users').find({}, { projection: { username: 1, status: 1, role: 1 } }).toArray();
    console.log('\nAll users:');
    users.forEach(u => console.log(`  - ${u.username} | status: ${u.status} | role: ${u.role}`));
    
    await mongoose.disconnect();
}

fixSuperAdmin().catch(console.error);
