package com.ridewave.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ridewave.model.DriverDocument;
import com.ridewave.model.enums.VerificationStatus;
import com.ridewave.repository.DriverDocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.sourceforge.tess4j.Tesseract;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.awt.image.ConvolveOp;
import java.awt.image.Kernel;
import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.List;
import java.util.regex.*;

/**
 * Fully offline, deterministic OCR verification pipeline.
 *
 * NO external APIs. NO Gemini. NO network calls.
 *
 * State machine per document:
 *   PENDING → PROCESSING → PASS (score≥80)
 *                        → REVIEW (60≤score<80)
 *                        → FAIL (score<60, retries<3)
 *                          → REVIEW (3rd FAIL)
 *
 * Mandatory output (NEVER NULL after completion):
 *   aiExtractedData  - strict JSON: {ocrText, score, flags, status}
 *   aiScore          - 0.00–1.00 (DB), multiply×100 for display
 *   aiFlags          - JSON array
 *   aiCheckedAt      - timestamp
 *   aiRawResponse    - raw OCR text (first 4000 chars)
 *
 * Retry: max 3 total attempts. 3rd fail → forced REVIEW.
 * Re-upload: caller resets ocrAttemptCount=0, clears all fields → fresh run.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LocalDocumentVerificationService {

    public static final int MAX_ATTEMPTS      = 3;
    static final int PASS_THRESHOLD    = 80;
    static final int REVIEW_THRESHOLD  = 60;

    private final DriverDocumentRepository repo;
    private final com.ridewave.repository.UserRepository userRepo;
    private final com.ridewave.repository.VehicleRepository vehicleRepo;
    private final DriverActivationService activationService;
    private final ObjectMapper json = new ObjectMapper();

    @Value("${verification.tessdata-path:}")
    private String tessdataPath;

    @Value("${verification.blur-threshold:60.0}")
    private double blurThreshold;

    // ── Entry point ───────────────────────────────────────────────────────

    @Async("taskExecutor")
    public void analyzeAsync(UUID docId, String fileUrl, String expectedName) {
        log.info("OCR[{}] START expectedName='{}'", docId, expectedName);

        DriverDocument doc = repo.findById(docId).orElse(null);
        if (doc == null) {
            log.error("OCR[{}] NOT FOUND IN DB — aborting", docId);
            return;
        }

        // Capture userId NOW while doc is freshly loaded and user proxy is accessible.
        // DO NOT call doc.getUser() again after repo.save() — the JPA session used for
        // the findById() is closed after save(), making the LAZY user proxy throw
        // LazyInitializationException. Capturing the UUID here bypasses that entirely.
        UUID userId;
        try {
            userId = doc.getUser().getUserId();
        } catch (Exception e) {
            // Fallback: query userId directly from the FK column
            userId = repo.findUserIdByDocId(docId);
            if (userId == null) {
                log.error("OCR[{}] could not resolve userId — aborting", docId);
                return;
            }
        }
        log.info("OCR[{}] userId={}", docId, userId);

        int attempt = doc.getOcrAttemptCount() + 1;
        log.info("OCR[{}] attempt={}/{}", docId, attempt, MAX_ATTEMPTS);

        // Transition: PROCESSING
        doc.setOcrStatus(VerificationStatus.PROCESSING);
        doc.setOcrAttemptCount(attempt);
        doc.setAiCheckedAt(null); // clear until job finishes
        repo.save(doc);

        if (attempt > MAX_ATTEMPTS) {
            log.warn("OCR[{}] max attempts exceeded → REVIEW", docId);
            writeResult(doc, userId, 0, List.of("MAX_ATTEMPTS_REACHED", "ADMIN_REVIEW"),
                    VerificationStatus.REVIEW, "", "Max attempts exceeded");
            return;
        }

        try {
            run(doc, userId, fileUrl, expectedName, attempt);
        } catch (Exception ex) {
            log.error("OCR[{}] UNEXPECTED ERROR attempt={}: {}", docId, attempt, ex.getMessage(), ex);
            writeFailure(doc, userId, attempt, List.of("UNKNOWN_ERROR"),
                    "Unexpected: " + ex.getMessage(), "");
        }
    }

    // ── Main pipeline ─────────────────────────────────────────────────────

    private void run(DriverDocument doc, UUID userId, String fileUrl, String expectedName, int attempt) {
        UUID docId = doc.getDocId();

        // ── 1. Decode ───────────────────────────────────────────────────
        String[] parts = splitDataUrl(fileUrl);
        if (parts == null) {
            log.warn("OCR[{}] not a data URL", docId);
            writeFailure(doc, userId, attempt, List.of("INVALID_FORMAT"), "Not a base64 data URL", "");
            return;
        }
        byte[] bytes;
        try { bytes = Base64.getDecoder().decode(parts[1]); }
        catch (Exception e) {
            writeFailure(doc, userId, attempt, List.of("INVALID_FORMAT"), "Base64 error: " + e.getMessage(), "");
            return;
        }
        BufferedImage raw;
        try { raw = ImageIO.read(new ByteArrayInputStream(bytes)); }
        catch (Exception e) {
            writeFailure(doc, userId, attempt, List.of("INVALID_FORMAT"), "ImageIO error: " + e.getMessage(), "");
            return;
        }
        if (raw == null) {
            writeFailure(doc, userId, attempt, List.of("INVALID_FORMAT"), "Unrecognised image format", "");
            return;
        }
        log.info("OCR[{}] decoded {}×{}", docId, raw.getWidth(), raw.getHeight());

        // ── 2. Quality metrics on raw image ─────────────────────────────
        double lapVar    = laplacianVariance(raw);
        double contrast  = contrastStdDev(raw);
        boolean isBlurry = lapVar < blurThreshold;
        boolean lowContrast = contrast < 25.0;
        log.info("OCR[{}] quality lapVar={} contrast={} blur={} lowContrast={}",
                docId, sf(lapVar), sf(contrast), isBlurry, lowContrast);

        // Critically blurry: OCR will produce garbage — fail immediately
        if (isBlurry && lapVar < blurThreshold * 0.2) {
            log.warn("OCR[{}] critically blurry → FAIL", docId);
            writeFailure(doc, userId, attempt, List.of("BLUR", "UNREADABLE"),
                    "Image too blurry for OCR", "");
            return;
        }

        // ── 3. Preprocess ───────────────────────────────────────────────
        log.info("OCR[{}] preprocessing...", docId);
        BufferedImage processed = preprocess(raw);

        // ── 4. Tesseract OCR ────────────────────────────────────────────
        log.info("OCR[{}] running Tesseract...", docId);
        String ocrText;
        try { ocrText = tesseract(processed); }
        catch (Exception e) {
            log.error("OCR[{}] Tesseract error: {}", docId, e.getMessage(), e);
            writeFailure(doc, userId, attempt, List.of("OCR_FAILED"),
                    "Tesseract: " + e.getMessage(), "");
            return;
        }
        if (ocrText == null || ocrText.isBlank()) {
            log.warn("OCR[{}] empty OCR output", docId);
            writeFailure(doc, userId, attempt, List.of("UNREADABLE"), "Empty OCR output", "");
            return;
        }
        log.info("OCR[{}] extracted {} chars", docId, ocrText.length());
        log.debug("OCR[{}] text:\n{}", docId, ocrText);

        // ── 5. Field extraction ─────────────────────────────────────────
        ExpiryResult expiry  = extractExpiry(ocrText);
        String extractedName = extractName(ocrText, expectedName);
        boolean nameMatch    = nameMatch(extractedName, expectedName);
        String docNumber     = extractDocNumber(ocrText);
        log.info("OCR[{}] expiry='{}' expired={} extractedName='{}' nameMatch={} docNo='{}'",
                docId, expiry.rawText(), expiry.expired(), extractedName, nameMatch, docNumber);

        // ── 6. Score (0–100) ────────────────────────────────────────────
        // Quality: 40 pts (Laplacian variance normalised against 5× threshold)
        int qualPts = (int)(Math.min(1.0, lapVar / (blurThreshold * 5)) * 40);
        // Name: 30 pts
        int namePts = nameMatch ? 30 : (extractedName != null ? 10 : 0);
        // Expiry: 20 pts
        int expPts  = expiry.expired() ? 0 : expiry.date() != null ? 20 : 10;
        // Readability: 10 pts
        int readPts = ocrText.length() >= 80 ? 10 : ocrText.length() >= 30 ? 5 : 0;
        int score   = Math.max(0, Math.min(100, qualPts + namePts + expPts + readPts));
        log.info("OCR[{}] score={} (qual={} name={} exp={} read={})",
                docId, score, qualPts, namePts, expPts, readPts);

        // ── 7. Flags ────────────────────────────────────────────────────
        List<String> flags = new ArrayList<>();
        if (isBlurry)                              flags.add("BLUR");
        if (lowContrast)                           flags.add("LOW_CONTRAST");
        if (expiry.expired())                      flags.add("EXPIRED");
        if (extractedName == null)                 flags.add("NAME_NOT_FOUND");
        else if (!nameMatch)                       flags.add("NAME_MISMATCH");
        if (ocrText.length() < 30)                flags.add("UNREADABLE");

        // ── 8. Status decision ───────────────────────────────────────────
        VerificationStatus status;
        if (score >= PASS_THRESHOLD) {
            status = VerificationStatus.PASS;
        } else if (score >= REVIEW_THRESHOLD) {
            status = VerificationStatus.REVIEW;
            flags.add("ADMIN_REVIEW");
        } else if (attempt >= MAX_ATTEMPTS) {
            status = VerificationStatus.REVIEW;
            flags.add("MAX_ATTEMPTS_REACHED");
            flags.add("ADMIN_REVIEW");
            log.warn("OCR[{}] FAIL on attempt {} → escalating to REVIEW", docId, attempt);
        } else {
            status = VerificationStatus.FAIL;
        }

        log.info("OCR[{}] status={} flags={}", docId, status, flags);
        writeResult(doc, userId, score, flags, status, ocrText,
                buildExtractedJson(ocrText, score, flags, status.name(),
                        extractedName, expectedName, docNumber, expiry,
                        nameMatch, lapVar, contrast));
    }

    // ── Preprocessing ─────────────────────────────────────────────────────

    /**
     * Full preprocessing pipeline:
     *   grayscale → denoise → contrast stretch → Otsu threshold → deskew → 2× resize
     */
    private BufferedImage preprocess(BufferedImage src) {
        BufferedImage g = grayscale(src);
        g = denoise(g);
        g = stretchContrast(g);
        g = otsuThreshold(g);
        g = deskew(g);
        g = scale(g, 2.0);
        return g;
    }

    private BufferedImage grayscale(BufferedImage img) {
        BufferedImage out = new BufferedImage(img.getWidth(), img.getHeight(),
                BufferedImage.TYPE_BYTE_GRAY);
        Graphics2D g = out.createGraphics();
        g.drawImage(img, 0, 0, null);
        g.dispose();
        return out;
    }

    private BufferedImage denoise(BufferedImage img) {
        float[] k = {
                1/16f,2/16f,1/16f,
                2/16f,4/16f,2/16f,
                1/16f,2/16f,1/16f
        };
        return new ConvolveOp(new Kernel(3,3,k), ConvolveOp.EDGE_NO_OP, null).filter(img, null);
    }

    private BufferedImage stretchContrast(BufferedImage img) {
        int w = img.getWidth(), h = img.getHeight();
        int[] px = img.getRaster().getPixels(0,0,w,h,(int[])null);
        int min=255, max=0;
        for (int p : px) { if (p<min) min=p; if (p>max) max=p; }
        if (max==min) return img;
        int[] out = new int[px.length];
        for (int i=0;i<px.length;i++)
            out[i] = (int)(((double)(px[i]-min)/(max-min))*255);
        BufferedImage res = new BufferedImage(w,h,BufferedImage.TYPE_BYTE_GRAY);
        res.getRaster().setPixels(0,0,w,h,out);
        return res;
    }

    private BufferedImage otsuThreshold(BufferedImage gray) {
        int w=gray.getWidth(), h=gray.getHeight();
        int[] px = gray.getRaster().getPixels(0,0,w,h,(int[])null);
        int[] hist = new int[256];
        for (int p : px) hist[Math.min(255,Math.max(0,p))]++;
        double total=px.length, sum=0;
        for (int i=0;i<256;i++) sum+=i*hist[i];
        double sumB=0, wB=0, maxVar=0; int t=128;
        for (int i=0;i<256;i++) {
            wB+=hist[i]; if(wB==0) continue;
            double wF=total-wB; if(wF==0) break;
            sumB+=i*hist[i];
            double mB=sumB/wB, mF=(sum-sumB)/wF;
            double var=wB*wF*(mB-mF)*(mB-mF);
            if(var>maxVar){maxVar=var;t=i;}
        }
        final int threshold=t;
        int[] out=new int[px.length];
        for (int i=0;i<px.length;i++) out[i]= px[i]>=threshold?255:0;
        BufferedImage res=new BufferedImage(w,h,BufferedImage.TYPE_BYTE_GRAY);
        res.getRaster().setPixels(0,0,w,h,out);
        return res;
    }

    /** Projection-profile deskew. Tests ±10° in 0.5° steps. */
    private BufferedImage deskew(BufferedImage img) {
        int w=img.getWidth(), h=img.getHeight();
        int[] px=img.getRaster().getPixels(0,0,w,h,(int[])null);
        double bestAngle=0, bestVar=Double.MIN_VALUE;
        for (double a=-10;a<=10;a+=0.5) {
            double rad=Math.toRadians(a), cos=Math.cos(rad), sin=Math.sin(rad);
            int[] prof=new int[h];
            for (int y=0;y<h;y++) for (int x=0;x<w;x++) {
                int nx=(int)(x*cos-y*sin), ny=(int)(x*sin+y*cos);
                if (nx>=0&&nx<w&&ny>=0&&ny<h&&px[y*w+x]==0) prof[y]++;
            }
            double mean=0; for(int v:prof) mean+=v; mean/=h;
            double var=0; for(int v:prof) var+=(v-mean)*(v-mean); var/=h;
            if(var>bestVar){bestVar=var;bestAngle=a;}
        }
        if (Math.abs(bestAngle)<0.3) return img;
        log.debug("Deskew: rotating {:.1f}°", bestAngle);
        BufferedImage out=new BufferedImage(w,h,BufferedImage.TYPE_BYTE_GRAY);
        Graphics2D g=out.createGraphics();
        g.setColor(Color.WHITE); g.fillRect(0,0,w,h);
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,
                RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g.rotate(Math.toRadians(bestAngle),w/2.0,h/2.0);
        g.drawImage(img,0,0,null); g.dispose();
        return out;
    }

    private BufferedImage scale(BufferedImage img, double factor) {
        int nw=(int)(img.getWidth()*factor), nh=(int)(img.getHeight()*factor);
        BufferedImage out=new BufferedImage(nw,nh,BufferedImage.TYPE_BYTE_GRAY);
        Graphics2D g=out.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,
                RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        g.drawImage(img,0,0,nw,nh,null); g.dispose();
        return out;
    }

    // ── Quality metrics ───────────────────────────────────────────────────

    private double laplacianVariance(BufferedImage img) {
        BufferedImage g=grayscale(img);
        int w=g.getWidth(), h=g.getHeight();
        if(w>800||h>800) {
            double s=Math.min(800.0/w,800.0/h);
            g=scale(g,s); w=g.getWidth(); h=g.getHeight();
        }
        int[] px=g.getRaster().getPixels(0,0,w,h,(int[])null);
        double sum=0,sq=0; int n=0;
        for(int y=1;y<h-1;y++) for(int x=1;x<w-1;x++) {
            double lap=px[(y-1)*w+x]+px[(y+1)*w+x]+px[y*w+(x-1)]+px[y*w+(x+1)]-4*px[y*w+x];
            sum+=lap; sq+=lap*lap; n++;
        }
        if(n==0) return 0;
        double mean=sum/n;
        return sq/n - mean*mean;
    }

    private double contrastStdDev(BufferedImage img) {
        BufferedImage g=grayscale(img);
        int w=g.getWidth(),h=g.getHeight();
        int[] px=g.getRaster().getPixels(0,0,w,h,(int[])null);
        double sum=0; for(int p:px) sum+=p; double mean=sum/px.length;
        double var=0; for(int p:px) var+=(p-mean)*(p-mean);
        return Math.sqrt(var/px.length);
    }

    // ── Tesseract ─────────────────────────────────────────────────────────

    private String tesseract(BufferedImage img) throws Exception {
        Tesseract t = new Tesseract();
        String path = tessdataPath;
        if (path==null||path.isBlank()) path=System.getenv("TESSDATA_PREFIX");
        if (path==null||path.isBlank()) {
            for (String c : new String[]{
                    "/usr/share/tesseract-ocr/5/tessdata",
                    "/usr/share/tesseract-ocr/4/tessdata",
                    "/usr/share/tessdata",
                    "C:/Program Files/Tesseract-OCR/tessdata",
                    "C:/Program Files (x86)/Tesseract-OCR/tessdata"}) {
                if (new java.io.File(c).isDirectory()){path=c;break;}
            }
        }
        if (path!=null&&!path.isBlank()) t.setDatapath(path);
        t.setLanguage("eng");
        t.setPageSegMode(3);
        t.setOcrEngineMode(1);
        return t.doOCR(img);
    }

    // ── Field extraction ──────────────────────────────────────────────────

    private static final List<DateTimeFormatter> DATE_FMTS = List.of(
            DateTimeFormatter.ofPattern("dd/MM/yyyy"),
            DateTimeFormatter.ofPattern("MM/dd/yyyy"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd"),
            DateTimeFormatter.ofPattern("dd-MM-yyyy"),
            DateTimeFormatter.ofPattern("dd.MM.yyyy"),
            DateTimeFormatter.ofPattern("d MMM yyyy",   Locale.ENGLISH),
            DateTimeFormatter.ofPattern("dd MMM yyyy",  Locale.ENGLISH),
            DateTimeFormatter.ofPattern("MMMM d, yyyy", Locale.ENGLISH)
    );

    record ExpiryResult(String rawText, LocalDate date, boolean expired) {}

    private ExpiryResult extractExpiry(String text) {
        Pattern lp = Pattern.compile(
                "(?:expiry|expiration|exp\\.?|valid(?:\\s+(?:until|thru|through|to|upto?))?|" +
                        "expires?|validity|expiry\\s+date|date\\s+of\\s+expiry)[:\\s]+([0-9a-zA-Z/\\-.\\s,]+)",
                Pattern.CASE_INSENSITIVE);
        Matcher m=lp.matcher(text);
        if (m.find()) {
            LocalDate d=parseDate(m.group(1).trim());
            if(d!=null) return new ExpiryResult(m.group(1).trim(),d,d.isBefore(LocalDate.now()));
        }
        Pattern dp=Pattern.compile(
                "\\b(\\d{1,2}[/\\-.]\\d{1,2}[/\\-.]\\d{2,4}|\\d{4}[/\\-.]\\d{1,2}[/\\-.]\\d{1,2}" +
                        "|\\d{1,2}\\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?\\s+\\d{4}" +
                        "|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?\\s+\\d{1,2},?\\s+\\d{4})\\b",
                Pattern.CASE_INSENSITIVE);
        Matcher dm=dp.matcher(text);
        LocalDate latest=null; String lr=null;
        while(dm.find()){LocalDate d=parseDate(dm.group().trim());if(d!=null&&(latest==null||d.isAfter(latest))){latest=d;lr=dm.group().trim();}}
        if(latest!=null) return new ExpiryResult(lr,latest,latest.isBefore(LocalDate.now()));
        return new ExpiryResult(null,null,false);
    }

    private LocalDate parseDate(String raw) {
        if(raw==null) return null;
        raw=raw.trim().replaceAll("\\s+"," ").replace(",","");
        for(DateTimeFormatter f:DATE_FMTS){try{return LocalDate.parse(raw,f);}catch(Exception ignored){}}
        return null;
    }

    /**
     * Extracts the owner/driver name from OCR text.
     *
     * Strategy (tried in order):
     *   1. "Name of Owner" label  (Vehicle Registration Certificates — Pakistan/India)
     *   2. "Name of Father/Husband/Son of" prefix stripped  (avoids capturing relational suffix)
     *   3. Generic label: Name:/Driver:/Holder:/Issued to:
     *   4. Fuzzy line scan — best token overlap with expectedName
     *
     * After extraction, any trailing "Son of / Daughter of / Wife of / S/o / D/o"
     * suffix is stripped before comparison, as VRCs commonly append this.
     */
    private String extractName(String text, String expected) {
        log.debug("NAME_EXTRACT: input text length={} expected='{}'", text.length(), expected);
        log.debug("NAME_EXTRACT: full OCR text:\n{}", text);

        String extracted = null;

        // ── 1. "Name of Owner" pattern (VRC Pakistan/India) ──────────────
        // Matches: "Name of Owner: Abdul Kareem" or "Name of Owner Abdul Kareem"
        Matcher vrc = Pattern.compile(
                "name\\s+of\\s+(?:owner|registered\\s+owner|proprietor|holder)" +
                        "[:\\s]+([A-Za-z][A-Za-z .'-]{1,50})",
                Pattern.CASE_INSENSITIVE).matcher(text);
        if (vrc.find()) {
            extracted = cleanExtractedName(vrc.group(1));
            log.info("NAME_EXTRACT: matched VRC 'Name of Owner' pattern → raw='{}' cleaned='{}'",
                    vrc.group(1), extracted);
        }

        // ── 2. Owner/Registered to label variants ─────────────────────────
        if (extracted == null) {
            Matcher owner = Pattern.compile(
                    "(?:owner(?:'s)?\\s+name|registered\\s+(?:owner|to|in\\s+name\\s+of)|" +
                            "vehicle\\s+owner|in\\s+the\\s+name\\s+of)[:\\s]+([A-Za-z][A-Za-z .'-]{1,50})",
                    Pattern.CASE_INSENSITIVE).matcher(text);
            if (owner.find()) {
                extracted = cleanExtractedName(owner.group(1));
                log.info("NAME_EXTRACT: matched owner label → raw='{}' cleaned='{}'",
                        owner.group(1), extracted);
            }
        }

        // ── 3. Generic label: Name:/Driver:/Holder:/Issued to: ─────────────
        if (extracted == null) {
            Matcher generic = Pattern.compile(
                    "(?:^|\\n)\\s*(?:name|driver|holder|applicant|issued\\s+to)" +
                            "[:\\s]+([A-Z][A-Za-z .'-]{1,50})",
                    Pattern.CASE_INSENSITIVE | Pattern.MULTILINE).matcher(text);
            if (generic.find()) {
                extracted = cleanExtractedName(generic.group(1));
                log.info("NAME_EXTRACT: matched generic label → raw='{}' cleaned='{}'",
                        generic.group(1), extracted);
            }
        }

        // ── 4. Fuzzy line scan — best token overlap with expected name ─────
        if (extracted == null) {
            log.debug("NAME_EXTRACT: no label matched, falling back to fuzzy line scan");
            if (expected != null && !expected.isBlank()) {
                String[] et = expected.toLowerCase().replaceAll("[^a-z\\s]","").split("\\s+");
                String best = null; int bs = 0;
                for (String line : text.split("\n")) {
                    line = line.trim();
                    if (line.length() < 3 || line.length() > 80) continue;
                    String[] lt = line.toLowerCase().replaceAll("[^a-z\\s]","").split("\\s+");
                    int sc = 0;
                    for (String lw : lt) for (String ew : et)
                        if (ew.equals(lw) || (ew.length() > 3 && lw.contains(ew))) sc++;
                    if (sc > bs) { bs = sc; best = line; }
                }
                if (bs >= 1) {
                    extracted = cleanExtractedName(best);
                    log.info("NAME_EXTRACT: fuzzy scan best line raw='{}' cleaned='{}'", best, extracted);
                }
            }
        }

        if (extracted == null) {
            log.warn("NAME_EXTRACT: no name found in OCR text");
        }
        return extracted;
    }

    /**
     * Strip trailing relational suffixes commonly printed on Pakistani/Indian
     * vehicle registration certificates after the owner's name:
     *   "Abdul Kareem Son of Mohammad"     → "Abdul Kareem"
     *   "Abdul Kareem S/O Mohammad Arif"   → "Abdul Kareem"
     *   "Sara Bibi W/O Abdul Kareem"       → "Sara Bibi"
     *   "Ali Hassan D/O ..."               → "Ali Hassan"
     * Also collapses multiple spaces and trims.
     */
    private String cleanExtractedName(String raw) {
        if (raw == null) return null;
        // Remove son/daughter/wife/husband of suffix (common in Pakistani/Indian docs)
        String cleaned = raw.replaceAll(
                "(?i)\\s+(?:son|daughter|wife|husband|d/o|s/o|w/o|h/o|c/o|d\\.o|s\\.o|w\\.o)" +
                        "(?:\\s+(?:of|/o))?[\\s\\w.]*$", "");
        // Collapse multiple spaces, trim
        cleaned = cleaned.replaceAll("\\s+", " ").trim();
        // Remove trailing punctuation
        cleaned = cleaned.replaceAll("[,;:]+$", "").trim();
        return cleaned.isBlank() ? null : cleaned;
    }

    private boolean nameMatch(String a, String b) {
        if (a == null || b == null) {
            log.info("NAME_MATCH: one side null — a='{}' b='{}'", a, b);
            return false;
        }
        // Normalize: lowercase, collapse spaces, remove non-alpha except spaces
        String na = a.toLowerCase().replaceAll("[^a-z\\s]", "").replaceAll("\\s+", " ").trim();
        String nb = b.toLowerCase().replaceAll("[^a-z\\s]", "").replaceAll("\\s+", " ").trim();
        log.info("NAME_MATCH: normalized extracted='{}' normalized expected='{}'", na, nb);
        if (na.isEmpty() || nb.isEmpty()) { log.warn("NAME_MATCH: one side empty after normalizing"); return false; }

        // Exact match after normalisation
        if (na.equals(nb)) { log.info("NAME_MATCH: exact match"); return true; }

        // Token overlap (handles partial names / initials)
        List<String> at = Arrays.asList(na.split("\\s+")), bt = Arrays.asList(nb.split("\\s+"));
        long overlap = at.stream().filter(bt::contains).count();
        int  min     = Math.min(at.size(), bt.size());
        boolean result = min > 0 && overlap >= Math.max(1, (long)Math.ceil(min * 0.6));
        log.info("NAME_MATCH: token overlap={} min={} threshold={} result={}",
                overlap, min, (long)Math.ceil(min * 0.6), result);
        return result;
    }

    private String extractDocNumber(String text) {
        Matcher m=Pattern.compile(
                "(?:no\\.?|number|reg(?:istration)?|license|lic\\.?|dl|cnic|id)[.:\\s#]+([A-Z0-9][A-Z0-9\\-]{4,19})",
                Pattern.CASE_INSENSITIVE).matcher(text);
        if(m.find()) return m.group(1).trim();
        Matcher m2=Pattern.compile("\\b([A-Z]{1,4}-?\\d{4,12}|\\d{7,15})\\b").matcher(text);
        return m2.find()?m2.group(1).trim():null;
    }

    // ── Persistence ───────────────────────────────────────────────────────

    /**
     * Persist a successful or REVIEW result.
     * Guarantees aiScore, aiFlags, aiCheckedAt, aiRawResponse are NEVER NULL.
     */
    private void writeResult(DriverDocument doc, UUID userId, int score, List<String> flags,
                             VerificationStatus status, String rawOcr, String extractedJson) {
        try {
            BigDecimal dbScore = BigDecimal.valueOf(score / 100.0).setScale(2, RoundingMode.HALF_UP);
            doc.setAiScore(dbScore);
            doc.setAiFlags(json.writeValueAsString(flags));
            doc.setAiCheckedAt(LocalDateTime.now());
            doc.setAiRawResponse(truncate(rawOcr.isBlank() ? "no-text" : rawOcr, 4000));
            doc.setAiExtractedData(extractedJson != null ? truncate(extractedJson, 4000) : "{}");
            doc.setOcrStatus(status);
            repo.save(doc);
            log.info("OCR[{}] PERSISTED status={} score={} flags={}", doc.getDocId(), status, score, flags);

            // ── Auto-activation check ──────────────────────────────────────
            // userId was captured before the session closed — no lazy load here.
            if (status == VerificationStatus.PASS) {
                // Delegate to separate @Transactional bean — self-call would bypass proxy
                activationService.tryActivate(userId);
            }

        } catch (Exception e) {
            log.error("OCR[{}] PERSIST FAILED: {}", doc.getDocId(), e.getMessage(), e);
        }
    }

    /**
     * Auto-activation eligibility check — runs after every PASS result.
     *
     * Rules (must ALL be true):
     *   1. LICENSE exists and ocrStatus == PASS
     *   2. VEHICLE_REGISTRATION exists and ocrStatus == PASS
     *   3. Neither document has a critical flag: NAME_MISMATCH, EXPIRED,
     *      UNREADABLE, BLURRY
     *   4. Driver has at least one registered vehicle
     *   5. Driver account is PENDING_VERIFICATION (not already ACTIVE or REJECTED)
     *
     * On success: driver.status = ACTIVE (frontend polls /auth/me and redirects).
     * On failure: driver.status stays PENDING_VERIFICATION → admin review queue.
     */
    @org.springframework.transaction.annotation.Transactional
    protected void tryAutoActivate(UUID userId) {
        try {
            com.ridewave.model.User user = userRepo.findById(userId).orElse(null);
            if (user == null) return;

            // Only act on accounts waiting for verification
            if (user.getStatus() != com.ridewave.model.enums.UserStatus.PENDING_VERIFICATION) {
                log.debug("AUTO_ACTIVATE[{}] skipped — status={}", userId, user.getStatus());
                return;
            }

            log.info("AUTO_ACTIVATE[{}] checking eligibility...", userId);

            List<DriverDocument> docs = repo.findByUser_UserId(userId);

            // Critical flags that block auto-activation
            Set<String> CRITICAL_FLAGS = Set.of(
                    "NAME_MISMATCH", "EXPIRED", "UNREADABLE", "BLURRY", "OCR_FAILED",
                    "INVALID_FORMAT", "NAME_NOT_FOUND");

            // Check each required document type
            for (com.ridewave.model.enums.DocumentType required : List.of(
                    com.ridewave.model.enums.DocumentType.LICENSE,
                    com.ridewave.model.enums.DocumentType.VEHICLE_REGISTRATION)) {

                DriverDocument d = docs.stream()
                        .filter(x -> x.getDocType() == required)
                        .filter(x -> x.getOcrStatus() == VerificationStatus.PASS)
                        .findFirst().orElse(null);

                if (d == null) {
                    log.info("AUTO_ACTIVATE[{}] not eligible — {} not PASS", userId, required);
                    return;
                }

                // Check for critical flags
                List<String> docFlags = parseFlags(d.getAiFlags());
                for (String f : docFlags) {
                    if (CRITICAL_FLAGS.contains(f)) {
                        log.info("AUTO_ACTIVATE[{}] not eligible — {} has critical flag: {}", userId, required, f);
                        return;
                    }
                }
            }

            // Vehicle check: if the driver has registered any vehicle, include it.
            // NOTE: Vehicle creation is via Profile page, not onboarding steps.
            // We do NOT block auto-activation on vehicle absence — a driver can
            // register their vehicle after activation. The VRC upload itself
            // already proves vehicle ownership.
            List<com.ridewave.model.Vehicle> vehicles = vehicleRepo.findByUser_UserId(userId);
            log.info("AUTO_ACTIVATE[{}] vehicles found={}", userId, vehicles.size());
            // (not a blocking condition — see note above)

            // All checks passed — activate
            userRepo.updateStatus(userId, com.ridewave.model.enums.UserStatus.ACTIVE);
            log.info("AUTO_ACTIVATE[{}] ✓ ALL CHECKS PASSED — driver.status = ACTIVE", userId);

        } catch (Exception e) {
            log.error("AUTO_ACTIVATE[{}] error during eligibility check: {}", userId, e.getMessage(), e);
            // Non-fatal: driver stays PENDING_VERIFICATION → admin reviews normally
        }
    }

    private List<String> parseFlags(String aiFlags) {
        if (aiFlags == null || aiFlags.isBlank()) return List.of();
        try {
            return json.readValue(aiFlags,
                    new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {});
        } catch (Exception e) { return List.of(); }
    }

    /** Persist a FAIL (or REVIEW on final attempt). Score = 0, flags always set. */
    private void writeFailure(DriverDocument doc, UUID userId, int attempt, List<String> baseFlags,
                              String reason, String rawOcr) {
        List<String> flags = new ArrayList<>(baseFlags);
        VerificationStatus status;
        if (attempt >= MAX_ATTEMPTS) {
            flags.add("MAX_ATTEMPTS_REACHED"); flags.add("ADMIN_REVIEW");
            status = VerificationStatus.REVIEW;
        } else {
            status = VerificationStatus.FAIL;
        }
        try {
            String extracted = json.writeValueAsString(Map.of(
                    "ocrText","","score",0,"flags",flags,"status",status.name(),"error",reason));
            writeResult(doc, userId, 0, flags, status, rawOcr.isBlank()?"error:"+reason:rawOcr, extracted);
        } catch (Exception e) {
            log.error("OCR[{}] writeFailure json error: {}", doc.getDocId(), e.getMessage());
            writeResult(doc, userId, 0, flags, status, "error:"+reason, "{}");
        }
    }

    // ── Build strict JSON output ───────────────────────────────────────────

    private String buildExtractedJson(String ocrText, int score, List<String> flags,
                                      String status, String extractedName, String expectedName,
                                      String docNumber,
                                      ExpiryResult expiry, boolean nameMatch,
                                      double lapVar, double contrast) {
        try {
            Map<String,Object> m = new LinkedHashMap<>();
            m.put("ocrText",       truncate(ocrText, 2000));
            m.put("score",         score);
            m.put("flags",         flags);
            m.put("status",        status);
            m.put("fullName",      extractedName);        // what OCR extracted (cleaned)
            m.put("expectedName",  expectedName);          // user's profile name
            m.put("nameMatch",     nameMatch);
            m.put("docNumber",     docNumber);
            m.put("expiryDate",    expiry.date()!=null?expiry.date().toString():null);
            m.put("expiryRaw",     expiry.rawText());
            m.put("expired",       expiry.expired());
            m.put("lapVar",        sf(lapVar));
            m.put("contrast",      sf(contrast));
            m.put("pipeline",      "local-tesseract-v4");
            return json.writeValueAsString(m);
        } catch (Exception e) { return "{}"; }
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private String[] splitDataUrl(String url) {
        if(url==null||!url.startsWith("data:")) return null;
        int c=url.indexOf(','); if(c<0) return null;
        return new String[]{url.substring(5,c).split(";")[0],url.substring(c+1)};
    }

    private String truncate(String s, int max) {
        if(s==null) return "";
        return s.length()<=max?s:s.substring(0,max)+"...[truncated]";
    }

    private String sf(double d) { return String.format("%.2f",d); }
}