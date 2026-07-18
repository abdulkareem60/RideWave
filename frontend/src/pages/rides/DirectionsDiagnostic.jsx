/**
 * Directions API Diagnostic
 *
 * Calls google.maps.DirectionsService.route() with provideRouteAlternatives=true
 * and dumps the COMPLETE raw response so you can see exactly what Google returns
 * before any extraction code touches it.
 *
 * HOW TO USE:
 * 1. Add your route (paste Karachi coordinates for a real test)
 * 2. Click "Run Diagnostic"
 * 3. Read the output — it shows rawRoutes.length, each route's keys,
 *    overview_polyline shape, summary, and leg data
 * 4. The "What we extract" section shows what our code actually gets
 *
 * This tells us definitively whether the issue is:
 *   A) Google returning only 1 route (API limitation for this route)
 *   B) Our extraction code misreading the response
 */

import { useState, useEffect, useRef } from "react";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

function loadMaps() {
  if (window.google?.maps?.DirectionsService) return Promise.resolve();
  if (window.__mapsPromise) return window.__mapsPromise;
  window.__mapsPromise = new Promise((resolve, reject) => {
    const cb = "__mapsReady_" + Date.now();
    window[cb] = () => { delete window[cb]; resolve(); };
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places&callback=${cb}`;
    s.async = true;
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return window.__mapsPromise;
}

// Test routes — pairs of Karachi locations that typically have multiple road options
const TEST_ROUTES = [
  {
    label: "Saddar → Safoora Goth",
    origin:      { lat: 24.8607, lng: 67.0104 },
    destination: { lat: 24.9444, lng: 67.1111 },
  },
  {
    label: "Clifton → Gulshan-e-Iqbal",
    origin:      { lat: 24.8099, lng: 67.0249 },
    destination: { lat: 24.9215, lng: 67.0939 },
  },
  {
    label: "Korangi → North Karachi",
    origin:      { lat: 24.8387, lng: 67.1255 },
    destination: { lat: 24.9875, lng: 67.0623 },
  },
];

export default function DirectionsDiagnostic() {
  const [status,    setStatus]    = useState("idle");
  const [results,   setResults]   = useState([]);
  const [routeIdx,  setRouteIdx]  = useState(0);
  const [gmReady,   setGmReady]   = useState(!!window.google?.maps?.DirectionsService);

  useEffect(() => {
    loadMaps().then(() => setGmReady(true)).catch(console.error);
  }, []);

  async function runDiagnostic() {
    if (!gmReady) { alert("Maps not loaded yet"); return; }
    setStatus("running");
    setResults([]);

    const test = TEST_ROUTES[routeIdx];
    const svc  = new window.google.maps.DirectionsService();

    const request = {
      origin:                   test.origin,
      destination:              test.destination,
      travelMode:               "DRIVING",
      provideRouteAlternatives: true,
    };

    console.group("[DIAGNOSTIC] Directions API call");
    console.info("Request:", request);

    let result;
    try {
      result = await svc.route(request);
    } catch (err) {
      const msg = typeof err === "string" ? err : (err?.message ?? String(err));
      console.error("API error:", err);
      console.groupEnd();
      setStatus("error");
      setResults([{ type: "error", message: msg }]);
      return;
    }

    console.info("Full result:", result);
    console.info("result.routes.length:", result?.routes?.length);

    if (result?.routes) {
      result.routes.forEach((r, i) => {
        console.group(`route[${i}]`);
        console.info("keys:", Object.keys(r));
        console.info("summary:", r.summary);
        console.info("overview_polyline:", r.overview_polyline);
        console.info("typeof overview_polyline:", typeof r.overview_polyline);
        if (r.overview_polyline && typeof r.overview_polyline === "object") {
          console.info("overview_polyline.points:", r.overview_polyline.points);
        }
        console.info("legs[0].distance:", r.legs?.[0]?.distance);
        console.info("legs[0].duration:", r.legs?.[0]?.duration);
        console.groupEnd();
      });
    }
    console.groupEnd();

    // ── Build human-readable diagnostic output ────────────────────────────
    const rawRoutes = result?.routes ?? [];
    const output = [];

    output.push({
      type: "info",
      label: "Total raw routes from Google",
      value: rawRoutes.length,
    });

    output.push({
      type: "info",
      label: "provideRouteAlternatives was set",
      value: "true (confirmed in request above)",
    });

    rawRoutes.forEach((r, i) => {
      const op = r.overview_polyline;
      const leg = r.legs?.[0];

      // Extract polyline using every method
      let poly = null, polyMethod = "none";
      if (op && typeof op === "object" && typeof op.points === "string") {
        poly = op.points;
        polyMethod = "overview_polyline.points";
      } else if (typeof op === "string" && op) {
        poly = op;
        polyMethod = "overview_polyline (string)";
      } else if (leg?.steps?.length) {
        const pts = leg.steps.map(s => s.polyline?.points).filter(Boolean);
        if (pts[0]) { poly = pts[0]; polyMethod = `step[0].polyline.points (${pts.length} steps)`; }
      }

      output.push({
        type: "route",
        index: i,
        summary:          r.summary         ?? "(no summary field)",
        overviewPolyType: op === null       ? "null"
                        : op === undefined  ? "undefined"
                        : typeof op === "object" ? `object — .points is ${typeof op.points} (len=${op.points?.length ?? "N/A"})`
                        : `string (len=${op.length})`,
        distanceText:  leg?.distance?.text  ?? "missing",
        distanceValue: leg?.distance?.value ?? "missing",
        durationText:  leg?.duration?.text  ?? "missing",
        durationValue: leg?.duration?.value ?? "missing",
        polyExtracted: poly ? `YES via ${polyMethod} (${poly.length} chars)` : "NO — would be filtered out",
        polyOk: !!poly,
      });
    });

    if (rawRoutes.length === 0) {
      output.push({ type: "warn", label: "Reason", value: "Google returned 0 routes. Check DirectionsStatus." });
    } else if (rawRoutes.length === 1) {
      output.push({ type: "warn", label: "Google limitation", value: "Only 1 route returned. This is normal for routes where Google has no meaningful alternative (e.g. a motorway with no parallel road). Not a code bug." });
    } else {
      output.push({ type: "ok", label: "Multiple routes", value: `${rawRoutes.length} routes — alternatives ARE available for this origin/destination pair.` });
    }

    setResults(output);
    setStatus("done");
  }

  const card = (children, bg = "var(--color-background-primary)") => ({
    background: bg,
    border: "1px solid var(--color-border-tertiary)",
    borderRadius: 12,
    padding: "14px 16px",
    marginBottom: 10,
  });

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 20px 60px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 18, fontWeight: 800, color: "var(--color-text-primary)", marginBottom: 4 }}>
        Directions API Diagnostic
      </h1>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 20 }}>
        Calls the real Google Directions API and shows the raw response — no extraction, no filtering.
        Tells you definitively if the issue is Google (only returns 1 route) or our code.
      </p>

      <div style={card()}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>
            Test Route
          </label>
          <select value={routeIdx} onChange={e => setRouteIdx(+e.target.value)}
            style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: "1.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 14, outline: "none" }}>
            {TEST_ROUTES.map((r, i) => <option key={i} value={i}>{r.label}</option>)}
          </select>
        </div>

        <button onClick={runDiagnostic} disabled={!gmReady || status === "running"}
          style={{ width: "100%", padding: "11px 0", borderRadius: 10, border: "none", background: status === "running" ? "#185FA580" : "#185FA5", color: "#fff", fontSize: 14, fontWeight: 700, cursor: (!gmReady || status === "running") ? "not-allowed" : "pointer" }}>
          {status === "running" ? "Calling Directions API…" : gmReady ? "Run Diagnostic" : "Loading Maps API…"}
        </button>

        <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 8, textAlign: "center" }}>
          Results also printed to DevTools Console → check the [DIAGNOSTIC] group
        </p>
      </div>

      {results.map((r, i) => {
        if (r.type === "error") return (
          <div key={i} style={card("#dc262610")}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#dc2626" }}>❌ API Error</div>
            <div style={{ fontSize: 13, color: "#dc2626", marginTop: 4 }}>{r.message}</div>
          </div>
        );

        if (r.type === "info") return (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px", borderRadius: 9, background: "var(--color-background-secondary)", marginBottom: 8, fontSize: 13 }}>
            <span style={{ color: "var(--color-text-secondary)" }}>{r.label}</span>
            <span style={{ fontWeight: 700, color: "var(--color-text-primary)" }}>{String(r.value)}</span>
          </div>
        );

        if (r.type === "warn") return (
          <div key={i} style={card("#fef3c7")}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 4 }}>⚠️ {r.label}</div>
            <div style={{ fontSize: 13, color: "#92400e" }}>{r.value}</div>
          </div>
        );

        if (r.type === "ok") return (
          <div key={i} style={card("#05966912")}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#059669", marginBottom: 4 }}>✓ {r.label}</div>
            <div style={{ fontSize: 13, color: "#059669" }}>{r.value}</div>
          </div>
        );

        if (r.type === "route") return (
          <div key={i} style={card(r.polyOk ? "var(--color-background-primary)" : "#dc262608", r.polyOk ? undefined : "#dc262610")}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: r.polyOk ? "#185FA5" : "#dc2626", color: "#fff", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {r.index}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>
                {r.summary}
              </div>
            </div>
            {[
              ["overview_polyline type", r.overviewPolyType],
              ["Polyline extracted?",    r.polyExtracted],
              ["Distance",              `${r.distanceText} (${r.distanceValue} m)`],
              ["Duration",              `${r.durationText} (${r.durationValue} s)`],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", gap: 12, marginBottom: 5, fontSize: 12 }}>
                <span style={{ color: "var(--color-text-tertiary)", minWidth: 160, flexShrink: 0 }}>{label}</span>
                <span style={{ color: "var(--color-text-primary)", fontFamily: "monospace", wordBreak: "break-all" }}>{value}</span>
              </div>
            ))}
          </div>
        );

        return null;
      })}
    </div>
  );
}