/**
 * BookingModal — book a seat on a ride.
 * ALL booking logic, state, validation, and API calls unchanged.
 * UI/UX redesign only — consistent with CreateRidePage and SearchRidesPage.
 */

import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, CreditCard, Banknote, Smartphone, MapPin, Flag,
  Route, AlertCircle, CheckCircle2, Loader2, Timer,
  Car, Star, ShieldCheck, Clock, ChevronRight,
  Navigation, Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PlacesAutocomplete from '../rides/PlacesAutocomplete.jsx';
import { bookingService } from '../../services/bookingService.js';
import { loadGoogleMaps } from '../../utils/googleMapsLoader.js';
import { formatCurrency } from '../../utils/formatters.js';

// ── Payment methods (unchanged) ───────────────────────────────────────────
const PAYMENT_METHODS = [
  { value: 'CASH',      label: 'Cash',      sub: 'Pay on pickup',  icon: Banknote   },
  { value: 'CARD',      label: 'Card',       sub: 'Debit/Credit',  icon: CreditCard },
  { value: 'EASYPAISA', label: 'EasyPaisa',  sub: 'Mobile wallet', icon: Smartphone },
  { value: 'JAZZCASH',  label: 'JazzCash',   sub: 'Mobile wallet', icon: Smartphone },
];

function fmtPrice(n) {
  return `PKR ${Number(n ?? 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}
function fmtTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const t = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const today = new Date(), tom = new Date(today); tom.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return `Today · ${t}`;
  if (d.toDateString() === tom.toDateString())   return `Tomorrow · ${t}`;
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${t}`;
}

function SectionLabel({ children }) {
  return <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: 10 }}>{children}</div>;
}

function SeatStepper({ seats, setSeats, max }) {
  const btn = (label, onClick, disabled) => (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label}
      style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: disabled ? 'var(--color-background-secondary)' : '#185FA5', color: disabled ? 'var(--color-text-tertiary)' : '#fff', fontSize: 20, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: disabled ? .4 : 1, transition: 'all .12s' }}>
      {label === 'dec' ? '−' : '+'}
    </button>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      {btn('dec', () => setSeats(s => Math.max(1, s - 1)), seats <= 1)}
      <div style={{ textAlign: 'center', minWidth: 48 }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{seats}</div>
        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>seat{seats !== 1 ? 's' : ''}</div>
      </div>
      {btn('inc', () => setSeats(s => Math.min(max, s + 1)), seats >= max)}
      <div style={{ marginLeft: 4, fontSize: 12, color: 'var(--color-text-secondary)' }}>
        <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{max}</span> available
      </div>
    </div>
  );
}

function PaymentCard({ method, selected, onClick }) {
  const Icon = method.icon;
  return (
    <button type="button" onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 12, border: `1.5px solid ${selected ? '#185FA5' : 'var(--color-border-secondary)'}`, background: selected ? '#185FA508' : 'var(--color-background-primary)', cursor: 'pointer', textAlign: 'left', width: '100%', boxShadow: selected ? '0 0 0 3px rgba(24,95,165,.1)' : 'none', transition: 'all .15s' }}>
      <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, background: selected ? '#185FA515' : 'var(--color-background-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s' }}>
        <Icon size={16} style={{ color: selected ? '#185FA5' : 'var(--color-text-secondary)' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{method.label}</div>
        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{method.sub}</div>
      </div>
      {selected
        ? <CheckCircle2 size={16} style={{ color: '#185FA5', flexShrink: 0 }} />
        : <div style={{ width: 16, height: 16, borderRadius: '50%', border: '1.5px solid var(--color-border-secondary)', flexShrink: 0 }} />
      }
    </button>
  );
}


// ── Fare breakdown row ────────────────────────────────────────────────────
function FareRow({ label, value, muted = false, accent = false }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
      <span style={{ fontSize:12, color: muted ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)' }}>{label}</span>
      <span style={{ fontSize:12, fontWeight: accent ? 700 : 500, color: accent ? '#185FA5' : 'var(--color-text-primary)', fontVariantNumeric:'tabular-nums' }}>{value}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main component — ALL STATE AND LOGIC UNCHANGED
// ═══════════════════════════════════════════════════════════════════════════
export default function BookingModal({ ride, onClose, onPickupChange, onDropChange }) {
  const navigate = useNavigate();

  const [seats,         setSeats]         = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [loading,       setLoading]       = useState(false);
  const [pickup,        setPickup]        = useState(null);
  const [drop,          setDrop]          = useState(null);
  const [segmentError,  setSegmentError]  = useState(null);

  // ── Partial-route fare calculation ─────────────────────────────────────
  const [fareCalc,      setFareCalc]      = useState(null);  // { segDistM, perSeatTripFare, passengerFarePerSeat, totalFare }
  const [fareLoading,   setFareLoading]   = useState(false);

  const hasRoute = !!ride.routePolyline;

  const handlePickupChange = useCallback((val) => {
    if (val && typeof val === 'object' && val.lat) {
      setPickup(val); setSegmentError(null); onPickupChange?.({ lat: val.lat, lng: val.lng });
    } else {
      setPickup(null); onPickupChange?.(null);
    }
  }, [onPickupChange]);

  const handleDropChange = useCallback((val) => {
    if (val && typeof val === 'object' && val.lat) {
      setDrop(val); setSegmentError(null); onDropChange?.({ lat: val.lat, lng: val.lng });
    } else {
      setDrop(null); onDropChange?.(null);
    }
  }, [onDropChange]);

  // ── Fare calculation ──────────────────────────────────────────────────
  // Pro-rated when pickup/drop provided, flat when full-route booking.
  // Fetches segment distance via Directions API (same API key already loaded).

  const perSeatTripFare = Number(ride.farePerSeat);  // already = totalTripFare ÷ seats
  const rideDistanceM   = ride.routeDistanceM ?? null;

  // Recalculate whenever pickup, drop, or seats change
  useEffect(() => {
    const hasPickup = !!pickup?.lat, hasDrop = !!drop?.lat;
    if (!hasPickup || !hasDrop || !rideDistanceM) {
      // Full-route or no distance data — use flat fare
      setFareCalc(null);
      return;
    }

    let cancelled = false;
    setFareLoading(true);

    loadGoogleMaps().then(() => {
      if (!window.google?.maps?.DirectionsService || cancelled) return;
      const svc = new window.google.maps.DirectionsService();
      svc.route({
        origin:      { lat: pickup.lat, lng: pickup.lng },
        destination: { lat: drop.lat,   lng: drop.lng   },
        travelMode:  'DRIVING',
      }).then(result => {
        if (cancelled) return;
        const segDistM = result?.routes?.[0]?.legs?.[0]?.distance?.value ?? null;
        if (!segDistM || !rideDistanceM) { setFareCalc(null); setFareLoading(false); return; }
        const ratio              = Math.min(segDistM / rideDistanceM, 1);
        const passengerFarePerSeat = Math.max(Math.round(perSeatTripFare * ratio), 10);
        const totalFare           = passengerFarePerSeat * seats;
        setFareCalc({ segDistM, perSeatTripFare, passengerFarePerSeat, totalFare });
        setFareLoading(false);
      }).catch(err => {
        if (!cancelled) { console.warn('[BookingModal] Directions failed:', err); setFareCalc(null); setFareLoading(false); }
      });
    }).catch(() => { if (!cancelled) setFareLoading(false); });

    return () => { cancelled = true; };
  }, [pickup, drop, seats, rideDistanceM, perSeatTripFare]);

  // Final displayed fare
  const totalFare = fareCalc
    ? fareCalc.totalFare
    : perSeatTripFare * seats;

  const handleBook = async () => {
    const hasPickup = !!pickup?.lat, hasDrop = !!drop?.lat;
    if (hasPickup !== hasDrop) {
      setSegmentError('Please provide both a pickup and a drop location, or leave both empty.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        rideId: ride.rideId, seatsRequested: seats,
        ...(hasPickup && { pickupName: pickup.name, pickupLat: pickup.lat, pickupLng: pickup.lng, dropName: drop.name, dropLat: drop.lat, dropLng: drop.lng }),
        ...(fareCalc?.segDistM && { passengerDistanceM: fareCalc.segDistM }),
        ...(fareCalc && { clientCalculatedFare: fareCalc.totalFare }),
      };
      const { data: res } = await bookingService.request(payload);
      toast.success(res.message ?? 'Booking confirmed!');
      onClose();
      navigate('/bookings');
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const driverInitial = ride.driver?.fullName?.charAt(0)?.toUpperCase() ?? '?';

  return (
    <>
      <style>{`
        @keyframes bm-in   { from{opacity:0} to{opacity:1} }
        @keyframes bm-up   { from{opacity:0;transform:translateY(20px) scale(.98)} to{opacity:1;transform:none} }
        @keyframes bm-spin { to{transform:rotate(360deg)} }
        .bm-bd { animation: bm-in .18s ease both; }
        .bm-sh { animation: bm-up .22s cubic-bezier(.22,1,.36,1) both; }
      `}</style>

      {/* Backdrop */}
      <div className="bm-bd" onClick={e => e.target === e.currentTarget && onClose()}
        style={{ position:'fixed', inset:0, zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:16, background:'rgba(0,0,0,.52)', backdropFilter:'blur(3px)' }}>

        {/* Sheet */}
        <div className="bm-sh"
          style={{ width:'100%', maxWidth:440, maxHeight:'92vh', background:'var(--color-background-primary)', borderRadius:20, boxShadow:'0 24px 60px rgba(0,0,0,.28)', display:'flex', flexDirection:'column', overflow:'hidden', border:'1px solid var(--color-border-tertiary)' }}>

          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 20px 16px', borderBottom:'1px solid var(--color-border-tertiary)', flexShrink:0 }}>
            <div>
              <div style={{ fontSize:17, fontWeight:800, color:'var(--color-text-primary)', lineHeight:1.2 }}>Book This Ride</div>
              <div style={{ fontSize:12, color:'var(--color-text-tertiary)', marginTop:2 }}>Confirm your details below</div>
            </div>
            <button onClick={onClose} aria-label="Close"
              style={{ width:34, height:34, borderRadius:10, border:'none', background:'var(--color-background-secondary)', color:'var(--color-text-secondary)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <X size={16} />
            </button>
          </div>

          {/* Scrollable body */}
          <div style={{ flex:1, overflowY:'auto', padding:'20px 20px 8px' }}>
            <div style={{ display:'flex', flexDirection:'column', gap:22 }}>

              {/* Ride summary */}
              <div>
                <SectionLabel>Ride Details</SectionLabel>
                <div style={{ background:'var(--color-background-secondary)', border:'1px solid var(--color-border-tertiary)', borderRadius:14, overflow:'hidden' }}>

                  {/* Driver row */}
                  <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderBottom:'1px solid var(--color-border-tertiary)' }}>
                    <div style={{ width:42, height:42, borderRadius:'50%', flexShrink:0, background:'#185FA515', border:'2px solid #185FA530', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:800, color:'#185FA5', overflow:'hidden' }}>
                      {ride.driver?.profilePic
                        ? <img src={ride.driver.profilePic} alt={ride.driver.fullName} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                        : driverInitial}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ fontSize:14, fontWeight:700, color:'var(--color-text-primary)' }}>{ride.driver?.fullName ?? 'Driver'}</span>
                        {ride.driver?.verified && <span style={{ display:'inline-flex', alignItems:'center', gap:2, fontSize:10, color:'#059669', fontWeight:600 }}><ShieldCheck size={10} /> Verified</span>}
                      </div>
                      {ride.driver?.trustScore != null && (
                        <div style={{ display:'flex', alignItems:'center', gap:3, fontSize:12, color:'var(--color-text-secondary)', marginTop:2 }}>
                          <Star size={10} style={{ color:'#f59e0b', fill:'#f59e0b' }} />
                          <span style={{ fontWeight:500 }}>{Number(ride.driver.trustScore).toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontSize:16, fontWeight:800, color:'var(--color-text-primary)', fontVariantNumeric:'tabular-nums' }}>{fmtPrice(ride.farePerSeat)}</div>
                      <div style={{ fontSize:10, color:'var(--color-text-tertiary)' }}>per seat</div>
                    </div>
                  </div>

                  {/* Route row */}
                  <div style={{ padding:'12px 16px', display:'flex', gap:12 }}>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', paddingTop:4, flexShrink:0 }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background:'#16a34a', border:'1.5px solid #16a34a40' }} />
                      <div style={{ width:1.5, height:22, background:'linear-gradient(to bottom,#16a34a60,#dc262660)', margin:'2px 0' }} />
                      <div style={{ width:8, height:8, borderRadius:'50%', background:'#dc2626', border:'1.5px solid #dc262640' }} />
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--color-text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ride.originName}</div>
                      <div style={{ display:'flex', alignItems:'center', gap:5, margin:'3px 0', fontSize:11, color:'var(--color-text-tertiary)' }}><Clock size={10} />{fmtTime(ride.departureTime)}</div>
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--color-text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ride.destName}</div>
                    </div>
                  </div>

                  {/* Vehicle row */}
                  {ride.vehicle && (
                    <div style={{ padding:'10px 16px', borderTop:'1px solid var(--color-border-tertiary)', display:'flex', alignItems:'center', gap:8 }}>
                      <Car size={12} style={{ color:'var(--color-text-tertiary)', flexShrink:0 }} />
                      <span style={{ fontSize:12, color:'var(--color-text-secondary)' }}>
                        {ride.vehicle.make} {ride.vehicle.model}
                        {ride.vehicle.plateNumber ? ` · ${ride.vehicle.plateNumber}` : ''}
                        {ride.vehicle.color ? ` · ${ride.vehicle.color}` : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Pickup / Drop */}
              {hasRoute ? (
                <div>
                  <SectionLabel>Your Journey</SectionLabel>
                  <div style={{ fontSize:12, color:'var(--color-text-secondary)', marginBottom:12, lineHeight:1.5 }}>
                    Choose your pickup and drop anywhere along this route (within 300 m), or leave both empty to ride the full route.
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {/* Pickup with connector */}
                    <div style={{ display:'flex', gap:10 }}>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', paddingTop:32, flexShrink:0 }}>
                        <div style={{ width:8, height:8, borderRadius:'50%', background:'#16a34a', border:'1.5px solid #16a34a40' }} />
                        <div style={{ width:1.5, flex:1, background:'var(--color-border-tertiary)', margin:'3px 0', minHeight:16 }} />
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <PlacesAutocomplete id="booking-pickup" label="Pickup Point" placeholder="e.g. Saddar, Karachi" icon={MapPin} onPlaceSelect={handlePickupChange} />
                      </div>
                    </div>
                    {/* Drop */}
                    <div style={{ display:'flex', gap:10 }}>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', paddingTop:32, flexShrink:0 }}>
                        <div style={{ width:8, height:8, borderRadius:'50%', background:'#dc2626', border:'1.5px solid #dc262640' }} />
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <PlacesAutocomplete id="booking-drop" label="Drop Point" placeholder="e.g. Gulshan-e-Iqbal, Karachi" icon={Flag} onPlaceSelect={handleDropChange} />
                      </div>
                    </div>
                  </div>

                  {segmentError && (
                    <div style={{ display:'flex', alignItems:'flex-start', gap:7, marginTop:10, padding:'10px 12px', borderRadius:10, background:'#dc262608', border:'1px solid #dc262625', fontSize:12, color:'#dc2626' }}>
                      <AlertCircle size={13} style={{ flexShrink:0, marginTop:1 }} />{segmentError}
                    </div>
                  )}
                  {pickup?.lat && drop?.lat && (
                    <div style={{ display:'flex', alignItems:'center', gap:7, marginTop:10, padding:'10px 12px', borderRadius:10, background:'#05966910', border:'1px solid #05966925', fontSize:12, color:'#059669', fontWeight:500 }}>
                      <Route size={12} style={{ flexShrink:0 }} />{pickup.name} → {drop.name}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'11px 14px', borderRadius:12, background:'#185FA508', border:'1px solid #185FA520', fontSize:12, color:'#185FA5', fontWeight:500 }}>
                  <Route size={13} style={{ flexShrink:0, marginTop:1 }} />
                  Full route · {ride.originName} → {ride.destName}
                </div>
              )}

              {/* Seats */}
              <div>
                <SectionLabel>Number of Seats</SectionLabel>
                <SeatStepper seats={seats} setSeats={setSeats} max={ride.availableSeats} />
              </div>

              {/* Payment */}
              <div>
                <SectionLabel>Payment Method</SectionLabel>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {PAYMENT_METHODS.map(m => <PaymentCard key={m.value} method={m} selected={paymentMethod === m.value} onClick={() => setPaymentMethod(m.value)} />)}
                </div>
              </div>

              {/* Approval notice */}
              {ride.requiresApproval && (
                <div style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'11px 14px', borderRadius:12, background:'#fef3c7', border:'1px solid #fde68a', fontSize:12, color:'#92400e', lineHeight:1.5 }}>
                  <Timer size={13} style={{ flexShrink:0, marginTop:1 }} />
                  The driver will review your request before confirming. You'll be notified once approved.
                </div>
              )}
            </div>
          </div>

          {/* Sticky footer */}
          <div style={{ flexShrink:0, borderTop:'1px solid var(--color-border-tertiary)', padding:'16px 20px 20px', background:'var(--color-background-primary)' }}>
            {/* Fare breakdown */}
            <div style={{ marginBottom:14, borderRadius:12, background:'var(--color-background-secondary)', border:'1px solid var(--color-border-tertiary)', overflow:'hidden' }}>
              {fareLoading ? (
                <div style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 16px', fontSize:12, color:'var(--color-text-secondary)' }}>
                  <Loader2 size={13} style={{ animation:'bm-spin .8s linear infinite' }} />
                  Calculating fare for your segment…
                </div>
              ) : fareCalc ? (
                <>
                  {/* Breakdown rows */}
                  <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--color-border-tertiary)' }}>
                    <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.07em', textTransform:'uppercase', color:'var(--color-text-tertiary)', marginBottom:8 }}>Fare Breakdown</div>
                    <FareRow label="Driver's per-seat fare" value={fmtPrice(fareCalc.perSeatTripFare)} muted />
                    <FareRow label={`Your segment (${(fareCalc.segDistM / 1000).toFixed(1)} km of ${rideDistanceM ? (rideDistanceM / 1000).toFixed(1) : '?'} km)`}
                      value={`${Math.round(fareCalc.segDistM / (rideDistanceM || fareCalc.segDistM) * 100)}%`} muted />
                    <FareRow label="Your fare per seat" value={fmtPrice(fareCalc.passengerFarePerSeat)} />
                    {seats > 1 && <FareRow label={`× ${seats} seats`} value={fmtPrice(fareCalc.totalFare)} accent />}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px' }}>
                    <div style={{ fontSize:10, color:'var(--color-text-tertiary)', fontWeight:700, letterSpacing:'.05em', textTransform:'uppercase' }}>Total</div>
                    <div style={{ fontSize:22, fontWeight:800, color:'var(--color-text-primary)', fontVariantNumeric:'tabular-nums' }}>{formatCurrency(fareCalc.totalFare)}</div>
                  </div>
                </>
              ) : (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px' }}>
                  <div>
                    <div style={{ fontSize:10, color:'var(--color-text-tertiary)', fontWeight:700, letterSpacing:'.05em', textTransform:'uppercase' }}>Total</div>
                    <div style={{ fontSize:12, color:'var(--color-text-secondary)', marginTop:2 }}>
                      {seats} seat{seats !== 1 ? 's' : ''} × {fmtPrice(perSeatTripFare)}
                      {!rideDistanceM && pickup?.lat && <span style={{ color:'#d97706', marginLeft:4 }}>(add pickup/drop for pro-rated fare)</span>}
                    </div>
                  </div>
                  <div style={{ fontSize:22, fontWeight:800, color:'var(--color-text-primary)', fontVariantNumeric:'tabular-nums' }}>{formatCurrency(totalFare)}</div>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div style={{ display:'flex', gap:10 }}>
              <button type="button" onClick={onClose} disabled={loading}
                style={{ flex:1, padding:'12px 0', borderRadius:12, border:'none', background:'var(--color-background-secondary)', color:'var(--color-text-primary)', fontSize:14, fontWeight:600, cursor:loading?'not-allowed':'pointer', opacity:loading?.5:1, transition:'opacity .12s' }}>
                Cancel
              </button>
              <button type="button" onClick={handleBook} disabled={loading}
                style={{ flex:2, padding:'12px 0', borderRadius:12, border:'none', background:loading?'#185FA570':'#185FA5', color:'#fff', fontSize:14, fontWeight:700, cursor:loading?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow:loading?'none':'0 3px 12px rgba(24,95,165,.35)', transition:'all .12s' }}>
                {loading
                  ? <><Loader2 size={15} style={{ animation:'bm-spin .8s linear infinite' }} />Confirming…</>
                  : ride.requiresApproval
                    ? <><ChevronRight size={15} />Send Request</>
                    : <><CheckCircle2 size={15} />Confirm Booking</>
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}