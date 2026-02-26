#!/usr/bin/env node

/**
 * Seed Test Accounts for PayrollGuard Demo
 *
 * Usage: node scripts/seedTestAccounts.js
 *
 * Creates 2 test accounts:
 * 1. Employee - john.doe@company.com  (role: employee)
 * 2. Admin    - admin.security@company.com (role: admin)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const RiskEvent = require('../models/RiskEvent');

const testAccounts = [
  {
    name: 'John Doe',
    email: 'john.doe@company.com',
    passwordHash: 'SecurePass123!',
    role: 'employee',
    bankAccount: {
      accountNumber: '9876543210',
      routingNumber: '021000021',
      bankName: 'JPMorgan Chase Bank, N.A.',
    },
    baselineBankAccount: {
      accountNumber: '9876543210',
      routingNumber: '021000021',
      bankName: 'JPMorgan Chase Bank, N.A.',
    },
    address: {
      street: '123 Main Street',
      city: 'New York',
      state: 'NY',
      zip: '10001',
      country: 'US',
    },
    knownIPs: ['192.168.1.100'],
    knownDeviceIds: ['MacBook-Pro-2023'],
  },
  {
    name: 'Security Team',
    email: 'admin.security@company.com',
    passwordHash: 'AdminPass789!',
    role: 'admin',
    bankAccount: {
      accountNumber: '5555555555',
      routingNumber: '021000021',
      bankName: 'JPMorgan Chase Bank, N.A.',
    },
    address: {
      street: '456 Security Ave',
      city: 'New York',
      state: 'NY',
      zip: '10002',
      country: 'US',
    },
    knownIPs: ['192.168.1.101'],
    knownDeviceIds: ['Admin-Desktop-001'],
  },
];

const seedAccounts = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Delete existing test accounts
    const existingEmails = testAccounts.map(acc => acc.email);
    const deleteResult = await Employee.deleteMany({ email: { $in: existingEmails } });
    if (deleteResult.deletedCount > 0) {
      console.log(`⚠️  Deleted ${deleteResult.deletedCount} existing test account(s)\n`);
    }

    console.log('📝 Creating test accounts...\n');

    let johnDoeEmployee = null;
    for (const account of testAccounts) {
      const employee = await Employee.create(account);
      if (account.email === 'john.doe@company.com') {
        johnDoeEmployee = employee;
      }
      console.log(`✅ Created ${account.role.toUpperCase()}: ${account.email}`);
      console.log(`   ├─ ID:      ${employee._id}`);
      console.log(`   ├─ Name:    ${employee.name}`);
      console.log(`   ├─ Role:    ${employee.role}`);
      console.log(`   ├─ Bank:    ${employee.bankAccount.bankName}`);
      console.log(`   ├─ Routing: ${employee.bankAccount.routingNumber}`);
      console.log(`   ├─ Account: ${employee.bankAccount.accountNumber}`);
      console.log(`   ├─ City:    ${employee.address.city}, ${employee.address.state}`);
      console.log(`   ├─ IPs:     ${employee.knownIPs.join(', ')}`);
      console.log(`   └─ Devices: ${employee.knownDeviceIds.join(', ')}\n`);
    }

    // Pre-seed a high-risk fraud RiskEvent for demo purposes
    console.log('🎯 Pre-seeding 100/100 fraud scenario...\n');

    const fraudRiskEvent = await RiskEvent.create({
      employeeId: johnDoeEmployee._id,
      ip: '45.33.32.156',
      deviceId: 'unknown-device',
      action: 'BANK_ACCOUNT_CHANGE_ATTEMPT',
      riskScore: 100,
      riskCodes: [
        'UNKNOWN_IP',
        'UNKNOWN_DEVICE',
        'UNUSUAL_HOUR',
        'CLIPBOARD_PASTE_DETECTED',
        'DIRECT_NAVIGATION',
        'BASELINE_DEVIATION_ROUTING',
      ],
      aiExplanation:
        'Multiple high-risk signals detected: unknown IP from VPN (Netherlands), unknown device, ' +
        'suspicious hour (2:47am), rapid clipboard paste, direct navigation to sensitive form, ' +
        'prepaid card routing number. Pattern strongly indicates account compromise.',
      geminiVerdict: 'LIKELY_FRAUD',
      geminiConfidence: 98,
      geminiRecommendation: 'BLOCK',
      metadata: {
        timestamp: new Date(),
        sessionDurationSeconds: 47,
        pasteEventCount: 2,
        targetAccount: '1111111111',
        targetRouting: '073972181',
        cardType: 'PREPAID_CARD',
      },
    });

    console.log(`✅ Pre-seeded fraud RiskEvent`);
    console.log(`   ├─ Risk Score:    ${fraudRiskEvent.riskScore}/100 🔴`);
    console.log(`   ├─ Verdict:       ${fraudRiskEvent.geminiVerdict}`);
    console.log(`   ├─ Confidence:    ${fraudRiskEvent.geminiConfidence}%`);
    console.log(`   ├─ Signals:       ${fraudRiskEvent.riskCodes.join(', ')}`);
    console.log(`   └─ Recommendation: ${fraudRiskEvent.geminiRecommendation}\n`);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎬 ACCOUNTS READY FOR DEMO\n');

    console.log('📋 EMPLOYEE (Green Path)');
    console.log('─────────────────────────────────────────');
    console.log('  Email:    john.doe@company.com');
    console.log('  Password: SecurePass123!');
    console.log('  Role:     employee');
    console.log('  Routing:  021000021 (JPMorgan)');
    console.log('  Expected: ✅ AUTO_APPROVE (known IP + known device)\n');

    console.log('📋 ADMIN (Dashboard)');
    console.log('─────────────────────────────────────────');
    console.log('  Email:    admin.security@company.com');
    console.log('  Password: AdminPass789!');
    console.log('  Role:     admin');
    console.log('  Expected: View pending reviews, fraud cases, surge sim\n');

    console.log('⚠️  ATTACKER SCENARIO (Red Path — use incognito)');
    console.log('─────────────────────────────────────────');
    console.log('  Same email/password as employee');
    console.log('  Routing:  073972181  ← prepaid card');
    console.log('  Account:  1111111111');
    console.log('  Expected: 🔴 BLOCKED or sent to admin review\n');

    console.log('Next steps:');
    console.log('  1. cd backend && npm run dev');
    console.log('  2. cd frontend && npm run dev');
    console.log('  3. Open normal window + incognito window');
    console.log('  4. Follow the 3-act demo flow\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding accounts:', err.message);
    process.exit(1);
  }
};

seedAccounts();
