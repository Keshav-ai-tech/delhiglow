import React, { useState } from 'react';

export default function Contact() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: 'General Query', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        setError(data.message || 'Failed to send message.');
      }
    } catch (err) {
      console.error('Contact submission error:', err);
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
          <h1 className="section-title">Contact <span>Concierge</span></h1>
          <p className="section-sub">
            Our luxury help desk is here to assist you with bespoke bookings or general inquiries.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '40px', maxWidth: '950px', margin: '0 auto' }}>
          {/* Info Card */}
          <div className="luxury-card">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginBottom: '20px' }}>
              Head Office
            </h3>
            <p style={{ fontSize: '15px', fontWeight: 300, marginBottom: '24px', lineHeight: '1.8' }}>
              📍 **DelhiGlow Support Desk**  
              LGF, Connaught Place Block E,  
              New Delhi, Delhi 110001
            </p>
            
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginBottom: '16px' }}>
              Inquiries
            </h3>
            <p style={{ fontSize: '15px', fontWeight: 300, marginBottom: '16px' }}>
              📞 **Phone:** +91 11 4321 8765  
            </p>
            <p style={{ fontSize: '15px', fontWeight: 300, marginBottom: '16px' }}>
              ✉ **Support:** support@delhiglow.com  
            </p>
            <p style={{ fontSize: '15px', fontWeight: 300 }}>
              ✉ **Curation:** partners@delhiglow.com  
            </p>
          </div>

          {/* Form Card */}
          <div className="luxury-card">
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✓</div>
                <h3 style={{ marginBottom: '10px' }}>Message Dispatched</h3>
                <p style={{ color: 'var(--charcoal-light)', fontWeight: 300, fontSize: '14.5px' }}>
                  Your inquiry has been successfully sent to our support team. We will respond within 12 hours.
                </p>
                <button className="btn-outline" style={{ marginTop: '24px' }} onClick={() => { setSubmitted(false); setFormData({ name: '', email: '', subject: 'General Query', message: '' }); }}>Send Another Message</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', marginBottom: '24px', textAlign: 'center' }}>
                  Write to Us
                </h3>
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
                <div className="form-group">
                  <label>Your Name *</label>
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    placeholder="yourname@domain.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Subject</label>
                  <select 
                    value={formData.subject} 
                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                  >
                    <option value="General Query">General Query</option>
                    <option value="Bridal Booking Help">Bridal Booking Help</option>
                    <option value="Partnership Details">Partnership Details</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Message *</label>
                  <textarea
                    placeholder="Type your message..."
                    value={formData.message}
                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                    required
                    style={{ 
                      width: '100%', 
                      height: '110px', 
                      padding: '12px 14px', 
                      border: '1.5px solid var(--ivory-dark)', 
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--ivory)',
                      outline: 'none',
                      fontFamily: 'var(--font-body)',
                      fontSize: '14.5px'
                    }}
                  />
                </div>
                <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }} disabled={loading}>
                  {loading ? 'Sending...' : 'Send Message ➔'}
                </button>
              </form>
            )}
          </div>
        </div>

      </div>
    </section>
  );
}
