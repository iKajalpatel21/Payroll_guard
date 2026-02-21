require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middleware/errorHandler');

// ── Route imports ──────────────────────────────────────────────────────────────
const authRoutes       = require('./routes/authRoutes');
const riskRoutes       = require('./routes/riskRoutes');
const managerRoutes    = require('./routes/managerRoutes');
const auditRoutes      = require('./routes/auditRoutes');
const payrollRoutes    = require('./routes/payrollRoutes');
const fraudCaseRoutes  = require('./routes/fraudCaseRoutes');
const alertRoutes      = require('./routes/alertRoutes');
const recoveryRoutes   = require('./routes/recoveryRoutes');

const app = express();

// ── Security Headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true, // needed for HTTP-only cookie
  })
);

// ── Rate Limiter (global) ─────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use(limiter);

// Stricter limiter on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many authentication attempts.' },
});

// ── Body + Cookie Parsing ─────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ success: true, message: 'PayrollGuard API is healthy 🛡️' }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',       authLimiter, authRoutes);
app.use('/api/risk-check', riskRoutes);
app.use('/api/manager',    managerRoutes);
app.use('/api/audit',      auditRoutes);
app.use('/api/payroll',    payrollRoutes);
app.use('/api/cases',      fraudCaseRoutes);
app.use('/api/alerts',     alertRoutes);
app.use('/api/recovery',   recoveryRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});

// ── Error Handler (must be last) ─────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
