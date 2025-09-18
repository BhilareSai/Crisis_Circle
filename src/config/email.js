const nodemailer = require("nodemailer");

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    // Fixed: removed 'er' from createTransporter
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

const emailConfig = {
  transporter: createTransporter(),

  // Email templates
  templates: {
    otpVerification: (otp, name) => ({
      subject: "Community Help - Email Verification",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h2 style="color: #007bff;">Community Help App</h2>
          </div>
          <div style="padding: 20px;">
            <h3>Hello ${name}!</h3>
            <p>Thank you for registering with Community Help App. To complete your registration, please use the following OTP:</p>
            <div style="background-color: #007bff; color: white; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0; border-radius: 5px;">
              ${otp}
            </div>
            <p><strong>This OTP will expire in 10 minutes.</strong></p>
            <p>If you didn't request this verification, please ignore this email.</p>
            <hr style="margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">
              This is an automated message from Community Help App. Please do not reply to this email.
            </p>
          </div>
        </div>
      `,
    }),

    passwordReset: (otp, name) => ({
      subject: "Community Help - Password Reset",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h2 style="color: #007bff;">Community Help App</h2>
          </div>
          <div style="padding: 20px;">
            <h3>Hello ${name}!</h3>
            <p>You requested a password reset. Please use the following OTP to reset your password:</p>
            <div style="background-color: #dc3545; color: white; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0; border-radius: 5px;">
              ${otp}
            </div>
            <p><strong>This OTP will expire in 10 minutes.</strong></p>
            <p>If you didn't request a password reset, please ignore this email.</p>
            <hr style="margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">
              This is an automated message from Community Help App. Please do not reply to this email.
            </p>
          </div>
        </div>
      `,
    }),

    accountApproved: (name) => ({
      subject: "Community Help - Account Approved!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h2 style="color: #007bff;">Community Help App</h2>
          </div>
          <div style="padding: 20px;">
            <h3>Congratulations ${name}!</h3>
            <p>Your account has been approved by our admin team. You can now access all features of the Community Help App.</p>
            <p>Start helping your community today!</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Login Now
              </a>
            </div>
            <hr style="margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">
              This is an automated message from Community Help App. Please do not reply to this email.
            </p>
          </div>
        </div>
      `,
    }),
  },
};

module.exports = emailConfig;
