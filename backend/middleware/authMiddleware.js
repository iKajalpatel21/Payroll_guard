const jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');

/**
 * Protect – verifies JWT from the HTTP-only cookie.
 * Attaches req.user = { id, role }.
 */
exports.protect = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authenticated. Please log in.' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

/**
 * Authorize – restricts access to specified roles.
 * Usage: authorize('admin', 'manager')
 */
exports.authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({
      success: false,
      message: `Role '${req.user?.role}' is not permitted to access this resource.`,
    });
  }
  next();
};
