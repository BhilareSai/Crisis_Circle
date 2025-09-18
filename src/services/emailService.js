const emailConfig = require("../config/email");
const { EMAIL_TYPES } = require("../utils/constants");

class EmailService {
  constructor() {
    this.transporter = emailConfig.transporter;
    this.templates = emailConfig.templates;
  }

  /**
   * Send email with retry mechanism
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} html - HTML content
   * @param {number} maxRetries - Maximum retry attempts
   * @returns {Promise<boolean>} Success status
   */
  async sendEmail(to, subject, html, maxRetries = 3) {
    let attempt = 1;

    while (attempt <= maxRetries) {
      try {
        const mailOptions = {
          from: `"Community Help" <${process.env.EMAIL_USER}>`,
          to: to.toLowerCase(),
          subject,
          html,
        };

        const result = await this.transporter.sendMail(mailOptions);

        console.log(`📧 Email sent successfully to ${to}:`, result.messageId);
        return true;
      } catch (error) {
        console.error(
          `❌ Email sending attempt ${attempt} failed for ${to}:`,
          error.message
        );

        if (attempt === maxRetries) {
          throw new Error(
            `Failed to send email after ${maxRetries} attempts: ${error.message}`
          );
        }

        attempt++;
        // Wait before retry (exponential backoff)
        await this.delay(Math.pow(2, attempt) * 1000);
      }
    }
  }

  /**
   * Send OTP verification email
   * @param {string} email - Recipient email
   * @param {string} otp - OTP code
   * @param {string} name - Recipient name
   * @returns {Promise<boolean>} Success status
   */
  async sendOTPVerification(email, otp, name) {
    try {
      const template = this.templates.otpVerification(otp, name);
      return await this.sendEmail(email, template.subject, template.html);
    } catch (error) {
      console.error("Error sending OTP verification email:", error.message);
      throw error;
    }
  }

  /**
   * Send password reset email
   * @param {string} email - Recipient email
   * @param {string} otp - Reset OTP code
   * @param {string} name - Recipient name
   * @returns {Promise<boolean>} Success status
   */
  async sendPasswordReset(email, otp, name) {
    try {
      const template = this.templates.passwordReset(otp, name);
      return await this.sendEmail(email, template.subject, template.html);
    } catch (error) {
      console.error("Error sending password reset email:", error.message);
      throw error;
    }
  }

  /**
   * Send account approved email
   * @param {string} email - Recipient email
   * @param {string} name - Recipient name
   * @returns {Promise<boolean>} Success status
   */
  async sendAccountApproved(email, name) {
    try {
      const template = this.templates.accountApproved(name);
      return await this.sendEmail(email, template.subject, template.html);
    } catch (error) {
      console.error("Error sending account approved email:", error.message);
      throw error;
    }
  }

  /**
   * Send account rejected email
   * @param {string} email - Recipient email
   * @param {string} name - Recipient name
   * @param {string} reason - Rejection reason
   * @returns {Promise<boolean>} Success status
   */
  async sendAccountRejected(email, name, reason = "") {
    try {
      const template = {
        subject: "Community Help - Account Status Update",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
              <h2 style="color: #007bff;">Community Help App</h2>
            </div>
            <div style="padding: 20px;">
              <h3>Hello ${name},</h3>
              <p>We regret to inform you that your account application has been rejected.</p>
              ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
              <p>If you believe this is an error or would like to reapply, please contact our support team.</p>
              <p>Thank you for your interest in Community Help App.</p>
              <hr style="margin: 30px 0;">
              <p style="color: #666; font-size: 12px;">
                This is an automated message from Community Help App. Please do not reply to this email.
              </p>
            </div>
          </div>
        `,
      };

      return await this.sendEmail(email, template.subject, template.html);
    } catch (error) {
      console.error("Error sending account rejected email:", error.message);
      throw error;
    }
  }

  /**
   * Send help request notification to nearby donors
   * @param {string} email - Donor email
   * @param {string} donorName - Donor name
   * @param {object} helpRequest - Help request details
   * @returns {Promise<boolean>} Success status
   */
  async sendHelpRequestNotification(email, donorName, helpRequest) {
    try {
      const itemsList = helpRequest.items
        .map(
          (item) =>
            `<li>${item.quantity} ${item.unit} of ${item.itemId.name}</li>`
        )
        .join("");

      const template = {
        subject: `New Help Request Near You - ${helpRequest.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
              <h2 style="color: #007bff;">Community Help App</h2>
            </div>
            <div style="padding: 20px;">
              <h3>Hello ${donorName}!</h3>
              <p>A new help request has been posted near your area:</p>
              
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4 style="color: #007bff; margin-top: 0;">${helpRequest.title}</h4>
                <p><strong>Description:</strong> ${helpRequest.description}</p>
                <p><strong>Items needed:</strong></p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  ${itemsList}
                </ul>
                <p><strong>Location:</strong> ${helpRequest.pickupLocation.zipCode}</p>
                <p><strong>Priority:</strong> <span style="text-transform: capitalize;">${helpRequest.priority}</span></p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/help-requests/${helpRequest._id}" 
                   style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  View Request
                </a>
              </div>
              
              <p>Thank you for being part of our community!</p>
              <hr style="margin: 30px 0;">
              <p style="color: #666; font-size: 12px;">
                This is an automated message from Community Help App. Please do not reply to this email.
              </p>
            </div>
          </div>
        `,
      };

      return await this.sendEmail(email, template.subject, template.html);
    } catch (error) {
      console.error("Error sending help request notification:", error.message);
      throw error;
    }
  }

  /**
   * Send help request approved notification
   * @param {string} email - Recipient email
   * @param {string} recipientName - Recipient name
   * @param {object} helpRequest - Help request details
   * @param {object} donor - Donor details
   * @returns {Promise<boolean>} Success status
   */
  async sendHelpRequestApproved(email, recipientName, helpRequest, donor) {
    try {
      const template = {
        subject: `Your Help Request has been Approved!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
              <h2 style="color: #007bff;">Community Help App</h2>
            </div>
            <div style="padding: 20px;">
              <h3>Great news, ${recipientName}!</h3>
              <p>Your help request "<strong>${helpRequest.title}</strong>" has been approved by a donor.</p>
              
              <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4 style="color: #155724; margin-top: 0;">Donor Information:</h4>
                <p><strong>Name:</strong> ${donor.name}</p>
                <p><strong>Phone:</strong> ${donor.phone}</p>
                <p><strong>Email:</strong> ${donor.email}</p>
              </div>
              
              <p>Please coordinate with the donor for pickup arrangements. Be sure to be available during your specified time slots.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/my-requests/${helpRequest._id}" 
                   style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  View Details
                </a>
              </div>
              
              <p>Thank you for using Community Help App!</p>
              <hr style="margin: 30px 0;">
              <p style="color: #666; font-size: 12px;">
                This is an automated message from Community Help App. Please do not reply to this email.
              </p>
            </div>
          </div>
        `,
      };

      return await this.sendEmail(email, template.subject, template.html);
    } catch (error) {
      console.error(
        "Error sending help request approved email:",
        error.message
      );
      throw error;
    }
  }

  /**
   * Send bulk announcement email
   * @param {Array} recipients - Array of {email, name} objects
   * @param {object} announcement - Announcement details
   * @returns {Promise<Array>} Array of send results
   */
  async sendBulkAnnouncement(recipients, announcement) {
    try {
      const results = [];

      for (const recipient of recipients) {
        try {
          const template = {
            subject: `Community Announcement: ${announcement.title}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
                  <h2 style="color: #007bff;">Community Help App</h2>
                </div>
                <div style="padding: 20px;">
                  <h3>Hello ${recipient.name}!</h3>
                  
                  <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h4 style="color: #007bff; margin-top: 0;">${
                      announcement.title
                    }</h4>
                    <p>${announcement.message.replace(/\n/g, "<br>")}</p>
                  </div>
                  
                  ${
                    announcement.links && announcement.links.length > 0
                      ? `
                    <div style="margin: 20px 0;">
                      <h4>Useful Links:</h4>
                      ${announcement.links
                        .map(
                          (link) => `
                        <a href="${link.url}" 
                           ${link.openInNewTab ? 'target="_blank"' : ""} 
                           style="display: inline-block; margin: 5px 10px 5px 0; color: #007bff;">
                          ${link.title}
                        </a>
                      `
                        )
                        .join("<br>")}
                    </div>
                  `
                      : ""
                  }
                  
                  <hr style="margin: 30px 0;">
                  <p style="color: #666; font-size: 12px;">
                    This is an automated message from Community Help App. Please do not reply to this email.
                  </p>
                </div>
              </div>
            `,
          };

          await this.sendEmail(
            recipient.email,
            template.subject,
            template.html
          );
          results.push({ email: recipient.email, status: "sent" });
        } catch (error) {
          results.push({
            email: recipient.email,
            status: "failed",
            error: error.message,
          });
        }

        // Add small delay between emails to avoid rate limiting
        await this.delay(100);
      }

      return results;
    } catch (error) {
      console.error("Error sending bulk announcement:", error.message);
      throw error;
    }
  }

  /**
   * Verify email service configuration
   * @returns {Promise<boolean>} Configuration status
   */
  async verifyConfiguration() {
    try {
      await this.transporter.verify();
      console.log("✅ Email service configuration verified");
      return true;
    } catch (error) {
      console.error("❌ Email service configuration error:", error.message);
      return false;
    }
  }

  /**
   * Delay utility function
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
module.exports = new EmailService();
