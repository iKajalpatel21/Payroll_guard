const otpGenerator = require('otp-generator');
const transporter = require('../config/mailer');

/**
 * Generates a 6-digit OTP and sends it to the employee's email.
 * In development (or if SMTP is not configured), falls back to console.log.
 * Returns the plain OTP string (caller must hash it before storing).
 */
const sendOtp = async (email, name) => {
  const otp = otpGenerator.generate(6, {
    upperCaseAlphabets: false,
    lowerCaseAlphabets: false,
    specialChars: false,
  });

  const smtpConfigured =
    process.env.SMTP_USER &&
    process.env.SMTP_USER !== 'your_email@gmail.com' &&
    process.env.SMTP_PASS &&
    process.env.SMTP_PASS !== 'your_app_password';

  if (!smtpConfigured) {
    // DEV FALLBACK – OTP is printed to the backend terminal
    console.log('\n========================================');
    console.log(`📧  OTP for ${name} <${email}>`);
    console.log(`🔑  CODE: ${otp}`);
    console.log('========================================\n');
    return otp;
  }

  // Production: send real email via SMTP
  const mailOptions = {
    from: `"PayrollGuard Security" <${process.env.SMTP_USER}>`,
    to: email,
    subject: '🔐 Your PayrollGuard Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background: #0f172a; padding: 24px; text-align: center;">
          <h1 style="color: #38bdf8; margin: 0; font-size: 22px;">PayrollGuard</h1>
          <p style="color: #94a3b8; margin: 4px 0 0;">Security Verification</p>
        </div>
        <div style="padding: 32px;">
          <p style="color: #334155;">Hi <strong>${name}</strong>,</p>
          <p style="color: #334155;">A request was made to change your payroll direct deposit details. Use the code below to verify:</p>
          <div style="background: #f1f5f9; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0f172a;">${otp}</span>
          </div>
          <p style="color: #64748b; font-size: 13px;">Expires in <strong>${process.env.OTP_EXPIRE_MINUTES || 10} minutes</strong>. If you did not initiate this, contact HR immediately.</p>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  return otp;
};

module.exports = { sendOtp };
