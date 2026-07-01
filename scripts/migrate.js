require('./dnsSet');
const mongoose = require('mongoose');

const migrations = [
  {
    name: 'sample_migration',
    up: async () => {
      console.log('  Running sample migration...');
    },
    down: async () => {
      console.log('  Rolling back sample migration...');
    },
  },
];

const migrate = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database.\n');

    const args = process.argv.slice(2);
    const direction = args.includes('--down') ? 'down' : 'up';

    console.log(`Running migrations (${direction})...\n`);

    for (const migration of migrations) {
      console.log(`  ${migration.name}:`);
      await migration[direction]();
      console.log('  ✅ Done.\n');
    }

    console.log('All migrations complete.\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
};

migrate();