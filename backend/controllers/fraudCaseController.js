const FraudCase = require('../models/FraudCase');
const RiskEvent = require('../models/RiskEvent');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ─── GET /api/cases ───────────────────────────────────────────────────────────
exports.getAllCases = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status)   filter.status   = req.query.status;
  if (req.query.severity) filter.severity = req.query.severity;

  const cases = await FraudCase.find(filter)
    .populate('employeeId',  'name email role')
    .populate('assignedTo',  'name email')
    .populate('resolvedBy',  'name')
    .sort({ createdAt: -1 });

  res.json({ success: true, count: cases.length, cases });
});

// ─── POST /api/cases ──────────────────────────────────────────────────────────
exports.createCase = asyncHandler(async (req, res) => {
  const { employeeId, type, severity, title, description, linkedRiskEventIds } = req.body;
  if (!employeeId) return res.status(400).json({ success: false, message: 'employeeId is required.' });

  const fraudCase = await FraudCase.create({
    employeeId,
    assignedTo:  req.user.id,
    type:        type       || 'OTHER',
    severity:    severity   || 'MEDIUM',
    title:       title      || 'Fraud Investigation',
    description: description|| '',
    linkedRiskEventIds: linkedRiskEventIds || [],
    timeline: [{
      action: 'CASE_OPENED',
      note:   description || 'Case opened by staff.',
      performedBy: req.user.id,
    }],
  });

  // Create alert for other staff
  const { createAlert } = require('../services/alertService');
  await createAlert({
    type: 'NEW_FRAUD_CASE',
    severity: 'WARNING',
    employeeId,
    message: `New ${severity || 'MEDIUM'} fraud case opened: ${title || 'Fraud Investigation'}`,
    linkedCaseId: fraudCase._id,
  });

  res.status(201).json({ success: true, fraudCase });
});

// ─── PUT /api/cases/:id ───────────────────────────────────────────────────────
exports.updateCase = asyncHandler(async (req, res) => {
  const { status, severity, assignedTo, note, resolution } = req.body;
  const fraudCase = await FraudCase.findById(req.params.id);
  if (!fraudCase) return res.status(404).json({ success: false, message: 'Case not found.' });

  if (status)     fraudCase.status   = status;
  if (severity)   fraudCase.severity = severity;
  if (assignedTo) fraudCase.assignedTo = assignedTo;
  if (resolution) {
    fraudCase.resolution = resolution;
    fraudCase.resolvedAt = new Date();
    fraudCase.resolvedBy = req.user.id;
  }

  // Append to timeline
  if (note || status) {
    fraudCase.timeline.push({
      action:      status || 'NOTE_ADDED',
      note:        note  || `Status changed to ${status}`,
      performedBy: req.user.id,
    });
  }

  await fraudCase.save();
  res.json({ success: true, fraudCase });
});

// ─── GET /api/cases/:id/analyze ─────────────────────────────────────────────
// Gemini analyzes the full case context and returns a scam pattern summary
exports.analyzeCase = asyncHandler(async (req, res) => {
  const fraudCase = await FraudCase.findById(req.params.id)
    .populate('employeeId', 'name email')
    .populate('linkedRiskEventIds');

  if (!fraudCase) return res.status(404).json({ success: false, message: 'Case not found.' });

  // Fetch recent risk events for this employee
  const recentEvents = await RiskEvent.find({ employeeId: fraudCase.employeeId._id })
    .sort({ createdAt: -1 })
    .limit(20);

  const eventSummary = recentEvents.map(e =>
    `- ${new Date(e.createdAt).toISOString()}: Score ${e.riskScore}, Codes: [${e.riskCodes.join(', ')}], IP: ${e.ip}, Device: ${e.deviceId}`
  ).join('\n');

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `
You are a senior bank fraud analyst AI assistant. Analyze this fraud case and provide a concise report.

CASE DETAILS:
- Employee: ${fraudCase.employeeId?.name} (${fraudCase.employeeId?.email})
- Case Type: ${fraudCase.type}
- Severity: ${fraudCase.severity}
- Status: ${fraudCase.status}
- Description: ${fraudCase.description || 'N/A'}

RECENT RISK EVENTS (last 20):
${eventSummary || 'No recent events found.'}

Provide:
1. PATTERN ANALYSIS (2-3 sentences): What attack pattern do you see?
2. THREAT ASSESSMENT (1-2 sentences): How serious is this?
3. RECOMMENDED ACTIONS (bulleted list of 3-5 concrete steps staff should take)
4. RECOVERY STEPS (if account appears compromised, what to do)

Be specific, actionable, and professional.
`.trim();

  try {
    const result = await model.generateContent(prompt);
    const analysis = result.response.text().trim();
    fraudCase.aiSummary = analysis;
    await fraudCase.save();
    res.json({ success: true, analysis });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gemini analysis failed: ' + err.message });
  }
});

// ─── GET /api/cases/stats ─────────────────────────────────────────────────────
exports.getCaseStats = asyncHandler(async (req, res) => {
  const [open, investigating, resolved, critical] = await Promise.all([
    FraudCase.countDocuments({ status: 'OPEN' }),
    FraudCase.countDocuments({ status: 'INVESTIGATING' }),
    FraudCase.countDocuments({ status: 'RESOLVED' }),
    FraudCase.countDocuments({ severity: 'CRITICAL' }),
  ]);
  res.json({ success: true, stats: { open, investigating, resolved, critical } });
});
