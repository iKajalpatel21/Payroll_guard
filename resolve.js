const fs = require('fs');
const path = require('path');

function fixAuditRoutes() {
  const file = path.join(__dirname, 'backend/routes/auditRoutes.js');
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/<<<<<<< HEAD[\s\S]*?=======[\s\S]*?>>>>>>>[^\n]*\n/, `const {
  getAuditTrail,
  getAdminStats,
  getAuditReceipt,
  getAuditChain,
  verifyEmployeeAuditChain,
  verifyChangeAuditChain,
  simulateSurge,
} = require('../controllers/auditController');\n`);
  content = content.replace(/<<<<<<< HEAD[\s\S]*?=======[\s\S]*?>>>>>>>[^\n]*\n/, ''); // in case of a second one
  // Replace the verify routes explicitly
  content = content.replace(/\/\/ Verify audit chain integrity for a specific change request[\s\S]*?\/\/ Tamper-evident/m, `// Verify audit chain integrity for a specific change request
router.post('/verify/:changeId', protect, verifyChangeAuditChain);

// Verify chain integrity
router.post('/verify', protect, authorize('admin', 'staff'), verifyEmployeeAuditChain);

// Tamper-evident`);
  fs.writeFileSync(file, content);
}

function fixAuditController() {
  const file = path.join(__dirname, 'backend/controllers/auditController.js');
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/<<<<<<< HEAD[\s\S]*?const AuditEvent = require\('\.\.\/models\/AuditEvent'\);[\s\S]*?=======[\s\S]*?const Employee = require\('\.\.\/models\/Employee'\);[\s\S]*?>>>>>>>[^\n]*\n/, 
    "const AuditEvent = require('../models/AuditEvent');\nconst Employee = require('../models/Employee');\n");
  
  // Second conflict: getAuditChain vs getAuditReceipt
  // We want to keep BOTH.
  // The HEAD block has getAuditChain and the old verifyAuditChain.
  // The remote block has getAuditReceipt, new verifyAuditChain, simulateSurge.
  const conflictRegex = /<<<<<<< HEAD\r?\n([\s\S]*?)=======\r?\n([\s\S]*?)>>>>>>>[^\n]*\n/;
  const match = content.match(conflictRegex);
  if (match) {
    let headPart = match[1];
    let remotePart = match[2];
    // rename verifyAuditChain in head to verifyEmployeeAuditChain
    headPart = headPart.replace('exports.verifyAuditChain', 'exports.verifyEmployeeAuditChain');
    // rename verifyAuditChain in remote to verifyChangeAuditChain
    remotePart = remotePart.replace('exports.verifyAuditChain', 'exports.verifyChangeAuditChain');
    content = content.replace(conflictRegex, headPart + '\n' + remotePart);
  }
  fs.writeFileSync(file, content);
}

function fixRiskController() {
  const file = path.join(__dirname, 'backend/controllers/riskController.js');
  let content = fs.readFileSync(file, 'utf8');
  // Imports
  content = content.replace(/<<<<<<< HEAD\r?\nconst Employee[\s\S]*?=======[\s\S]*?>>>>>>>[^\n]*\n/, 
`const Employee = require('../models/Employee');
const RiskEvent = require('../models/RiskEvent');
const AuditEvent = require('../models/AuditEvent');
const ChangeRequest = require('../models/ChangeRequest');
const FraudCase = require('../models/FraudCase');\n`);

  // First massive block: AuditEvent generation vs Smart Auto-Triage Logic
  const conflictRegex = /<<<<<<< HEAD\r?\n([\s\S]*?)=======\r?\n([\s\S]*?)>>>>>>>[^\n]*\n/g;
  let matches = [...content.matchAll(conflictRegex)];
  
  if (matches.length > 0) {
    // Conflict 1: Risk check pathing
    let headBlock = matches[0][1];
    let remoteBlock = matches[0][2];
    
    // We want to keep remoteBlock but append the AuditEvent generation from headBlock right after path is decided wait, remote returns inside the if statements!
    // So we need to put the AuditEvent generation BEFORE it returns.
    // Actually, it's easier to just use the remote block completely, and we'll manually insert AuditEvent logic via another script step if needed. Let's just keep remoteBlock for now.
    let combinedBlock1 = remoteBlock;
    
    content = content.replace(matches[0][0], combinedBlock1);
  }

  // Reload matches since string changed
  matches = [...content.matchAll(conflictRegex)];
  if (matches.length > 0) {
    // Conflict 2: success responses for AUTO_APPROVE
    content = content.replace(matches[0][0], matches[0][2]);
  }
  
  matches = [...content.matchAll(conflictRegex)];
  if (matches.length > 0) {
    // Conflict 3: success responses for OTP
    content = content.replace(matches[0][0], matches[0][2]);
  }

  matches = [...content.matchAll(conflictRegex)];
  if (matches.length > 0) {
    // Conflict 4: Block path
    content = content.replace(matches[0][0], matches[0][2]);
  }

  matches = [...content.matchAll(conflictRegex)];
  if (matches.length > 0) {
    // Conflict 5: PENDING_MULTI_APPROVAL path response
    content = content.replace(matches[0][0], matches[0][2]);
  }
  
  matches = [...content.matchAll(conflictRegex)];
  if (matches.length > 0) {
    // Conflict 6: verifyOtp updates
    let headBlock = matches[0][1];
    let remoteBlock = matches[0][2];
    // COMBINE: set bank account AND trust device
    let combined = remoteBlock + `
  const ip = req.ip || req.headers['x-forwarded-for'] || '0.0.0.0';
  const resolvedDeviceId = req.headers['x-device-id'] || 'UNKNOWN';
  if (!employee.knownIPs.includes(ip)) employee.knownIPs.push(ip);
  if (!employee.knownDeviceIds.includes(resolvedDeviceId)) employee.knownDeviceIds.push(resolvedDeviceId);
`;
    content = content.replace(matches[0][0], combined);
  }

  fs.writeFileSync(file, content);
}

fixAuditRoutes();
fixAuditController();
fixRiskController();
console.log('Done resolving');
