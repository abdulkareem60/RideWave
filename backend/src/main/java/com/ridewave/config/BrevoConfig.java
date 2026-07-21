@Configuration
@Getter
@Setter
@ConfigurationProperties(prefix = "brevo")
public class BrevoConfig {

    private String apiKey;

}