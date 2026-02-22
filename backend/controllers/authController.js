const Employee = require('../models/Employee');
const { notifyEmployee } = require('../services/notificationService');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// POST /api/auth/register
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
  }

  const exists = await Employee.findOne({ email });
  if (exists) return res.status(409).json({ success: false, message: 'Email already registered.' });

  const employee = await Employee.create({ name, email, passwordHash: password, role: 'employee' });
  sendTokenResponse(employee, 201, res);
});

// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const employee = await Employee.findOne({ email }).select('+passwordHash');
  if (!employee) return res.status(401).json({ success: false, message: 'Invalid credentials.' });

  const match = await employee.matchPassword(password);
  if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials.' });

  if (!employee.isActive) {
    return res.status(403).json({ success: false, message: 'Account is disabled.' });
  }
  if (employee.isFrozen) {
    return res.status(403).json({ success: false, message: `Account is frozen by security staff. Reason: ${employee.frozenReason || 'Contact your security team.'}` });
  }

  // ── Detect new IP or device → send "new sign-in" notification ──────────────
  const ip       = req.ip || req.headers['x-forwarded-for'] || '0.0.0.0';
  const deviceId = req.headers['x-device-id'] || 'UNKNOWN';
  const isNewIP     = !employee.knownIPs.includes(ip);
  const isNewDevice = deviceId !== 'UNKNOWN' && !employee.knownDeviceIds.includes(deviceId);

  if (isNewIP || isNewDevice) {
    // Fire-and-forget notification
    notifyEmployee(employee, 'NEW_LOGIN', { ip, device: deviceId }).catch(() => {});
  }

  sendTokenResponse(employee, 200, res);
});

// POST /api/auth/logout
exports.logout = asyncHandler(async (req, res) => {
  res.cookie('token', 'none', { expires: new Date(Date.now() + 10 * 1000), httpOnly: true });
  res.json({ success: true, message: 'Logged out.' });
});

// GET /api/auth/me
exports.getMe = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.user.id);
  res.json({ success: true, employee: {
    id: employee._id,
    name: employee.name,
    email: employee.email,
    role: employee.role,
    needsOnboarding: employee.role === 'employee' && !(employee.bankAccount && employee.bankAccount.accountNumber)
  } });
});

// ─── Shared JWT helper ────────────────────────────────────────────────────────
const jwt = require('jsonwebtoken');

const sendTokenResponse = (employee, statusCode, res) => {
  const token = jwt.sign(
    { id: employee._id, role: employee.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );

  const isProduction = process.env.NODE_ENV === 'production';
  res.status(statusCode)
    .cookie('token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    .json({
      success: true,
      employee: {
        id:    employee._id,
        name:  employee.name,
        email: employee.email,
        role:  employee.role,
        needsOnboarding: employee.role === 'employee' && !(employee.bankAccount && employee.bankAccount.accountNumber)
      },
    });
};
