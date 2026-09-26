require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');

async function createAdmin() {
  const email = process.argv[2] || 'ptvrj25@gmail.com';
  const password = process.argv[3] || 'Password123!';
  const name = process.argv[4] || 'Pruthviraj';
  const usn = process.argv[5] || '1CD21CS001';

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    let user = await User.findOne({ email: email.toLowerCase() });
    const passwordHash = await bcrypt.hash(password, 10);

    if (user) {
      user.passwordHash = passwordHash;
      user.role = 'admin';
      user.isActive = true;
      await user.save();
      console.log(`Updated existing user ${email} to admin with new password.`);
    } else {
      user = await User.create({
        name,
        usn,
        email: email.toLowerCase(),
        passwordHash,
        role: 'admin',
        isActive: true
      });
      console.log(`Created new admin user ${email} successfully.`);
    }

    console.log('User details:');
    console.log('Email:', user.email);
    console.log('Role:', user.role);
    console.log('Password set to:', password);
  } catch (err) {
    console.error('Error creating admin:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

createAdmin();
