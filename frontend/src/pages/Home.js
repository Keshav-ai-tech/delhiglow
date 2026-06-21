import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import SalonCard from '../components/SalonCard';

function MograPetals() {
  const [petals, setPetals] = useState([]);

  useEffect(() => {
    // Generate 18 random petals
    const newPetals = Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 12}s`,
      duration: `${10 + Math.random() * 10}s`,
      scale: 0.4 + Math.random() * 0.8,
      opacity: 0.3 + Math.random() * 0.6
    }));
    setPetals(newPetals);
  }, []);

  return (
    <div className="petals-container">
      {petals.map(p => (
        <div
          key={p.id}
          className="mogra-petal"
          style={{
            left: p.left,
            animationDelay: p.delay,
            animationDuration: p.duration,
            transform: `scale(${p.scale})`,
            opacity: p.opacity
          }}
        />
      ))}
    </div>
  );
}

export default function Home() {
  const [salons, setSalons] = useState([]);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/salons?sort=rating')
      .then(r => r.json())
      .then(d => setSalons(d.data || []));
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const trimmed = search.trim();
    if (!trimmed) {
      navigate('/salons');
      return;
    }

    const AREAS = ['South Delhi', 'West Delhi', 'Central Delhi', 'North Delhi', 'East Delhi'];
    const TAGS = ['Bridal', 'Luxury', 'Spa', 'Hair', 'Skin', 'Nail Art', 'Affordable'];

    const matchedArea = AREAS.find(a => a.toLowerCase() === trimmed.toLowerCase());
    const matchedTag = TAGS.find(t => t.toLowerCase() === trimmed.toLowerCase());

    if (matchedArea) {
      navigate(`/salons?area=${encodeURIComponent(matchedArea)}`);
    } else if (matchedTag) {
      navigate(`/salons?tag=${encodeURIComponent(matchedTag)}`);
    } else {
      navigate(`/salons?search=${encodeURIComponent(trimmed)}`);
    }
  };

  const featured = salons.filter(s => s.rating >= 4.7);
  const areas = ['South Delhi', 'West Delhi', 'Central Delhi', 'North Delhi', 'East Delhi'];

  return (
    <>
      {/* Immersive Petals and Hero */}
      <section className="hero">
        <MograPetals />
        <div className="hero-overlay" />
        <div className="hero-content">
          <div className="hero-eyebrow">Delhi NCR's Finest Bridal & Beauty Sanctuaries</div>
          <h1>
            Your Beauty, Our City's <span>Majestic Rhythm</span>
          </h1>
          <p className="hero-sub">
            Step into a sanctuary of bespoke bridal artistry and luxury wellness. Handpicked, verified salons crafted for your most grand moments.
          </p>
          
          <form className="hero-search" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Search by salon name, area, or speciality (e.g. Bridal)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button type="submit">Discover</button>
          </form>

          <div className="hero-stats">
            <div className="hero-stat"><strong>50+</strong><span>Verified Salons</span></div>
            <div className="hero-stat"><strong>2,500+</strong><span>Delhi Brides Glowed</span></div>
            <div className="hero-stat"><strong>4.9★</strong><span>Couture Excellence</span></div>
          </div>
        </div>
      </section>

      {/* Instagram Story Previews */}
      <div className="stories-section">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
              ✦ Live Adornment Previews
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Tap to view
            </span>
          </div>
          {salons.length === 0 ? (
            <div style={{ height: '80px', display: 'flex', alignItems: 'center' }}>Loading stories...</div>
          ) : (
            <div className="stories-container">
              {salons.map(s => (
                <Link key={s.id} to={`/salon/${s.id}`} className="story-item">
                  <div className="story-ring">
                    <img 
                      src={s.image || (s.images && s.images.length > 0 ? s.images[0] : '')} 
                      alt={s.name} 
                      className="story-avatar" 
                      onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=200'; }} 
                    />
                  </div>
                  <span className="story-label">{s.name.replace(' Salon & Spa', '').replace(' Bridal Studio', '').replace(' Bridal Lounge', '').replace(' Beauty Bar', '')}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Browse by Area */}
      <section className="section section-ivory">
        <div className="jaali-pattern-bg" />
        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          <h2 className="section-title">
            Discover by <span>Capital Quarters</span>
          </h2>
          <p className="section-sub">
            From the elegant boutiques of South Delhi to the vibrant lanes of Connaught Place, find the perfect beauty sanctuary near you.
          </p>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '-10px', justifyContent: 'center' }}>
            {areas.map(area => (
              <button
                key={area}
                className="filter-btn"
                onClick={() => navigate(`/salons?area=${encodeURIComponent(area)}`)}
                style={{ padding: '12px 28px', fontSize: '14px', borderRadius: '50px' }}
              >
                {area}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Top Rated / Featured Section */}
      <section className="section" style={{ background: '#FFFFFF' }}>
        <div className="container">
          <h2 className="section-title">
            The <span>Elite Selection</span>
          </h2>
          <p className="section-sub">
            Delhi's highest-rated beauty destinations, renowned for bridal couture and luxurious relaxation.
          </p>
          {salons.length === 0 ? (
            <div className="loading">Arranging the vanity...</div>
          ) : (
            <div className="salons-grid">
              {featured.map(salon => <SalonCard key={salon.id} salon={salon} />)}
            </div>
          )}
          <div style={{ textAlign: 'center', marginTop: '56px' }}>
            <button className="btn-primary" onClick={() => navigate('/salons')}>
              Browse All Sanctuaries &nbsp;➔
            </button>
          </div>
        </div>
      </section>

      {/* How it Works / Ritual Steps */}
      <section className="section section-ivory" id="how-it-works">
        <div className="jaali-pattern-bg" />
        <div className="container" style={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
          <h2 className="section-title" style={{ textAlign: 'center' }}>
            Your Beauty <span>Ritual</span>
          </h2>
          <p className="section-sub" style={{ margin: '0 auto 56px', textAlign: 'center' }}>
            Because you deserve a detailed adornment, not just an appointment.
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '36px', marginTop: '16px' }}>
            {[
              { 
                step: 'I', 
                icon: '🔍', 
                title: 'Behold & Filter', 
                desc: 'Explore Delhi\'s finest by quarter, rating, or specific adornment tags.' 
              },
              { 
                step: 'II', 
                icon: '💄', 
                title: 'Select Your Sanctuary', 
                desc: 'Delve into bridal portfolios, services, transparent pricing, and trusted reviews.' 
              },
              { 
                step: 'III', 
                icon: '📅', 
                title: 'Secure the Booking', 
                desc: 'Reserve your date and timing. Receive instantaneous confirmation.' 
              },
            ].map(item => (
              <div 
                key={item.step} 
                style={{ 
                  padding: '40px 28px', 
                  background: 'var(--white)', 
                  borderRadius: 'var(--radius-md)', 
                  boxShadow: 'var(--shadow-sm)',
                  border: '1px solid var(--glass-border)',
                  textAlign: 'left'
                }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>{item.icon}</div>
                <div style={{ color: 'var(--gold)', fontWeight: 600, fontSize: '11px', letterSpacing: '2px', marginBottom: '8px' }}>
                  PHASE {item.step}
                </div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', marginBottom: '10px', fontWeight: 700 }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--charcoal-light)', lineHeight: '1.6' }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
