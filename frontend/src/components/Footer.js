import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (email.trim()) {
      try {
        const res = await fetch('/api/newsletters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (data.success) {
          setSubscribed(true);
          setEmail('');
        }
      } catch (err) {
        console.error('Newsletter subscription error:', err);
      }
    }
  };

  return (
    <footer className="luxury-footer">
      <div className="footer-pattern-bg" />
      <div className="footer-inner">
        
        {/* Column 1: Brand details */}
        <div className="footer-brand-col">
          <div className="footer-brand-name">
            <span style={{ color: 'var(--gold)', marginRight: '6px', fontStyle: 'normal' }}>❀</span>
            Delhi<span style={{ color: 'var(--gold)', fontStyle: 'italic', fontWeight: 400 }}>Glow</span>
          </div>
          <p className="footer-brand-desc">
            Delhi's premier sanctuary of luxury bridal and wellness curations. Connecting the capital's finest beauty artisans to bring you a ritual of absolute adornment.
          </p>
          <div className="footer-social-links">
            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="footer-social-link">
              <span className="social-star">✦</span> Instagram
            </a>
            <a href="https://pinterest.com" target="_blank" rel="noreferrer" className="footer-social-link">
              <span className="social-star">✦</span> Pinterest
            </a>
          </div>
        </div>

        {/* Column 2: Selection Directory */}
        <div className="footer-col">
          <h4>The Selection</h4>
          <ul>
            <li><Link to="/salons">All Sanctuaries</Link></li>
            <li><Link to="/salons?tag=Bridal">Bridal Couture</Link></li>
            <li><Link to="/salons?tag=Luxury">Luxury Salons</Link></li>
            <li><Link to="/salons?tag=Spa">Spas & Wellness</Link></li>
          </ul>
        </div>

        {/* Column 3: Sanctuary Registry */}
        <div className="footer-col">
          <h4>Sanctuary Registry</h4>
          <ul>
            <li><Link to="/about">Our Story</Link></li>
            <li><Link to="/partner">Partner With Us</Link></li>
            <li><Link to="/contact">Contact Support</Link></li>
            <li><Link to="/admin" style={{ opacity: 0.85, borderBottom: '1px dotted rgba(212, 175, 55, 0.4)', paddingBottom: '2px' }}>Admin Dashboard</Link></li>
          </ul>
        </div>

        {/* Column 4: Newsletter */}
        <div className="footer-newsletter-col">
          <h4>The Gazette</h4>
          <p className="newsletter-desc">
            Subscribe to receive exclusive curation invitations and bridal wellness notes.
          </p>
          {subscribed ? (
            <div className="newsletter-success">
              <span style={{ color: 'var(--gold)', fontSize: '1.25rem' }}>❀</span> Welcome to the Curation
            </div>
          ) : (
            <form className="footer-newsletter-form" onSubmit={handleSubscribe}>
              <input 
                type="email" 
                placeholder="Enter email address" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                required 
              />
              <button type="submit">Join</button>
            </form>
          )}
        </div>

      </div>

      {/* Footer Bottom copyright bar */}
      <div className="footer-bottom">
        <span>© 2026 DelhiGlow. Crafted with precision for SuperXgen Buildathon.</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          Made with <span className="footer-heart">♥</span> in Delhi NCR
        </span>
      </div>
    </footer>
  );
}
