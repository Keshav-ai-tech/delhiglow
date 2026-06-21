import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { auth as firebaseAuth, isFirebaseClientActive } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

export default function Auth({ onLoginSuccess }) {
  const [activeTab, setActiveTab] = useState('login'); // 'login' or 'signup'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'customer', // 'customer' or 'owner'
    salonName: '',
    area: 'South Delhi',
    location: '',
    speciality: '',
    timings: '10:00 AM – 8:00 PM'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = location.state?.from || '/';

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (activeTab === 'forgot') {
        if (!formData.email) {
          setError('Please enter your email address.');
          setLoading(false);
          return;
        }

        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email })
        });
        const data = await res.json();

        if (data.success) {
          setError('');
          setSuccessMessage(data.message || 'A temporary reset password has been sent to your registered email.');
          setActiveTab('login');
        } else {
          setError(data.message || 'Failed to request password reset.');
        }
        setLoading(false);
        return;
      }

      if (activeTab === 'login') {
        if (!formData.email || !formData.password) {
          setError('Please enter both your email address and password.');
          setLoading(false);
          return;
        }

        let firebaseToken = null;
        if (isFirebaseClientActive && firebaseAuth) {
          try {
            const userCredential = await signInWithEmailAndPassword(firebaseAuth, formData.email, formData.password);
            firebaseToken = await userCredential.user.getIdToken();
          } catch (firebaseErr) {
            console.error('Firebase Auth Login Error:', firebaseErr);
            // Handle specific Firebase error codes or show messages
            let msg = firebaseErr.message;
            if (firebaseErr.code === 'auth/invalid-credential' || firebaseErr.code === 'auth/wrong-password' || firebaseErr.code === 'auth/user-not-found') {
              msg = 'Invalid email address or password.';
            }
            setError(msg);
            setLoading(false);
            return;
          }
        }

        const headers = { 'Content-Type': 'application/json' };
        if (firebaseToken) {
          headers['Authorization'] = `Bearer ${firebaseToken}`;
        }

        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers,
          body: JSON.stringify({ email: formData.email, password: formData.password })
        });
        const data = await res.json();

        if (data.success) {
          localStorage.setItem('user', JSON.stringify(data.data));
          if (onLoginSuccess) onLoginSuccess(data.data);
          
          // Redirect based on role
          if (data.data.role === 'owner' || data.data.role === 'staff') {
            navigate('/admin');
          } else {
            if (!data.data.beautyProfile) {
              navigate('/beauty-quiz?welcome=true');
            } else {
              navigate(redirectPath);
            }
          }
        } else {
          setError(data.message || 'Invalid email address or password.');
        }
      } else {
        // Sign Up
        if (!formData.name || !formData.email || !formData.password || !formData.phone || !formData.role) {
          setError('Please fill in all the required authentication fields.');
          setLoading(false);
          return;
        }

        // Additional validation if owner registration
        if (formData.role === 'owner' && !formData.salonName) {
          setError('Please provide your salon business name.');
          setLoading(false);
          return;
        }

        let firebaseToken = null;
        if (isFirebaseClientActive && firebaseAuth) {
          try {
            const userCredential = await createUserWithEmailAndPassword(firebaseAuth, formData.email, formData.password);
            firebaseToken = await userCredential.user.getIdToken();
          } catch (firebaseErr) {
            console.error('Firebase Auth Registration Error:', firebaseErr);
            let msg = firebaseErr.message;
            if (firebaseErr.code === 'auth/email-already-in-use') {
              msg = 'An account with this email address already exists.';
            } else if (firebaseErr.code === 'auth/weak-password') {
              msg = 'Password should be at least 6 characters.';
            }
            setError(msg);
            setLoading(false);
            return;
          }
        }

        const signupPayload = {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          role: formData.role,
          ...(formData.role === 'owner' && {
            salonName: formData.salonName,
            area: formData.area,
            location: formData.location || 'New Delhi',
            speciality: formData.speciality || 'Luxury Curation',
            timings: formData.timings || '10:00 AM – 8:00 PM'
          })
        };

        const headers = { 'Content-Type': 'application/json' };
        if (firebaseToken) {
          headers['Authorization'] = `Bearer ${firebaseToken}`;
        }

        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers,
          body: JSON.stringify(signupPayload)
        });
        const data = await res.json();

        if (data.success) {
          localStorage.setItem('user', JSON.stringify(data.data));
          if (onLoginSuccess) onLoginSuccess(data.data);

          // Redirect based on role
          if (data.data.role === 'owner') {
            navigate('/admin');
          } else {
            if (!data.data.beautyProfile) {
              navigate('/beauty-quiz?welcome=true');
            } else {
              navigate(redirectPath);
            }
          }
        } else {
          setError(data.message || 'Registration failed. Please try again.');
        }
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setError('Connection failure. Please check if backend API is online.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="section section-ivory" style={{ minHeight: '85vh', display: 'flex', alignItems: 'center' }}>
      <div className="jaali-pattern-bg" />
      <div className="container" style={{ position: 'relative', zIndex: 2, width: '100%' }}>
        
        <div style={{ maxWidth: '540px', margin: '0 auto' }}>
          
          {/* Card Frame */}
          <div style={{ 
            background: 'var(--white)', 
            borderRadius: 'var(--radius-md)', 
            border: '1px solid var(--glass-border)',
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden'
          }}>
            
            {/* Tab Headers */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--ivory-dark)' }}>
              <button 
                onClick={() => { setActiveTab('login'); setError(''); setSuccessMessage(''); }}
                style={{
                  flex: 1,
                  padding: '20px',
                  background: activeTab === 'login' ? 'var(--ivory)' : 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'login' ? '3px solid var(--gold)' : 'none',
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.15rem',
                  fontWeight: activeTab === 'login' ? 700 : 500,
                  cursor: 'pointer',
                  color: activeTab === 'login' ? 'var(--crimson)' : 'var(--charcoal-light)',
                  transition: 'all 0.2s'
                }}
              >
                Sign In
              </button>
              <button 
                onClick={() => { setActiveTab('signup'); setError(''); setSuccessMessage(''); }}
                style={{
                  flex: 1,
                  padding: '20px',
                  background: activeTab === 'signup' ? 'var(--ivory)' : 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'signup' ? '3px solid var(--gold)' : 'none',
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.15rem',
                  fontWeight: activeTab === 'signup' ? 700 : 500,
                  cursor: 'pointer',
                  color: activeTab === 'signup' ? 'var(--crimson)' : 'var(--charcoal-light)',
                  transition: 'all 0.2s'
                }}
              >
                Register
              </button>
            </div>

            {/* Form Content */}
            <div className="auth-card-body" style={{ padding: '36px' }}>
              
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginBottom: '8px', textAlign: 'center' }}>
                {activeTab === 'forgot' ? 'Forgot Password' : activeTab === 'login' ? 'Welcome Back' : 'Create Your Registry'}
              </h3>
              <p style={{ fontSize: '13.5px', color: 'var(--charcoal-light)', textAlign: 'center', marginBottom: '28px', fontWeight: 300 }}>
                {activeTab === 'forgot'
                  ? 'Enter your registered email address and we will email you a temporary password.'
                  : activeTab === 'login' 
                    ? 'Access your saved bookings and beauty sanctuaries in Delhi.' 
                    : 'Register now to secure premium bridal and luxury appointments.'}
              </p>

              {error && (
                <div style={{ 
                  background: '#FFF0F2', 
                  border: '1px solid rgba(122, 12, 46, 0.2)', 
                  color: 'var(--crimson)', 
                  padding: '12px 14px', 
                  borderRadius: 'var(--radius-sm)', 
                  fontSize: '13px', 
                  marginBottom: '20px' 
                }}>
                  ✕ {error}
                </div>
              )}

              {successMessage && (
                <div style={{ 
                  background: '#F4FAF6', 
                  border: '1px solid rgba(40, 167, 69, 0.2)', 
                  color: '#28a745', 
                  padding: '12px 14px', 
                  borderRadius: 'var(--radius-sm)', 
                  fontSize: '13px', 
                  marginBottom: '20px' 
                }}>
                  ✓ {successMessage}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {activeTab === 'signup' && (
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '13.5px' }}>Register As *</label>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="role"
                          value="customer"
                          checked={formData.role === 'customer'}
                          onChange={handleInputChange}
                          style={{ accentColor: 'var(--crimson)' }}
                        />
                        Customer (Book Sanctuaries)
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="role"
                          value="owner"
                          checked={formData.role === 'owner'}
                          onChange={handleInputChange}
                          style={{ accentColor: 'var(--crimson)' }}
                        />
                        Salon Partner / Owner
                      </label>
                    </div>
                  </div>
                )}

                {activeTab === 'signup' && (
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input
                      type="text"
                      name="name"
                      placeholder="Enter your name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="yourname@domain.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                {activeTab === 'signup' && (
                  <div className="form-group">
                    <label>Contact Number *</label>
                    <input
                      type="tel"
                      name="phone"
                      placeholder="+91 XXXXX XXXXX"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                )}

                {activeTab !== 'forgot' && (
                  <div className="form-group">
                    <label>Password *</label>
                    <div style={{ position: 'relative', width: '100%' }}>
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        style={{ paddingRight: '44px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          padding: '4px',
                          cursor: 'pointer',
                          color: 'var(--charcoal-light)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          outline: 'none',
                          transition: 'color 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--gold)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--charcoal-light)'}
                      >
                        {showPassword ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {activeTab === 'login' && (
                      <div style={{ textAlign: 'right', marginTop: '10px' }}>
                        <button
                          type="button"
                          onClick={() => { setActiveTab('forgot'); setError(''); setSuccessMessage(''); }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--crimson)',
                            fontSize: '13px',
                            cursor: 'pointer',
                            padding: 0,
                            fontFamily: 'inherit',
                            textDecoration: 'underline'
                          }}
                        >
                          Forgot Password?
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Vendor Business details (only if activeTab is signup and role is owner) */}
                {activeTab === 'signup' && formData.role === 'owner' && (
                  <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px dashed var(--ivory-dark)' }}>
                    <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--crimson)', marginBottom: '16px' }}>
                      ✦ Salon Business Information
                    </h4>
                    
                    <div className="form-group">
                      <label>Salon / Sanctuary Name *</label>
                      <input
                        type="text"
                        name="salonName"
                        placeholder="e.g. Royal Aura Salon"
                        value={formData.salonName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Delhi Quarter *</label>
                      <select 
                        name="area"
                        value={formData.area} 
                        onChange={handleInputChange}
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
                      <label>Address / Location *</label>
                      <input
                        type="text"
                        name="location"
                        placeholder="e.g. Connaught Place Block C, New Delhi"
                        value={formData.location}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Couture Speciality *</label>
                      <input
                        type="text"
                        name="speciality"
                        placeholder="e.g. Bridal & HD Makeup, Hair Styling"
                        value={formData.speciality}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Working Hours *</label>
                      <input
                        type="text"
                        name="timings"
                        placeholder="e.g. 10:00 AM – 8:00 PM"
                        value={formData.timings}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                )}

                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ width: '100%', justifyContent: 'center', marginTop: '24px' }}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : activeTab === 'forgot' ? 'Send Reset Password ✦' : activeTab === 'login' ? 'Sign In ✦' : 'Create Account ✦'}
                </button>
              </form>
              {activeTab === 'forgot' && (
                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('login'); setError(''); setSuccessMessage(''); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--crimson)',
                      fontSize: '13.5px',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      textDecoration: 'underline'
                    }}
                  >
                    Back to Sign In
                  </button>
                </div>
              )}
            </div>

          </div>
          
          {/* Quick Links for Owners/Staff/Customers */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '16px', 
            marginTop: '20px', 
            fontSize: '13px' 
          }}>
            <Link to="/about" style={{ color: 'var(--charcoal-light)', textDecoration: 'none', transition: 'color 0.2s', fontWeight: 300 }} onMouseEnter={e => e.target.style.color = 'var(--gold)'} onMouseLeave={e => e.target.style.color = 'var(--charcoal-light)'}>Our Story</Link>
            <span style={{ color: 'var(--ivory-dark)' }}>•</span>
            <Link to="/partner" style={{ color: 'var(--charcoal-light)', textDecoration: 'none', transition: 'color 0.2s', fontWeight: 300 }} onMouseEnter={e => e.target.style.color = 'var(--gold)'} onMouseLeave={e => e.target.style.color = 'var(--charcoal-light)'}>Partner With Us</Link>
            <span style={{ color: 'var(--ivory-dark)' }}>•</span>
            <Link to="/contact" style={{ color: 'var(--charcoal-light)', textDecoration: 'none', transition: 'color 0.2s', fontWeight: 300 }} onMouseEnter={e => e.target.style.color = 'var(--gold)'} onMouseLeave={e => e.target.style.color = 'var(--charcoal-light)'}>Contact Support</Link>
          </div>

        </div>

      </div>
    </section>
  );
}
