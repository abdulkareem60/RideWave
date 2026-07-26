/**
 * HomePage — RideWave Premium Landing Page
 *
 * ALL routing, auth logic, and PlacesAutocomplete functionality UNCHANGED.
 * Premium redesign inspired by Linear, Airbnb, and top-tier startups.
 * Enhanced with scroll animations, refined typography, and micro-interactions.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MapPin, Flag, ArrowRight, ShieldCheck, Star, Clock,
  Car, Users, Wallet, CheckCircle2, Navigation, Smartphone,
  ChevronRight, Award, Route, Phone,
  Twitter, Instagram, Facebook, ArrowUpRight, Quote,
  Sparkles, TrendingUp, Heart, Zap, Globe, ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import PlacesAutocomplete from '../components/rides/PlacesAutocomplete.jsx';

// ─── Animation Hook ───────────────────────────────────────────────────────
function useScrollReveal(threshold = 0.1) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, isVisible];
}

// ─── Reusable Animation Wrapper ───────────────────────────────────────────
function Reveal({ children, delay = 0, className = '' }) {
  const [ref, isVisible] = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(24px)',
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ─── Section Label ────────────────────────────────────────────────────────
function SectionLabel({ children, centered = false, light = false }) {
  return (
    <div className={`flex items-center gap-3 mb-5 ${centered ? 'justify-center' : ''}`}>
      <span className={`block w-8 h-[2px] rounded-full ${light ? 'bg-white/30' : 'bg-blue-600 dark:bg-blue-400'}`} />
      <span className={`text-[11px] font-bold uppercase tracking-[0.2em] ${light ? 'text-white/50' : 'text-blue-600 dark:text-blue-400'}`}>
        {children}
      </span>
      {centered && <span className={`block w-8 h-[2px] rounded-full ${light ? 'bg-white/30' : 'bg-blue-600 dark:bg-blue-400'}`} />}
    </div>
  );
}

// ─── RouteSearchCard — logic UNCHANGED ────────────────────────────────────
function RouteSearchCard() {
  const navigate = useNavigate();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    navigate(`/rides/search${params.toString() ? `?${params}` : ''}`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="relative bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/10 dark:shadow-black/30 border border-white/50 dark:border-gray-700/50 w-full overflow-hidden"
    >
      {/* Subtle gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-emerald-400 to-blue-500" />

      <div className="relative">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 mb-6">
          Where are you going?
        </p>

        <div className="flex gap-4 mb-6">
          <div className="flex flex-col items-center pt-4 flex-shrink-0">
            <span className="w-3 h-3 rounded-full bg-emerald-500 ring-[3px] ring-emerald-100 dark:ring-emerald-900/50" />
            <span className="w-[2px] h-10 bg-gradient-to-b from-emerald-400/60 to-blue-500/60 my-1.5" />
            <span className="w-3 h-3 rounded-full bg-blue-600 ring-[3px] ring-blue-100 dark:ring-blue-900/50" />
          </div>
          <div className="flex-1 flex flex-col gap-3 min-w-0">
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

        <button
          type="submit"
          disabled={!from && !to}
          className="group w-full py-4 bg-blue-700 disabled:bg-gray-200 dark:disabled:bg-gray-700 text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2.5 shadow-lg shadow-blue-700/25 hover:bg-blue-800 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-blue-700/40 active:scale-[0.98]"
        >
          <Route size={16} className="transition-transform group-hover:rotate-12" />
          Search rides
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
        </button>

        <div className="flex divide-x divide-gray-100 dark:divide-gray-700/50 mt-5 pt-5 border-t border-gray-100 dark:border-gray-700/50">
          {[
            ['4.9★', 'Rating', Star],
            ['30K+', 'Rides', Car],
            ['Verified', 'Drivers', ShieldCheck],
          ].map(([value, label, Icon]) => (
            <div key={label} className="flex-1 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Icon size={12} className="text-gray-400 dark:text-gray-500" />
                <span className="text-sm font-black text-gray-800 dark:text-gray-200">{value}</span>
              </div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </form>
  );
}

// ─── Hero ──────────────────────────────────────────────────────────────────
function HeroSection({ user, isDriver, isAdmin }) {
  const dashLink = isAdmin ? '/admin/dashboard' : isDriver ? '/driver/dashboard' : '/rides/search';

  return (
    <section className="relative min-h-[100svh] flex flex-col overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1800&q=80&auto=format&fit=crop"
          alt=""
          aria-hidden
          className="w-full h-full object-cover object-center scale-105 animate-[pulse_20s_ease-in-out_infinite]"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950/90 via-gray-950/70 to-blue-950/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-gray-950/30" />
        {/* Animated mesh gradient overlay */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] animate-[pulse_8s_ease-in-out_infinite]" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-500/15 rounded-full blur-[100px] animate-[pulse_10s_ease-in-out_infinite_1s]" />
        </div>
      </div>

      <div className="relative z-10 flex-1 flex items-center">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24 lg:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            <div className="max-w-xl">
              <Reveal>
                <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-6 backdrop-blur-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                  </span>
                  Now serving Karachi · Lahore · Islamabad
                </div>
              </Reveal>

              <Reveal delay={100}>
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.05] tracking-tight mb-6">
                  Your city.
                  <br />
                  <span className="bg-gradient-to-r from-blue-400 via-emerald-400 to-blue-400 bg-clip-text text-transparent animate-gradient">
                    Shared smarter.
                  </span>
                </h1>
              </Reveal>

              <Reveal delay={200}>
                <p className="text-lg sm:text-xl text-white/60 leading-relaxed max-w-md mb-8 font-light">
                  Connect with verified drivers heading your way. Book a seat, split the cost, skip the traffic.
                </p>
              </Reveal>

              <Reveal delay={300}>
                {!user ? (
                  <div className="flex flex-wrap gap-4 mb-10">
                    <Link to="/register"
                      className="group inline-flex items-center gap-2.5 px-7 py-4 rounded-2xl bg-blue-600 text-white font-bold text-sm shadow-xl shadow-blue-600/30 hover:bg-blue-500 hover:shadow-blue-500/40 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0">
                      Start riding free
                      <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                    </Link>
                    <Link to="/rides/search"
                      className="group inline-flex items-center gap-2.5 px-7 py-4 rounded-2xl bg-white/8 border border-white/20 backdrop-blur text-white font-semibold text-sm hover:bg-white/15 hover:border-white/30 transition-all duration-300">
                      Browse rides
                      <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                ) : (
                  <div className="mb-10">
                    <Link to={dashLink}
                      className="group inline-flex items-center gap-2.5 px-7 py-4 rounded-2xl bg-blue-600 text-white font-bold text-sm shadow-xl shadow-blue-600/30 hover:bg-blue-500 hover:shadow-blue-500/40 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0">
                      Go to dashboard
                      <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                )}
              </Reveal>

              <Reveal delay={400}>
                <div className="flex flex-wrap gap-4">
                  {[
                    { icon: CheckCircle2, value: '30K+', label: 'Rides completed' },
                    { icon: Clock, value: '98%', label: 'On-time arrival' },
                    { icon: Star, value: '4.9★', label: 'Average rating' },
                  ].map(({ icon: Icon, value, label }) => (
                    <div
                      key={label}
                      className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 hover:border-white/20 transition-all duration-300"
                    >
                      <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                        <Icon size={16} className="text-white/80" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-white leading-none">{value}</div>
                        <div className="text-[10px] text-white/40 mt-1 font-medium uppercase tracking-wider">{label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>

            {/* Desktop search card */}
            <div className="hidden lg:block">
              <Reveal delay={200}>
                <RouteSearchCard />
              </Reveal>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile search card */}
      <div className="relative z-10 lg:hidden px-4 pb-10">
        <RouteSearchCard />
      </div>

      {/* Scroll indicator */}
      <div className="relative z-10 hidden sm:flex justify-center pb-8">
        <div className="flex flex-col items-center gap-2 animate-bounce">
          <span className="text-[10px] text-white/30 uppercase tracking-widest font-medium">Scroll</span>
          <ChevronDown size={18} className="text-white/30" />
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────
function HowItWorksSection() {
  const steps = [
    {
      n: '01',
      icon: MapPin,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      ring: 'ring-blue-200 dark:ring-blue-800',
      title: 'Find your route',
      body: 'Search by origin and destination. See seats, fare, and driver rating before booking.'
    },
    {
      n: '02',
      icon: Navigation,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      ring: 'ring-emerald-200 dark:ring-emerald-800',
      title: 'Ride together',
      body: "GPS check-in confirms you're at the pickup. No codes, no confusion."
    },
    {
      n: '03',
      icon: CheckCircle2,
      color: 'text-violet-600',
      bg: 'bg-violet-50 dark:bg-violet-900/20',
      ring: 'ring-violet-200 dark:ring-violet-800',
      title: 'Arrive and rate',
      body: 'Payment settles automatically. Rate your trip — visible to all future passengers.'
    },
  ];

  return (
    <section className="bg-gray-50/80 dark:bg-gray-900/30 py-20 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-blue-100/50 to-transparent dark:from-blue-900/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto relative">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-16 sm:mb-20">
          <Reveal>
            <div>
              <SectionLabel>How RideWave works</SectionLabel>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">
                Simple from first tap
                <br className="hidden sm:block" />
                <span className="text-gray-400 dark:text-gray-600">to final drop.</span>
              </h2>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <Link to="/rides/search"
              className="group self-start sm:self-auto inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl border-2 border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 font-bold text-sm hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500 dark:hover:text-white transition-all duration-300 hover:shadow-lg hover:shadow-blue-600/20">
              Find a ride
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((step, i) => (
            <Reveal key={step.n} delay={i * 150}>
              <div className="relative group">
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="hidden sm:block absolute top-10 left-[calc(50%+40px)] right-0 h-[2px]">
                    <div className="h-full bg-gradient-to-r from-gray-200 via-gray-300 to-transparent dark:from-gray-700 dark:via-gray-600 rounded-full" />
                  </div>
                )}

                <div className="flex items-start gap-5 sm:flex-col sm:gap-6">
                  <div className={`w-14 h-14 rounded-2xl ${step.bg} flex items-center justify-center flex-shrink-0 relative z-10 ring-1 ${step.ring} group-hover:scale-110 transition-transform duration-300`}>
                    <step.icon size={24} className={step.color} />
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] font-black text-gray-300 dark:text-gray-600 uppercase tracking-[0.2em] mb-2">
                      Step {step.n}
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2.5">
                      {step.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                      {step.body}
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Why Choose — Bento Grid ──────────────────────────────────────────────
function WhyChooseSection() {
  const features = [
    {
      icon: ShieldCheck,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-900/15',
      border: 'border-emerald-200/60 dark:border-emerald-800/40',
      title: 'Driver-verified routes',
      body: 'Gemini AI verifies every license and vehicle document before approval.',
      size: 'normal'
    },
    {
      icon: Route,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-900/15',
      border: 'border-blue-200/60 dark:border-blue-800/40',
      title: 'Instant fare calculation',
      body: 'Partial-route booking: pay only for your segment, not the full trip.',
      size: 'normal'
    },
    {
      icon: Star,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-900/15',
      border: 'border-amber-200/60 dark:border-amber-800/40',
      title: 'Trust score system',
      body: 'Ratings from completed rides only — no anonymous reviews, ever.',
      size: 'normal'
    },
    {
      icon: Navigation,
      color: 'text-violet-600',
      bg: 'bg-violet-50 dark:bg-violet-900/15',
      border: 'border-violet-200/60 dark:border-violet-800/40',
      title: 'Route-based matching',
      body: "Board anywhere along the driver's published route. Maximum flexibility.",
      size: 'large'
    },
    {
      icon: Wallet,
      color: 'text-rose-600',
      bg: 'bg-rose-50 dark:bg-rose-900/15',
      border: 'border-rose-200/60 dark:border-rose-800/40',
      title: 'No surge pricing',
      body: 'Fixed fares set before you book. What you see is what you pay.',
      size: 'normal'
    },
    {
      icon: Phone,
      color: 'text-cyan-600',
      bg: 'bg-cyan-50 dark:bg-cyan-900/15',
      border: 'border-cyan-200/60 dark:border-cyan-800/40',
      title: 'GPS live tracking',
      body: 'Proximity check confirms you're at the vehicle. Safety first.',
      size: 'normal'
    },
  ];

  return (
    <section className="bg-white dark:bg-gray-950 py-20 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 sm:mb-20">
          <Reveal>
            <SectionLabel centered>Why RideWave</SectionLabel>
          </Reveal>
          <Reveal delay={100}>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 dark:text-white tracking-tight mb-4">
              Built differently,
              <span className="text-gray-400 dark:text-gray-600"> by design.</span>
            </h2>
          </Reveal>
          <Reveal delay={200}>
            <p className="text-base sm:text-lg text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
              Every feature exists because a real commuter asked for it.
            </p>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {features.map((f, i) => (
            <Reveal
              key={f.title}
              delay={i * 80}
              className={f.size === 'large' ? 'sm:col-span-2 lg:col-span-1' : ''}
            >
              <div
                className={`group relative h-full p-6 sm:p-7 rounded-3xl bg-gray-50/80 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-black/20 transition-all duration-300 overflow-hidden ${f.size === 'large' ? 'lg:row-span-1' : ''}`}
              >
                {/* Hover gradient */}
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${f.bg}`} />

                <div className="relative">
                  <div className={`w-12 h-12 rounded-2xl ${f.bg} ${f.border} border flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                    <f.icon size={22} className={f.color} />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">
                    {f.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    {f.body}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Safety ────────────────────────────────────────────────────────────────
function SafetySection() {
  const features = [
    [ShieldCheck, 'License & RC verified by Gemini AI'],
    [Navigation, 'Real-time GPS proximity check-in'],
    [Award, 'Trust scores from completed rides only'],
    [Users, 'Admin review for flagged documents'],
  ];

  return (
    <section className="bg-gray-950 py-20 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-blue-600/15 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-[400px] h-[400px] rounded-full bg-emerald-600/10 blur-[100px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div>
            <Reveal>
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-6">
                <ShieldCheck size={13} /> Verified & Safe
              </div>
            </Reveal>

            <Reveal delay={100}>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight mb-5">
                Safety isn't a feature.
                <br />
                <span className="text-white/40">It's the foundation.</span>
              </h2>
            </Reveal>

            <Reveal delay={200}>
              <p className="text-white/50 leading-relaxed mb-8 text-base sm:text-lg font-light">
                Before any driver can offer a ride, they pass multi-layer verification. AI-powered OCR reads their documents. Our team reviews edge cases.
              </p>
            </Reveal>

            <div className="flex flex-col gap-4">
              {features.map(([Icon, text], i) => (
                <Reveal key={text} delay={250 + i * 80}>
                  <div className="group flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 transition-colors duration-300">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500/20 transition-colors duration-300">
                      <Icon size={16} className="text-emerald-400" />
                    </div>
                    <span className="text-sm text-white/70 font-medium group-hover:text-white/90 transition-colors duration-300">{text}</span>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          <Reveal delay={200}>
            <div className="relative">
              <div className="rounded-3xl overflow-hidden aspect-[4/3] ring-1 ring-white/10">
                <img
                  src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80&auto=format&fit=crop"
                  alt="Verified driver"
                  loading="lazy"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 to-transparent" />
              </div>

              {/* Floating badge */}
              <div className="absolute -bottom-6 left-6 right-6 sm:left-8 sm:right-8 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl p-4 sm:p-5 flex items-center gap-4 shadow-2xl">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck size={20} className="text-emerald-400" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">AI Document Verification</div>
                  <div className="text-xs text-white/50 mt-0.5">Powered by Google Gemini · Instant</div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ─── Cities — Masonry Grid ────────────────────────────────────────────────
function CitiesSection() {
  const navigate = useNavigate();
  const cities = [
    { name: 'Karachi', rides: '14,000+ rides', img: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=600&q=80&auto=format&fit=crop', featured: true },
    { name: 'Lahore', rides: '9,500+ rides', img: 'https://images.unsplash.com/photo-1599030357806-3c0f6b0e1e1d?w=600&q=80&auto=format&fit=crop' },
    { name: 'Islamabad', rides: '6,200+ rides', img: 'https://images.unsplash.com/photo-1568303571738-8f2a8bbf6ff3?w=600&q=80&auto=format&fit=crop' },
    { name: 'Rawalpindi', rides: '3,800+ rides', img: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&q=80&auto=format&fit=crop' },
  ];

  return (
    <section className="bg-gray-50/80 dark:bg-gray-900/30 py-20 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-12 sm:mb-16">
          <Reveal>
            <div>
              <SectionLabel>Where we operate</SectionLabel>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
                Rides across
                <span className="text-gray-400 dark:text-gray-600"> Pakistan.</span>
              </h2>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <button
              onClick={() => navigate('/rides/search')}
              className="group self-start sm:self-auto inline-flex items-center gap-2 text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors duration-200"
            >
              View all routes
              <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </Reveal>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {cities.map((city, i) => (
            <Reveal
              key={city.name}
              delay={i * 100}
              className={i === 0 ? 'col-span-2 sm:col-span-2 lg:col-span-1 lg:row-span-2' : ''}
            >
              <div
                onClick={() => navigate(`/rides/search?from=${city.name}`)}
                className="group relative overflow-hidden rounded-3xl cursor-pointer h-full"
              >
                <div className={`relative overflow-hidden ${i === 0 ? 'aspect-[16/9] sm:aspect-[2/1] lg:aspect-auto lg:h-full min-h-[200px] lg:min-h-[420px]' : 'aspect-[4/3]'} min-h-[160px]`}>
                  <img
                    src={city.img}
                    alt={city.name}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent group-hover:from-black/70 transition-colors duration-300" />

                  {/* City info */}
                  <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6">
                    <div className={`font-black text-white mb-1.5 ${i === 0 ? 'text-2xl sm:text-3xl lg:text-4xl' : 'text-lg sm:text-xl'}`}>
                      {city.name}
                    </div>
                    <div className="flex items-center gap-2 text-white/60 text-xs sm:text-sm">
                      <Car size={12} />
                      {city.rides}
                    </div>
                  </div>

                  {/* Hover arrow */}
                  <div className="absolute top-4 right-4 sm:top-6 sm:right-6 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                    <ArrowUpRight size={16} className="text-white" />
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Testimonials ──────────────────────────────────────────────────────────
function TestimonialsSection() {
  const reviews = [
    {
      name: 'Sana Raza',
      role: 'Daily commuter, Karachi',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&q=80&fit=crop',
      rating: 5,
      text: 'I save around Rs. 2,000 a week compared to Uber. GPS check-in means no awkward calls.'
    },
    {
      name: 'Kamran Ali',
      role: 'Driver, Lahore',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&q=80&fit=crop',
      rating: 5,
      text: 'I drive Lahore to Islamabad every other week. I recover half my fuel cost.'
    },
    {
      name: 'Aisha Malik',
      role: 'Student, Islamabad',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&q=80&fit=crop',
      rating: 5,
      text: 'The partial-route booking is a game changer. I pay only for my segment.'
    },
  ];

  return (
    <section className="bg-white dark:bg-gray-950 py-20 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}
      />

      <div className="max-w-6xl mx-auto relative">
        <div className="text-center mb-16 sm:mb-20">
          <Reveal>
            <SectionLabel centered>Real riders</SectionLabel>
          </Reveal>
          <Reveal delay={100}>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
              What people <span className="text-gray-400 dark:text-gray-600">say.</span>
            </h2>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {reviews.map((r, i) => (
            <Reveal key={r.name} delay={i * 120}>
              <div className="group relative h-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 sm:p-8 hover:border-blue-200 dark:hover:border-blue-800/50 hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-black/20 transition-all duration-300">
                {/* Quote icon */}
                <Quote size={24} className="text-blue-100 dark:text-blue-900/50 mb-4" />

                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: r.rating }).map((_, idx) => (
                    <Star key={idx} size={14} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>

                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed mb-6 italic">
                  "{r.text}"
                </p>

                <div className="flex items-center gap-3 pt-4 border-t border-gray-50 dark:border-gray-800">
                  <img
                    src={r.avatar}
                    alt={r.name}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-700 flex-shrink-0"
                  />
                  <div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white">{r.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{r.role}</div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Driver CTA — Immersive ───────────────────────────────────────────────
function DriverCtaSection() {
  const stats = [
    ['24h', 'Avg. approval time'],
    ['PKR 3K+', 'Avg. monthly earnings'],
    ['4.8★', 'Driver rating avg.'],
  ];

  return (
    <section className="bg-gray-50/80 dark:bg-gray-900/30 py-20 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <div className="relative bg-gray-950 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden p-8 sm:p-12 lg:p-16">
            {/* Background effects */}
            <div className="absolute -top-24 right-0 w-[500px] h-[500px] rounded-full bg-blue-600/20 blur-[100px] pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-[300px] h-[300px] rounded-full bg-emerald-600/15 blur-[80px] pointer-events-none" />
            <div className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
                backgroundSize: '32px 32px'
              }}
            />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-wider mb-6">
                  <Car size={13} /> Drive with RideWave
                </div>

                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight mb-5">
                  Making the trip anyway?
                  <br />
                  <span className="text-white/40">Bring passengers along.</span>
                </h2>

                <p className="text-white/50 text-base sm:text-lg leading-relaxed mb-8 font-light">
                  Set your own fare, choose your passengers, earn on every seat. Verification takes under 24 hours.
                </p>

                <div className="flex flex-wrap gap-4">
                  <Link to="/register"
                    className="group inline-flex items-center gap-2.5 px-7 py-4 rounded-2xl bg-blue-600 text-white font-bold text-sm shadow-xl shadow-blue-600/30 hover:bg-blue-500 hover:shadow-blue-500/40 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0">
                    <Car size={17} />
                    Become a driver
                  </Link>
                  <Link to="/rides/search"
                    className="inline-flex items-center gap-2.5 px-7 py-4 rounded-2xl bg-white/8 border border-white/15 text-white font-semibold text-sm hover:bg-white/14 hover:border-white/25 transition-all duration-300">
                    Browse as passenger
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
                {stats.map(([value, label], i) => (
                  <div
                    key={label}
                    className="group px-6 sm:px-8 py-5 sm:py-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
                  >
                    <div className="text-2xl sm:text-3xl font-black text-white mb-1 group-hover:text-blue-400 transition-colors duration-300">{value}</div>
                    <div className="text-xs text-white/40 font-medium">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ─── App Teaser ────────────────────────────────────────────────────────────
function AppTeaserSection() {
  return (
    <section className="bg-white dark:bg-gray-950 py-16 sm:py-20 px-4 sm:px-6 border-t border-gray-100 dark:border-gray-800">
      <div className="max-w-lg mx-auto text-center">
        <Reveal>
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-600 to-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-600/20">
            <Smartphone size={28} className="text-white" />
          </div>
        </Reveal>

        <Reveal delay={100}>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-3">
            Mobile app coming soon.
          </h2>
        </Reveal>

        <Reveal delay={200}>
          <p className="text-base text-gray-500 dark:text-gray-400 leading-relaxed mb-8 max-w-sm mx-auto">
            Real-time tracking, one-tap booking, push notifications. iOS & Android — early 2025.
          </p>
        </Reveal>

        <Reveal delay={300}>
          <div className="flex flex-wrap justify-center gap-3">
            {['App Store', 'Google Play'].map(store => (
              <button
                key={store}
                disabled
                className="flex items-center gap-2.5 px-5 py-3 rounded-xl bg-gray-900 dark:bg-gray-800 text-white text-xs font-bold opacity-40 cursor-not-allowed"
              >
                <Smartphone size={14} />
                {store} — Soon
              </button>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ─── Footer ────────────────────────────────────────────────────────────────
function HomeFooter() {
  const year = new Date().getFullYear();
  const cols = [
    {
      heading: 'Passengers',
      links: [
        ['Find a ride', '/rides/search'],
        ['How it works', '#'],
        ['My bookings', '/bookings']
      ]
    },
    {
      heading: 'Drivers',
      links: [
        ['Become a driver', '/register'],
        ['Driver dashboard', '/driver/dashboard'],
        ['Verification', '/driver/onboarding']
      ]
    },
    {
      heading: 'Company',
      links: [
        ['Terms of Service', '/terms'],
        ['Privacy Policy', '/privacy'],
        ['Contact', 'mailto:support@ridewave.pk']
      ]
    },
  ];

  return (
    <footer className="bg-gray-950 px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-10">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-10 mb-14 pb-14 border-b border-white/[0.06]">
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-3 mb-5">
              <img src="/logo.png" alt="RideWave" className="w-10 h-10 object-contain" />
              <span className="text-xl font-black text-white">
                Ride<span className="text-blue-400">Wave</span>
              </span>
            </div>
            <p className="text-xs text-white/30 leading-relaxed max-w-[220px] mb-6">
              Connecting Pakistani commuters with verified drivers for safer, cheaper shared rides.
            </p>
            <div className="flex gap-2.5">
              {[Twitter, Instagram, Facebook].map((Icon, i) => (
                <button
                  key={i}
                  className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center hover:bg-blue-600/20 hover:border-blue-500/30 transition-all duration-200 group"
                >
                  <Icon size={14} className="text-white/40 group-hover:text-blue-400 transition-colors duration-200" />
                </button>
              ))}
            </div>
          </div>

          {cols.map(col => (
            <div key={col.heading}>
              <div className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mb-5">
                {col.heading}
              </div>
              <div className="flex flex-col gap-3">
                {col.links.map(([label, href]) => (
                  <Link
                    key={label}
                    to={href}
                    className="text-sm text-white/40 hover:text-white transition-colors duration-200"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/20 order-2 sm:order-1">
            © {year} RideWave. All rights reserved.
          </p>
          <div className="flex items-center gap-2.5 order-1 sm:order-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] text-white/30 font-medium">All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Trust Bar ────────────────────────────────────────────────────────────
function TrustBar() {
  const [ref, isVisible] = useScrollReveal();
  const logos = [
    { name: 'Dawn', icon: Globe },
    { name: 'TechCrunch', icon: Zap },
    { name: 'The News', icon: TrendingUp },
    { name: 'Express Tribune', icon: Sparkles },
    { name: 'ProPakistani', icon: Heart },
  ];

  return (
    <section
      ref={ref}
      className="bg-white dark:bg-gray-950 py-10 sm:py-12 px-4 sm:px-6 lg:px-8 border-b border-gray-100 dark:border-gray-800"
    >
      <div className="max-w-6xl mx-auto">
        <p
          className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-600 mb-6"
          style={{ opacity: isVisible ? 1 : 0, transition: 'opacity 0.5s ease' }}
        >
          Featured in
        </p>
        <div
          className="flex flex-wrap justify-center items-center gap-8 sm:gap-12"
          style={{ opacity: isVisible ? 1 : 0, transform: isVisible ? 'translateY(0)' : 'translateY(10px)', transition: 'all 0.6s ease 0.1s' }}
        >
          {logos.map(({ name, icon: Icon }) => (
            <div key={name} className="flex items-center gap-2 text-gray-300 dark:text-gray-700 hover:text-gray-500 dark:hover:text-gray-500 transition-colors duration-300">
              <Icon size={18} />
              <span className="text-sm font-bold">{name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────
export default function HomePage() {
  const { user, isDriver, isAdmin } = useAuth();

  return (
    <div className="min-h-screen font-sans antialiased selection:bg-blue-500/30 selection:text-blue-900 dark:selection:bg-blue-400/30 dark:selection:text-blue-100">
      <HeroSection user={user} isDriver={isDriver} isAdmin={isAdmin} />
      <TrustBar />
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
