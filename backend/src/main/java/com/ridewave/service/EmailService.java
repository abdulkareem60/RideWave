package com.ridewave.service;

import com.ridewave.config.AppProperties;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Email service — sends HTML emails via JavaMailSender.
 *
 * All public methods are {@code @Async}: they execute on a separate thread
 * so email delivery never blocks the HTTP response. Failures are logged at
 * ERROR level but do NOT propagate — registration, password reset, and ride
 * operations succeed even when the mail server is unreachable.
 *
 * Configuration (application.yml → env vars on Render):
 *   spring.mail.host     = MAIL_HOST       (e.g. smtp-relay.brevo.com)
 *   spring.mail.port     = MAIL_PORT       (e.g. 587)
 *   spring.mail.username = MAIL_USERNAME
 *   spring.mail.password = MAIL_PASSWORD
 *   app.mail.from-address = MAIL_FROM_ADDRESS  (e.g. noreply@ridewave.pk)
 *   app.mail.from-name    = MAIL_FROM_NAME     (e.g. RideWave)
 *
 * Note: from-address must be a verified sender in Brevo / SendGrid.
 *       It can differ from spring.mail.username (the SMTP login).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;
    private final AppProperties  appProperties;

    // ── Auth / Account OTPs ───────────────────────────────────────────────

    @Async
    public void sendEmailVerificationOtp(String toEmail, String fullName, String otp) {
        String subject = "RideWave – Verify Your Email Address";
        String body    = buildOtpEmail(
                fullName, otp,
                "verify your email address",
                appProperties.getOtp().getExpiryMinutes());
        send(toEmail, subject, body);
    }

    @Async
    public void sendPasswordResetOtp(String toEmail, String fullName, String otp) {
        String subject = "RideWave – Password Reset OTP";
        String body    = buildOtpEmail(
                fullName, otp,
                "reset your password",
                appProperties.getOtp().getExpiryMinutes());
        send(toEmail, subject, body);
    }

    // ── Driver verification emails ─────────────────────────────────────────

    @Async
    public void sendDriverApprovalEmail(String toEmail, String fullName) {
        String subject = "RideWave – Your Driver Account Has Been Approved!";
        String body = """
                <html><body style="font-family:Arial,sans-serif;color:#1F2937;">
                  <div style="max-width:480px;margin:0 auto;padding:32px 0;">
                    <h2 style="color:#1E3A5F;">Welcome to RideWave, %s!</h2>
                    <p>Your driver account has been
                       <strong style="color:#065F46;">approved</strong>. 🎉</p>
                    <p>You can now log in and start creating rides.</p>
                    <a href="https://ride-wave-murex.vercel.app/driver/dashboard"
                       style="display:inline-block;margin-top:16px;padding:12px 24px;
                              background:#185FA5;color:#fff;border-radius:8px;
                              text-decoration:none;font-weight:bold;">
                      Go to Dashboard
                    </a>
                  </div>
                </body></html>
                """.formatted(fullName);
        send(toEmail, subject, body);
    }

    @Async
    public void sendDriverRejectionEmail(String toEmail, String fullName, String reason) {
        String subject = "RideWave – Driver Application Update";
        String body = """
                <html><body style="font-family:Arial,sans-serif;color:#1F2937;">
                  <div style="max-width:480px;margin:0 auto;padding:32px 0;">
                    <h2 style="color:#1E3A5F;">Application Update</h2>
                    <p>Hi %s,</p>
                    <p>Unfortunately your driver application could not be approved at this time.</p>
                    <p><strong>Reason:</strong> %s</p>
                    <p>Please re-submit with updated documents, or contact support if you believe
                       this is a mistake.</p>
                  </div>
                </body></html>
                """.formatted(fullName, reason);
        send(toEmail, subject, body);
    }

    // ── Booking notifications ──────────────────────────────────────────────

    @Async
    public void sendBookingConfirmation(String toEmail, String passengerName,
                                        String originName, String destName,
                                        String departureDatetime) {
        String subject = "RideWave – Booking Confirmed";
        String body = """
                <html><body style="font-family:Arial,sans-serif;color:#1F2937;">
                  <div style="max-width:480px;margin:0 auto;padding:32px 0;">
                    <h2 style="color:#1E3A5F;">Your ride is confirmed, %s!</h2>
                    <p><strong>Route:</strong> %s → %s</p>
                    <p><strong>Departure:</strong> %s</p>
                    <p>Open the app to track your driver and check in when you arrive.</p>
                  </div>
                </body></html>
                """.formatted(passengerName, originName, destName, departureDatetime);
        send(toEmail, subject, body);
    }

    // ── Internal send ──────────────────────────────────────────────────────

    /**
     * Sends an HTML email and swallows all exceptions.
     *
     * The method is intentionally non-throwing: a mail failure must never
     * roll back a registration, booking, or any other business transaction.
     * Failures appear in the application log at ERROR level, including the
     * full stack trace so the root cause (e.g. wrong SMTP credentials,
     * firewall block, unverified sender) is visible.
     */
    private void send(String toEmail, String subject, String htmlBody) {
        String fromAddress = appProperties.getMail().getFromAddress();
        String fromName    = appProperties.getMail().getFromName();

        log.info("[Email] Sending → to={} | subject={} | from={} ({})",
                toEmail, subject, fromAddress, fromName);

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromAddress, fromName);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);

            mailSender.send(message);
            log.info("[Email] Sent successfully → to={}", toEmail);

        } catch (MailException ex) {
            // MailException covers connection failures, auth errors, etc.
            log.error("[Email] SEND FAILED (MailException) → to={} subject={} | {} — {}",
                    toEmail, subject, ex.getClass().getSimpleName(), ex.getMessage());
            log.debug("[Email] Full stack trace:", ex);

        } catch (jakarta.mail.MessagingException ex) {
            // MessagingException from MimeMessageHelper (bad address format, etc.)
            log.error("[Email] SEND FAILED (MessagingException) → to={} subject={} | {}",
                    toEmail, subject, ex.getMessage());
            log.debug("[Email] Full stack trace:", ex);

        } catch (Exception ex) {
            // Catch-all — should not normally be reached
            log.error("[Email] SEND FAILED (unexpected) → to={} subject={} | {}",
                    toEmail, subject, ex.getMessage(), ex);
        }
    }

    // ── HTML templates ─────────────────────────────────────────────────────

    private String buildOtpEmail(String fullName, String otp,
                                 String purpose, int expiryMinutes) {
        return """
                <html>
                <body style="font-family:Arial,sans-serif;color:#1F2937;margin:0;padding:0;">
                  <div style="max-width:480px;margin:0 auto;padding:40px 24px;">

                    <!-- Header -->
                    <div style="text-align:center;margin-bottom:32px;">
                      <h1 style="font-size:28px;font-weight:900;color:#185FA5;margin:0;">
                        RideWave
                      </h1>
                    </div>

                    <!-- Body -->
                    <p style="font-size:16px;">Hi <strong>%s</strong>,</p>
                    <p style="font-size:15px;color:#374151;">
                      Use the code below to <strong>%s</strong>.
                      It expires in <strong>%d minutes</strong>.
                    </p>

                    <!-- OTP box -->
                    <div style="text-align:center;margin:32px 0;">
                      <div style="display:inline-block;padding:20px 40px;
                                  background:#DBEAFE;border-radius:12px;
                                  border:2px solid #93C5FD;">
                        <span style="font-size:40px;font-weight:900;
                                     letter-spacing:12px;color:#1E40AF;
                                     font-family:monospace;">%s</span>
                      </div>
                    </div>

                    <p style="font-size:13px;color:#6B7280;">
                      If you did not request this, you can safely ignore this email.
                      Your account security has not been affected.
                    </p>

                    <!-- Footer -->
                    <hr style="border:none;border-top:1px solid #E5E7EB;margin:32px 0;" />
                    <p style="font-size:12px;color:#9CA3AF;text-align:center;">
                      © RideWave · Pakistan's verified ride-sharing platform
                    </p>
                  </div>
                </body>
                </html>
                """.formatted(fullName, purpose, expiryMinutes, otp);
    }
}