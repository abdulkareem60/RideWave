/**
 * HomePage — RideWave guest landing page.
 *
 * ALL routing, auth logic, and PlacesAutocomplete functionality UNCHANGED.
 * Mobile-first responsive redesign using Tailwind CSS.
 * No inline styles — pure Tailwind utility classes.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MapPin, Flag, ArrowRight, ShieldCheck, Star, Clock,
  Car, Users, Wallet, CheckCircle2, Navigation, Smartphone,
  ChevronRight, Award, Route, Phone,
  Twitter, Instagram, Facebook, ArrowUpRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import PlacesAutocomplete from '../components/rides/PlacesAutocomplete.jsx';

// ─── RouteSearchCard — logic UNCHANGED ────────────────────────────────────
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
    <form
      onSubmit={handleSubmit}
      className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl p-5 sm:p-6 shadow-2xl border border-white/60 dark:border-gray-700/60 w-full"
    >
      <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">
        Where are you going?
      </p>

      <div className="flex gap-3 mb-5">
        <div className="flex flex-col items-center pt-3.5 flex-shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-900" />
          <span className="w-0.5 h-8 bg-gradient-to-b from-emerald-400 to-blue-500 opacity-40 my-1" />
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-blue-200 dark:ring-blue-900" />
        </div>
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          <PlacesAutocomplete id="hero-from" placeholder="Leaving from…" value={from} onChange={setFrom} icon={MapPin} />
          <PlacesAutocomplete id="hero-to"   placeholder="Going to…"     value={to}   onChange={setTo}   icon={Flag}  />
        </div>
      </div>

      <button type="submit" disabled={!from && !to}
        className="w-full py-3.5 bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-700/30 hover:bg-blue-800 disabled:cursor-not-allowed transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0">
        <Route size={15} /> Search rides <ArrowRight size={14} />
      </button>

      <div className="flex divide-x divide-gray-100 dark:divide-gray-700/60 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/60">
        {[['4.9★','Rating'],['30K+','Rides'],['Verified','Drivers']].map(([v,l]) => (
          <div key={l} className="flex-1 text-center">
            <div className="text-xs font-bold text-gray-800 dark:text-gray-200">{v}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">{l}</div>
          </div>
        ))}
      </div>
    </form>
  );
}

// ─── Hero ──────────────────────────────────────────────────────────────────
function HeroSection({ user, isDriver, isAdmin }) {
  const dashLink = isAdmin ? '/admin/dashboard' : isDriver ? '/driver/dashboard' : '/rides/search';
  return (
    <section className="relative min-h-[100svh] flex flex-col overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img src="https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1800&q=80&auto=format&fit=crop"
          alt="" aria-hidden className="w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950/92 via-gray-950/75 to-blue-900/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-transparent to-transparent" />
      </div>

      <div className="relative z-10 flex-1 flex items-center">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">

            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                Now serving Karachi · Lahore · Islamabad
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black text-white leading-[1.02] tracking-tight mb-5">
                Your city.<br />
                <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                  Shared smarter.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-white/70 leading-relaxed max-w-md mb-7">
                Connect with verified drivers heading your way. Book a seat, split the cost, skip the traffic.
              </p>

              {!user ? (
                <div className="flex flex-wrap gap-3 mb-8 sm:mb-10">
                  <Link to="/register"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-700/40 hover:bg-blue-700 hover:-translate-y-0.5 transition-all duration-150">
                    Start riding free <ArrowRight size={15} />
                  </Link>
                  <Link to="/rides/search"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 border border-white/25 backdrop-blur text-white font-semibold text-sm hover:bg-white/18 transition-all duration-150">
                    Browse rides
                  </Link>
                </div>
              ) : (
                <div className="mb-8 sm:mb-10">
                  <Link to={dashLink}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-700/40 hover:bg-blue-700 hover:-translate-y-0.5 transition-all duration-150">
                    Go to dashboard <ArrowRight size={15} />
                  </Link>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                {[
                  { icon:CheckCircle2, value:'30K+', label:'Rides completed' },
                  { icon:Clock,        value:'98%',  label:'On-time'         },
                  { icon:Star,         value:'4.9★', label:'Avg rating'      },
                ].map(({ icon:Icon, value, label }) => (
                  <div key={label} className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-white/8 border border-white/15 backdrop-blur-sm">
                    <div className="w-8 h-8 rounded-lg bg-white/12 flex items-center justify-center flex-shrink-0">
                      <Icon size={15} className="text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-white leading-none">{value}</div>
                      <div className="text-[10px] text-white/55 mt-0.5">{label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop search card */}
            <div className="hidden lg:block"><RouteSearchCard /></div>
          </div>
        </div>
      </div>

      {/* Mobile search card */}
      <div className="relative z-10 lg:hidden px-4 pb-8"><RouteSearchCard /></div>

      {/* Scroll cue */}
      <div className="relative z-10 hidden sm:flex justify-center pb-8">
        <div className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center animate-bounce">
          <ChevronRight size={15} className="text-white/40 rotate-90" />
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────
function HowItWorksSection() {
  const steps = [
    { n:'01', icon:MapPin,       color:'text-blue-600',   bg:'bg-blue-50 dark:bg-blue-900/20',   title:'Find your route',  body:'Search by origin and destination. See seats, fare, and driver rating before booking.' },
    { n:'02', icon:Navigation,   color:'text-emerald-600', bg:'bg-emerald-50 dark:bg-emerald-900/20', title:'Ride together',  body:'GPS check-in confirms you\'re at the pickup. No codes, no confusion.' },
    { n:'03', icon:CheckCircle2, color:'text-violet-600',  bg:'bg-violet-50 dark:bg-violet-900/20', title:'Arrive and rate', body:'Payment settles automatically. Rate your trip — visible to all future passengers.' },
  ];
  return (
    <section className="bg-gray-50 dark:bg-gray-900/50 py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 mb-10 sm:mb-14">
          <div>
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-widest mb-3">
              <span className="block w-6 h-0.5 bg-current rounded" /> How RideWave works
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">
              Simple from first tap<br className="hidden sm:block" /> to final drop.
            </h2>
          </div>
          <Link to="/rides/search"
            className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 font-semibold text-sm hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500 dark:hover:text-white transition-all duration-150 flex-shrink-0">
            Find a ride <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-8">
          {steps.map((step, i) => (
            <div key={step.n} className="relative">
              {i < steps.length-1 && (
                <div className="hidden sm:block absolute top-6 left-[calc(50%+28px)] right-0 h-0.5 bg-gradient-to-r from-gray-200 to-transparent dark:from-gray-700" />
              )}
              <div className="flex items-start gap-4 sm:flex-col sm:gap-5">
                <div className={`w-12 h-12 rounded-2xl ${step.bg} flex items-center justify-center flex-shrink-0 relative z-10`}>
                  <step.icon size={22} className={step.color} />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">Step {step.n}</div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-1.5">{step.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{step.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Why Choose ────────────────────────────────────────────────────────────
function WhyChooseSection() {
  const features = [
    { icon:ShieldCheck, color:'text-emerald-600', bg:'bg-emerald-50 dark:bg-emerald-900/20', title:'Driver-verified routes',  body:'Gemini AI verifies every license and vehicle document.' },
    { icon:Route,       color:'text-blue-600',    bg:'bg-blue-50 dark:bg-blue-900/20',       title:'Instant fare calculation', body:'Partial-route booking: pay only for your segment.' },
    { icon:Star,        color:'text-amber-600',   bg:'bg-amber-50 dark:bg-amber-900/20',     title:'Trust score system',      body:'Ratings from completed rides only — no anonymous reviews.' },
    { icon:Navigation,  color:'text-violet-600',  bg:'bg-violet-50 dark:bg-violet-900/20',   title:'Route-based matching',    body:'Board anywhere along the driver\'s route.' },
    { icon:Wallet,      color:'text-red-600',     bg:'bg-red-50 dark:bg-red-900/20',         title:'No surge pricing',        body:'Fixed fares set before you book. No surprises.' },
    { icon:Phone,       color:'text-emerald-600', bg:'bg-emerald-50 dark:bg-emerald-900/20', title:'GPS live tracking',       body:'Proximity check confirms you\'re at the vehicle.' },
  ];
  return (
    <section className="bg-white dark:bg-gray-950 py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10 sm:mb-14">
          <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-widest mb-3">
            <span className="block w-6 h-0.5 bg-current rounded" /> Why RideWave <span className="block w-6 h-0.5 bg-current rounded" />
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900 dark:text-white tracking-tight mb-3">
            Built differently, by design.
          </h2>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            Every feature exists because a real commuter asked for it.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
          {features.map(f => (
            <div key={f.title}
              className="p-5 sm:p-6 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 hover:-translate-y-0.5 hover:shadow-lg dark:hover:shadow-black/20 transition-all duration-200">
              <div className={`w-11 h-11 rounded-xl ${f.bg} flex items-center justify-center mb-4`}>
                <f.icon size={20} className={f.color} />
              </div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1.5">{f.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Safety ────────────────────────────────────────────────────────────────
function SafetySection() {
  return (
    <section className="bg-gray-950 py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-72 sm:w-96 h-72 sm:h-96 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-64 sm:w-80 h-64 sm:h-80 rounded-full bg-emerald-600/15 blur-3xl pointer-events-none" />
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-5">
              <ShieldCheck size={12} /> Verified & Safe
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight mb-4">
              Safety isn't a feature.<br className="hidden sm:block" /> It's the foundation.
            </h2>
            <p className="text-white/60 leading-relaxed mb-7 text-sm sm:text-base">
              Before any driver can offer a ride, they pass multi-layer verification. AI-powered OCR reads their documents. Our team reviews edge cases.
            </p>
            <div className="flex flex-col gap-3.5">
              {[[ShieldCheck,'License & RC verified by Gemini AI'],[Navigation,'Real-time GPS proximity check-in'],[Award,'Trust scores from completed rides only'],[Users,'Admin review for flagged documents']].map(([Icon,text]) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/12 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <Icon size={14} className="text-emerald-400" />
                  </div>
                  <span className="text-sm text-white/75 font-medium">{text}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="rounded-2xl overflow-hidden aspect-[4/3]">
              <img src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80&auto=format&fit=crop"
                alt="Verified driver" loading="lazy" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-br from-blue-700/30 to-transparent" />
            </div>
            <div className="absolute bottom-4 left-4 right-4 sm:bottom-5 sm:left-5 sm:right-5 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-3 sm:p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/25 flex items-center justify-center flex-shrink-0">
                <ShieldCheck size={18} className="text-emerald-400" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">AI Document Verification</div>
                <div className="text-xs text-white/55 mt-0.5">Powered by Google Gemini · Instant</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Cities ────────────────────────────────────────────────────────────────
function CitiesSection() {
  const navigate = useNavigate();
  const cities = [
    { name:'Karachi',    rides:'14,000+ rides', img:'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=600&q=80&auto=format&fit=crop', featured:true },
    { name:'Lahore',     rides:'9,500+ rides',  img:'https://images.unsplash.com/photo-1599030357806-3c0f6b0e1e1d?w=600&q=80&auto=format&fit=crop' },
    { name:'Islamabad',  rides:'6,200+ rides',  img:'https://images.unsplash.com/photo-1568303571738-8f2a8bbf6ff3?w=600&q=80&auto=format&fit=crop' },
    { name:'Rawalpindi', rides:'3,800+ rides',  img:'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&q=80&auto=format&fit=crop' },
  ];
  return (
    <section className="bg-gray-50 dark:bg-gray-900/50 py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 sm:mb-10">
          <div>
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-widest mb-3">
              <span className="block w-6 h-0.5 bg-current rounded" /> Where we operate
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
              Rides across Pakistan.
            </h2>
          </div>
          <button onClick={() => navigate('/rides/search')}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline underline-offset-2">
            View all routes <ArrowUpRight size={15} />
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
          {cities.map((city, i) => (
            <div key={city.name}
              onClick={() => navigate(`/rides/search?from=${city.name}`)}
              className={`relative overflow-hidden rounded-2xl cursor-pointer group
                ${i === 0 ? 'col-span-2 sm:col-span-2 lg:col-span-1 lg:row-span-2' : ''}`}>
              <div className={`${i === 0 ? 'aspect-[16/9] sm:aspect-[2/1] lg:aspect-auto lg:h-full' : 'aspect-[4/3]'} relative min-h-[160px]`}>
                <img src={city.img} alt={city.name} loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4">
                  <div className={`font-black text-white mb-1 ${i===0?'text-xl sm:text-2xl lg:text-3xl':'text-base sm:text-lg'}`}>{city.name}</div>
                  <div className="flex items-center gap-1.5 text-white/65 text-xs"><Car size={10} /> {city.rides}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Testimonials ──────────────────────────────────────────────────────────
function TestimonialsSection() {
  const reviews = [
    { name:'Sana Raza',   role:'Daily commuter, Karachi',  avatar:'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&q=80&fit=crop', rating:5, text:'I save around Rs. 2,000 a week compared to Uber. GPS check-in means no awkward calls.' },
    { name:'Kamran Ali',  role:'Driver, Lahore',            avatar:'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&q=80&fit=crop', rating:5, text:'I drive Lahore to Islamabad every other week. I recover half my fuel cost.' },
    { name:'Aisha Malik', role:'Student, Islamabad',         avatar:'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&q=80&fit=crop', rating:5, text:'The partial-route booking is a game changer. I pay only for my segment.' },
  ];
  return (
    <section className="bg-white dark:bg-gray-950 py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10 sm:mb-14">
          <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-widest mb-3">
            <span className="block w-6 h-0.5 bg-current rounded" /> Real riders <span className="block w-6 h-0.5 bg-current rounded" />
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900 dark:text-white tracking-tight">What people say.</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {reviews.map(r => (
            <div key={r.name}
              className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 sm:p-6 hover:border-blue-200 dark:hover:border-blue-800/50 hover:-translate-y-0.5 hover:shadow-xl dark:hover:shadow-black/25 transition-all duration-200">
              <div className="flex gap-0.5 mb-4">
                {Array.from({length:r.rating}).map((_,i)=><Star key={i} size={13} className="text-amber-400 fill-amber-400"/>)}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-5">"{r.text}"</p>
              <div className="flex items-center gap-3">
                <img src={r.avatar} alt={r.name} className="w-9 h-9 rounded-full object-cover border-2 border-gray-100 dark:border-gray-700 flex-shrink-0" />
                <div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white">{r.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{r.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Driver CTA ────────────────────────────────────────────────────────────
function DriverCtaSection() {
  return (
    <section className="bg-gray-50 dark:bg-gray-900/50 py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="relative bg-gray-950 rounded-3xl overflow-hidden p-7 sm:p-10 lg:p-12">
          <div className="absolute -top-16 right-16 w-64 h-64 rounded-full bg-blue-600/25 blur-3xl pointer-events-none" />
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-widest mb-5">
                <Car size={11} /> Drive with RideWave
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight mb-4">
                Making the trip anyway?<br className="hidden sm:block" /> Bring passengers along.
              </h2>
              <p className="text-white/55 text-sm sm:text-base leading-relaxed mb-7">
                Set your own fare, choose your passengers, earn on every seat. Verification takes under 24 hours.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/register"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-600/30 hover:bg-blue-700 hover:-translate-y-0.5 transition-all duration-150">
                  <Car size={15} /> Become a driver
                </Link>
                <Link to="/rides/search"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/8 border border-white/15 text-white font-semibold text-sm hover:bg-white/14 transition-all duration-150">
                  Browse as passenger
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-3 lg:grid-cols-1 gap-3">
              {[['24h','Avg. approval time'],['PKR 3K+','Avg. monthly earnings'],['4.8★','Driver rating avg.']].map(([v,l]) => (
                <div key={l} className="px-4 sm:px-5 py-3 sm:py-4 rounded-xl bg-white/6 border border-white/10">
                  <div className="text-lg sm:text-2xl font-black text-white">{v}</div>
                  <div className="text-[10px] sm:text-xs text-white/45 mt-0.5 sm:mt-1">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── App Teaser ────────────────────────────────────────────────────────────
function AppTeaserSection() {
  return (
    <section className="bg-white dark:bg-gray-950 py-14 sm:py-16 px-4 sm:px-6 border-t border-gray-100 dark:border-gray-800">
      <div className="max-w-lg mx-auto text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-emerald-500 flex items-center justify-center mx-auto mb-5">
          <Smartphone size={26} className="text-white" />
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-3">Mobile app coming soon.</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6 max-w-xs mx-auto">
          Real-time tracking, one-tap booking, push notifications. iOS & Android — early 2025.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {['App Store','Google Play'].map(s => (
            <button key={s} disabled
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 dark:bg-gray-800 text-white text-xs font-semibold opacity-50 cursor-not-allowed">
              <Smartphone size={14} /> {s} — Soon
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Footer ────────────────────────────────────────────────────────────────
function HomeFooter() {
  const year = new Date().getFullYear();
  const cols = [
    { heading:'Passengers', links:[['Find a ride','/rides/search'],['How it works','#'],['My bookings','/bookings']] },
    { heading:'Drivers',    links:[['Become a driver','/register'],['Driver dashboard','/driver/dashboard'],['Verification','/driver/onboarding']] },
    { heading:'Company',    links:[['Terms of Service','/terms'],['Privacy Policy','/privacy'],['Contact','mailto:support@ridewave.pk']] },
  ];
  return (
    <footer className="bg-gray-950 px-4 sm:px-6 lg:px-8 pt-12 sm:pt-14 pb-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10 pb-10 border-b border-white/8">
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <img src="/logo.png" alt="RideWave" className="w-9 h-9 object-contain" />
              <span className="text-lg font-black text-white">Ride<span className="text-blue-400">Wave</span></span>
            </div>
            <p className="text-xs text-white/35 leading-relaxed max-w-[200px]">
              Connecting Pakistani commuters with verified drivers for safer, cheaper shared rides.
            </p>
            <div className="flex gap-2 mt-4">
              {[Twitter,Instagram,Facebook].map((Icon,i) => (
                <button key={i} className="w-8 h-8 rounded-lg bg-white/6 border border-white/10 flex items-center justify-center hover:bg-blue-600/20 hover:border-blue-500/30 transition-all duration-150">
                  <Icon size={13} className="text-white/50" />
                </button>
              ))}
            </div>
          </div>
          {cols.map(col => (
            <div key={col.heading}>
              <div className="text-[10px] font-bold text-white/25 uppercase tracking-widest mb-4">{col.heading}</div>
              <div className="flex flex-col gap-2.5">
                {col.links.map(([label,href]) => (
                  <Link key={label} to={href} className="text-xs text-white/45 hover:text-white transition-colors duration-150">{label}</Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/25 order-2 sm:order-1">© {year} RideWave. All rights reserved.</p>
          <div className="flex items-center gap-2 order-1 sm:order-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] text-white/25">All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────
export default function HomePage() {
  const { user, isDriver, isAdmin } = useAuth();
  return (
    <div className="min-h-screen font-sans antialiased">
      <HeroSection user={user} isDriver={isDriver} isAdmin={isAdmin} />
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