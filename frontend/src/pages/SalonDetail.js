import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const TIME_SLOTS = ['10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM'];

export default function SalonDetail({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Slider states and refs
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const sliderRef = React.useRef(null);

  // AI Lehenga-to-Look Stylist states
  const [selectedLehengaImage, setSelectedLehengaImage] = useState(null);
  const [selectedJewelry, setSelectedJewelry] = useState('Polki & Kundan Gold');
  const [aiStylingLoading, setAiStylingLoading] = useState(false);
  const [aiStylingResult, setAiStylingResult] = useState(null);
  const [aiStylingError, setAiStylingError] = useState('');

  const handleLehengaUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.match('image.*')) {
      alert('Please upload a valid JPEG, PNG, or WEBP image of your lehenga.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const max_size = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > max_size) {
            height *= max_size / width;
            width = max_size;
          }
        } else {
          if (height > max_size) {
            width *= max_size / height;
            height = max_size;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        setSelectedLehengaImage(compressedBase64);
        setAiStylingResult(null);
        setAiStylingError('');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleStylingAnalysis = async () => {
    if (!selectedLehengaImage) {
      setAiStylingError('Please upload a lehenga photo first.');
      return;
    }

    setAiStylingLoading(true);
    setAiStylingError('');
    setAiStylingResult(null);

    try {
      const res = await fetch('/api/ai/styling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: selectedLehengaImage,
          jewelry: selectedJewelry,
          salonId: salon.id
        })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setAiStylingResult(data.data);
      } else {
        setAiStylingError(data.message || 'AI Styling failed. Please try again.');
      }
    } catch {
      setAiStylingError('Network error. Please try again.');
    } finally {
      setAiStylingLoading(false);
    }
  };

  const handleScroll = () => {
    if (sliderRef.current) {
      const scrollLeft = sliderRef.current.scrollLeft;
      const width = sliderRef.current.offsetWidth;
      if (width > 0) {
        const newIndex = Math.round(scrollLeft / width);
        setActiveSlideIndex(newIndex);
      }
    }
  };

  const handleDotClick = (idx) => {
    if (sliderRef.current) {
      const width = sliderRef.current.offsetWidth;
      sliderRef.current.scrollTo({
        left: idx * width,
        behavior: 'smooth'
      });
      setActiveSlideIndex(idx);
    }
  };

  const getSalonImages = (salonObj) => {
    if (!salonObj) return [];
    let list = [];
    
    // Add cover image first if it exists
    if (salonObj.image) {
      list.push(salonObj.image);
    }
    
    // Add other photos, avoiding duplicating the cover image
    if (salonObj.photos && salonObj.photos.length > 0) {
      salonObj.photos.forEach(photo => {
        if (photo && !list.includes(photo)) {
          list.push(photo);
        }
      });
    }
    
    // Fallbacks
    const fallbackImages = [
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200',
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1200',
      'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=1200'
    ];
    
    let fallbackIdx = 0;
    while (list.length < 3 && fallbackIdx < fallbackImages.length) {
      const fallback = fallbackImages[fallbackIdx];
      if (!list.includes(fallback)) {
        list.push(fallback);
      }
      fallbackIdx++;
    }
    return list;
  };

  // Salon and Booking states
  const [salon, setSalon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedServices, setSelectedServices] = useState([]);
  const [booking, setBooking] = useState({ name: '', phone: '', email: '', date: '', time: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isDateClosed = (dateStr) => {
    if (!dateStr || !salon || !salon.closed_on) return false;
    const closedLower = salon.closed_on.toLowerCase().trim();
    if (closedLower === 'none' || closedLower === '') return false;

    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = daysOfWeek[d.getDay()];
      return closedLower.includes(dayName);
    } catch (e) {
      return false;
    }
  };

  // Reviews states
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(5.0);
  const [reviewsCount, setReviewsCount] = useState(0);
  const [isEligible, setIsEligible] = useState(false);
  const [eligibleBookingId, setEligibleBookingId] = useState(null);
  const [eligibilityMessage, setEligibilityMessage] = useState('');
  
  // Review form states
  const [userRating, setUserRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewPhotos, setReviewPhotos] = useState([]);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');

  const savedUser = localStorage.getItem('user');
  const loggedIn = !!savedUser;
  const userObj = loggedIn ? JSON.parse(savedUser) : null;

  const fetchReviews = () => {
    fetch(`/api/reviews/salon/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setReviews(d.data || []);
          setAvgRating(d.averageRating);
          setReviewsCount(d.count);
        }
      })
      .catch(err => console.error('Failed to load reviews:', err));
  };

  useEffect(() => {
    // Redirect owner/staff if trying to access other salons
    if (user && (user.role === 'owner' || user.role === 'staff')) {
      if (parseInt(id) !== parseInt(user.salon_id)) {
        navigate('/admin');
        return;
      }
    }

    // Fetch Salon Details
    fetch(`/api/salons/${id}`)
      .then(r => r.json())
      .then(d => { 
        setSalon(d.data); 
        setLoading(false); 
      })
      .catch(() => setLoading(false));

    // Fetch Reviews
    fetchReviews();

    // Pre-fill booking fields if a user session is active
    if (loggedIn && userObj) {
      setBooking(prev => ({
        ...prev,
        name: userObj.name || '',
        email: userObj.email || '',
        phone: userObj.phone || ''
      }));

      // Check review eligibility
      if (userObj.role === 'customer') {
        fetch(`/api/reviews/check-eligibility/${id}`, {
          headers: { 'Authorization': `Bearer ${userObj.token}` }
        })
          .then(r => r.json())
          .then(d => {
            setIsEligible(d.eligible);
            setEligibleBookingId(d.booking_id || null);
            setEligibilityMessage(d.message || '');
          })
          .catch(err => console.error('Error checking review eligibility:', err));
      }
    }
  }, [id, loggedIn]);

  // Reset selected time slot if preferred date falls on a closed day
  useEffect(() => {
    if (booking.date && isDateClosed(booking.date)) {
      setBooking(prev => ({ ...prev, time: '' }));
    }
  }, [booking.date]);

  // Auto-scroller for salon images
  useEffect(() => {
    if (!salon) return;
    const images = getSalonImages(salon);
    if (images.length <= 1) return;

    const timer = setTimeout(() => {
      const nextIdx = (activeSlideIndex + 1) % images.length;
      if (sliderRef.current) {
        const width = sliderRef.current.offsetWidth;
        sliderRef.current.scrollTo({
          left: nextIdx * width,
          behavior: 'smooth'
        });
        setActiveSlideIndex(nextIdx);
      }
    }, 4000);

    return () => clearTimeout(timer);
  }, [activeSlideIndex, salon]);

  const handleBook = async (e) => {
    e.preventDefault();
    setError('');

    if (!loggedIn) {
      setError('Booking requires a registered account. Please register or sign in to secure your slot.');
      return;
    }

    if (selectedServices.length === 0) { 
      setError('Please select at least one adornment service first.'); 
      return; 
    }
    if (!booking.name || !booking.phone || !booking.date || !booking.time) { 
      setError('Please fill in all the required details to secure your slot.'); 
      return; 
    }

    if (isDateClosed(booking.date)) {
      setError(`This sanctuary is closed on ${salon.closed_on}s. Please choose another date.`);
      return;
    }

    const totalCharge = selectedServices.reduce((sum, s) => sum + s.price, 0);
    const selectedServiceNames = selectedServices.map(s => s.name).join(', ');
    const combinedDuration = selectedServices.map(s => s.duration).join(', ');

    setSubmitting(true); 
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salon_id: salon.id,
          salon_name: salon.name,
          service: selectedServiceNames,
          price: totalCharge,
          duration: combinedDuration,
          ...booking
        })
      });
      const data = await res.json();
      if (data.success) {
        navigate('/booking-success', { state: { booking: data.data, salon } });
      } else {
        setError(data.message || 'Booking failed. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Client side image compression and optimization using canvas
  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    if (reviewPhotos.length + files.length > 2) {
      alert('You can upload a maximum of 2 photos.');
      return;
    }

    files.forEach(file => {
      if (!file.type.match('image.*')) {
        alert('Only JPEG, PNG, or WEBP image formats are supported.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Compress using canvas to ensure small size (e.g. max 900px wide)
          const canvas = document.createElement('canvas');
          const max_size = 900;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > max_size) {
              height *= max_size / width;
              width = max_size;
            }
          } else {
            if (height > max_size) {
              width *= max_size / height;
              height = max_size;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Compress to JPEG with 70% quality (ideal for speed and size)
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          setReviewPhotos(prev => [...prev, compressedBase64]);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (idx) => {
    setReviewPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setReviewError('');
    setReviewSuccess('');

    if (reviewText.trim().length < 20) {
      setReviewError('Your review commentary must be at least 20 characters.');
      return;
    }

    setReviewSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userObj.token}`
        },
        body: JSON.stringify({
          salon_id: salon.id,
          booking_id: eligibleBookingId,
          rating: userRating,
          text: reviewText,
          photos: reviewPhotos
        })
      });
      const data = await res.json();
      if (data.success) {
        setReviewSuccess('Thank you! Your review has been verified and published.');
        setReviewText('');
        setReviewPhotos([]);
        setUserRating(5);
        // Refresh review list and dynamic rating totals
        fetchReviews();
        // Set eligible false since review is completed
        setIsEligible(false);
      } else {
        setReviewError(data.message || 'Failed to submit review.');
      }
    } catch {
      setReviewError('Network error. Please try again.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) return <div className="loading" style={{ paddingTop: '160px' }}>Summoning salon details...</div>;
  if (!salon) return (
    <div className="empty-state" style={{ paddingTop: '120px' }}>
      <div style={{ fontSize: '3rem', marginBottom: '16px' }}>❀</div>
      <h3>Sanctuary Not Found</h3>
      <p style={{ marginTop: '8px' }}>This specific beauty destination does not exist in our registry.</p>
    </div>
  );

  const today = new Date().toISOString().split('T')[0];

  return (
    <>
      {/* Immersive Image Slider & Overlay */}
      <div className="detail-hero-slider-wrapper">
        <div className="detail-hero-slider" ref={sliderRef} onScroll={handleScroll}>
          {getSalonImages(salon).map((imgUrl, idx) => (
            <div key={idx} className="detail-hero-slide">
              <img 
                src={imgUrl} 
                alt={`${salon.name} view ${idx + 1}`}
                onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1200'; }} 
              />
            </div>
          ))}
        </div>
        <div className="detail-hero-overlay" />
        
        {/* Slider Navigation Dots */}
        <div className="detail-hero-slider-dots">
          {getSalonImages(salon).map((_, idx) => (
            <span 
              key={idx} 
              className={`detail-hero-slider-dot ${activeSlideIndex === idx ? 'active' : ''}`}
              onClick={() => handleDotClick(idx)}
            />
          ))}
        </div>

        <div className="container" style={{ width: '100%', position: 'relative', zIndex: 3 }}>
          <div className="detail-hero-content" style={{ padding: 0 }}>
            <h1>{salon.name}</h1>
            <p>
              <span>📍 {salon.location}</span>
              <span>&nbsp;•&nbsp;</span>
              <span>⏰ Hours: {salon.timings}</span>
              {salon.owner_name && (
                <>
                  <span>&nbsp;•&nbsp;</span>
                  <span>👑 Director: {salon.owner_name}</span>
                </>
              )}
            </p>
            
            <div className="detail-tags-row">
              <span className="gold-badge" style={{ background: 'var(--gold)', color: 'var(--charcoal)', padding: '6px 16px', borderRadius: '50px', fontSize: '12.5px', fontWeight: 600 }}>
                ★ {avgRating} &nbsp;({reviewsCount} reviews)
              </span>
              <span style={{ border: '1px solid rgba(255, 255, 255, 0.25)', padding: '5px 16px', borderRadius: '50px', fontSize: '12.5px', background: 'rgba(255,255,255,0.08)' }}>
                Range: {salon.price_range}
              </span>
              {salon.tags.map(t => (
                <span key={t} className="detail-tag">{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="container">
        <div className="detail-layout" style={user && (user.role === 'owner' || user.role === 'staff') ? { gridTemplateColumns: '1fr' } : {}}>
          
          {/* Left: About & Services */}
          <div>
            {/* AI Lehenga-to-Look Stylist Section */}
            {!(user && (user.role === 'owner' || user.role === 'staff')) && (
              <div className="luxury-card ai-stylist-card" style={{ marginBottom: '40px', padding: '28px', border: '1px solid rgba(212, 175, 55, 0.35)', borderRadius: 'var(--radius-md)', background: 'var(--white)', boxShadow: 'var(--shadow-sm)' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--crimson)', borderBottom: '1px solid var(--ivory-dark)', paddingBottom: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0 }}>
                  ❀ AI Lehenga-to-Look Bridal Stylist
                </h3>
                <p style={{ fontSize: '13.5px', color: 'var(--charcoal-light)', marginBottom: '20px', fontWeight: 300, lineHeight: '1.6' }}>
                  Upload a photo of your bridal attire (lehenga/saree) and select your jewelry type. Our AI Stylist will design a curated makeup and hair brief, and match them to this sanctuary's rituals.
                </p>

                <div className="ai-stylist-grid">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Bridal Lehenga Photo *</label>
                    <div className="lehenga-upload-container" style={{ position: 'relative', border: '1.5px dashed var(--gold)', borderRadius: 'var(--radius-sm)', padding: '16px', textAlign: 'center', background: 'var(--ivory)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '140px', cursor: 'pointer' }}>
                      {selectedLehengaImage ? (
                        <>
                          <img src={selectedLehengaImage} alt="Lehenga Preview" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 'var(--radius-xs)' }} />
                          <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedLehengaImage(null); setAiStylingResult(null); }} style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer' }}>✕</button>
                        </>
                      ) : (
                        <label style={{ cursor: 'pointer', display: 'block', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '24px', marginBottom: '6px' }}>👗</span>
                          <span style={{ fontSize: '12.5px', color: 'var(--charcoal-light)' }}>Choose lehenga photo</span>
                          <input type="file" accept="image/*" onChange={handleLehengaUpload} style={{ display: 'none' }} />
                        </label>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Anticipated Jewelry Type</label>
                      <select value={selectedJewelry} onChange={e => setSelectedJewelry(e.target.value)} style={{ width: '100%' }}>
                        <option value="Polki & Kundan Gold">Polki & Kundan Gold</option>
                        <option value="Diamond & Platinum">Diamond & Platinum</option>
                        <option value="Pearls & Emerald Beads">Pearls & Emerald Beads</option>
                        <option value="Antique Temple Jewelry">Antique Temple Jewelry</option>
                        <option value="Minimalist Silver / Modern">Minimalist Silver / Modern</option>
                      </select>
                    </div>

                    <button 
                      type="button" 
                      className="btn-primary" 
                      onClick={handleStylingAnalysis} 
                      disabled={aiStylingLoading || !selectedLehengaImage}
                      style={{ width: '100%', height: '48px', justifyContent: 'center', margin: '12px 0 0 0' }}
                    >
                      {aiStylingLoading ? 'Analyzing Look...' : 'Analyze My Look ✦'}
                    </button>
                  </div>
                </div>

                {aiStylingError && (
                  <div style={{ background: '#FFF0F2', border: '1px solid rgba(122, 12, 46, 0.2)', color: 'var(--crimson)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', fontSize: '13.5px', marginBottom: '20px' }}>
                    ✕ {aiStylingError}
                  </div>
                )}

                {aiStylingResult && (
                  <div className="ai-result-box" style={{ background: 'var(--ivory)', border: '1.5px solid var(--gold)', borderRadius: 'var(--radius-sm)', padding: '20px', marginTop: '20px', animation: 'fadeIn 0.5s ease-out' }}>
                    <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--crimson)', marginBottom: '12px', borderBottom: '1px dashed rgba(212, 175, 55, 0.4)', paddingBottom: '8px', marginTop: 0 }}>
                      ✦ AI Suggested Look: <span style={{ fontWeight: 700 }}>{aiStylingResult.lookName}</span>
                    </h4>
                    
                    <div style={{ marginBottom: '12px', fontSize: '14px', lineHeight: '1.6' }}>
                      <strong>💄 Makeup & Skin:</strong> {aiStylingResult.makeupBrief}
                    </div>
                    <div style={{ marginBottom: '16px', fontSize: '14px', lineHeight: '1.6' }}>
                      <strong>💇 Hairstyle:</strong> {aiStylingResult.hairBrief}
                    </div>

                    {aiStylingResult.matchingServices && aiStylingResult.matchingServices.length > 0 && (
                      <div style={{ borderTop: '1px solid var(--ivory-dark)', paddingTop: '12px' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--charcoal-light)', display: 'block', marginBottom: '8px', letterSpacing: '0.05em' }}>
                          Matching Rituals at {salon.name}:
                        </span>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {aiStylingResult.matchingServices.map(svcName => {
                            const svc = salon.services.find(s => s.name.toLowerCase() === svcName.toLowerCase());
                            return (
                              <button
                                key={svcName}
                                type="button"
                                onClick={() => {
                                  if (svc && !(user && (user.role === 'owner' || user.role === 'staff'))) {
                                    setSelectedService(svc);
                                    const el = document.querySelector('.booking-card');
                                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  }
                                }}
                                className="badge"
                                style={{ 
                                  background: 'var(--white)', 
                                  border: '1px solid var(--gold)', 
                                  borderRadius: '50px', 
                                  padding: '6px 14px', 
                                  fontSize: '12.5px', 
                                  cursor: svc && !(user && (user.role === 'owner' || user.role === 'staff')) ? 'pointer' : 'default',
                                  fontWeight: 500,
                                  color: 'var(--charcoal)',
                                  transition: 'var(--transition)'
                                }}
                              >
                                ✨ {svcName} {svc ? `(₹${svc.price.toLocaleString('en-IN')})` : ''} ➔
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="detail-about">
              <h2>About the Sanctuary</h2>
              <p>{salon.about}</p>
              <div className="detail-meta-list">
                {salon.owner_name && <span><strong>Sanctuary Director:</strong> {salon.owner_name}</span>}
                <span><strong>Concierge Desk:</strong> {salon.contact}</span>
                <span><strong>Rest Days:</strong> Closed on {salon.closed_on}</span>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              {user && (user.role === 'owner' || user.role === 'staff') ? (
                <>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, marginBottom: '8px' }}>
                    Ritual <span>Catalogue</span>
                  </h2>
                  <p style={{ fontSize: '14px', color: 'var(--charcoal-light)', fontWeight: 300 }}>
                    Review your sanctuary's current rituals, durations, and pricing below.
                  </p>
                </>
              ) : (
                <>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, marginBottom: '8px' }}>
                    Select Your <span>Rituals</span>
                  </h2>
                  <p style={{ fontSize: '14px', color: 'var(--charcoal-light)', fontWeight: 300 }}>
                    Please choose one or more of the custom-designed services below to begin your booking.
                  </p>
                </>
              )}
            </div>

            <div className="services-list">
              {salon.services.length === 0 ? (
                <div style={{ background: 'var(--white)', padding: '24px', borderRadius: 'var(--radius-md)', border: '1px dashed var(--gold)', textAlign: 'center' }}>
                  No service catalogue configured yet.
                </div>
              ) : (
                salon.services.map((svc, i) => (
                  <div
                    key={i}
                    className={`service-item ${!(user && (user.role === 'owner' || user.role === 'staff')) && selectedServices.some(s => s.name === svc.name) ? 'selected' : ''}`}
                    style={user && (user.role === 'owner' || user.role === 'staff') ? { cursor: 'default' } : {}}
                    onClick={user && (user.role === 'owner' || user.role === 'staff') ? null : () => {
                      setSelectedServices(prev => {
                        const exists = prev.find(s => s.name === svc.name);
                        if (exists) {
                          return prev.filter(s => s.name !== svc.name);
                        } else {
                          return [...prev, svc];
                        }
                      });
                      setTimeout(() => {
                        const el = document.querySelector('.booking-card');
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }, 100);
                    }}
                  >
                    <div>
                      <div className="service-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {svc.name}
                        {selectedServices.some(s => s.name === svc.name) && (
                          <span style={{ color: 'var(--gold)', fontSize: '13px', fontWeight: 'bold' }}>✓ Selected</span>
                        )}
                      </div>
                      <div className="service-meta">Duration: ⏱ {svc.duration}</div>
                    </div>
                    <div className="service-price">₹{svc.price.toLocaleString('en-IN')}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Booking Form Card */}
          {!(user && (user.role === 'owner' || user.role === 'staff')) && (
            <div>
              <div className="booking-card">
                <h3>Secure Your Session</h3>
                
                {error && (
                  <div style={{ background: '#FFF0F2', border: '1px solid rgba(122, 12, 46, 0.2)', color: 'var(--crimson)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', fontSize: '13.5px', marginBottom: '20px', fontWeight: 400 }}>
                    ✕ {error}
                  </div>
                )}

                {selectedServices.length > 0 ? (
                  <div className="booking-summary">
                    <div className="booking-summary-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px', borderBottom: '1px solid rgba(212, 175, 55, 0.05)', paddingBottom: '8px' }}>
                      <span style={{ color: 'var(--charcoal-light)' }}>Rituals Selected ({selectedServices.length}):</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                        {selectedServices.map(s => (
                          <span key={s.name} className="badge" style={{ fontSize: '12px', padding: '4px 10px', background: 'var(--white)', border: '1px solid var(--gold)', borderRadius: '20px' }}>
                            {s.name}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="booking-summary-row" style={{ borderBottom: '1px solid rgba(212, 175, 55, 0.05)', paddingBottom: '8px' }}>
                      <span style={{ color: 'var(--charcoal-light)' }}>Combined Duration:</span>
                      <span>{selectedServices.map(s => s.duration).join(', ')}</span>
                    </div>
                    <div className="booking-summary-row" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                      <span style={{ color: 'var(--charcoal-light)', fontWeight: 600 }}>Total Service Charge:</span>
                      <strong style={{ color: 'var(--crimson)', fontSize: '1.2rem' }}>
                        ₹{selectedServices.reduce((sum, s) => sum + s.price, 0).toLocaleString('en-IN')}
                      </strong>
                    </div>
                  </div>
                ) : (
                  <div style={{ background: 'var(--ivory)', border: '1px dashed var(--gold)', borderRadius: 'var(--radius-sm)', padding: '24px', textAlign: 'center', margin: '20px 0', fontSize: '13.5px', color: 'var(--charcoal-light)', fontWeight: 300 }}>
                    ✦ Select one or more services on the left to activate the booking form.
                  </div>
                )}

                {!loggedIn ? (
                  <div style={{ textAlign: 'center', padding: '24px 16px', background: 'var(--ivory)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', marginTop: '20px' }}>
                    <p style={{ fontSize: '14px', color: 'var(--charcoal-light)', marginBottom: '20px', lineHeight: '1.6', fontWeight: 300 }}>
                      Secure your custom adornment booking by registering a luxury registry account or signing in.
                    </p>
                    <button 
                      onClick={() => navigate('/auth', { state: { from: `/salon/${id}` } })}
                      className="btn-primary" 
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      Sign In / Register to Book ➔
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleBook}>
                    <div className="form-group">
                      <label>Full Name *</label>
                      <input
                        type="text"
                        placeholder="Enter your name"
                        value={booking.name}
                        onChange={e => setBooking({ ...booking, name: e.target.value })}
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Contact Number *</label>
                      <input
                        type="tel"
                        placeholder="+91 XXXXX XXXXX"
                        value={booking.phone}
                        onChange={e => setBooking({ ...booking, phone: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Email Address</label>
                      <input
                        type="email"
                        placeholder="yourname@domain.com"
                        value={booking.email}
                        onChange={e => setBooking({ ...booking, email: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>Preferred Date *</label>
                      <input
                        type="date"
                        min={today}
                        value={booking.date}
                        onChange={e => setBooking({ ...booking, date: e.target.value })}
                        required
                        style={isDateClosed(booking.date) ? { borderColor: 'var(--crimson)', boxShadow: '0 0 0 1px var(--crimson)' } : {}}
                      />
                      {isDateClosed(booking.date) && (
                        <span style={{ color: 'var(--crimson)', fontSize: '11px', marginTop: '6px', display: 'block', fontWeight: 500 }}>
                          ✕ Sanctuary is closed on {salon.closed_on}s. Please choose another date.
                        </span>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Preferred Time Slot *</label>
                      <select 
                        value={booking.time} 
                        onChange={e => setBooking({ ...booking, time: e.target.value })}
                        required
                        disabled={!booking.date || isDateClosed(booking.date)}
                      >
                        {!booking.date ? (
                          <option value="">Choose a date first</option>
                        ) : isDateClosed(booking.date) ? (
                          <option value="">Closed on this day</option>
                        ) : (
                          <>
                            <option value="">Choose a slot</option>
                            {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                          </>
                        )}
                      </select>
                    </div>

                    <button 
                      type="submit" 
                      className="btn-primary" 
                      style={{ width: '100%', marginTop: '12px', justifyContent: 'center' }} 
                      disabled={submitting}
                    >
                      {submitting ? 'Verifying details...' : 'Confirm Session ✦'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

        </div>

        {/* ================= RATINGS & REVIEWS COMPONENT ================= */}
        <div className="reviews-section">
          <div className="reviews-header">
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, marginBottom: '6px' }}>
                Sanctuary <span>Reviews</span>
              </h2>
              <p style={{ fontSize: '14.5px', color: 'var(--charcoal-light)', fontWeight: 300 }}>
                Read authentic logs of self-care and grandeur experienced by Delhi brides.
              </p>
            </div>

            <div className="ratings-summary-box">
              <div className="ratings-large-num">{avgRating}</div>
              <div>
                <div style={{ color: 'var(--gold)', fontSize: '18px', letterSpacing: '2px', marginBottom: '4px' }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i}>{i < Math.round(avgRating) ? '★' : '☆'}</span>
                  ))}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--charcoal-light)', fontWeight: 500, uppercase: 'true', letterSpacing: '0.05em' }}>
                  Based on {reviewsCount} reviews
                </div>
              </div>
            </div>
          </div>

          {/* Form to submit review if eligible */}
          {isEligible && (
            <div className="luxury-card" style={{ marginBottom: '40px', padding: '36px', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--crimson)', borderBottom: '1px solid var(--ivory-dark)', paddingBottom: '12px', marginBottom: '24px' }}>
                ❀ Log Your Adornment Experience
              </h3>

              {reviewError && (
                <div style={{ background: '#FFF0F2', border: '1px solid rgba(122, 12, 46, 0.2)', color: 'var(--crimson)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', fontSize: '13.5px', marginBottom: '20px' }}>
                  ✕ {reviewError}
                </div>
              )}

              {reviewSuccess && (
                <div style={{ background: '#E6F4EA', border: '1px solid rgba(26, 122, 74, 0.2)', color: '#1a7a4a', padding: '12px 16px', borderRadius: 'var(--radius-sm)', fontSize: '13.5px', marginBottom: '20px' }}>
                  ✓ {reviewSuccess}
                </div>
              )}

              <form onSubmit={handleReviewSubmit}>
                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label>Service Rating *</label>
                  <div className="star-selector">
                    {Array.from({ length: 5 }).map((_, i) => {
                      const ratingVal = i + 1;
                      return (
                        <span
                          key={i}
                          className={`star-selector-icon ${ratingVal <= (hoverRating || userRating) ? 'active' : ''}`}
                          onClick={() => setUserRating(ratingVal)}
                          onMouseEnter={() => setHoverRating(ratingVal)}
                          onMouseLeave={() => setHoverRating(0)}
                        >
                          ★
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="form-group">
                  <label>Your Review * (Minimum 20 characters)</label>
                  <textarea
                    placeholder="Tell us about the makeup quality, staff hospitality, and overall experience..."
                    value={reviewText}
                    onChange={e => setReviewText(e.target.value)}
                    required
                    style={{ 
                      width: '100%', 
                      height: '120px', 
                      padding: '14px', 
                      border: '1.5px solid var(--ivory-dark)', 
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--ivory)',
                      outline: 'none',
                      fontFamily: 'var(--font-body)',
                      fontSize: '14.5px',
                      lineHeight: '1.6'
                    }}
                  />
                  <div style={{ fontSize: '12px', color: reviewText.trim().length >= 20 ? '#1a7a4a' : 'var(--charcoal-light)', marginTop: '6px', textAlign: 'right' }}>
                    {reviewText.trim().length} characters (min 20)
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label>Add Photos (Optional, max 2 images)</label>
                  <input
                    type="file"
                    accept="image/jpeg, image/png, image/webp"
                    onChange={handlePhotoUpload}
                    multiple
                    disabled={reviewPhotos.length >= 2}
                    style={{ fontSize: '14px' }}
                  />
                  
                  {reviewPhotos.length > 0 && (
                    <div className="photo-preview-grid">
                      {reviewPhotos.map((p, idx) => (
                        <div key={idx} className="photo-preview-item">
                          <img src={p} className="photo-preview-img" alt="Upload Preview" />
                          <button type="button" className="photo-preview-remove" onClick={() => removePhoto(idx)}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ fontSize: '11px', color: 'var(--charcoal-light)', marginTop: '6px' }}>
                    Images are compressed and optimized on select. Limit size to under 5MB.
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={reviewSubmitting || reviewText.trim().length < 20}
                  style={{ minWidth: '200px', justifyContent: 'center' }}
                >
                  {reviewSubmitting ? 'Submitting review...' : 'Submit Verified Review ✦'}
                </button>
              </form>
            </div>
          )}

          {/* List of Reviews */}
          {reviews.length === 0 ? (
            <div style={{ background: 'var(--white)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '48px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>❀</div>
              <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', marginBottom: '6px' }}>No Reviews Yet</h4>
              <p style={{ fontSize: '14px', color: 'var(--charcoal-light)', fontWeight: 300 }}>
                Be the first to share your self-care ritual at this sanctuary!
              </p>
            </div>
          ) : (
            <div>
              {reviews.map((r) => (
                <div key={r.id} className="review-card">
                  <div className="review-header-info">
                    <div className="review-username">
                      {r.user_name}
                      <span className="review-verified-badge">✓ Verified Customer</span>
                    </div>
                    <div className="review-date">
                      {new Date(r.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>

                  <div className="review-stars">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i}>{i < r.rating ? '★' : '☆'}</span>
                    ))}
                  </div>

                  <p className="review-text">{r.text}</p>

                  {r.photos && r.photos.length > 0 && (
                    <div className="review-photos">
                      {r.photos.map((ph, index) => (
                        <img 
                          key={index}
                          src={ph} 
                          className="review-photo-img" 
                          alt="Review attachment" 
                          onClick={() => window.open(ph, '_blank')} 
                        />
                      ))}
                    </div>
                  )}

                  {/* Owner Response Box */}
                  {r.reply && (
                    <div className="owner-reply-box">
                      <div className="owner-reply-title">
                        ✦ Owner's Response
                      </div>
                      <p className="review-text" style={{ fontStyle: 'italic', fontSize: '14px' }}>"{r.reply.text}"</p>
                      <div className="review-date" style={{ marginTop: '8px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Answered on {new Date(r.reply.date).toLocaleDateString('en-IN')} by {r.reply.replied_by === 'owner' ? 'Salon Owner' : 'Salon Staff'}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </>
  );
}
