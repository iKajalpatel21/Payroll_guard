const jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ─── Utility: send JWT as HTTP-only cookie ───────────────────────────────────
const sendTokenResponse = (employee, statusCode, res) => {
  const token = jwt.sign(
    { id: employee._id, role: employee.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  };

  res.status(statusCode).cookie('token', token, cookieOptions).json({
    success: true,
    employee: {
      _id:   employee._id,
      name:  employee.name,
      email: employee.email,
      role:  employee.role,
    },
  });
};

// ─── POST /api/auth/register ─────────────────────────────────────────────────
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'name, email, and password are required.' });
  }

  const existing = await Employee.findOne({ email });
  if (existing) {
    return res.status(409).json({ success: false, message: 'Email already registered.' });
  }

  const employee = await Employee.create({
    name,
    email,
    passwordHash: password,   // pre-save hook will hash this
    role: role || 'employee',
    knownIPs:       [req.ip],
    knownDeviceIds: [req.headers['x-device-id'] || 'WEB_BROWSER'],
  });

  sendTokenResponse(employee, 201, res);
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const employee = await Employee.findOne({ email }).select('+passwordHash');
  if (!employee || !(await employee.matchPassword(password))) {
    return res.status(401).json({ success: false, message: 'Invalid credentials.' });
  }

  if (!employee.isActive) {
    return res.status(403).json({ success: false, message: 'Account is disabled.' });
  }
  if (employee.isFrozen) {
    return res.status(403).json({ success: false, message: `Account is frozen by security staff. Reason: ${employee.frozenReason || 'Contact your security team.'}` });
  }

  sendTokenResponse(employee, 200, res);
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
exports.logout = asyncHandler(async (req, res) => {
  res.clearCookie('token').json({ success: true, message: 'Logged out.' });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
exports.getMe = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.user.id);
  res.json({ success: true, employee });
});
