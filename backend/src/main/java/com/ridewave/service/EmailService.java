package com.ridewave.service;

import com.ridewave.config.AppProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Sends transactional emails asynchronously via Gmail SMTP (Spring Mail).
 *
 * Sender: single configured Gmail account authenticated via an App Password.
 * Recipient: dynamic — always the `toEmail` parameter.
 *
 * All methods are @Async so they never block the calling thread.
 * Check logs for "EMAIL SEND FAILED" if emails are not arriving.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final AppProperties  appProperties;
    private final BrevoEmailService brevoEmailService;

    // ── Auth / Account OTPs ───────────────────────────────────────────────

    @Async
    public void sendEmailVerificationOtp(String toEmail, String fullName, String otp) {
        String subject = "RideWave – Verify Your Email Address";
        String body    = buildOtpEmail(fullName, otp,
                "verify your email address",
                appProperties.getOtp().getExpiryMinutes());
        send(toEmail, subject, body);
    }

    @Async
    public void sendPasswordResetOtp(String toEmail, String fullName, String otp) {
        String subject = "RideWave – Password Reset OTP";
        String body    = buildOtpEmail(fullName, otp,
                "reset your password",
                appProperties.getOtp().getExpiryMinutes());
        send(toEmail, subject, body);
    }

    // ── Driver verification emails ────────────────────────────────────────

    @Async
    public void sendDriverApprovalEmail(String toEmail, String fullName) {
        String subject = "RideWave – Your Driver Account Has Been Approved!";
        String body = """
                <html><body style="font-family:Arial,sans-serif;color:#1F2937;">
                  <h2 style="color:#1E3A5F;">Welcome to RideWave, %s!</h2>
                  <p>Your driver account has been <strong style="color:#065F46;">approved</strong>.</p>
                  <p>You can now log in and start creating rides.</p>
                </body></html>
                """.formatted(fullName);
        send(toEmail, subject, body);
    }

    @Async
    public void sendDriverRejectionEmail(String toEmail, String fullName, String reason) {
        String subject = "RideWave – Driver Application Update";
        String body = """
                <html><body style="font-family:Arial,sans-serif;color:#1F2937;">
                  <h2 style="color:#1E3A5F;">Application Update</h2>
                  <p>Hi %s, your application could not be approved. Reason: %s</p>
                </body></html>
                """.formatted(fullName, reason);
        send(toEmail, subject, body);
    }

    // ── Ride start OTP ────────────────────────────────────────────────────

    /**
     * Sends ride-start OTP to a confirmed passenger via email.
     * Used instead of SMS to avoid per-message charges.
     * The passenger shares this 6-digit code with the driver at pickup.
     */
    @Async
    public void sendRideStartOtp(String toEmail, String passengerName,
                                 String otp, String originName, String destName) {
        String subject = "RideWave – Your Ride OTP";
        String body = """
                <html><body style="font-family:Arial,sans-serif;color:#1F2937;">
                  <h2 style="color:#1E3A5F;">Your Ride is About to Start!</h2>
                  <p>Hi %s,</p>
                  <p>Your driver is ready. Share the OTP below to start your ride:</p>
                  <p style="font-size:13px;color:#6B7280;">%s &rarr; %s</p>
                  <div style="margin:24px 0;padding:20px 32px;background:#DBEAFE;
                              border-radius:8px;display:inline-block;">
                    <span style="font-size:36px;font-weight:bold;
                                 letter-spacing:8px;color:#1E3A5F;">%s</span>
                  </div>
                  <p>This code expires in <strong>15 minutes</strong>.</p>
                  <p style="color:#991B1B;font-size:13px;">
                    Only share this code with your assigned RideWave driver.
                    Never share with anyone else.
                  </p>
                </body></html>
                """.formatted(passengerName, originName, destName, otp);
        send(toEmail, subject, body);
    }

    // ── Generic ───────────────────────────────────────────────────────────

    @Async
    public void sendGenericEmail(String toEmail, String subject, String bodyHtml) {
        send(toEmail, subject, bodyHtml);
    }

    // ── Private helpers ───────────────────────────────────────────────────

    private String buildOtpEmail(String name, String otp, String purpose, int expiryMinutes) {
        return """
                <html><body style="font-family:Arial,sans-serif;color:#1F2937;">
                  <h2 style="color:#1E3A5F;">RideWave – One-Time Password</h2>
                  <p>Hi %s,</p>
                  <p>Use the code below to %s:</p>
                  <div style="margin:24px 0;padding:20px 32px;background:#DBEAFE;
                              border-radius:8px;display:inline-block;">
                    <span style="font-size:36px;font-weight:bold;
                                 letter-spacing:8px;color:#1E3A5F;">%s</span>
                  </div>
                  <p>This code expires in <strong>%d minutes</strong>.</p>
                  <p style="color:#991B1B;font-size:13px;">
                    Never share this code with anyone.
                  </p>
                </body></html>
                """.formatted(name, purpose, otp, expiryMinutes);
    }

    /**
     * Sends via Gmail SMTP. `toEmail` is always the dynamic recipient —
     * the from-address is the single configured Gmail sender.
     */

    private void send(String to, String subject, String html) {
        brevoEmailService.send(
                to,
                subject,
                html
        );
    }
}