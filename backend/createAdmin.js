import mongoose from 'mongoose';
import User from './models/User.js';
import { hashPassword } from './utils/auth.js';
import dotenv from 'dotenv';

dotenv.config();

const createAdmin = async () => {
  try {
    // Connect to MongoDB Atlas
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      console.error(' MONGODB_URI is not defined in .env file');
      process.exit(1);
    }
    
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB Atlas');
    console.log(`Database: ${mongoose.connection.name}`);

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@jutaghar.com' });
    if (existingAdmin) {
      console.log('Admin user already exists!');
      console.log('Deleting and recreating with correct password...');
      await User.deleteOne({ email: 'admin@jutaghar.com' });
    }

    // Hash the password
    const hashedPassword = await hashPassword('admin123');

    // Create admin user
    const admin = new User({
      fullName: 'Admin User',
      email: 'admin@jutaghar.com',
      password: hashedPassword,
      phone: '9876543210',
      role: 'admin',
      status: 'active'
    });

    await admin.save();
    console.log('Admin user created successfully!');
    console.log('-----------------------------------');
    console.log('Email: admin@jutaghar.com');
    console.log('Password: admin123');
    console.log('-----------------------------------');
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error.message);
    process.exit(1);
  }
};

createAdmin();
