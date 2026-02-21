/**
 * Surge Simulator – Seed Attack Script
 * Run: node scripts/seedAttacks.js
 *
 * Inserts 100+ fake RiskEvent documents to simulate an attack wave.
 * Requires MONGO_URI in backend/.env
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const RiskEvent = require('../models/RiskEvent');
const Employee = require('../models/Employee');

const ATTACK_IPS = [
  '45.33.32.156', '104.21.14.1', '198.51.100.77',
  '203.0.113.42', '192.0.2.100', '10.20.30.40',
  '172.16.254.1', '192.168.100.200',
];
const ATTACK_DEVICES = ['BOT_001', 'BOT_002', 'BOT_003', 'SCRAPR_X', 'PHANTOM_DEV'];
const RISK_CODES_POOL = [
  ['UNKNOWN_IP', 'UNKNOWN_DEVICE', 'BURST_ACTIVITY'],
  ['UNKNOWN_IP', 'BURST_ACTIVITY'],
  ['UNKNOWN_DEVICE', 'HIGH_HISTORICAL_RISK'],
  ['BURST_ACTIVITY', 'ELEVATED_FREQUENCY'],
  ['UNKNOWN_IP'],
];

const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const seedAttacks = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB Atlas');

    // Find all employees to spread attacks across
    const employees = await Employee.find({}, '_id');
    if (employees.length === 0) {
      console.warn('⚠️  No employees found. Register at least one employee first, then re-run this script.');
      process.exit(0);
    }

    const attacks = [];
    const now = Date.now();

    for (let i = 0; i < 120; i++) {
      const employee = randomItem(employees);
      const riskCodes = randomItem(RISK_CODES_POOL);
      const riskScore = randomInt(55, 100);
      // Spread timestamps over the last 2 hours so the burst detector fires
      const createdAt = new Date(now - randomInt(0, 2 * 60 * 60 * 1000));

      attacks.push({
        employeeId: employee._id,
        ip: randomItem(ATTACK_IPS),
        deviceId: randomItem(ATTACK_DEVICES),
        action: 'SIMULATED_ATTACK',
        riskScore,
        riskCodes,
        aiExplanation: 'Simulated attack event inserted by surge simulator.',
        createdAt,
        updatedAt: createdAt,
      });
    }

    await RiskEvent.insertMany(attacks);
    console.log(`✅ Successfully inserted ${attacks.length} simulated attack events.`);
    console.log('   Open your Admin Dashboard to see the risk activity light up!');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
    process.exit(0);
  }
};

seedAttacks();
