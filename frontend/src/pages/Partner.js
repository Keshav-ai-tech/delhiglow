import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Partner() {
  const [formData, setFormData] = useState({ name: '', salonName: '', area: 'South Delhi', contact: '', email: '' });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        setError(data.message || 'Failed to submit partner application.');
      }
    } catch (err) {
      console.error('Partner submission error:', err);
      setError('Connection failure. Please check if backend API is online.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="section section-ivory" style={{ minHeight: '80vh' }}>
      <div className="jaali-pattern-bg" />
      <div className="container" style={{ position: 'relative', zIndex: 2 }}>
        
        <div className="filter-section-header">
          <h1 className="section-title">List Your <span>Sanctuary</span></h1>
          <p className="section-sub">
            Join Delhi's most prestigious network of luxury beauty and bridal studios.
          </p>
        </div>

        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          {submitted ? (
            <div className="luxury-card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>❀</div>
              <h2 style={{ marginBottom: '12px' }}>Application Received</h2>
              <p style={{ color: 'var(--charcoal-light)', fontWeight: 300, marginBottom: '24px' }}>
                Thank you for your interest. Our curation concierge will visit your studio in Delhi NCR within 48 hours to inspect standard compliance.
              </p>
              <button className="btn-primary" onClick={() => { setSubmitted(false); setFormData({ name: '', salonName: '', area: 'South Delhi', contact: '', email: '' }); }}>Submit Another Salon</button>
            </div>
          ) : (
            <div className="luxury-card">
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: '8px', textAlign: 'center' }}>
                Partner Concierge Application
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--charcoal-light)', textAlign: 'center', marginBottom: '32px', fontWeight: 300 }}>
                List your business and connect with premium, high-intent clients looking for your specific craft.
              </p>

              {error && (
                <div style={{ 
                  background: '#FFF0F2', 
                  border: '1px solid rgba(122, 12, 46, 0.2)', 
                  color: 'var(--crimson)', 
                  padding: '12px 14px', 
                  borderRadius: 'var(--radius-sm)', 
                  fontSize: '13.5px', 
                  marginBottom: '20px' 
                }}>
                  ✕ {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Owner / Director Name *</label>
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Salon / Studio Name *</label>
                  <input
                    type="text"
                    placeholder="Enter registered business name"
                    value={formData.salonName}
                    onChange={e => setFormData({ ...formData, salonName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Delhi Quarter *</label>
                  <select 
                    value={formData.area} 
                    onChange={e => setFormData({ ...formData, area: e.target.value })}
                    required
                  >
                    <option value="South Delhi">South Delhi</option>
                    <option value="West Delhi">West Delhi</option>
                    <option value="Central Delhi">Central Delhi</option>
                    <option value="North Delhi">North Delhi</option>
                    <option value="East Delhi">East Delhi</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Contact Number *</label>
                  <input
                    type="tel"
                    placeholder="+91 XXXXX XXXXX"
                    value={formData.contact}
                    onChange={e => setFormData({ ...formData, contact: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Business Email *</label>
                  <input
                    type="email"
                    placeholder="studio@domain.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '16px' }} disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit Curation Request ✦'}
                </button>
              </form>

              <div style={{ marginTop: '24px', borderTop: '1px dashed var(--ivory-dark)', paddingTop: '20px', textAlign: 'center' }}>
                <p style={{ fontSize: '13.5px', color: 'var(--charcoal-light)', margin: 0, fontWeight: 300 }}>
                  Ready to onboard your business immediately?{' '}
                  <Link to="/auth" style={{ color: 'var(--gold)', fontWeight: 500, textDecoration: 'none' }}>
                    Create Owner Account ➔
                  </Link>
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </section>
  );
}
