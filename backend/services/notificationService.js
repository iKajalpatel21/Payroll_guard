const transporter = require('../config/mailer');

/**
 * Central notification service.
 * Sends security emails to the employee's registered email.
 * Falls back to console.log in dev when SMTP is not configured.
 */

const SMTP_CONFIGURED =
  process.env.SMTP_USER &&
  process.env.SMTP_USER !== 'your_email@gmail.com' &&
  process.env.SMTP_PASS &&
  process.env.SMTP_PASS !== 'your_app_password';

const TEMPLATES = {
  NEW_LOGIN: (meta) => ({
    subject: '🔐 New sign-in to your PayrollGuard account',
    preview: `New login from ${meta.ip}`,
    body: `
      <p>Hi <strong>${meta.name}</strong>,</p>
      <p>We detected a new sign-in to your account:</p>
      <table style="background:#f1f5f9;border-radius:8px;padding:16px;width:100%;">
        <tr><td style="color:#64748b;padding:4px 0;">Time</td><td><strong>${meta.time}</strong></td></tr>
        <tr><td style="color:#64748b;padding:4px 0;">IP Address</td><td><strong>${meta.ip}</strong></td></tr>
        <tr><td style="color:#64748b;padding:4px 0;">Device</td><td><strong>${meta.device || 'Unknown'}</strong></td></tr>
      </table>
      <p style="margin-top:16px;">If this was <strong>you</strong>, no action is needed.</p>
      <p>If this was <strong>NOT you</strong>, contact your security team immediately and change your password.</p>
    `,
  }),

  CHANGE_ATTEMPT: (meta) => ({
    subject: '⚠️ Payroll account change attempt detected',
    preview: `Someone tried to change your bank details`,
    body: `
      <p>Hi <strong>${meta.name}</strong>,</p>
      <p>A request was made to change your payroll direct deposit bank details at <strong>${meta.time}</strong>.</p>
      <table style="background:#f1f5f9;border-radius:8px;padding:16px;width:100%;margin:12px 0;">
        <tr><td style="color:#64748b;padding:4px 0;">Risk Level</td><td><strong style="color:${meta.riskScore > 70 ? '#ef4444' : meta.riskScore > 30 ? '#f59e0b' : '#22c55e'}">${meta.riskLevel}</strong></td></tr>
        <tr><td style="color:#64748b;padding:4px 0;">IP Address</td><td><strong>${meta.ip}</strong></td></tr>
        <tr><td style="color:#64748b;padding:4px 0;">AI Assessment</td><td><em>${meta.aiMessage || 'Evaluating...'}</em></td></tr>
      </table>
      <p>Status: <strong>${meta.outcome}</strong></p>
      <p>If this was <strong>NOT you</strong>, call your HR/Security team immediately at your bank's fraud line.</p>
    `,
  }),

  ADDRESS_CHANGE: (meta) => ({
    subject: '📍 Your address has been updated',
    preview: 'Your mailing address was changed',
    body: `
      <p>Hi <strong>${meta.name}</strong>,</p>
      <p>Your mailing/home address was updated at <strong>${meta.time}</strong>.</p>
      <p>New address: <strong>${meta.newAddress}</strong></p>
      <p>If this was <strong>NOT you</strong>, contact your security team immediately.</p>
    `,
  }),

  CHANGE_BLOCKED: (meta) => ({
    subject: '🚨 Suspicious activity blocked on your account',
    preview: 'We blocked a high-risk change attempt',
    body: `
      <p>Hi <strong>${meta.name}</strong>,</p>
      <p style="color:#ef4444;font-weight:bold;">We automatically blocked a high-risk attempt to change your payroll bank details.</p>
      <table style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:16px;width:100%;margin:12px 0;">
        <tr><td style="color:#64748b;padding:4px 0;">Time</td><td><strong>${meta.time}</strong></td></tr>
        <tr><td style="color:#64748b;padding:4px 0;">Risk Score</td><td><strong style="color:#ef4444">${meta.riskScore}/100</strong></td></tr>
        <tr><td style="color:#64748b;padding:4px 0;">Reason</td><td><em>${meta.aiMessage}</em></td></tr>
      </table>
      <p>Our security team has been alerted and a fraud case has been opened.</p>
      <p><strong>Action required:</strong> Please contact your HR or security team to verify your identity.</p>
    `,
  }),

  PAYROLL_HELD: (meta) => ({
    subject: '⏸️ Your payroll payment has been held',
    preview: 'Action required: payroll held for security review',
    body: `
      <p>Hi <strong>${meta.name}</strong>,</p>
      <p>Your payroll payment for cycle <strong>${meta.cycleId}</strong> has been held pending a security review.</p>
      <p><strong>Reason:</strong> ${meta.reason}</p>
      <p>Your manager or HR team will review this shortly. If you believe this is in error, please contact HR directly.</p>
    `,
  }),

  ACCOUNT_FROZEN: (meta) => ({
    subject: '🔒 Your account has been frozen',
    preview: 'Security action: account frozen',
    body: `
      <p>Hi <strong>${meta.name}</strong>,</p>
      <p style="color:#ef4444;font-weight:bold;">Your PayrollGuard account has been frozen by the security team.</p>
      <p><strong>Reason:</strong> ${meta.reason}</p>
      <p>You will not be able to log in or make any changes until your account is unfrozen.</p>
      <p>Please contact your security team or HR to resolve this.</p>
    `,
  }),

  MULTI_APPROVAL_REQUESTED: (meta) => ({
    subject: '⏳ Change request locked pending review',
    preview: `A change from a new location requires approval`,
    body: `
      <p>Hi <strong>${meta.name}</strong>,</p>
      <p>A request to update your <strong>${meta.changeType}</strong> was made from an unfamiliar location or device (IP: ${meta.ip}).</p>
      <p>For your security, this change has been <strong>locked</strong> and sent to your manager and the security team for review.</p>
      <p style="margin-top:16px;">If this was <strong>you</strong>, no action is needed — you'll be notified when it's approved.</p>
      <p>If this was <strong>NOT you</strong>, contact HR immediately to report a compromised account.</p>
    `,
  }),

  APPROVAL_NEEDED: (meta) => ({
    subject: '⚠️ Review required: Team member account change',
    preview: `Approval needed for ${meta.employeeName}`,
    body: `
      <p>Hi,</p>
      <p><strong>${meta.employeeName}</strong> requested a <strong>${meta.changeType}</strong> update from an unrecognized location.</p>
      <table style="background:#f1f5f9;border-radius:8px;padding:16px;width:100%;margin:12px 0;">
        <tr><td style="color:#64748b;padding:4px 0;">IP Location</td><td><strong>${meta.geoInfo}</strong></td></tr>
        <tr><td style="color:#64748b;padding:4px 0;">Risk Score</td><td><strong style="color:${meta.riskScore > 70 ? '#ef4444' : '#f59e0b'}">${meta.riskScore}/100</strong></td></tr>
      </table>
      <p>Please log in to your dashboard to review and approve or deny this request.</p>
    `,
  }),

  CHANGE_APPROVED_BY_MANAGER: (meta) => ({
    subject: '✅ Your account change was approved',
    preview: `Your ${meta.changeType} update was approved`,
    body: `
      <p>Hi <strong>${meta.name}</strong>,</p>
      <p>Good news! Your recent <strong>${meta.changeType}</strong> change request was reviewed and approved by ${meta.approvedBy}.</p>
      <p>The changes have now been applied to your payroll profile.</p>
    `,
  }),

  CHANGE_DENIED: (meta) => ({
    subject: '❌ Your account change was denied',
    preview: `Your ${meta.changeType} update was denied`,
    body: `
      <p>Hi <strong>${meta.name}</strong>,</p>
      <p>Your recent request to update your <strong>${meta.changeType}</strong> was reviewed and <strong>denied</strong> by ${meta.deniedBy}.</p>
      <p>No changes were made to your account. If you believe this is an error, please contact HR.</p>
    `,
  }),
};

const wrap = (subject, preview, bodyHtml) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,Arial,sans-serif;">
  <div style="max-width:520px;margin:32px auto;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#0f172a;padding:24px 32px;text-align:center;">
      <h1 style="color:#38bdf8;margin:0;font-size:20px;letter-spacing:-0.5px;">🛡️ PayrollGuard</h1>
      <p style="color:#64748b;margin:4px 0 0;font-size:13px;">${preview}</p>
    </div>
    <div style="background:#fff;padding:28px 32px;color:#334155;font-size:14px;line-height:1.6;">
      ${bodyHtml}
    </div>
    <div style="background:#f1f5f9;padding:16px 32px;text-align:center;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">This is an automated security alert from PayrollGuard. Do not reply to this email.</p>
    </div>
  </div>
</body>
</html>`;

/**
 * Send a notification email to the employee's registered email.
 * Falls back to console.log in dev.
 */
const notifyEmployee = async (employee, eventType, meta = {}) => {
  const templateFn = TEMPLATES[eventType];
  if (!templateFn) return;

  const enrichedMeta = {
    name: employee.name,
    time: new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }),
    ...meta,
  };

  const { subject, preview, body } = templateFn(enrichedMeta);
  const html = wrap(subject, preview, body);

  if (!SMTP_CONFIGURED) {
    // DEV: log to terminal
    console.log('\n══════════════════════════════════════════');
    console.log(`📧  NOTIFICATION → ${employee.email}`);
    console.log(`📌  ${subject}`);
    console.log(`📝  Event: ${eventType}`);
    console.log(`🔖  Meta: ${JSON.stringify(enrichedMeta, null, 2)}`);
    console.log('══════════════════════════════════════════\n');
    return;
  }

  try {
    await transporter.sendMail({
      from:    `"PayrollGuard Security" <${process.env.SMTP_USER}>`,
      to:      employee.email,
      subject,
      html,
    });
    console.log(`📧 Notification sent to ${employee.email}: ${eventType}`);
  } catch (err) {
    console.error(`Failed to send notification to ${employee.email}:`, err.message);
  }
};

module.exports = { notifyEmployee };
