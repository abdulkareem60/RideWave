package com.ridewave.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ridewave.config.AppProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Email service — sends HTML emails via the Brevo Transactional Email REST API.
 *
 * Replaces JavaMailSender/SMTP entirely. Uses JDK 11+ HttpClient — no extra libs.
 * All public methods are @Async so email never blocks HTTP responses.
 * All failures are logged and swallowed — registration/OTP/ride ops succeed
 * even when Brevo is unreachable.
 *
 * Required env var on Render:
 *   BREVO_API_KEY   → Settings → API Keys in app.brevo.com
 *
 * Optional (have defaults from AppProperties):
 *   MAIL_FROM_ADDRESS → verified sender in Brevo (e.g. noreply@ridewave.pk)
 *   MAIL_FROM_NAME    → display name (e.g. RideWave)
 */
@Service
@Slf4j
public class EmailService {

    private static final String BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

    private final AppProperties appProperties;
    private final ObjectMapper  objectMapper;
    private final HttpClient    httpClient;

    @Value("${brevo.api-key:}")
    private String brevoApiKey;

    public EmailService(AppProperties appProperties, ObjectMapper objectMapper) {
        this.appProperties = appProperties;
        this.objectMapper  = objectMapper;
        this.httpClient    = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    // ── Auth / Account OTPs ───────────────────────────────────────────────

    @Async
    public void sendEmailVerificationOtp(String toEmail, String fullName, String otp) {
        send(toEmail, fullName,
                "RideWave \u2013 Verify Your Email Address",
                buildOtpEmail(fullName, otp,
                        "verify your email address",
                        appProperties.getOtp().getExpiryMinutes()));
    }

    @Async
    public void sendPasswordResetOtp(String toEmail, String fullName, String otp) {
        send(toEmail, fullName,
                "RideWave \u2013 Password Reset OTP",
                buildOtpEmail(fullName, otp,
                        "reset your password",
                        appProperties.getOtp().getExpiryMinutes()));
    }

    // ── Driver verification emails ─────────────────────────────────────────

    @Async
    public void sendDriverApprovalEmail(String toEmail, String fullName) {
        String body = """
                <html><body style="font-family:Arial,sans-serif;color:#1F2937;">
                  <div style="max-width:480px;margin:0 auto;padding:32px 0;">
                    <h2 style="color:#185FA5;">Welcome to RideWave, %s!</h2>
                    <p>Your driver account has been
                       <strong style="color:#065F46;">approved</strong>. \uD83C\uDF89</p>
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
        send(toEmail, fullName, "RideWave \u2013 Your Driver Account Has Been Approved!", body);
    }

    @Async
    public void sendDriverRejectionEmail(String toEmail, String fullName, String reason) {
        String body = """
                <html><body style="font-family:Arial,sans-serif;color:#1F2937;">
                  <div style="max-width:480px;margin:0 auto;padding:32px 0;">
                    <h2 style="color:#185FA5;">Application Update</h2>
                    <p>Hi %s,</p>
                    <p>Unfortunately your driver application could not be approved.</p>
                    <p><strong>Reason:</strong> %s</p>
                    <p>Please re-submit with updated documents or contact support.</p>
                  </div>
                </body></html>
                """.formatted(fullName, reason);
        send(toEmail, fullName, "RideWave \u2013 Driver Application Update", body);
    }

    // ── Booking notifications ──────────────────────────────────────────────

    @Async
    public void sendBookingConfirmation(String toEmail, String passengerName,
                                        String originName, String destName,
                                        String departureDatetime) {
        String body = """
                <html><body style="font-family:Arial,sans-serif;color:#1F2937;">
                  <div style="max-width:480px;margin:0 auto;padding:32px 0;">
                    <h2 style="color:#185FA5;">Your ride is confirmed, %s!</h2>
                    <p><strong>Route:</strong> %s \u2192 %s</p>
                    <p><strong>Departure:</strong> %s</p>
                    <p>Open the app to track your driver and check in when you arrive.</p>
                  </div>
                </body></html>
                """.formatted(passengerName, originName, destName, departureDatetime);
        send(toEmail, passengerName, "RideWave \u2013 Booking Confirmed", body);
    }

    // ── Core: POST to Brevo REST API ──────────────────────────────────────

    /**
     * Builds and sends the Brevo /v3/smtp/email request.
     *
     * JSON body:
     * {
     *   "sender":      { "name": "RideWave", "email": "noreply@ridewave.pk" },
     *   "to":          [{ "email": "...", "name": "..." }],
     *   "subject":     "...",
     *   "htmlContent": "..."
     * }
     *
     * 2xx = accepted for delivery.
     * Non-2xx = logged with Brevo's response body so the rejection reason is visible.
     * All exceptions caught — mail failure never propagates to callers.
     */
    private void send(String toEmail, String toName, String subject, String htmlContent) {
        String fromAddress = appProperties.getMail().getFromAddress();
        String fromName    = appProperties.getMail().getFromName();

        log.info("[Email] Queuing via Brevo REST \u2192 to={} | subject={} | from={}",
                toEmail, subject, fromAddress);

        if (brevoApiKey == null || brevoApiKey.isBlank()) {
            log.warn("[Email] BREVO_API_KEY not set \u2014 skipping email to {}", toEmail);
            return;
        }

        try {
            Map<String, Object> payload = Map.of(
                    "sender",      Map.of("name", fromName, "email", fromAddress),
                    "to",          List.of(Map.of(
                            "email", toEmail,
                            "name",  toName != null ? toName : toEmail)),
                    "subject",     subject,
                    "htmlContent", htmlContent
            );

            String json = objectMapper.writeValueAsString(payload);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(BREVO_API_URL))
                    .header("accept",       "application/json")
                    .header("content-type", "application/json")
                    .header("api-key",       brevoApiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .timeout(Duration.ofSeconds(15))
                    .build();

            HttpResponse<String> response =
                    httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            int status = response.statusCode();
            if (status >= 200 && status < 300) {
                log.info("[Email] Sent \u2713 via Brevo \u2192 to={} | httpStatus={}", toEmail, status);
            } else {
                log.error("[Email] Brevo REJECTED \u2192 to={} | httpStatus={} | response={}",
                        toEmail, status, response.body());
            }

        } catch (java.net.http.HttpTimeoutException ex) {
            log.error("[Email] TIMEOUT \u2192 to={} | subject={} | {}", toEmail, subject, ex.getMessage());

        } catch (java.io.IOException ex) {
            log.error("[Email] IO ERROR \u2192 to={} | subject={} | {}", toEmail, subject, ex.getMessage());

        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            log.error("[Email] INTERRUPTED \u2192 to={} | subject={}", toEmail, subject);

        } catch (Exception ex) {
            log.error("[Email] UNEXPECTED \u2192 to={} | subject={} | {}",
                    toEmail, subject, ex.getMessage(), ex);
        }
    }

    // ── OTP HTML template ─────────────────────────────────────────────────

    private String buildOtpEmail(String fullName, String otp,
                                 String purpose, int expiryMinutes) {
        return """
                <html>
                <body style="font-family:Arial,sans-serif;color:#1F2937;margin:0;
                             padding:0;background:#F9FAFB;">
                  <div style="max-width:480px;margin:0 auto;padding:40px 24px;
                              background:#FFFFFF;border-radius:12px;">

                    <div style="text-align:center;margin-bottom:28px;">
                      <h1 style="font-size:26px;font-weight:900;color:#185FA5;margin:0;">
                        RideWave
                      </h1>
                    </div>

                    <p style="font-size:16px;margin-top:0;">Hi <strong>%s</strong>,</p>
                    <p style="font-size:15px;color:#374151;">
                      Use the code below to <strong>%s</strong>.
                      It expires in <strong>%d minutes</strong>.
                    </p>

                    <div style="text-align:center;margin:32px 0;">
                      <div style="display:inline-block;padding:20px 40px;
                                  background:#DBEAFE;border-radius:12px;
                                  border:2px solid #93C5FD;">
                        <span style="font-size:40px;font-weight:900;letter-spacing:12px;
                                     color:#1E40AF;font-family:monospace;">%s</span>
                      </div>
                    </div>

                    <p style="font-size:13px;color:#6B7280;">
                      If you did not request this, you can safely ignore this email.
                    </p>

                    <hr style="border:none;border-top:1px solid #E5E7EB;margin:28px 0;" />
                    <p style="font-size:11px;color:#9CA3AF;text-align:center;margin:0;">
                      \u00A9 RideWave \u00B7 Pakistan's verified ride-sharing platform
                    </p>
                  </div>
                </body>
                </html>
                """.formatted(fullName, purpose, expiryMinutes, otp);
    }
}