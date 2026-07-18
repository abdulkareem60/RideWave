/**
 * HomePage — RideWave guest landing page.
 *
 * ALL logic, routing, authentication, and API calls unchanged.
 * PlacesAutocomplete + navigation to /rides/search preserved exactly.
 * UI/UX redesign only.
 *
 * Design language:
 *   - Full-bleed hero with Unsplash photo + dark gradient overlay
 *   - Working RouteSearchCard as the primary CTA (not a button)
 *   - Horizontal "how it works" timeline (editorial, not card grid)
 *   - CSS-only micro-animations (no Framer Motion dependency)
 *   - White + #185FA5 blue + #059669 emerald palette
 *   - Signature: the city photo hero with a glass-morphism search card
 */

import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MapPin, Flag, ArrowRight, ShieldCheck, Star, Clock,
  Car, Users, Wallet, CheckCircle2, Navigation, Smartphone,
  ChevronRight, Play, Award, Zap, MapIcon, Phone,
  Twitter, Instagram, Facebook, ArrowUpRight, Route,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import PlacesAutocomplete from '../components/rides/PlacesAutocomplete.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// Shared CSS (injected once at page level)
// ─────────────────────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @keyframes hp-fadeUp   { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:none; } }
  @keyframes hp-fadeIn   { from { opacity:0; } to { opacity:1; } }
  @keyframes hp-float    { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-6px); } }
  @keyframes hp-shimmer  { from { background-position: -200% center; } to { background-position: 200% center; } }
  @keyframes hp-countUp  { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
  @keyframes hp-slideIn  { from { opacity:0; transform:translateX(-16px); } to { opacity:1; transform:none; } }

  .hp-fade-up   { animation: hp-fadeUp  0.7s cubic-bezier(.22,1,.36,1) both; }
  .hp-fade-in   { animation: hp-fadeIn  0.6s ease both; }
  .hp-float     { animation: hp-float   4s   ease-in-out infinite; }
  .hp-stat      { animation: hp-countUp 0.8s cubic-bezier(.22,1,.36,1) both; }
  .hp-slide-in  { animation: hp-slideIn 0.7s cubic-bezier(.22,1,.36,1) both; }

  .hp-delay-100 { animation-delay: 100ms; }
  .hp-delay-200 { animation-delay: 200ms; }
  .hp-delay-300 { animation-delay: 300ms; }
  .hp-delay-400 { animation-delay: 400ms; }
  .hp-delay-500 { animation-delay: 500ms; }
  .hp-delay-600 { animation-delay: 600ms; }
  .hp-delay-700 { animation-delay: 700ms; }
  .hp-delay-800 { animation-delay: 800ms; }

  .hp-card-hover {
    transition: transform 0.22s cubic-bezier(.22,1,.36,1),
                box-shadow 0.22s cubic-bezier(.22,1,.36,1),
                border-color 0.22s ease;
  }
  .hp-card-hover:hover {
    transform: translateY(-3px);
    box-shadow: 0 20px 40px rgba(0,0,0,.1);
  }
  .hp-link-hover {
    transition: color .15s, text-decoration-color .15s;
    text-underline-offset: 3px;
  }
  .hp-link-hover:hover { color: #185FA5; }

  .hp-btn-primary {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 13px 28px; border-radius: 12px;
    background: #185FA5; color: #fff;
    font-size: 15px; font-weight: 700; letter-spacing: -.01em;
    border: none; cursor: pointer; text-decoration: none;
    transition: background .15s, transform .15s, box-shadow .15s;
    box-shadow: 0 4px 14px rgba(24,95,165,.35);
  }
  .hp-btn-primary:hover {
    background: #1451884;
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(24,95,165,.45);
  }
  .hp-btn-ghost {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 13px 24px; border-radius: 12px;
    background: rgba(255,255,255,.12); color: #fff;
    font-size: 15px; font-weight: 600; letter-spacing: -.01em;
    border: 1.5px solid rgba(255,255,255,.25); cursor: pointer;
    text-decoration: none; backdrop-filter: blur(8px);
    transition: background .15s, border-color .15s;
  }
  .hp-btn-ghost:hover {
    background: rgba(255,255,255,.2);
    border-color: rgba(255,255,255,.4);
  }
  .hp-btn-outline {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 12px 24px; border-radius: 12px;
    background: transparent; color: #185FA5;
    font-size: 15px; font-weight: 600;
    border: 1.5px solid #185FA5; cursor: pointer;
    text-decoration: none;
    transition: background .15s, color .15s;
  }
  .hp-btn-outline:hover { background: #185FA5; color: #fff; }

  .hp-glass {
    background: rgba(255,255,255,.92);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid rgba(255,255,255,.6);
  }

  .hp-label {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 11px; font-weight: 700; letter-spacing: .1em;
    text-transform: uppercase; color: #185FA5;
  }
  .hp-label::before {
    content: ''; display: block;
    width: 24px; height: 2px; background: #185FA5;
    border-radius: 2px;
  }

  .hp-step-line::after {
    content: '';
    position: absolute;
    top: 22px; left: calc(50% + 22px);
    width: calc(100% - 44px); height: 1px;
    background: linear-gradient(to right, #185FA5, #059669);
    opacity: .25;
  }

  .hp-city-card {
    position: relative; overflow: hidden;
    border-radius: 16px; cursor: pointer;
    aspect-ratio: 4/3;
    transition: transform .25s cubic-bezier(.22,1,.36,1), box-shadow .25s;
  }
  .hp-city-card:hover {
    transform: scale(1.03);
    box-shadow: 0 24px 48px rgba(0,0,0,.25);
  }
  .hp-city-card img {
    width: 100%; height: 100%; object-fit: cover;
    transition: transform .5s cubic-bezier(.22,1,.36,1);
  }
  .hp-city-card:hover img { transform: scale(1.06); }
  .hp-city-card .overlay {
    position: absolute; inset: 0;
    background: linear-gradient(to top, rgba(0,0,0,.7) 0%, transparent 55%);
  }

  .hp-testimonial {
    background: #fff;
    border: 1px solid #E5E7EB;
    border-radius: 20px;
    padding: 28px;
    transition: box-shadow .22s, border-color .22s, transform .22s cubic-bezier(.22,1,.36,1);
  }
  .hp-testimonial:hover {
    box-shadow: 0 16px 40px rgba(0,0,0,.08);
    border-color: #BFDBFE;
    transform: translateY(-2px);
  }

  .hp-gradient-text {
    background: linear-gradient(135deg, #185FA5 0%, #059669 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  @media (prefers-reduced-motion: reduce) {
    .hp-fade-up, .hp-fade-in, .hp-float, .hp-stat, .hp-slide-in {
      animation: none !important; opacity: 1 !important; transform: none !important;
    }
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// Scroll reveal hook
// ─────────────────────────────────────────────────────────────────────────────
function useScrollReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

// ─────────────────────────────────────────────────────────────────────────────
// RouteSearchCard — logic UNCHANGED from original
// ─────────────────────────────────────────────────────────────────────────────
function RouteSearchCard() {
  const navigate = useNavigate();
  const [from, setFrom] = useState('');
  const [to,   setTo]   = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to)   params.set('to',   to);
    navigate(`/rides/search${params.toString() ? `?${params}` : ''}`);
  };

  return (
    <form onSubmit={handleSubmit} className="hp-glass" style={{
      borderRadius: 20,
      padding: '28px 24px',
      boxShadow: '0 32px 64px rgba(0,0,0,.24), 0 0 0 1px rgba(255,255,255,.5)',
      width: '100%',
      maxWidth: 420,
    }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 12 }}>
          Where are you going?
        </div>

        {/* Route indicator */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 14, gap: 0, flexShrink: 0 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#059669', border: '2px solid #D1FAE5' }} />
            <div style={{ width: 2, height: 32, background: 'linear-gradient(to bottom, #059669, #185FA5)', margin: '3px 0', opacity: .4 }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#185FA5', border: '2px solid #DBEAFE' }} />
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <PlacesAutocomplete
              id="hero-from"
              placeholder="Leaving from…"
              value={from}
              onChange={setFrom}
              icon={MapPin}
            />
            <PlacesAutocomplete
              id="hero-to"
              placeholder="Going to…"
              value={to}
              onChange={setTo}
              icon={Flag}
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={!from && !to}
        style={{
          width: '100%', padding: '14px 20px',
          background: (!from && !to) ? '#9CA3AF' : '#185FA5',
          color: '#fff', border: 'none', borderRadius: 12,
          fontSize: 15, fontWeight: 700, cursor: (!from && !to) ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'background .15s, transform .12s',
          boxShadow: (!from && !to) ? 'none' : '0 4px 14px rgba(24,95,165,.4)',
        }}
        onMouseEnter={e => { if (from || to) e.target.style.transform = 'translateY(-1px)'; }}
        onMouseLeave={e => { e.target.style.transform = 'none'; }}
      >
        <Route size={16} /> Search rides
        <ArrowRight size={15} />
      </button>

      <div style={{ display: 'flex', gap: 16, marginTop: 16, paddingTop: 16, borderTop: '1px solid #F3F4F6' }}>
        {[['4.9★', 'Avg rating'], ['30K+', 'Rides'], ['Verified', 'Drivers']].map(([val, label]) => (
          <div key={label} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{val}</div>
            <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 1 }}>{label}</div>
          </div>
        ))}
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Floating stat pill (hero overlay)
// ─────────────────────────────────────────────────────────────────────────────
function StatPill({ value, label, icon: Icon, delay, style: extraStyle }) {
  return (
    <div className={`hp-stat hp-delay-${delay}`} style={{
      display: 'inline-flex', alignItems: 'center', gap: 10,
      padding: '12px 16px', borderRadius: 14,
      background: 'rgba(255,255,255,.1)', backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,.2)',
      ...extraStyle,
    }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={18} style={{ color: '#fff' }} />
      </div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', marginTop: 1 }}>{label}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hero Section
// ─────────────────────────────────────────────────────────────────────────────
function HeroSection({ user, isDriver, isAdmin }) {
  const dashLink = isAdmin ? '/admin/dashboard' : isDriver ? '/driver/dashboard' : '/rides/search';

  return (
    <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Background photo — Pakistani highway/city roads */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <img
          src="https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1800&q=80&auto=format&fit=crop"
          alt=""
          aria-hidden="true"
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 40%' }}
        />
        {/* Multi-layer gradient for depth + readability */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(15,17,23,.92) 0%, rgba(15,17,23,.75) 50%, rgba(24,95,165,.4) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,17,23,.8) 0%, transparent 60%)' }} />
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto', padding: '0 24px', paddingTop: 80, paddingBottom: 80, flex: 1, display: 'flex', alignItems: 'center' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 60, alignItems: 'center', width: '100%' }}>

          {/* Left — copy */}
          <div style={{ maxWidth: 580 }}>
            <div className="hp-fade-up" style={{ marginBottom: 20 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 100, background: 'rgba(5,150,105,.2)', border: '1px solid rgba(5,150,105,.4)', fontSize: 12, fontWeight: 600, color: '#34D399', letterSpacing: '.04em' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399', flexShrink: 0 }} />
                Now serving Karachi · Lahore · Islamabad
              </span>
            </div>

            <h1 className="hp-fade-up hp-delay-100" style={{ fontSize: 'clamp(42px, 6vw, 80px)', fontWeight: 900, color: '#fff', lineHeight: 1.0, letterSpacing: '-.03em', marginBottom: 24 }}>
              Your city.<br />
              <span className="hp-gradient-text">Shared smarter.</span>
            </h1>

            <p className="hp-fade-up hp-delay-200" style={{ fontSize: 18, color: 'rgba(255,255,255,.72)', lineHeight: 1.65, maxWidth: 440, marginBottom: 36 }}>
              Connect with verified drivers heading your way. Book a seat, split the cost, skip the traffic. Real rides, real people, real savings.
            </p>

            {!user && (
              <div className="hp-fade-up hp-delay-300" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 56 }}>
                <Link to="/register" className="hp-btn-primary">
                  Start riding free <ArrowRight size={16} />
                </Link>
                <Link to="/rides/search" className="hp-btn-ghost">
                  Browse rides
                </Link>
              </div>
            )}

            {user && (
              <div className="hp-fade-up hp-delay-300" style={{ marginBottom: 56 }}>
                <Link to={dashLink} className="hp-btn-primary">
                  Go to dashboard <ArrowRight size={16} />
                </Link>
              </div>
            )}

            {/* Floating stats */}
            <div className="hp-fade-up hp-delay-400" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <StatPill value="30K+" label="Rides completed"  icon={CheckCircle2} delay={500} />
              <StatPill value="98%"  label="On-time arrivals" icon={Clock}         delay={600} />
              <StatPill value="4.9★" label="Avg. driver rating" icon={Star}        delay={700} />
            </div>
          </div>

          {/* Right — search card */}
          <div className="hp-fade-up hp-delay-200" style={{ flexShrink: 0 }}>
            <RouteSearchCard />
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 1 }}>
        <div className="hp-float" style={{ width: 36, height: 36, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronRight size={16} style={{ color: 'rgba(255,255,255,.5)', transform: 'rotate(90deg)' }} />
        </div>
      </div>

      {/* Responsive override for mobile */}
      <style>{`
        @media (max-width: 900px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .hero-card { display: none !important; }
        }
      `}</style>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// How It Works
// ─────────────────────────────────────────────────────────────────────────────
function HowItWorksSection() {
  const [ref, visible] = useScrollReveal();

  const steps = [
    {
      n: '01',
      icon: MapPin,
      color: '#185FA5',
      bg: '#EFF6FF',
      title: 'Find your route',
      body: 'Search by origin and destination. See available seats, fare per seat, and driver rating before committing.',
      status: 'SCHEDULED',
    },
    {
      n: '02',
      icon: Navigation,
      color: '#059669',
      bg: '#ECFDF5',
      title: 'Ride together',
      body: 'GPS check-in confirms you\'re at the pickup. No codes, no confusion — the app knows when you\'re there.',
      status: 'IN_PROGRESS',
    },
    {
      n: '03',
      icon: CheckCircle2,
      color: '#7C3AED',
      bg: '#F5F3FF',
      title: 'Arrive and rate',
      body: 'Payment settles automatically. Rate your trip — ratings are visible to all future passengers.',
      status: 'COMPLETED',
    },
  ];

  return (
    <section ref={ref} style={{ background: '#FAFAFA', padding: '100px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        <div style={{ marginBottom: 64, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <div className="hp-label" style={{ marginBottom: 14, opacity: visible ? 1 : 0, transition: 'opacity .5s' }}>How RideWave works</div>
            <h2 style={{
              fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900,
              color: '#0F1117', letterSpacing: '-.02em', lineHeight: 1.1,
              opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(16px)',
              transition: 'opacity .6s .1s, transform .6s .1s',
            }}>
              Simple from first<br />tap to final drop.
            </h2>
          </div>
          <Link to="/rides/search" className="hp-btn-outline" style={{ flexShrink: 0 }}>
            Find a ride <ArrowRight size={15} />
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
          {steps.map((step, i) => (
            <div
              key={step.n}
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'none' : 'translateY(24px)',
                transition: `opacity .6s ${i * 120 + 200}ms, transform .6s ${i * 120 + 200}ms cubic-bezier(.22,1,.36,1)`,
              }}
            >
              {/* Step number + connector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: step.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <step.icon size={24} style={{ color: step.color }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: '.08em' }}>STEP {step.n}</div>
                  <div style={{ fontSize: 10, fontFamily: 'monospace', color: step.color, fontWeight: 600, marginTop: 2 }}>{step.status}</div>
                </div>
                {i < steps.length - 1 && (
                  <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, #E5E7EB, transparent)' }} />
                )}
              </div>

              <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0F1117', marginBottom: 10, letterSpacing: '-.01em' }}>
                {step.title}
              </h3>
              <p style={{ fontSize: 15, color: '#6B7280', lineHeight: 1.65 }}>
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile responsive */}
      <style>{`@media (max-width: 700px) { .hiw-grid { grid-template-columns: 1fr !important; } }`}</style>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Why Choose RideWave — horizontal feature strip
// ─────────────────────────────────────────────────────────────────────────────
function WhyChooseSection() {
  const [ref, visible] = useScrollReveal();

  const features = [
    { icon: ShieldCheck, color: '#059669', title: 'Driver-verified routes',  body: 'Every driver submits their license and vehicle docs. Gemini AI verifies them — no human shortcuts.' },
    { icon: Zap,         color: '#185FA5', title: 'Instant fare calculation', body: 'Partial-route booking: pay only for your segment. Distance-proportional pricing, no rounding tricks.' },
    { icon: Star,        color: '#D97706', title: 'Trust score system',       body: 'Ratings come from completed rides only. No anonymous reviews — accountability on both sides.' },
    { icon: Route,       color: '#7C3AED', title: 'Route-based matching',     body: 'Passengers board anywhere along the driver\'s route — not just origin to destination.' },
    { icon: Wallet,      color: '#DC2626', title: 'No surge pricing',         body: 'Fixed per-seat fares set by the driver before you book. The price you see is the price you pay.' },
    { icon: Phone,       color: '#059669', title: 'GPS live tracking',        body: 'Real-time proximity check confirms you\'re at the vehicle before the ride starts.' },
  ];

  return (
    <section ref={ref} style={{ background: '#fff', padding: '100px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div className="hp-label" style={{ justifyContent: 'center', marginBottom: 14, opacity: visible ? 1 : 0, transition: 'opacity .5s' }}>Why RideWave</div>
          <h2 style={{
            fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900,
            color: '#0F1117', letterSpacing: '-.02em',
            opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(16px)',
            transition: 'opacity .6s .1s, transform .6s .1s',
          }}>
            Built differently, by design.
          </h2>
          <p style={{ fontSize: 17, color: '#6B7280', marginTop: 12, maxWidth: 500, margin: '12px auto 0', opacity: visible ? 1 : 0, transition: 'opacity .6s .2s' }}>
            Every feature exists because a real commuter asked for it.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {features.map((f, i) => (
            <div
              key={f.title}
              className="hp-card-hover"
              style={{
                padding: '28px 24px', borderRadius: 20,
                background: '#FAFAFA', border: '1px solid #F3F4F6',
                opacity: visible ? 1 : 0,
                transform: visible ? 'none' : 'translateY(20px)',
                transition: `opacity .5s ${i * 80 + 200}ms, transform .5s ${i * 80 + 200}ms cubic-bezier(.22,1,.36,1)`,
              }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${f.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <f.icon size={22} style={{ color: f.color }} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F1117', marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.65 }}>{f.body}</p>
            </div>
          ))}
        </div>
      </div>
      <style>{`@media (max-width: 700px) { .why-grid { grid-template-columns: 1fr !important; } } @media (max-width: 1000px) { .why-grid { grid-template-columns: repeat(2,1fr) !important; } }`}</style>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Safety & Verification — dark section
// ─────────────────────────────────────────────────────────────────────────────
function SafetySection() {
  const [ref, visible] = useScrollReveal();

  return (
    <section ref={ref} style={{ background: '#0F1117', padding: '100px 24px', position: 'relative', overflow: 'hidden' }}>
      {/* Ambient glow */}
      <div style={{ position: 'absolute', top: -80, right: -80, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(24,95,165,.25) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -60, left: -60, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(5,150,105,.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>

          {/* Left */}
          <div style={{ opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateX(-24px)', transition: 'opacity .7s, transform .7s cubic-bezier(.22,1,.36,1)' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 100, background: 'rgba(5,150,105,.15)', border: '1px solid rgba(5,150,105,.3)', fontSize: 11, fontWeight: 700, color: '#34D399', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 20 }}>
              <ShieldCheck size={12} /> Verified &amp; Safe
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, color: '#fff', letterSpacing: '-.02em', lineHeight: 1.1, marginBottom: 20 }}>
              Safety isn't a feature. It's the foundation.
            </h2>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,.6)', lineHeight: 1.7, marginBottom: 36 }}>
              Before any driver can offer a ride, they pass a multi-layer verification process. AI-powered OCR reads their documents. Our team reviews edge cases. Only then does the green checkmark appear.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                ['License & RC verified by Gemini AI', ShieldCheck],
                ['Real-time GPS proximity check-in', Navigation],
                ['Trust scores from completed rides only', Award],
                ['Admin review for any flagged documents', Users],
              ].map(([text, Icon]) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(5,150,105,.15)', border: '1px solid rgba(5,150,105,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={14} style={{ color: '#34D399' }} />
                  </div>
                  <span style={{ fontSize: 15, color: 'rgba(255,255,255,.8)', fontWeight: 500 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — visual */}
          <div style={{ opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateX(24px)', transition: 'opacity .7s .15s, transform .7s .15s cubic-bezier(.22,1,.36,1)', position: 'relative' }}>
            <div style={{ borderRadius: 24, overflow: 'hidden', position: 'relative', aspectRatio: '4/3' }}>
              <img
                src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80&auto=format&fit=crop"
                alt="Verified driver"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(24,95,165,.3), transparent)' }} />
              {/* Floating badge */}
              <div style={{
                position: 'absolute', bottom: 20, left: 20, right: 20,
                background: 'rgba(255,255,255,.12)', backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,.2)', borderRadius: 14,
                padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(5,150,105,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ShieldCheck size={20} style={{ color: '#34D399' }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>AI Document Verification</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', marginTop: 1 }}>Powered by Google Gemini · Instant</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`@media (max-width: 800px) { .safety-grid { grid-template-columns: 1fr !important; } }`}</style>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Featured Cities
// ─────────────────────────────────────────────────────────────────────────────
function CitiesSection() {
  const [ref, visible] = useScrollReveal();
  const navigate = useNavigate();

  const cities = [
    { name: 'Karachi', rides: '14,000+ rides', img: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=600&q=80&auto=format&fit=crop' },
    { name: 'Lahore',  rides: '9,500+ rides',  img: 'https://images.unsplash.com/photo-1599030357806-3c0f6b0e1e1d?w=600&q=80&auto=format&fit=crop' },
    { name: 'Islamabad', rides: '6,200+ rides', img: 'https://images.unsplash.com/photo-1568303571738-8f2a8bbf6ff3?w=600&q=80&auto=format&fit=crop' },
    { name: 'Rawalpindi', rides: '3,800+ rides', img: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&q=80&auto=format&fit=crop' },
  ];

  return (
    <section ref={ref} style={{ background: '#FAFAFA', padding: '100px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 48, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="hp-label" style={{ marginBottom: 14, opacity: visible ? 1 : 0, transition: 'opacity .5s' }}>Where we operate</div>
            <h2 style={{
              fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900,
              color: '#0F1117', letterSpacing: '-.02em',
              opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(16px)',
              transition: 'opacity .6s .1s, transform .6s .1s',
            }}>
              Rides across Pakistan.
            </h2>
          </div>
          <button
            onClick={() => navigate('/rides/search')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: '#185FA5', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            View all routes <ArrowUpRight size={16} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gridTemplateRows: 'auto auto', gap: 16 }}>
          {cities.map((city, i) => (
            <div
              key={city.name}
              className="hp-city-card"
              onClick={() => navigate(`/rides/search?from=${city.name}`)}
              style={{
                gridColumn: i === 0 ? '1' : undefined,
                gridRow: i === 0 ? '1 / 3' : undefined,
                aspectRatio: i === 0 ? '3/4' : '4/3',
                opacity: visible ? 1 : 0,
                transform: visible ? 'none' : 'translateY(20px)',
                transition: `opacity .6s ${i * 100 + 200}ms, transform .6s ${i * 100 + 200}ms cubic-bezier(.22,1,.36,1)`,
              }}
            >
              <img src={city.img} alt={city.name} loading="lazy" />
              <div className="overlay" />
              <div style={{ position: 'absolute', bottom: 20, left: 20 }}>
                <div style={{ fontSize: i === 0 ? 28 : 20, fontWeight: 800, color: '#fff', marginBottom: 4 }}>{city.name}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Car size={12} /> {city.rides}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`@media (max-width: 700px) { .cities-grid { grid-template-columns: 1fr 1fr !important; grid-template-rows: auto !important; } .city-featured { grid-column: 1 / -1 !important; grid-row: auto !important; aspect-ratio: 16/9 !important; } }`}</style>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Testimonials
// ─────────────────────────────────────────────────────────────────────────────
function TestimonialsSection() {
  const [ref, visible] = useScrollReveal();

  const reviews = [
    {
      name: 'Sana Raza', role: 'Daily commuter, Karachi',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&q=80&fit=crop&auto=format',
      rating: 5,
      text: 'I save around Rs. 2,000 a week compared to Uber. The drivers are verified and the GPS check-in means no awkward "where are you" calls.',
    },
    {
      name: 'Kamran Ali', role: 'Driver, Lahore',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&q=80&fit=crop&auto=format',
      rating: 5,
      text: 'I drive Lahore to Islamabad every other week. I used to drive alone — now I recover half my fuel cost and still pick my own route.',
    },
    {
      name: 'Aisha Malik', role: 'Student, Islamabad',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&q=80&fit=crop&auto=format',
      rating: 5,
      text: 'The partial-route booking is a game changer. I hop on midway to uni and pay only for my segment. No other app does this.',
    },
  ];

  return (
    <section ref={ref} style={{ background: '#fff', padding: '100px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div className="hp-label" style={{ justifyContent: 'center', marginBottom: 14, opacity: visible ? 1 : 0, transition: 'opacity .5s' }}>Real riders</div>
          <h2 style={{
            fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900,
            color: '#0F1117', letterSpacing: '-.02em',
            opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(16px)',
            transition: 'opacity .6s .1s, transform .6s .1s',
          }}>
            What people say.
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {reviews.map((r, i) => (
            <div
              key={r.name}
              className="hp-testimonial"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'none' : 'translateY(20px)',
                transition: `opacity .6s ${i * 120 + 200}ms, transform .6s ${i * 120 + 200}ms cubic-bezier(.22,1,.36,1)`,
              }}
            >
              {/* Stars */}
              <div style={{ display: 'flex', gap: 3, marginBottom: 16 }}>
                {Array.from({ length: r.rating }).map((_, j) => (
                  <Star key={j} size={14} style={{ color: '#F59E0B', fill: '#F59E0B' }} />
                ))}
              </div>

              <p style={{ fontSize: 15, color: '#374151', lineHeight: 1.7, marginBottom: 20 }}>
                "{r.text}"
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src={r.avatar} alt={r.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid #E5E7EB' }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0F1117' }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: '#9CA3AF' }}>{r.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`@media (max-width: 700px) { .testi-grid { grid-template-columns: 1fr !important; } } @media (max-width: 1000px) { .testi-grid { grid-template-columns: repeat(2,1fr) !important; } }`}</style>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Driver CTA — redesigned
// ─────────────────────────────────────────────────────────────────────────────
function DriverCtaSection() {
  const [ref, visible] = useScrollReveal();

  return (
    <section ref={ref} style={{ background: '#FAFAFA', padding: '100px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{
          background: 'linear-gradient(135deg, #0F1117 0%, #1A2744 100%)',
          borderRadius: 28,
          padding: 'clamp(40px, 6vw, 72px)',
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: 48,
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
          opacity: visible ? 1 : 0,
          transform: visible ? 'none' : 'translateY(24px)',
          transition: 'opacity .7s, transform .7s cubic-bezier(.22,1,.36,1)',
        }}>
          {/* Ambient */}
          <div style={{ position: 'absolute', top: -60, right: 100, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(24,95,165,.35) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 100, background: 'rgba(24,95,165,.25)', border: '1px solid rgba(24,95,165,.4)', fontSize: 11, fontWeight: 700, color: '#93C5FD', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 20 }}>
              <Car size={11} /> Drive with RideWave
            </div>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 900, color: '#fff', letterSpacing: '-.02em', marginBottom: 16, lineHeight: 1.1 }}>
              Making the trip anyway?<br />Bring passengers along.
            </h2>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,.6)', lineHeight: 1.65, maxWidth: 460, marginBottom: 32 }}>
              Set your own fare, choose your passengers, earn on every seat. Document verification takes under 24 hours. Most drivers see their first booking request the same day they go live.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link to="/register" className="hp-btn-primary">
                <Car size={16} /> Become a driver
              </Link>
              <Link to="/rides/search" className="hp-btn-ghost" style={{ fontSize: 14 }}>
                Browse as passenger
              </Link>
            </div>
          </div>

          <div style={{ position: 'relative', zIndex: 1, flexShrink: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 200 }}>
              {[['24h', 'Avg. approval time'], ['PKR 3K+', 'Avg. monthly earnings'], ['4.8★', 'Driver rating avg.']].map(([val, label]) => (
                <div key={label} style={{
                  padding: '16px 20px', borderRadius: 14,
                  background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)',
                }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-.02em' }}>{val}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <style>{`@media (max-width: 800px) { .driver-cta-grid { grid-template-columns: 1fr !important; } }`}</style>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// App Teaser
// ─────────────────────────────────────────────────────────────────────────────
function AppTeaserSection() {
  const [ref, visible] = useScrollReveal();

  return (
    <section ref={ref} style={{ background: '#fff', padding: '80px 24px', borderTop: '1px solid #F3F4F6' }}>
      <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: 'linear-gradient(135deg, #185FA5, #059669)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
          opacity: visible ? 1 : 0, transition: 'opacity .6s',
        }}>
          <Smartphone size={30} style={{ color: '#fff' }} />
        </div>
        <h2 style={{
          fontSize: 'clamp(24px, 3.5vw, 38px)', fontWeight: 900,
          color: '#0F1117', letterSpacing: '-.02em', marginBottom: 12,
          opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(12px)',
          transition: 'opacity .6s .1s, transform .6s .1s',
        }}>
          Mobile app coming soon.
        </h2>
        <p style={{ fontSize: 16, color: '#6B7280', lineHeight: 1.65, maxWidth: 420, margin: '0 auto 28px', opacity: visible ? 1 : 0, transition: 'opacity .6s .2s' }}>
          Real-time ride tracking, one-tap booking, and push notifications. Available on iOS and Android — early 2025.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', opacity: visible ? 1 : 0, transition: 'opacity .6s .3s' }}>
          {['App Store', 'Google Play'].map(store => (
            <button key={store} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 20px', borderRadius: 12,
              background: '#0F1117', color: '#fff',
              border: 'none', cursor: 'not-allowed', opacity: .55,
              fontSize: 14, fontWeight: 600,
            }}>
              <Smartphone size={16} /> {store} — Coming Soon
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Footer — modern, detailed
// ─────────────────────────────────────────────────────────────────────────────
function HomeFooter() {
  const year = new Date().getFullYear();
  const cols = [
    { heading: 'Passengers', links: [['Find a ride', '/rides/search'], ['How it works', '#how'], ['Safety', '#safety'], ['My bookings', '/bookings']] },
    { heading: 'Drivers',    links: [['Become a driver', '/register'], ['Driver dashboard', '/driver/dashboard'], ['Earnings', '/earnings'], ['Verification', '/driver/onboarding']] },
    { heading: 'Company',    links: [['About RideWave', '#about'], ['Terms of Service', '/terms'], ['Privacy Policy', '/privacy'], ['Contact', 'mailto:support@ridewave.pk']] },
  ];

  return (
    <footer style={{ background: '#0F1117', padding: '64px 24px 32px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Top row */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, marginBottom: 56, paddingBottom: 48, borderBottom: '1px solid rgba(255,255,255,.08)' }}>

          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <img src="/logo.png" alt="RideWave" style={{ width: 36, height: 36, objectFit: 'contain' }} />
              <span style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>Ride<span style={{ color: '#185FA5' }}>Wave</span></span>
            </div>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,.45)', lineHeight: 1.7, maxWidth: 240 }}>
              Connecting Pakistani commuters with verified drivers for safer, cheaper shared rides.
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              {[Twitter, Instagram, Facebook].map((Icon, i) => (
                <button key={i} style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background .15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(24,95,165,.3)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.08)'}
                >
                  <Icon size={15} style={{ color: 'rgba(255,255,255,.6)' }} />
                </button>
              ))}
            </div>
          </div>

          {cols.map(col => (
            <div key={col.heading}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 16 }}>{col.heading}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {col.links.map(([label, href]) => (
                  <Link
                    key={label}
                    to={href}
                    style={{ fontSize: 14, color: 'rgba(255,255,255,.5)', textDecoration: 'none', transition: 'color .15s' }}
                    onMouseEnter={e => e.target.style.color = '#fff'}
                    onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,.5)'}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,.3)' }}>
            © {year} RideWave. All rights reserved.
          </p>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399' }} />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,.3)' }}>All systems operational</span>
          </div>
        </div>
      </div>
      <style>{`@media (max-width: 800px) { .footer-grid { grid-template-columns: 1fr 1fr !important; } }`}</style>
    </footer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { user, isDriver, isAdmin } = useAuth();

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <style>{GLOBAL_CSS}</style>

      <HeroSection   user={user} isDriver={isDriver} isAdmin={isAdmin} />
      <HowItWorksSection />
      <WhyChooseSection />
      <SafetySection />
      <CitiesSection />
      <TestimonialsSection />
      <DriverCtaSection />
      <AppTeaserSection />
      <HomeFooter />
    </div>
  );
}