/**
 * DriverDashboard — RideWave
 *
 * ALL logic, queries, mutations, state, and data structures UNCHANGED.
 * Complete UI redesign: timeline-based ride feed, performance sidebar,
 * live countdown, occupancy rings, custom components.
 *
 * Design language: Linear × Stripe × Vercel
 *   - Off-white (#F7F7F8) surface, ink (#0D0D0E) accents
 *   - No generic stat cards — numbers integrated into context
 *   - Vertical timeline for rides, not a grid
 *   - Departure countdown ticking every second
 *   - Subdued color (blue #185FA5, emerald #059669, amber #D97706)
 */

import { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusCircle, Car, CheckCircle, Clock, ShieldCheck,
  Star, Armchair, MapPin, Flag, ChevronRight, Bell,
  ThumbsUp, ThumbsDown, RefreshCw, Calendar, ChevronDown,
  ChevronUp, Users, Activity, XCircle, UserCheck, BarChart3,
  ArrowUpRight, Settings, Pencil, Trash2, Ban, AlertTriangle,
  LockKeyhole, Play, CheckCircle2, Timer, Zap, TrendingUp,
  Navigation, Route, Circle, CircleDot, ChevronLeft,
  MoreHorizontal, Eye, EyeOff, Gauge,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageLayout          from '../../components/common/PageLayout.jsx';
import Spinner             from '../../components/common/Spinner.jsx';
import StatusBadge         from '../../components/common/StatusBadge.jsx';
import TrustScoreBadge     from '../../components/common/TrustScoreBadge.jsx';
import { useAuth }         from '../../context/AuthContext.jsx';
import { rideService }     from '../../services/rideService.js';
import { bookingService }  from '../../services/bookingService.js';
import { formatDate, formatTimeAgo, formatCurrency } from '../../utils/formatters.js';
import RouteMap from '../../components/rides/RouteMap.jsx';

// ─── Global CSS ────────────────────────────────────────────────────────────
const CSS = `
  @keyframes dd-up   { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
  @keyframes dd-in   { from{opacity:0} to{opacity:1} }
  @keyframes dd-spin { to{transform:rotate(360deg)} }
  @keyframes dd-pulse{ 0%,100%{opacity:1} 50%{opacity:.4} }
  @keyframes dd-ping { 0%{transform:scale(1);opacity:1} 75%,100%{transform:scale(1.8);opacity:0} }

  .dd-up   { animation: dd-up  .45s cubic-bezier(.22,1,.36,1) both; }
  .dd-in   { animation: dd-in  .35s ease both; }
  .dd-d1{animation-delay:.06s} .dd-d2{animation-delay:.12s}
  .dd-d3{animation-delay:.18s} .dd-d4{animation-delay:.24s}
  .dd-d5{animation-delay:.30s} .dd-d6{animation-delay:.36s}

  .dd-card {
    background: var(--dd-surface);
    border: 1px solid var(--dd-border);
    border-radius: 16px;
    transition: box-shadow .2s, border-color .2s;
  }
  .dd-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,.07); }

  .dd-row-btn {
    background:none; border:none; cursor:pointer; width:100%;
    text-align:left; padding:0; transition:background .12s;
    border-radius:12px;
  }
  .dd-row-btn:hover { background: var(--dd-hover); }

  .dd-action-btn {
    display:inline-flex; align-items:center; gap:5px;
    padding:6px 12px; border-radius:8px; border:none;
    font-size:12px; font-weight:600; cursor:pointer;
    transition: all .12s;
  }
  .dd-action-btn:hover { transform:translateY(-1px); }
  .dd-action-btn:active { transform:none; }

  .dd-approve { background:#05966912; color:#059669; border:1px solid #05966930; }
  .dd-approve:hover { background:#05966920; }
  .dd-reject  { background:#DC262608; color:#DC2626; border:1px solid #DC262620; }
  .dd-reject:hover { background:#DC262615; }
  .dd-primary { background:#185FA5; color:#fff; box-shadow:0 2px 8px rgba(24,95,165,.25); }
  .dd-primary:hover { background:#145189; box-shadow:0 4px 12px rgba(24,95,165,.35); }
  .dd-ghost   { background:transparent; color:var(--dd-text2); border:1px solid var(--dd-border); }
  .dd-ghost:hover { background:var(--dd-hover); color:var(--dd-text1); }
  .dd-danger  { background:#DC262610; color:#DC2626; border:1px solid #DC262625; }
  .dd-danger:hover { background:#DC262620; }

  .dd-input {
    width:100%; padding:9px 12px; border-radius:9px;
    border:1.5px solid var(--dd-border); background:var(--dd-surface);
    color:var(--dd-text1); font-size:13px; outline:none;
    transition:border-color .15s, box-shadow .15s;
  }
  .dd-input:focus { border-color:#185FA5; box-shadow:0 0 0 3px rgba(24,95,165,.1); }
  .dd-input::placeholder { color:var(--dd-text3); }

  .dd-section-label {
    font-size:10.5px; font-weight:700; letter-spacing:.08em;
    text-transform:uppercase; color:var(--dd-text3); margin-bottom:12px;
  }

  .dd-timeline-dot {
    width:10px; height:10px; border-radius:50%;
    flex-shrink:0; border:2px solid;
  }

  .dd-chip {
    display:inline-flex; align-items:center; gap:4px;
    padding:3px 8px; border-radius:6px;
    font-size:11px; font-weight:600; letter-spacing:.02em;
  }

  .dd-perf-ring {
    position:relative; display:inline-flex;
    align-items:center; justify-content:center;
  }

  /* Light */
  :root {
    --dd-bg:      #F7F7F8;
    --dd-surface: #FFFFFF;
    --dd-border:  #E8E8EC;
    --dd-hover:   #F2F2F5;
    --dd-text1:   #0D0D0E;
    --dd-text2:   #5C5C6E;
    --dd-text3:   #9999AA;
    --dd-ink:     #0D0D0E;
  }
  /* Dark */
  .dark {
    --dd-bg:      #0D0D0E;
    --dd-surface: #17171A;
    --dd-border:  #252530;
    --dd-hover:   #1F1F25;
    --dd-text1:   #F0F0F5;
    --dd-text2:   #8888A0;
    --dd-text3:   #55556A;
    --dd-ink:     #F0F0F5;
  }

  @media (prefers-reduced-motion:reduce) {
    .dd-up,.dd-in { animation:none!important; opacity:1!important; transform:none!important; }
  }
`;

// ─── Departure countdown ───────────────────────────────────────────────────
function useCountdown(iso) {
  const [diff, setDiff] = useState(() => new Date(iso) - Date.now());
  useEffect(() => {
    const id = setInterval(() => setDiff(new Date(iso) - Date.now()), 1000);
    return () => clearInterval(id);
  }, [iso]);
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  if (h > 24) return `in ${Math.floor(h / 24)}d`;
  if (h > 0)  return `${h}h ${m}m`;
  if (m > 0)  return `${m}m ${s}s`;
  return `${s}s`;
}

// ─── Avatar ───────────────────────────────────────────────────────────────
function Avatar({ src, name, size = 36 }) {
  const [broken, setBroken] = useState(false);
  const initials = (name ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const px = `${size}px`;
  const fs = Math.round(size * 0.34);
  if (src && !broken) return (
    <img src={src} alt={name ?? 'User'} onError={() => setBroken(true)}
      style={{ width:px, height:px, borderRadius:'50%', objectFit:'cover', border:'2px solid var(--dd-border)', flexShrink:0 }} />
  );
  return (
    <div style={{ width:px, height:px, borderRadius:'50%', background:'#185FA510', border:'2px solid #185FA525', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      <span style={{ fontSize:fs, fontWeight:700, color:'#185FA5' }}>{initials}</span>
    </div>
  );
}

// ─── Occupancy ring ────────────────────────────────────────────────────────
function OccupancyRing({ available, total, size = 44 }) {
  const booked = total - available;
  const pct    = total > 0 ? booked / total : 0;
  const r      = (size - 6) / 2;
  const circ   = 2 * Math.PI * r;
  const dash   = pct * circ;
  const color  = pct >= .9 ? '#DC2626' : pct >= .6 ? '#D97706' : '#059669';
  return (
    <div className="dd-perf-ring" style={{ width:size, height:size }}>
      <svg width={size} height={size} style={{ transform:'rotate(-90deg)', flexShrink:0 }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--dd-border)" strokeWidth={4} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={4}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition:'stroke-dasharray .4s' }} />
      </svg>
      <div style={{ position:'absolute', display:'flex', flexDirection:'column', alignItems:'center', lineHeight:1 }}>
        <span style={{ fontSize:12, fontWeight:800, color:'var(--dd-text1)' }}>{booked}</span>
        <span style={{ fontSize:9, color:'var(--dd-text3)', marginTop:1 }}>/{total}</span>
      </div>
    </div>
  );
}

// ─── Status pill ──────────────────────────────────────────────────────────
function Pill({ children, color = 'gray' }) {
  const map = {
    green:  { bg:'#05966912', text:'#059669', border:'#05966930' },
    blue:   { bg:'#185FA510', text:'#185FA5', border:'#185FA530' },
    amber:  { bg:'#D9770610', text:'#D97706', border:'#D9770630' },
    red:    { bg:'#DC262610', text:'#DC2626', border:'#DC262630' },
    gray:   { bg:'var(--dd-hover)', text:'var(--dd-text2)', border:'var(--dd-border)' },
    purple: { bg:'#7C3AED10', text:'#7C3AED', border:'#7C3AED30' },
  };
  const c = map[color] ?? map.gray;
  return (
    <span className="dd-chip" style={{ background:c.bg, color:c.text, border:`1px solid ${c.border}` }}>
      {children}
    </span>
  );
}

// ─── Route label ──────────────────────────────────────────────────────────
function RouteLabel({ from, to, size = 'sm' }) {
  const fs  = size === 'sm' ? 13 : 15;
  const iFs = size === 'sm' ? 12 : 14;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, minWidth:0 }}>
      <span style={{ display:'flex', alignItems:'center', gap:4, minWidth:0 }}>
        <span style={{ width:6, height:6, borderRadius:'50%', background:'#059669', flexShrink:0 }} />
        <span style={{ fontSize:fs, fontWeight:600, color:'var(--dd-text1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{from}</span>
      </span>
      <ChevronRight size={iFs} style={{ color:'var(--dd-text3)', flexShrink:0 }} />
      <span style={{ display:'flex', alignItems:'center', gap:4, minWidth:0 }}>
        <span style={{ width:6, height:6, borderRadius:'50%', background:'#DC2626', flexShrink:0 }} />
        <span style={{ fontSize:fs, fontWeight:600, color:'var(--dd-text1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{to}</span>
      </span>
    </div>
  );
}

// ─── Booking request card ─────────────────────────────────────────────────
// LOGIC UNCHANGED
function BookingRequestCard({ booking, onDecide, deciding }) {
  const [rejectMode, setRejectMode] = useState(false);
  const [reason, setReason]         = useState('');
  const isDeciding = deciding === booking.bookingId;

  const handleApprove = () => onDecide(booking.bookingId, true, null);
  const handleReject  = () => {
    if (!rejectMode) { setRejectMode(true); return; }
    onDecide(booking.bookingId, false, reason.trim() || 'Driver rejected the request.');
    setRejectMode(false);
  };

  return (
    <div style={{ padding:'16px', borderRadius:12, background:'var(--dd-hover)', border:'1px solid var(--dd-border)' }}>
      {/* Passenger row */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:12 }}>
        <Avatar src={booking.passengerPhoto} name={booking.passengerName} size={40} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:3 }}>
            <span style={{ fontSize:14, fontWeight:700, color:'var(--dd-text1)' }}>{booking.passengerName}</span>
            {booking.passengerVerified && (
              <Pill color="green"><ShieldCheck size={9} /> Verified</Pill>
            )}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            {booking.passengerTrustScore != null && (
              <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:12, color:'var(--dd-text2)' }}>
                <Star size={11} style={{ color:'#F59E0B', fill:'#F59E0B' }} />
                {Number(booking.passengerTrustScore).toFixed(1)}
              </span>
            )}
            <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:12, color:'var(--dd-text2)' }}>
              <Armchair size={11} />
              {booking.seatsBooked} seat{booking.seatsBooked !== 1 ? 's' : ''}
            </span>
            <span style={{ fontSize:11, color:'var(--dd-text3)' }}>{formatTimeAgo(booking.bookingTime)}</span>
          </div>
        </div>
        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ fontSize:16, fontWeight:800, color:'var(--dd-text1)', fontVariantNumeric:'tabular-nums' }}>
            {formatCurrency(booking.totalFare)}
          </div>
          <div style={{ fontSize:10, color:'var(--dd-text3)', marginTop:1 }}>total fare</div>
        </div>
      </div>

      {/* Segment */}
      <div style={{ padding:'10px 12px', borderRadius:9, background:'var(--dd-surface)', border:'1px solid var(--dd-border)', marginBottom:12, fontSize:13 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <MapPin size={13} style={{ color:'#059669', flexShrink:0 }} />
          <span style={{ color:'var(--dd-text1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>
            {booking.pickupName ?? booking.rideOriginName ?? booking.originName}
          </span>
          <ChevronRight size={13} style={{ color:'var(--dd-text3)', flexShrink:0 }} />
          <Flag size={13} style={{ color:'#185FA5', flexShrink:0 }} />
          <span style={{ color:'var(--dd-text1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>
            {booking.dropName ?? booking.rideDestName ?? booking.destName}
          </span>
        </div>
        {booking.pickupName && (
          <p style={{ fontSize:11, color:'var(--dd-text3)', marginTop:4 }}>
            Segment · Full route: {booking.rideOriginName} → {booking.rideDestName}
          </p>
        )}
      </div>

      {/* Reject reason */}
      {rejectMode && (
        <input type="text" placeholder="Reason for rejection (optional)"
          value={reason} onChange={e => setReason(e.target.value)} autoFocus
          className="dd-input" style={{ marginBottom:10 }} />
      )}

      {/* Actions */}
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={handleApprove} disabled={isDeciding} className="dd-action-btn dd-approve" style={{ flex:1, justifyContent:'center' }}>
          {isDeciding
            ? <span style={{ width:13, height:13, border:'2px solid #05966940', borderTopColor:'#059669', borderRadius:'50%', animation:'dd-spin .7s linear infinite' }} />
            : <><ThumbsUp size={13} /> Approve</>
          }
        </button>
        <button onClick={handleReject} disabled={isDeciding}
          className={`dd-action-btn ${rejectMode ? 'dd-danger' : 'dd-reject'}`}
          style={{ flex:1, justifyContent:'center' }}>
          <ThumbsDown size={13} />
          {rejectMode ? 'Confirm reject' : 'Reject'}
        </button>
        {rejectMode && (
          <button onClick={() => { setRejectMode(false); setReason(''); }}
            className="dd-action-btn dd-ghost" style={{ padding:'6px 10px' }}>
            <XCircle size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── RideActionsBar — all 4 rules, logic UNCHANGED ────────────────────────
function RideActionsBar({ ride, onRideChanged }) {
  const navigate     = useNavigate();
  const queryClient  = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const isScheduled  = ride.status === 'SCHEDULED';
  const isInProgress = ride.status === 'IN_PROGRESS';
  const hasBookings  = (ride.bookingCount ?? 0) > 0;
  const canModify    = ride.canModify ?? (isScheduled && !hasBookings);

  const deleteMutation = useMutation({
    mutationFn: () => rideService.deleteRide(ride.rideId),
    onSuccess:  () => { toast.success('Ride deleted.'); queryClient.invalidateQueries({ queryKey: ['my-rides'] }); onRideChanged?.(); },
    onError: err => toast.error(err.response?.data?.message ?? 'Could not delete ride.'),
  });
  const cancelMutation = useMutation({
    mutationFn: () => rideService.cancel(ride.rideId, 'Cancelled by driver'),
    onSuccess:  () => { toast.success('Ride cancelled.'); queryClient.invalidateQueries({ queryKey: ['my-rides'] }); onRideChanged?.(); },
    onError: err => toast.error(err.response?.data?.message ?? 'Could not cancel ride.'),
  });

  if (isScheduled && hasBookings) {
    return (
      <div style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'10px 12px', borderRadius:9, background:'#D9770608', border:'1px solid #D9770620', fontSize:12, color:'#D97706', marginBottom:12 }}>
        <LockKeyhole size={12} style={{ flexShrink:0, marginTop:1 }} />
        <span>
          <strong style={{ color:'#B45309' }}>Locked</strong> — {ride.bookingCount} passenger{ride.bookingCount !== 1 ? 's have' : ' has'} booked. Contact them directly if plans change.
        </span>
      </div>
    );
  }
  if (isInProgress || ride.status === 'COMPLETED' || ride.status === 'CANCELLED' || ride.status === 'EXPIRED') return null;

  return (
    <div style={{ marginBottom:12 }}>
      {confirmDelete && (
        <div style={{ padding:'12px', borderRadius:9, background:'#DC262608', border:'1px solid #DC262620', marginBottom:8 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#DC2626', marginBottom:6, display:'flex', alignItems:'center', gap:6 }}>
            <AlertTriangle size={13} /> Permanently delete this ride?
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => setConfirmDelete(false)} className="dd-action-btn dd-ghost" style={{ flex:1, justifyContent:'center' }}>Keep it</button>
            <button onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending} className="dd-action-btn dd-danger" style={{ flex:1, justifyContent:'center' }}>
              {deleteMutation.isPending ? 'Deleting…' : 'Yes, delete'}
            </button>
          </div>
        </div>
      )}
      {confirmCancel && (
        <div style={{ padding:'12px', borderRadius:9, background:'#D9770608', border:'1px solid #D9770620', marginBottom:8 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#D97706', marginBottom:6, display:'flex', alignItems:'center', gap:6 }}>
            <AlertTriangle size={13} /> Cancel this ride?
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => setConfirmCancel(false)} className="dd-action-btn dd-ghost" style={{ flex:1, justifyContent:'center' }}>Keep it</button>
            <button onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending} className="dd-action-btn dd-danger" style={{ flex:1, justifyContent:'center', color:'#D97706', borderColor:'#D9770630', background:'#D9770610' }}>
              {cancelMutation.isPending ? 'Cancelling…' : 'Yes, cancel'}
            </button>
          </div>
        </div>
      )}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        <button onClick={e => { e.stopPropagation(); navigate(`/rides/${ride.rideId}/edit`); }}
          className="dd-action-btn dd-ghost"><Pencil size={12} /> Edit</button>
        <button onClick={e => { e.stopPropagation(); setConfirmCancel(true); setConfirmDelete(false); }}
          className="dd-action-btn" style={{ background:'#D9770608', color:'#D97706', border:'1px solid #D9770625' }}>
          <Ban size={12} /> Cancel
        </button>
        <button onClick={e => { e.stopPropagation(); setConfirmDelete(true); setConfirmCancel(false); }}
          className="dd-action-btn dd-danger"><Trash2 size={12} /> Delete</button>
      </div>
    </div>
  );
}

// ─── Approved passenger row ───────────────────────────────────────────────
// LOGIC UNCHANGED
function ApprovedRow({ booking }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid var(--dd-border)' }}
      className="last:border-0">
      <Avatar src={booking.passengerPhoto} name={booking.passengerName} size={28} />
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:13, fontWeight:600, color:'var(--dd-text1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{booking.passengerName}</p>
        <p style={{ fontSize:11, color:'var(--dd-text3)' }}>{booking.seatsBooked} seat{booking.seatsBooked !== 1 ? 's' : ''} · {formatCurrency(booking.totalFare)}</p>
      </div>
      <StatusBadge status={booking.status} />
    </div>
  );
}

// ─── Ride timeline card ───────────────────────────────────────────────────
// Core UI piece — ride as an expandable timeline row with countdown
function RideTimelineCard({ ride, onDecide, deciding, index }) {
  const [expanded, setExpanded] = useState(index === 0);
  const countdown = useCountdown(ride.departureTime);

  const { data, isLoading } = useQuery({
    queryKey: ['ride-bookings', ride.rideId],
    queryFn:  () => rideService.getBookingsForRide(ride.rideId).then(r => r.data.data?.content ?? []),
    refetchInterval: 8_000,
  });

  const bookings = data ?? [];
  const pending  = bookings.filter(b => b.status === 'PENDING');
  const approved = bookings.filter(b => b.status === 'APPROVED' || b.status === 'CONFIRMED');

  const isScheduled   = ride.status === 'SCHEDULED';
  const isInProgress  = ride.status === 'IN_PROGRESS';
  const isExpired     = ride.status === 'EXPIRED';
  const dotColor      = isInProgress ? '#059669' : isExpired ? '#9999AA' : isScheduled ? '#185FA5' : '#9999AA';
  const dotPulse      = isInProgress;

  return (
    <div className="dd-up" style={{ animationDelay:`${index*60}ms`, display:'flex', gap:0 }}>
      {/* Timeline rail */}
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', width:28, flexShrink:0, paddingTop:18 }}>
        {/* Dot */}
        <div style={{ position:'relative', width:10, height:10, flexShrink:0 }}>
          <div style={{ width:10, height:10, borderRadius:'50%', background:dotColor, border:`2px solid ${dotColor}30` }} />
          {dotPulse && (
            <div style={{ position:'absolute', inset:-2, borderRadius:'50%', border:`2px solid ${dotColor}`, animation:'dd-ping 1.5s cubic-bezier(0,0,.2,1) infinite' }} />
          )}
        </div>
        {/* Connector line */}
        <div style={{ flex:1, width:1.5, background:'var(--dd-border)', margin:'4px 0', minHeight:24 }} />
      </div>

      {/* Card */}
      <div style={{ flex:1, minWidth:0, marginBottom:8 }}>
        <div className="dd-card" style={{ overflow:'hidden' }}>
          {/* Header — clickable */}
          <button className="dd-row-btn" onClick={() => setExpanded(e => !e)}>
            <div style={{ padding:'16px 18px' }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>

                {/* Occupancy ring */}
                <OccupancyRing available={ride.availableSeats ?? 0} total={ride.totalSeats ?? ride.totalSeats ?? 1} size={48} />

                {/* Main info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
                    <RouteLabel from={ride.originName} to={ride.destName} />
                    {pending.length > 0 && (
                      <span style={{ display:'flex', alignItems:'center', gap:3, padding:'2px 7px', borderRadius:6, background:'#DC262610', color:'#DC2626', border:'1px solid #DC262625', fontSize:11, fontWeight:700 }}>
                        <Bell size={9} /> {pending.length}
                      </span>
                    )}
                    {isExpired && <Pill color="gray">EXPIRED</Pill>}
                    {isInProgress && <Pill color="green"><span style={{ width:5, height:5, borderRadius:'50%', background:'#059669', animation:'dd-pulse 1.5s infinite' }} /> Live</Pill>}
                  </div>

                  <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                    {/* Countdown */}
                    {isScheduled && countdown && (
                      <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, fontWeight:700, color:'#185FA5' }}>
                        <Timer size={12} /> {countdown}
                      </span>
                    )}
                    <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, color:'var(--dd-text2)' }}>
                      <Calendar size={11} />{formatDate(ride.departureTime)}
                    </span>
                    <span style={{ fontSize:12, fontWeight:600, color:'var(--dd-text2)', fontVariantNumeric:'tabular-nums' }}>
                      {formatCurrency(ride.farePerSeat)}/seat
                    </span>
                    {ride.routeDistanceM && (
                      <span style={{ fontSize:12, color:'var(--dd-text3)' }}>
                        {(ride.routeDistanceM / 1000).toFixed(1)} km
                      </span>
                    )}
                  </div>
                </div>

                {/* Expand toggle */}
                <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                  <StatusBadge status={ride.status} />
                  <ChevronDown size={16} style={{ color:'var(--dd-text3)', transform:expanded?'rotate(180deg)':'none', transition:'transform .2s' }} />
                </div>
              </div>
            </div>
          </button>

          {/* Expanded content */}
          {expanded && (
            <div style={{ borderTop:'1px solid var(--dd-border)', padding:'16px 18px' }}>

              {/* Actions */}
              <RideActionsBar ride={ride} onRideChanged={null} />

              {/* Route map */}
              {ride.originLat && (
                <div style={{ borderRadius:10, overflow:'hidden', border:'1px solid var(--dd-border)', marginBottom:16 }}>
                  <RouteMap
                    originLat={ride.originLat} originLng={ride.originLng} originName={ride.originName}
                    destLat={ride.destLat} destLng={ride.destLng} destName={ride.destName}
                    routePolyline={ride.routePolyline}
                    passengers={approved.filter(b => b.pickupLat).map(b => ({
                      pickupLat: b.pickupLat, pickupLng: b.pickupLng, pickupName: b.pickupName,
                      dropLat: b.dropLat, dropLng: b.dropLng, dropName: b.dropName,
                      passengerName: b.passengerName,
                    }))}
                    height="240px"
                  />
                </div>
              )}

              {isLoading && <div style={{ display:'flex', justifyContent:'center', padding:'16px 0' }}><Spinner /></div>}

              {/* Pending requests */}
              {!isLoading && pending.length > 0 && (
                <div style={{ marginBottom:16 }}>
                  <div className="dd-section-label" style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <Bell size={10} style={{ color:'#D97706' }} /> Pending ({pending.length})
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {pending.map(b => <BookingRequestCard key={b.bookingId} booking={b} onDecide={onDecide} deciding={deciding} />)}
                  </div>
                </div>
              )}

              {/* Approved */}
              {!isLoading && approved.length > 0 && (
                <div>
                  <div className="dd-section-label" style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <UserCheck size={10} style={{ color:'#059669' }} /> Passengers ({approved.length})
                  </div>
                  <div style={{ padding:'4px 0' }}>
                    {approved.map(b => <ApprovedRow key={b.bookingId} booking={b} />)}
                  </div>
                </div>
              )}

              {!isLoading && bookings.length === 0 && (
                <div style={{ textAlign:'center', padding:'24px 0' }}>
                  <Users size={28} style={{ color:'var(--dd-text3)', margin:'0 auto 8px' }} />
                  <p style={{ fontSize:13, color:'var(--dd-text3)' }}>No booking requests yet</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Recent ride row ──────────────────────────────────────────────────────
// LOGIC UNCHANGED
function RecentRideRow({ ride }) {
  const statusColor = ride.status === 'COMPLETED' ? '#059669' : ride.status === 'IN_PROGRESS' ? '#D97706' : 'var(--dd-text3)';
  return (
    <Link to={`/rides/${ride.rideId}`} style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderBottom:'1px solid var(--dd-border)' }}
      className="dd-row-btn last:border-0">
      <div style={{ width:8, height:8, borderRadius:'50%', background:statusColor, flexShrink:0 }} />
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:13, fontWeight:600, color:'var(--dd-text1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {ride.originName} → {ride.destName}
        </p>
        <p style={{ fontSize:11, color:'var(--dd-text3)', marginTop:2 }}>
          {formatDate(ride.departureTime)} · {formatCurrency(ride.farePerSeat)}/seat
        </p>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
        <StatusBadge status={ride.status} />
        <ArrowUpRight size={14} style={{ color:'var(--dd-text3)' }} />
      </div>
    </Link>
  );
}

// ─── Performance meter ────────────────────────────────────────────────────
function PerfMeter({ label, value, max, color }) {
  const pct = Math.min(value / max, 1);
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
        <span style={{ fontSize:12, color:'var(--dd-text2)' }}>{label}</span>
        <span style={{ fontSize:14, fontWeight:800, color:'var(--dd-text1)', fontVariantNumeric:'tabular-nums' }}>{value}</span>
      </div>
      <div style={{ height:4, borderRadius:4, background:'var(--dd-border)', overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct*100}%`, background:color, borderRadius:4, transition:'width .6s cubic-bezier(.22,1,.36,1)' }} />
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// DriverDashboard — ALL STATE, QUERIES, MUTATIONS UNCHANGED
// ═════════════════════════════════════════════════════════════════════════════
export default function DriverDashboard() {
  const { user }    = useAuth();
  const queryClient = useQueryClient();
  const [deciding, setDeciding] = useState(null);
  const [tab, setTab]   = useState('requests'); // 'requests' | 'history'

  // ── Queries (UNCHANGED) ──────────────────────────────────────────────
  const { data: ridesData, isLoading: ridesLoading } = useQuery({
    queryKey: ['my-rides'],
    queryFn:  () => rideService.getMyRides({ size: 20 }).then(r => r.data.data),
    refetchInterval: 15_000,
  });

  const allRides        = ridesData?.content ?? [];
  const scheduledRides  = allRides.filter(r => r.status === 'SCHEDULED');
  const inProgressRides = allRides.filter(r => r.status === 'IN_PROGRESS');
  const completedRides  = allRides.filter(r => r.status === 'COMPLETED');
  const expiredRides    = allRides.filter(r => r.status === 'EXPIRED');
  const totalRides      = ridesData?.totalElements ?? 0;
  const activeRides     = [...inProgressRides, ...scheduledRides];

  const { data: pendingCountData } = useQuery({
    queryKey: ['pending-bookings-count', scheduledRides.map(r => r.rideId)],
    queryFn:  async () => {
      if (!scheduledRides.length) return 0;
      const counts = await Promise.all(
        scheduledRides.map(r =>
          rideService.getBookingsForRide(r.rideId)
            .then(res => (res.data.data?.content ?? []).filter(b => b.status === 'PENDING').length)
            .catch(() => 0)
        )
      );
      return counts.reduce((a, b) => a + b, 0);
    },
    enabled: scheduledRides.length > 0,
    refetchInterval: 8_000,
  });

  const pendingTotal = pendingCountData ?? 0;

  // ── Mutations (UNCHANGED) ────────────────────────────────────────────
  const decideMutation = useMutation({
    mutationFn: ({ bookingId, approved, reason }) => bookingService.decide(bookingId, { approved, reason }),
    onMutate:   ({ bookingId }) => setDeciding(bookingId),
    onSuccess:  (_, { approved }) => {
      toast.success(approved ? 'Approved — passenger notified.' : 'Booking rejected.');
      queryClient.invalidateQueries({ queryKey: ['my-rides'] });
      queryClient.invalidateQueries({ queryKey: ['ride-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['pending-bookings-count'] });
    },
    onError:    err => toast.error(err.response?.data?.message ?? 'Action failed.'),
    onSettled:  () => setDeciding(null),
  });

  const handleDecide = useCallback((bookingId, approved, reason) => {
    decideMutation.mutate({ bookingId, approved, reason });
  }, [decideMutation]);

  // ── Greeting ─────────────────────────────────────────────────────────
  const h      = new Date().getHours();
  const period = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  const firstName = user?.fullName?.split(' ')[0] ?? 'Driver';
  const trustScore = user?.trustScore ?? 0;

  return (
    <PageLayout>
      <style>{CSS}</style>

      <div style={{ background:'var(--dd-bg)', minHeight:'100vh', padding:0 }}>
        <div style={{ maxWidth:900, margin:'0 auto', padding:'0 4px' }}>

          {/* ── Hero header ─────────────────────────────────────────── */}
          <div className="dd-up" style={{ padding:'28px 0 20px', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
            <div>
              <h1 style={{ fontSize:'clamp(22px,3vw,28px)', fontWeight:900, color:'var(--dd-text1)', letterSpacing:'-.02em', marginBottom:4 }}>
                Good {period}, {firstName}.
              </h1>
              <p style={{ fontSize:14, color:'var(--dd-text2)' }}>
                {activeRides.length > 0
                  ? `${activeRides.length} active ride${activeRides.length !== 1 ? 's' : ''} · ${pendingTotal > 0 ? `${pendingTotal} pending request${pendingTotal !== 1 ? 's' : ''}` : 'all clear'}`
                  : 'No active rides — create one to start receiving bookings.'
                }
              </p>
            </div>

            <div style={{ display:'flex', gap:8, flexShrink:0 }}>
              <button onClick={() => { queryClient.invalidateQueries({ queryKey: ['ride-bookings'] }); queryClient.invalidateQueries({ queryKey: ['pending-bookings-count'] }); }}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 14px', borderRadius:10, border:'1px solid var(--dd-border)', background:'var(--dd-surface)', fontSize:13, fontWeight:600, color:'var(--dd-text2)', cursor:'pointer', transition:'all .12s' }}
                className="dd-ghost dd-action-btn">
                <RefreshCw size={13} /> Refresh
              </button>
              <Link to="/rides/create"
                style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:10, background:'#185FA5', color:'#fff', textDecoration:'none', fontSize:13, fontWeight:700, boxShadow:'0 2px 8px rgba(24,95,165,.3)', transition:'all .12s' }}
                className="dd-primary dd-action-btn">
                <PlusCircle size={14} /> New Ride
              </Link>
            </div>
          </div>

          {/* ── Pulse strip ─────────────────────────────────────────── */}
          <div className="dd-up dd-d1" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:1, borderRadius:14, overflow:'hidden', border:'1px solid var(--dd-border)', marginBottom:24, background:'var(--dd-border)' }}>
            {[
              { value: activeRides.length,   label:'Active rides',     icon:Activity,     color:'#185FA5' },
              { value: pendingTotal,          label:'Pending requests', icon:Bell,         color:'#D97706',  badge:pendingTotal > 0 },
              { value: completedRides.length, label:'Completed',        icon:CheckCircle2, color:'#059669' },
              { value: trustScore != null ? `${Number(trustScore).toFixed(1)}★` : '—', label:'Trust score', icon:Star, color:'#7C3AED' },
            ].map((s, i) => (
              <div key={s.label} style={{ background:'var(--dd-surface)', padding:'16px', position:'relative' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                  <s.icon size={14} style={{ color:s.color }} />
                  <span style={{ fontSize:11, fontWeight:600, color:'var(--dd-text3)', letterSpacing:'.04em', textTransform:'uppercase' }}>{s.label}</span>
                  {s.badge && (
                    <span style={{ width:6, height:6, borderRadius:'50%', background:'#DC2626', animation:'dd-pulse 1.5s infinite' }} />
                  )}
                </div>
                <div style={{ fontSize:24, fontWeight:900, color:'var(--dd-text1)', letterSpacing:'-.02em', fontVariantNumeric:'tabular-nums' }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* ── Layout: main + sidebar ───────────────────────────────── */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 260px', gap:20, alignItems:'start' }}>

            {/* MAIN ──────────────────────────────────────────────────── */}
            <div>
              {/* Tab bar */}
              <div style={{ display:'flex', gap:0, marginBottom:20, border:'1px solid var(--dd-border)', borderRadius:12, overflow:'hidden', background:'var(--dd-surface)' }}>
                {[
                  { key:'requests', label:'Active Rides', icon:Activity, count:pendingTotal },
                  { key:'history',  label:'History',      icon:Clock },
                ].map((t, i) => (
                  <button key={t.key} onClick={() => setTab(t.key)}
                    style={{
                      flex:1, padding:'11px 0', border:'none', cursor:'pointer', fontSize:13, fontWeight:600,
                      display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                      transition:'all .12s',
                      background: tab === t.key ? '#185FA5' : 'transparent',
                      color: tab === t.key ? '#fff' : 'var(--dd-text2)',
                    }}>
                    <t.icon size={14} />
                    {t.label}
                    {t.count > 0 && (
                      <span style={{ padding:'1px 6px', borderRadius:10, background:'#DC2626', color:'#fff', fontSize:10, fontWeight:700 }}>
                        {t.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Requests tab */}
              {tab === 'requests' && (
                <div>
                  {ridesLoading ? (
                    <div style={{ display:'flex', justifyContent:'center', padding:'48px 0' }}><Spinner size="lg" /></div>
                  ) : activeRides.length > 0 ? (
                    <div>
                      {activeRides.map((ride, i) => (
                        <RideTimelineCard key={ride.rideId} ride={ride} onDecide={handleDecide} deciding={deciding} index={i} />
                      ))}
                      {/* Timeline end dot */}
                      <div style={{ display:'flex', gap:0 }}>
                        <div style={{ width:28, display:'flex', justifyContent:'center' }}>
                          <div style={{ width:8, height:8, borderRadius:'50%', border:'2px solid var(--dd-border)', background:'var(--dd-bg)' }} />
                        </div>
                        <div style={{ flex:1, paddingBottom:8 }}>
                          <Link to="/rides/create" className="dd-action-btn dd-primary" style={{ display:'inline-flex' }}>
                            <PlusCircle size={13} /> Schedule another ride
                          </Link>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign:'center', padding:'56px 24px', borderRadius:16, border:'1px dashed var(--dd-border)' }}>
                      <div style={{ width:52, height:52, borderRadius:14, background:'var(--dd-hover)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                        <Car size={24} style={{ color:'var(--dd-text3)' }} />
                      </div>
                      <h3 style={{ fontSize:16, fontWeight:700, color:'var(--dd-text1)', marginBottom:6 }}>No active rides</h3>
                      <p style={{ fontSize:13, color:'var(--dd-text3)', maxWidth:260, margin:'0 auto 20px', lineHeight:1.6 }}>
                        Create a ride to start receiving booking requests from passengers.
                      </p>
                      <Link to="/rides/create" className="dd-action-btn dd-primary" style={{ display:'inline-flex' }}>
                        <PlusCircle size={14} /> Create a Ride
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* History tab */}
              {tab === 'history' && (
                <div className="dd-up">
                  {/* Quick links */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
                    {[
                      { to:'/rides/create', icon:PlusCircle, label:'New Ride',    sub:'Offer seats on your next trip' },
                      { to:'/rides/my',     icon:BarChart3,  label:'All Rides',   sub:'Full history and management' },
                    ].map(a => (
                      <Link key={a.to} to={a.to} style={{ textDecoration:'none' }}>
                        <div className="dd-card" style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:12, cursor:'pointer' }}>
                          <div style={{ width:36, height:36, borderRadius:9, background:'#185FA510', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            <a.icon size={17} style={{ color:'#185FA5' }} />
                          </div>
                          <div style={{ minWidth:0 }}>
                            <p style={{ fontSize:13, fontWeight:700, color:'var(--dd-text1)' }}>{a.label}</p>
                            <p style={{ fontSize:11, color:'var(--dd-text3)' }}>{a.sub}</p>
                          </div>
                          <ArrowUpRight size={14} style={{ color:'var(--dd-text3)', marginLeft:'auto', flexShrink:0 }} />
                        </div>
                      </Link>
                    ))}
                  </div>

                  {/* Recent rides */}
                  <div className="dd-card" style={{ padding:'16px 18px' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                      <span style={{ fontSize:13, fontWeight:700, color:'var(--dd-text1)' }}>Recent rides</span>
                      <Link to="/rides/my" style={{ fontSize:12, fontWeight:600, color:'#185FA5', textDecoration:'none', display:'flex', alignItems:'center', gap:3 }}>
                        View all <ChevronRight size={13} />
                      </Link>
                    </div>
                    {ridesLoading
                      ? <div style={{ display:'flex', justifyContent:'center', padding:'20px 0' }}><Spinner /></div>
                      : allRides.length === 0
                        ? (
                          <div style={{ textAlign:'center', padding:'20px 0' }}>
                            <Clock size={24} style={{ color:'var(--dd-text3)', margin:'0 auto 8px' }} />
                            <p style={{ fontSize:13, color:'var(--dd-text3)' }}>No rides yet</p>
                          </div>
                        )
                        : allRides.slice(0, 8).map(r => <RecentRideRow key={r.rideId} ride={r} />)
                    }
                  </div>
                </div>
              )}
            </div>

            {/* SIDEBAR ───────────────────────────────────────────────── */}
            <div style={{ display:'flex', flexDirection:'column', gap:14, position:'sticky', top:24 }}>

              {/* Driver card */}
              <div className="dd-card dd-up dd-d2" style={{ padding:'18px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16, paddingBottom:14, borderBottom:'1px solid var(--dd-border)' }}>
                  <Avatar src={user?.profilePic} name={user?.fullName} size={44} />
                  <div style={{ minWidth:0 }}>
                    <p style={{ fontSize:14, fontWeight:800, color:'var(--dd-text1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.fullName ?? 'Driver'}</p>
                    <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:2 }}>
                      {user?.verified && <Pill color="green"><ShieldCheck size={9} /> Verified</Pill>}
                      <TrustScoreBadge score={user?.trustScore} />
                    </div>
                  </div>
                </div>

                {/* Performance meters */}
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  <PerfMeter label="Completed rides" value={completedRides.length} max={Math.max(totalRides, 1)} color="#059669" />
                  <PerfMeter label="Total rides" value={totalRides} max={Math.max(totalRides, 100)} color="#185FA5" />
                  {expiredRides.length > 0 && (
                    <PerfMeter label="Expired (no bookings)" value={expiredRides.length} max={Math.max(totalRides, 1)} color="#D97706" />
                  )}
                </div>

                {/* Trust score visual */}
                <div style={{ marginTop:16, paddingTop:14, borderTop:'1px solid var(--dd-border)', display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ position:'relative', width:44, height:44, flexShrink:0 }}>
                    <svg width={44} height={44} style={{ transform:'rotate(-90deg)' }}>
                      <circle cx={22} cy={22} r={18} fill="none" stroke="var(--dd-border)" strokeWidth={4} />
                      <circle cx={22} cy={22} r={18} fill="none" stroke="#7C3AED" strokeWidth={4}
                        strokeDasharray={`${(trustScore / 5) * 2 * Math.PI * 18} ${2 * Math.PI * 18}`}
                        strokeLinecap="round" />
                    </svg>
                    <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <span style={{ fontSize:11, fontWeight:800, color:'var(--dd-text1)' }}>{Number(trustScore).toFixed(1)}</span>
                    </div>
                  </div>
                  <div>
                    <p style={{ fontSize:12, fontWeight:700, color:'var(--dd-text1)' }}>Trust score</p>
                    <p style={{ fontSize:11, color:'var(--dd-text3)', marginTop:1 }}>Based on completed rides</p>
                  </div>
                </div>
              </div>

              {/* Quick actions */}
              <div className="dd-card dd-up dd-d3" style={{ padding:'14px' }}>
                <p className="dd-section-label">Quick actions</p>
                {[
                  { to:'/rides/create',       icon:PlusCircle, label:'Create ride' },
                  { to:'/driver/onboarding',  icon:ShieldCheck, label:'Verification' },
                  { to:'/rides/my',            icon:BarChart3,  label:'All my rides' },
                ].map(a => (
                  <Link key={a.to} to={a.to} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 10px', borderRadius:9, textDecoration:'none', transition:'background .12s', marginBottom:2 }}
                    onMouseEnter={e => e.currentTarget.style.background='var(--dd-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <a.icon size={14} style={{ color:'var(--dd-text2)', flexShrink:0 }} />
                    <span style={{ fontSize:13, fontWeight:600, color:'var(--dd-text1)' }}>{a.label}</span>
                    <ChevronRight size={13} style={{ color:'var(--dd-text3)', marginLeft:'auto' }} />
                  </Link>
                ))}
              </div>

              {/* Expired rides callout */}
              {expiredRides.length > 0 && (
                <div className="dd-up dd-d4" style={{ padding:'14px', borderRadius:12, background:'#D9770608', border:'1px solid #D9770620' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:6 }}>
                    <Timer size={13} style={{ color:'#D97706' }} />
                    <span style={{ fontSize:12, fontWeight:700, color:'#D97706' }}>{expiredRides.length} expired ride{expiredRides.length !== 1 ? 's' : ''}</span>
                  </div>
                  <p style={{ fontSize:11, color:'var(--dd-text2)', lineHeight:1.5 }}>
                    These rides passed their estimated arrival time with no bookings and were automatically archived.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Responsive: collapse sidebar on mobile */}
          <style>{`
            @media (max-width: 780px) {
              .dd-grid { grid-template-columns: 1fr !important; }
              .dd-sidebar { position: static !important; }
            }
          `}</style>
        </div>
      </div>
    </PageLayout>
  );
}