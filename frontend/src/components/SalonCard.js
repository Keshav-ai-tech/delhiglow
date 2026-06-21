import React from 'react';
import { Link } from 'react-router-dom';

export default function SalonCard({ salon }) {
  return (
    <Link to={`/salon/${salon.id}`} className="salon-card">
      <div className="salon-card-image-wrapper">
        <img
          className="salon-card-img"
          src={salon.image || (salon.images && salon.images.length > 0 ? salon.images[0] : '')}
          alt={salon.name}
          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600'; }}
        />
        <div className="salon-card-overlay" />
        <span className="gold-badge salon-card-badge">{salon.speciality}</span>
        {salon.match_pct && (
          <span className="gold-badge match-pct-badge" style={{ position: 'absolute', top: '18px', left: '18px', zIndex: 2, background: 'var(--crimson)', color: 'var(--white)', padding: '6px 12px', borderRadius: '50px', fontSize: '11.5px', fontWeight: 600, border: '1px solid rgba(255,255,255,0.25)', boxShadow: '0 4px 10px rgba(0,0,0,0.15)' }}>
            ✨ {salon.match_pct}% Match
          </span>
        )}
      </div>
      
      <div className="salon-card-body">
        <div className="salon-card-top">
          <div className="salon-card-name">{salon.name}</div>
          <div className="salon-card-price">Starting from ₹{(salon.starting_price || 0).toLocaleString('en-IN')}</div>
        </div>
        
        <div className="salon-card-location">
          <span>📍</span> {salon.location}
        </div>
        
        {salon.owner_name && (
          <div className="salon-card-owner">
            <span>👑</span> Director: {salon.owner_name}
          </div>
        )}
        
        <div className="salon-card-rating">
          <span className="star">★</span>
          <span className="salon-card-rating-num">{salon.rating}</span>
          <span style={{ color: 'var(--charcoal-light)', fontSize: '13px', fontWeight: 300 }}>
            ({salon.reviews} reviews)
          </span>
          <span style={{ marginLeft: 'auto', fontWeight: 600, color: 'var(--gold)', fontSize: '13px' }}>
            {salon.price_range}
          </span>
        </div>
        
        <div className="salon-card-tags">
          {salon.tags.map(tag => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>
      </div>
    </Link>
  );
}
