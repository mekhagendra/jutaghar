import mongoose from 'mongoose';
import crypto from 'crypto';
import User from './models/User.js';
import { hashPassword } from './utils/auth.js';
import dotenv from 'dotenv';

dotenv.config();

const createAdmin = async () => {
  try {
    // Connect to MongoDB Atlas
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      console.error('MONGODB_URI is not defined in .env file');
      process.exit(1);
    }

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@jutaghar.com';
    let adminPassword = process.env.ADMIN_PASSWORD;
    let passwordGenerated = false;

    if (!adminPassword) {
      adminPassword = crypto.randomBytes(15).toString('base64url').slice(0, 20);
      passwordGenerated = true;
      console.warn('WARNING: ADMIN_PASSWORD is not set. A random password has been generated.');
      console.warn('Store it securely — it will not be shown again.');
    }
    
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB Atlas');
    console.log(`Database: ${mongoose.connection.name}`);

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log('Admin user already exists!');
      console.log('Deleting and recreating...');
      await User.deleteOne({ email: adminEmail });
    }

    // Hash the password
    const hashedPassword = await hashPassword(adminPassword);

    // Create admin user
    const admin = new User({
      fullName: 'Admin User',
      email: adminEmail,
      password: hashedPassword,
      phone: '9876543210',
      role: 'admin',
      status: 'active'
    });

    await admin.save();
    console.log('Admin user created successfully!');
    console.log('-----------------------------------');
    console.log(`Email: ${adminEmail}`);
    if (passwordGenerated) {
      console.log(`Password: ${adminPassword}`);
      console.log('(generated — set ADMIN_PASSWORD in .env to control this)');
    } else {
      console.log('Password: (set via ADMIN_PASSWORD env var)');
    }
    console.log('-----------------------------------');
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error.message);
    process.exit(1);
  }
};

createAdmin();

