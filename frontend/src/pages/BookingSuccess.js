import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';

function ConfettiEffect() {
  const [pieces, setPieces] = useState([]);

  useEffect(() => {
    const colors = ['#D4AF37', '#7A0C2E', '#F4E4BC', '#FFFDF9', '#9C1F45'];
    const list = Array.from({ length: 45 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 3}s`,
      duration: `${2.5 + Math.random() * 3}s`,
      size: `${5 + Math.random() * 8}px`,
      color: colors[Math.floor(Math.random() * colors.length)]
    }));
    setPieces(list);
  }, []);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 1 }}>
      {pieces.map(p => (
        <div
          key={p.id}
          className="confetti"
          style={{
            left: p.left,
            animationDelay: p.delay,
            animationDuration: p.duration,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '0'
          }}
        />
      ))}
    </div>
  );
}

export default function BookingSuccess() {
  const { state } = useLocation();
  const booking = state?.booking;
  const salon = state?.salon;

  const savedUser = localStorage.getItem('user');
  const loggedIn = !!savedUser;

  return (
    <div className="success-page">
      <ConfettiEffect />
      
      <div className="success-card" style={{ zIndex: 2 }}>
        <div className="success-icon">❀</div>
        <h2>Booking Confirmed</h2>
        <p>Your adornment session has been registered. DelhiGlow looks forward to welcoming you.</p>

        {booking ? (
          <div style={{ 
            background: 'var(--ivory-dark)', 
            borderRadius: 'var(--radius-sm)', 
            padding: '24px', 
            textAlign: 'left', 
            marginBottom: '32px',
            border: '1px dashed rgba(212, 175, 55, 0.3)'
          }}>
            <div style={{ display: 'grid', gap: '12px', fontSize: '14.5px' }}>
              {[
                ['Sanctuary', salon?.name || 'N/A'],
                ['Ritual Services', booking.service],
                ['Duration', booking.duration || 'N/A'],
                ['Total Price', booking.price ? `₹${booking.price.toLocaleString('en-IN')}` : 'N/A'],
                ['Preferred Date', booking.date],
                ['Preferred Time', booking.time],
                ['Guest Name', booking.name],
                ['Contact Number', booking.phone],
                ['Registry ID', `#${booking.id}`],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(212, 175, 55, 0.05)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--charcoal-light)', fontWeight: 300 }}>{label}</span>
                  <strong style={{ fontWeight: 600, color: 'var(--charcoal)', textAlign: 'right' }}>{value}</strong>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ padding: '20px', background: 'var(--ivory-dark)', borderRadius: 'var(--radius-sm)', marginBottom: '32px', fontSize: '14px', fontStyle: 'italic' }}>
            No booking details found. If you just booked, your slot is confirmed.
          </div>
        )}

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {loggedIn ? (
            <Link to="/profile" className="btn-primary">View My Bookings</Link>
          ) : (
            <Link to="/" className="btn-primary">Return to Court</Link>
          )}
          <Link to="/salons" className="btn-outline">Explore More</Link>
        </div>
      </div>
    </div>
  );
}
