require('./dnsSet');
const mongoose = require('mongoose');
const AdminAccess = require('../models/admin/AdminAccess');
const { generateRawKey, generateUrlHash, hashKey } = require('../utils/hashKey');

const generateKey = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const args = process.argv.slice(2);
    const type = args.includes('--url') ? 'url' : 'shortcut';
    const expiryDays = parseInt(args.find((a) => a.startsWith('--days='))?.split('=')[1]) || 1;

    let rawKey, hash;

    if (type === 'shortcut') {
      rawKey = generateRawKey(16);
      hash = hashKey(rawKey);
    } else {
      rawKey = generateUrlHash();
      hash = hashKey(rawKey);
    }

    await AdminAccess.create({
      hash,
      type,
      expiresAt: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000),
    });

    console.log('\n═══════════════════════════════════════');
    console.log('  Access Key Generated');
    console.log('═══════════════════════════════════════');
    console.log(`  Type: ${type}`);
    console.log(`  Key: ${rawKey}`);

    if (type === 'url') {
      const url = process.env.CLIENT_URL || 'http://localhost:3000';
      console.log(`  URL: ${url}/?access=${rawKey}`);
    }

    console.log(`  Expires: ${new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()}`);
    console.log('═══════════════════════════════════════\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Failed:', error.message);
    process.exit(1);
  }
};

generateKey();