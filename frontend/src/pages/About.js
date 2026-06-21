import React from 'react';

export default function About() {
  return (
    <section className="section section-ivory" style={{ minHeight: '80vh' }}>
      <div className="jaali-pattern-bg" />
      <div className="container" style={{ position: 'relative', zIndex: 2 }}>
        
        <div className="filter-section-header">
          <h1 className="section-title">Our <span>Story</span></h1>
          <p className="section-sub">
            The heritage of adornment, rooted in the capital's timeless grace.
          </p>
        </div>

        <div className="luxury-card" style={{ maxWidth: '850px', margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: '20px', borderLeft: '4px solid var(--crimson)', paddingLeft: '14px' }}>
            Bridal Grandeur & Modern Indulgence
          </h2>
          <p style={{ marginBottom: '24px', fontSize: '16px', fontWeight: 300 }}>
            Delhi's wedding industry is a symphony of colors, heritage, and absolute celebration. From the exquisite gold embroidery of Chandni Chowk lehengas to the grand celebrations in South Delhi farmhouses, adornment is a sacred ritual. 
          </p>
          <p style={{ marginBottom: '24px', fontSize: '16px', fontWeight: 300 }}>
            Founded in 2026, **DelhiGlow** was created to bring order and premium curation to this high-intent, high-value ecosystem. We believe that booking your bridal look or a luxury spa day should not be stressful. It should feel like stepping into a sanctuary of self-care.
          </p>
          
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: '20px', borderLeft: '4px solid var(--crimson)', paddingLeft: '14px', marginTop: '40px' }}>
            Our Curated Standard
          </h2>
          <p style={{ marginBottom: '24px', fontSize: '16px', fontWeight: 300 }}>
            We do not list every salon in the city. Every partner in the DelhiGlow network is rigorously verified and held to a high rating benchmark:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginTop: '8px' }}>
            <div style={{ background: 'var(--ivory)', padding: '24px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✦</div>
              <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', marginBottom: '6px' }}>4.7+ Rating Standard</h4>
              <p style={{ fontSize: '13.5px', color: 'var(--charcoal-light)' }}>Only salons checked and approved by real brides are featured.</p>
            </div>
            <div style={{ background: 'var(--ivory)', padding: '24px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>❀</div>
              <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', marginBottom: '6px' }}>Authentic Pricing</h4>
              <p style={{ fontSize: '13.5px', color: 'var(--charcoal-light)' }}>No hidden fees. Every service package features transparent rates.</p>
            </div>
            <div style={{ background: 'var(--ivory)', padding: '24px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✨</div>
              <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', marginBottom: '6px' }}>Sanitised Studios</h4>
              <p style={{ fontSize: '13.5px', color: 'var(--charcoal-light)' }}>Premium luxury standards for absolute peace of mind.</p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
