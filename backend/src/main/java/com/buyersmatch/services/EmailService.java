package com.buyersmatch.services;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@RequiredArgsConstructor
public class EmailService {

  private final JavaMailSender mailSender;

  @Value("${spring.mail.username}")
  private String fromEmail;

  @Value("${mail.from.name:Buyers Match Portal}")
  private String fromName;

  @Value("${frontend.url:http://localhost:5173}")
  private String frontendUrl;

  @Value("${admin.notify.email:admin@example.com}")
  private String adminNotifyEmail;

  // -------------------------------------------------------------------------
  // ONBOARDING EMAIL
  // -------------------------------------------------------------------------

  public void sendPortalOnboardingEmail(String toEmail, String clientName, String password) {
    try {
      MimeMessage message = mailSender.createMimeMessage();
      MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
      helper.setFrom(fromEmail, fromName);
      helper.setTo(toEmail);
      helper.setSubject("Welcome to Buyers Match Client Portal");
      helper.setText(buildOnboardingHtml(clientName, toEmail, password), true);
      mailSender.send(message);
      log.info("Onboarding email sent to {}", toEmail);
    } catch (Exception e) {
      log.error("Failed to send onboarding email to {}: {}", toEmail, e.getMessage());
      throw new RuntimeException("Failed to send onboarding email: " + e.getMessage());
    }
  }

  // -------------------------------------------------------------------------
  // CREDENTIALS UPDATE EMAIL
  // -------------------------------------------------------------------------

  public void sendCredentialsUpdateEmail(String toEmail, String clientName, String newPassword) {
    try {
      MimeMessage message = mailSender.createMimeMessage();
      MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
      helper.setFrom(fromEmail, fromName);
      helper.setTo(toEmail);
      helper.setSubject("Your Buyers Match Portal Credentials Have Been Updated");
      helper.setText(buildCredentialsUpdateHtml(clientName, toEmail, newPassword), true);
      mailSender.send(message);
      log.info("Credentials update email sent to {}", toEmail);
    } catch (Exception e) {
      log.error("Failed to send credentials update email to {}: {}", toEmail, e.getMessage());
      throw new RuntimeException("Failed to send credentials update email: " + e.getMessage());
    }
  }

  // -------------------------------------------------------------------------
  // CLIENT ACTION NOTIFICATION (to admin)
  // -------------------------------------------------------------------------

  public void sendClientActionNotification(String clientName, String propertyAddress, String action, String remark) {
    try {
      MimeMessage message = mailSender.createMimeMessage();
      MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
      helper.setFrom(fromEmail, fromName);
      String[] emails = java.util.Arrays.stream(adminNotifyEmail.split(","))
          .map(String::trim)
          .toArray(String[]::new);
      helper.setTo(emails);
      helper.setSubject("Client Response – " + propertyAddress);
      helper.setText(buildClientActionHtml(clientName, propertyAddress, action, remark), true);
      mailSender.send(message);
      log.info("Client action notification sent to admin for {} – {}", clientName, action);
    } catch (Exception e) {
      log.error("Failed to send client action notification: {}", e.getMessage());
      throw new RuntimeException("Failed to send notification email: " + e.getMessage());
    }
  }

  // -------------------------------------------------------------------------
  // TEMPLATES
  // -------------------------------------------------------------------------

  private String buildClientActionHtml(String clientName, String propertyAddress, String action, String remark) {
    boolean isAccept = "ACCEPT".equalsIgnoreCase(action);
    boolean isWalkthrough = "REQUEST_WALKTHROUGH".equalsIgnoreCase(action);
    String actionLabel = isAccept ? "Accepted" : (isWalkthrough ? "Requested Walkthrough" : "Declined");
    String accentColor = isAccept ? "#14b8a6" : (isWalkthrough ? "#3b82f6" : "#ef4444");
    String actionEmoji = isAccept ? "✅" : (isWalkthrough ? "🚶" : "❌");
    String remarkSection = (remark != null && !remark.isBlank())
        ? """
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin:24px 0;">
              <p style="margin:0 0 8px;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">Client Remark</p>
              <p style="margin:0;color:#0d2240;font-size:15px;line-height:1.6;">%s</p>
            </div>
            """
            .formatted(remark)
        : "<p style=\"color:#94a3b8;font-size:14px;margin:16px 0;\">No remark provided.</p>";

    return """
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family:Arial,sans-serif;background:#f1f5f9;margin:0;padding:0;">
          <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
            <div style="background:#0d2240;padding:36px 32px;text-align:center;">
              <h1 style="color:#14b8a6;margin:0;font-size:26px;letter-spacing:-0.5px;">Buyers Match</h1>
              <p style="color:#94a3b8;margin:6px 0 0;font-size:14px;">Client Response Notification</p>
            </div>
            <div style="padding:40px 32px;">
              <div style="text-align:center;margin-bottom:28px;">
                <div style="font-size:48px;">%s</div>
                <h2 style="color:#0d2240;margin:12px 0 4px;font-size:22px;">%s</h2>
                <p style="color:#64748b;margin:0;font-size:14px;">Client has responded to a property assignment</p>
              </div>
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:24px;margin:0 0 16px;">
                <table style="width:100%%;border-collapse:collapse;">
                  <tr>
                    <td style="padding:8px 0;color:#64748b;font-size:13px;width:110px;font-weight:600;">Client</td>
                    <td style="padding:8px 0;color:#0d2240;font-size:14px;font-weight:700;">%s</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#64748b;font-size:13px;font-weight:600;">Property</td>
                    <td style="padding:8px 0;color:#0d2240;font-size:14px;font-weight:700;">%s</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#64748b;font-size:13px;font-weight:600;">Response</td>
                    <td style="padding:8px 0;">
                      <span style="background:%s;color:#fff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:0.05em;">%s</span>
                    </td>
                  </tr>
                </table>
              </div>
              %s
              <p style="color:#94a3b8;font-size:12px;text-align:center;margin:24px 0 0;"></p>
            </div>
          </div>
        </body>
        </html>
        """
        .formatted(actionEmoji, actionLabel, clientName, propertyAddress, accentColor, actionLabel, remarkSection);
  }

  private String buildOnboardingHtml(String name, String email, String password) {
    return """
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family:Arial,sans-serif;background:#f1f5f9;margin:0;padding:0;">
          <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
            <div style="background:#0d2240;padding:36px 32px;text-align:center;">
              <h1 style="color:#14b8a6;margin:0;font-size:26px;letter-spacing:-0.5px;">BuyersMatch</h1>
              <p style="color:#94a3b8;margin:6px 0 0;font-size:14px;">Client Portal Access</p>
            </div>
            <div style="padding:40px 32px;">
              <h2 style="color:#0d2240;margin:0 0 12px;font-size:22px;">Welcome, %s!</h2>
              <p style="color:#475569;line-height:1.7;margin:0 0 24px;">Your Buyers Match client portal account has been created. You can now log in to view your matched properties and updates.</p>
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:24px;margin:0 0 28px;">
                <p style="margin:0 0 12px;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">Your Login Credentials</p>
                <table style="width:100%%;border-collapse:collapse;">
                  <tr>
                    <td style="padding:6px 0;color:#64748b;font-size:14px;width:90px;">Email</td>
                    <td style="padding:6px 0;color:#0d2240;font-size:14px;font-weight:600;">%s</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#64748b;font-size:14px;">Password</td>
                    <td style="padding:6px 0;color:#0d2240;font-size:18px;font-weight:700;font-family:monospace;letter-spacing:2px;">%s</td>
                  </tr>
                </table>
              </div>
              <div style="text-align:center;margin:0 0 28px;">
                <a href="%s/login" style="background:#14b8a6;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:700;font-size:15px;display:inline-block;">Log in to Portal</a>
              </div>
              <p style="color:#94a3b8;font-size:13px;text-align:center;margin:0;">Please keep your credentials safe. If you have any questions, contact our team.</p>
            </div>
            <div style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="color:#cbd5e1;font-size:12px;margin:0;">© Buyers Match · Client Portal</p>
            </div>
          </div>
        </body>
        </html>
        """
        .formatted(name, email, password, frontendUrl);
  }

  private String buildCredentialsUpdateHtml(String name, String email, String newPassword) {
    return """
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family:Arial,sans-serif;background:#f1f5f9;margin:0;padding:0;">
          <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
            <div style="background:#0d2240;padding:36px 32px;text-align:center;">
              <h1 style="color:#14b8a6;margin:0;font-size:26px;letter-spacing:-0.5px;">Buyers Match</h1>
              <p style="color:#94a3b8;margin:6px 0 0;font-size:14px;">Client Portal</p>
            </div>
            <div style="padding:40px 32px;">
              <h2 style="color:#0d2240;margin:0 0 12px;font-size:22px;">Credentials Updated</h2>
              <p style="color:#475569;line-height:1.7;margin:0 0 24px;">Hi %s, your Buyers Match client portal credentials have been updated by our team.</p>
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:24px;margin:0 0 28px;">
                <p style="margin:0 0 12px;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">Your New Credentials</p>
                <table style="width:100%%;border-collapse:collapse;">
                  <tr>
                    <td style="padding:6px 0;color:#64748b;font-size:14px;width:90px;">Email</td>
                    <td style="padding:6px 0;color:#0d2240;font-size:14px;font-weight:600;">%s</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#64748b;font-size:14px;">Password</td>
                    <td style="padding:6px 0;color:#0d2240;font-size:18px;font-weight:700;font-family:monospace;letter-spacing:2px;">%s</td>
                  </tr>
                </table>
              </div>
              <div style="text-align:center;margin:0 0 28px;">
                <a href="%s/login" style="background:#14b8a6;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:700;font-size:15px;display:inline-block;">Log in to Portal</a>
              </div>
              <p style="color:#94a3b8;font-size:13px;text-align:center;margin:0;">If you did not expect this change, please contact us immediately.</p>
            </div>
            <div style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="color:#cbd5e1;font-size:12px;margin:0;">© Buyers Match · Client Portal</p>
            </div>
          </div>
        </body>
        </html>
        """
        .formatted(name, email, newPassword, frontendUrl);
  }
}
