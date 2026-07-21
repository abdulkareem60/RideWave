package com.ridewave.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.ridewave.config.AppProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class BrevoEmailService {

    private static final String BREVO_URL = "https://api.brevo.com/v3/smtp/email";

    @Value("${brevo.api-key}")
    private String apiKey;

    private final AppProperties appProperties;

    private final RestClient restClient = RestClient.builder().build();

    public void send(String toEmail,
                     String subject,
                     String htmlContent) {

        try {

            EmailRequest request = new EmailRequest(
                    new Sender(
                            appProperties.getMail().getFromName(),
                            appProperties.getMail().getFromAddress()
                    ),
                    List.of(new Recipient(toEmail)),
                    subject,
                    htmlContent
            );

            restClient.post()
                    .uri(BREVO_URL)
                    .header(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .header("api-key", apiKey)
                    .body(request)
                    .retrieve()
                    .toBodilessEntity();

            log.info("BREVO EMAIL SENT SUCCESSFULLY -> {}", toEmail);

        } catch (Exception ex) {

            log.error("BREVO EMAIL FAILED -> {}", toEmail, ex);

        }
    }

    // ============================
    // DTOs
    // ============================

    public record EmailRequest(

            Sender sender,

            List<Recipient> to,

            String subject,

            @JsonProperty("htmlContent")
            String htmlContent

    ) {
    }

    public record Sender(
            String name,
            String email
    ) {
    }

    public record Recipient(
            String email
    ) {
    }
}