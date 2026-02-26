require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) { console.error('MONGO_URI not set'); process.exit(1); }

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const Employee = require('../models/Employee');
  const ChangeRequest = require('../models/ChangeRequest');

  // 1. Convert manager → admin
  const mgr = await mongoose.connection.collection('employees').updateMany(
    { role: 'manager' }, { $set: { role: 'admin' } }
  );
  console.log(`✅ Converted ${mgr.modifiedCount} manager(s) → admin`);

  // 2. Convert staff → admin
  const staff = await mongoose.connection.collection('employees').updateMany(
    { role: 'staff' }, { $set: { role: 'admin' } }
  );
  console.log(`✅ Converted ${staff.modifiedCount} staff → admin`);

  // 3. Convert PENDING_MANAGER → PENDING_ADMIN_REVIEW in ChangeRequest
  const cr = await mongoose.connection.collection('changerequests').updateMany(
    { status: 'PENDING_MANAGER' }, { $set: { status: 'PENDING_ADMIN_REVIEW' } }
  );
  console.log(`✅ Converted ${cr.modifiedCount} PENDING_MANAGER → PENDING_ADMIN_REVIEW`);

  // 4. Verify no invalid roles remain
  const invalid = await mongoose.connection.collection('employees').find(
    { role: { $nin: ['employee', 'admin'] } }
  ).toArray();
  if (invalid.length > 0) {
    console.warn(`⚠️  ${invalid.length} employee(s) still have invalid roles:`, invalid.map(e => `${e.email} (${e.role})`));
  } else {
    console.log('✅ All employee roles are valid (employee or admin)');
  }

  await mongoose.connection.close();
  console.log('✅ Migration complete');
}

run().catch(err => { console.error('❌ Migration failed:', err); process.exit(1); });
