const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

async function createDefaultAdmin() {
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cbt');
        console.log('Connected to database');

        // Check if admin already exists
        const existingAdmin = await User.findOne({ username: 'admin' });
        
        if (existingAdmin) {
            console.log('Admin user already exists. Updating password...');
            existingAdmin.password = 'admin123';
            existingAdmin.isDefaultAdmin = true;
            existingAdmin.canDeleteDefaultAdmin = true;
            await existingAdmin.save();
            console.log('Admin password updated successfully');
        } else {
            // Create new admin user
            const adminUser = new User({
                username: 'admin',
                password: 'admin123',
                role: 'admin',
                fullName: 'System Administrator',
                email: 'admin@healthschool.com',
                createdAt: new Date(),
                isDefaultAdmin: true,
                canDeleteDefaultAdmin: true
            });
            
            await adminUser.save();
            console.log('Default admin user created successfully');
        }

        // Verify the admin user
        const admin = await User.findOne({ username: 'admin' });
        console.log('Admin user details:', {
            username: admin.username,
            role: admin.role,
            isDefaultAdmin: admin.isDefaultAdmin,
            fullName: admin.fullName
        });

        console.log('\n✅ Default admin credentials:');
        console.log('Username: admin');
        console.log('Password: admin123');

    } catch (error) {
        console.error('Error creating admin user:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed');
    }
}

createDefaultAdmin(); 