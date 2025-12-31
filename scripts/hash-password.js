#!/usr/bin/env node

/**
 * Password Hashing Utility
 * Use this script to generate bcrypt hashes for passwords
 * 
 * Usage: node scripts/hash-password.js <plain-password>
 */

const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password) {
  console.error('Usage: node scripts/hash-password.js <plain-password>');
  process.exit(1);
}

// Generate hash with salt rounds (10 is recommended)
bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('Error hashing password:', err);
    process.exit(1);
  }
  
  console.log('\n✅ Password hash generated:');
  console.log(hash);
  console.log('\n📝 Use this hash in your database INSERT statement.\n');
});


