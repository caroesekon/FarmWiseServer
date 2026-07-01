require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
require('./dnsSet');
const mongoose = require('mongoose');
const readline = require('readline');
const AdminAccess = require('../models/admin/AdminAccess');
const User = require('../models/client/User');
const Farm = require('../models/client/Farm');
const { normalizePhone, isValidEmail } = require('../utils/validators');
const generatePassword = require('../utils/generatePassword');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) => {
  return new Promise((resolve) => rl.question(query, resolve));
};

const showMenu = () => {
  console.log('\n═══════════════════════════════════════');
  console.log('       FarmWise Admin CLI');
  console.log('═══════════════════════════════════════');
  console.log('  SUPER ADMINS');
  console.log('    1.  Create Super Admin');
  console.log('    2.  List Super Admins');
  console.log('    3.  Remove Super Admin');
  console.log('');
  console.log('  FARM ADMINS');
  console.log('    4.  Create Farm Admin');
  console.log('    5.  List Farm Admins');
  console.log('    6.  Suspend Farm Admin');
  console.log('    7.  Activate Farm Admin');
  console.log('    8.  Delete Farm Admin');
  console.log('    9.  Reset Farm Admin Password');
  console.log('    10. List All Farms');
  console.log('');
  console.log('  DATABASE');
  console.log('    11. List DB Collections');
  console.log('    12. Drop DB Collection');
  console.log('    13. Drop Entire Database');
  console.log('');
  console.log('    0.  Exit');
  console.log('═══════════════════════════════════════\n');
};

const createSuperAdmin = async () => {
  console.log('\n[Create Super Admin]');

  const name = await question('  Full Name: ');
  if (!name) {
    console.log('  Name is required.');
    return;
  }

  const email = await question('  Email: ');
  if (!email) {
    console.log('  Email is required.');
    return;
  }

  if (!isValidEmail(email)) {
    console.log('  Invalid email format.');
    return;
  }

  const existing = await AdminAccess.findOne({ email: email.toLowerCase() });
  if (existing) {
    console.log('  A super admin with this email already exists.');
    return;
  }

  const password = await question('  Password (leave blank to auto-generate): ');
  const finalPassword = password || generatePassword();

  await AdminAccess.create({
    name,
    email: email.toLowerCase(),
    password: finalPassword,
    role: 'superAdmin',
  });

  console.log('\n  ✅ Super Admin created:');
  console.log(`  Name: ${name}`);
  console.log(`  Email: ${email.toLowerCase()}`);
  console.log(`  Password: ${finalPassword}`);
};

const listSuperAdmins = async () => {
  console.log('\n[Super Admins]');
  const admins = await AdminAccess.find().sort({ createdAt: -1 });

  if (admins.length === 0) {
    console.log('  No super admins found.');
    return;
  }

  admins.forEach((admin, index) => {
    console.log(`  ${index + 1}. ${admin.name} | ${admin.email} | Role: ${admin.role} | Status: ${admin.status} | Created: ${admin.createdAt.toISOString().split('T')[0]}`);
  });
};

const removeSuperAdmin = async () => {
  const email = await question('\n  Email of Super Admin to remove: ');
  if (!email) return;

  const admin = await AdminAccess.findOne({ email: email.toLowerCase() });

  if (!admin) {
    console.log('  Super admin not found.');
    return;
  }

  const count = await AdminAccess.countDocuments();
  if (count <= 1) {
    console.log('  Cannot remove the last super admin.');
    return;
  }

  const confirm = await question(`  Remove ${admin.name} (${admin.email})? Type "YES" to confirm: `);

  if (confirm !== 'YES') {
    console.log('  Cancelled.');
    return;
  }

  await admin.deleteOne();
  console.log(`  ✅ ${admin.name} removed.`);
};

const createFarmAdmin = async () => {
  console.log('\n[Create Farm Admin]');

  const name = await question('  Full Name: ');
  if (!name) {
    console.log('  Name is required.');
    return;
  }

  const email = await question('  Email: ');
  const phone = await question('  Phone (+254...): ');

  if (!email && !phone) {
    console.log('  Either email or phone is required.');
    return;
  }

  const farmName = await question('  Farm Name: ');
  if (!farmName) {
    console.log('  Farm name is required.');
    return;
  }

  const county = await question('  County: ');
  if (!county) {
    console.log('  County is required.');
    return;
  }

  const subCounty = await question('  Sub-County (optional): ');

  if (email) {
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      console.log('  A user with this email already exists.');
      return;
    }
  }

  if (phone) {
    const normalizedPhone = normalizePhone(phone);
    const existingPhone = await User.findOne({ phone: normalizedPhone });
    if (existingPhone) {
      console.log('  A user with this phone number already exists.');
      return;
    }
  }

  const password = generatePassword();

  const farm = await Farm.create({
    name: farmName,
    location: {
      county,
      subCounty: subCounty || '',
    },
  });

  const user = await User.create({
    name,
    email: email ? email.toLowerCase() : undefined,
    phone: phone ? normalizePhone(phone) : undefined,
    password,
    role: 'farmAdmin',
    farmId: farm._id,
    status: 'active',
  });

  farm.owner = user._id;
  await farm.save();

  console.log('\n  ✅ Farm Admin created:');
  console.log(`  Name: ${user.name}`);
  console.log(`  Email: ${user.email || 'N/A'}`);
  console.log(`  Phone: ${user.phone || 'N/A'}`);
  console.log(`  Farm: ${farm.name}`);
  console.log(`  Password: ${password}`);
};

const listFarmAdmins = async () => {
  console.log('\n[Farm Admins]');
  const users = await User.find({ role: 'farmAdmin' }).sort({ createdAt: -1 });

  if (users.length === 0) {
    console.log('  No farm admins found.');
    return;
  }

  for (const user of users) {
    const farm = await Farm.findOne({ owner: user._id }).select('name');
    console.log(`  ${user.name} | ${user.email || user.phone || 'N/A'} | Farm: ${farm?.name || 'N/A'} | Status: ${user.status} | Created: ${user.createdAt.toISOString().split('T')[0]}`);
  }
};

const suspendFarmAdmin = async () => {
  const identifier = await question('\n  Email or Phone of Farm Admin to suspend: ');
  if (!identifier) return;

  const user = await User.findOne({
    role: 'farmAdmin',
    $or: [{ email: identifier }, { phone: identifier }],
  });

  if (!user) {
    console.log('  Farm admin not found.');
    return;
  }

  user.status = 'suspended';
  await user.save();

  console.log(`  ✅ ${user.name} has been suspended.`);
};

const activateFarmAdmin = async () => {
  const identifier = await question('\n  Email or Phone of Farm Admin to activate: ');
  if (!identifier) return;

  const user = await User.findOne({
    role: 'farmAdmin',
    $or: [{ email: identifier }, { phone: identifier }],
  });

  if (!user) {
    console.log('  Farm admin not found.');
    return;
  }

  user.status = 'active';
  await user.save();

  console.log(`  ✅ ${user.name} has been activated.`);
};

const deleteFarmAdmin = async () => {
  const identifier = await question('\n  Email or Phone of Farm Admin to delete: ');
  if (!identifier) return;

  const user = await User.findOne({
    role: 'farmAdmin',
    $or: [{ email: identifier }, { phone: identifier }],
  });

  if (!user) {
    console.log('  Farm admin not found.');
    return;
  }

  const confirm = await question(`  ⚠️  This will delete ${user.name}, their farm, and ALL data. Type "DELETE" to confirm: `);

  if (confirm !== 'DELETE') {
    console.log('  Cancelled.');
    return;
  }

  await Farm.deleteMany({ owner: user._id });
  await User.deleteMany({ farmId: user.farmId });

  const models = [
    'Animal', 'HealthRecord', 'Vaccination', 'Production', 'Breeding',
    'Field', 'Crop', 'Inventory', 'Equipment', 'Finance', 'Task', 'Alert', 'Notification',
  ];

  for (const modelName of models) {
    const Model = require(`../models/client/${modelName}`);
    await Model.deleteMany({ farmId: user.farmId });
  }

  await user.deleteOne();

  console.log(`  ✅ ${user.name} and all associated data deleted.`);
};

const resetFarmAdminPassword = async () => {
  const identifier = await question('\n  Email or Phone of Farm Admin: ');
  if (!identifier) return;

  const user = await User.findOne({
    role: 'farmAdmin',
    $or: [{ email: identifier }, { phone: identifier }],
  });

  if (!user) {
    console.log('  Farm admin not found.');
    return;
  }

  const newPassword = generatePassword();
  user.password = newPassword;
  await user.save();

  console.log(`  ✅ Password reset for ${user.name}`);
  console.log(`  New Password: ${newPassword}`);
};

const listFarms = async () => {
  console.log('\n[All Farms]');
  const farms = await Farm.find().sort({ createdAt: -1 }).populate('owner', 'name email phone');

  if (farms.length === 0) {
    console.log('  No farms found.');
    return;
  }

  for (const farm of farms) {
    console.log(`  ${farm.name} | Owner: ${farm.owner?.name || 'N/A'} | County: ${farm.location?.county || 'N/A'} | Status: ${farm.status}`);
  }
};

const listCollections = async () => {
  console.log('\n[Database Collections]');
  const collections = await mongoose.connection.db.listCollections().toArray();

  if (collections.length === 0) {
    console.log('  No collections found.');
    return;
  }

  collections.forEach((col, index) => {
    console.log(`  ${index + 1}. ${col.name}`);
  });
};

const dropCollection = async () => {
  const collectionName = await question('\n  Collection name to drop: ');
  if (!collectionName) return;

  const collections = await mongoose.connection.db.listCollections({ name: collectionName }).toArray();

  if (collections.length === 0) {
    console.log(`  Collection "${collectionName}" not found.`);
    return;
  }

  const confirm = await question(`  ⚠️  This will permanently delete "${collectionName}". Type "DROP" to confirm: `);

  if (confirm !== 'DROP') {
    console.log('  Cancelled.');
    return;
  }

  await mongoose.connection.db.dropCollection(collectionName);
  console.log(`  ✅ Collection "${collectionName}" dropped.`);
};

const dropDatabase = async () => {
  console.log('\n  ⚠️  WARNING: This will delete ALL data permanently.');
  const confirm = await question('  Type the database name to confirm: ');

  const dbName = mongoose.connection.db.databaseName;

  if (confirm !== dbName) {
    console.log('  Cancelled. Database name did not match.');
    return;
  }

  const finalConfirm = await question(`  Are you absolutely sure? Type "YES DELETE EVERYTHING": `);

  if (finalConfirm !== 'YES DELETE EVERYTHING') {
    console.log('  Cancelled.');
    return;
  }

  await mongoose.connection.db.dropDatabase();
  console.log('  ✅ Database dropped. Restart the server to reconnect.');
  process.exit(0);
};

const main = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('  MONGODB_URI is not set in .env file');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('  Connected to database.\n');

    let running = true;

    while (running) {
      showMenu();
      const choice = await question('  Select an option: ');

      switch (choice) {
        case '1':
          await createSuperAdmin();
          break;
        case '2':
          await listSuperAdmins();
          break;
        case '3':
          await removeSuperAdmin();
          break;
        case '4':
          await createFarmAdmin();
          break;
        case '5':
          await listFarmAdmins();
          break;
        case '6':
          await suspendFarmAdmin();
          break;
        case '7':
          await activateFarmAdmin();
          break;
        case '8':
          await deleteFarmAdmin();
          break;
        case '9':
          await resetFarmAdminPassword();
          break;
        case '10':
          await listFarms();
          break;
        case '11':
          await listCollections();
          break;
        case '12':
          await dropCollection();
          break;
        case '13':
          await dropDatabase();
          break;
        case '0':
          running = false;
          console.log('\n  Goodbye.\n');
          break;
        default:
          console.log('  Invalid option.');
      }
    }

    await mongoose.connection.close();
    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('  Fatal error:', error.message);
    process.exit(1);
  }
};

main();