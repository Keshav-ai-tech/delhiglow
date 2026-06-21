import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Bookings({ user }) {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Post-booking review states
  const [selectedBookingForReview, setSelectedBookingForReview] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewPhotos, setReviewPhotos] = useState([]);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate('/auth', { state: { from: '/my-bookings' } });
    }
  }, [user, navigate]);

  const fetchBookings = async () => {
    if (!user) return;
    try {
      setBookingsLoading(true);
      const res = await fetch('/api/customer/bookings', {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setBookings(data.data || []);
      } else {
        setErrorMsg(data.message || 'Failed to fetch your bookings.');
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setErrorMsg('Failed to connect to the server.');
    } finally {
      setBookingsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [user]);

  const handleCancelBooking = async (bookingId) => {
    const confirmCancel = window.confirm("Are you sure you want to cancel this booking? This action cannot be undone.");
    if (!confirmCancel) return;

    try {
      const res = await fetch(`/api/customer/bookings/${bookingId}/cancel`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        alert("Booking cancelled successfully.");
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' } : b));
      } else {
        alert(data.message || "Failed to cancel booking.");
      }
    } catch (err) {
      console.error('Error cancelling booking:', err);
      alert("Failed to cancel booking due to connection error.");
    }
  };

  const handleDismissReviewOption = async (bookingId) => {
    const confirmDismiss = window.confirm("Are you sure you want to dismiss the review option for this booking? You won't be able to review this ritual.");
    if (!confirmDismiss) return;

    try {
      const res = await fetch(`/api/customer/bookings/${bookingId}/dismiss-review`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        alert("Review option dismissed.");
        fetchBookings();
      } else {
        alert(data.message || "Failed to dismiss review option.");
      }
    } catch (err) {
      console.error('Error dismissing review option:', err);
      alert("Failed to dismiss due to connection error.");
    }
  };

  const handleDeleteReview = async (bookingId) => {
    const confirmDelete = window.confirm("Are you sure you want to delete your review for this booking? This action cannot be undone.");
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/reviews/booking/${bookingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        alert("Review deleted successfully.");
        fetchBookings();
      } else {
        alert(data.message || "Failed to delete review.");
      }
    } catch (err) {
      console.error('Error deleting review:', err);
      alert("Failed to delete review due to connection error.");
    }
  };

  const handleOpenReviewModal = (booking) => {
    setSelectedBookingForReview(booking);
    setReviewRating(5);
    setReviewText('');
    setReviewPhotos([]);
    setReviewError('');
    setReviewSuccess('');
    setReviewSubmitting(false);
  };

  const handleReviewPhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      if (!file.type.match('image.*')) return;
      const reader = new FileReader();
      reader.onloadend = () => {
        setReviewPhotos(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
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
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          salon_id: selectedBookingForReview.salon_id,
          booking_id: selectedBookingForReview.id,
          rating: reviewRating,
          text: reviewText,
          photos: reviewPhotos
        })
      });

      const data = await res.json();
      if (data.success) {
        setReviewSuccess('Thank you! Your review has been submitted successfully.');
        setBookings(prev => prev.map(b => 
          b.id === selectedBookingForReview.id 
            ? { ...b, reviewStatus: 'reviewed', isReviewed: true, isReviewable: false } 
            : b
        ));
        
        setTimeout(() => {
          setSelectedBookingForReview(null);
        }, 1500);
      } else {
        setReviewError(data.message || 'Failed to submit review.');
      }
    } catch (err) {
      console.error('Error submitting review:', err);
      setReviewError('Network error. Please try again.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <section className="section section-ivory" style={{ minHeight: '90vh' }}>
      <div className="jaali-pattern-bg" />
      <div className="container" style={{ position: 'relative', zIndex: 2, padding: '40px 16px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="section-title" style={{ textAlign: 'left', margin: 0 }}>My <span>Booking History</span></h1>
            <p style={{ color: 'var(--charcoal-light)', fontSize: '14px', marginTop: '6px' }}>
              View status, cancel pending slots, or leave reviews for completed beauty rituals.
            </p>
          </div>
          <Link to="/profile" className="btn-outline" style={{ textDecoration: 'none' }}>
            ➔ Back to Profile
          </Link>
        </div>

        {errorMsg && (
          <div className="error-box" style={{ padding: '14px', borderRadius: '4px', background: '#fdf2f2', color: '#ec4899', marginBottom: '24px' }}>
            {errorMsg}
          </div>
        )}

        {bookingsLoading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--charcoal-light)' }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
            <p style={{ fontSize: '15px' }}>Retrieving your appointments...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="settings-panel-box" style={{ padding: '64px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📅</div>
            <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '12px' }}>No bookings found</h3>
            <p style={{ color: 'var(--charcoal-light)', marginBottom: '24px' }}>
              You haven't scheduled any slots yet. Discover Delhi's finest beauty sanctuaries and book your first ritual!
            </p>
            <Link to="/salons" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>
              Explore Sanctuaries &nbsp;➔
            </Link>
          </div>
        ) : (
          <div className="customer-bookings-list" style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px', margin: '0 auto' }}>
            {bookings.map(b => (
              <div key={b.id} className="customer-booking-card" style={{ background: 'var(--white)' }}>
                <div className="customer-booking-header">
                  <div className="customer-booking-title-group">
                    <Link to={`/salon/${b.salon_id}`} className="customer-booking-salon">
                      {b.salon_name}
                    </Link>
                    <span className="customer-booking-id">Registry ID: #{b.id}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className={`customer-booking-badge ${b.status}`}>
                      {b.status}
                    </span>
                    {b.reviewStatus && b.reviewStatus !== 'upcoming' && b.status !== 'cancelled' && (
                      <span className={`customer-booking-badge ${b.reviewStatus}`}>
                        {b.reviewStatus === 'reviewable' ? 'Review Active' : b.reviewStatus}
                      </span>
                    )}
                  </div>
                </div>
                <div className="customer-booking-body">
                  <div className="customer-booking-details">
                    <div className="customer-booking-detail-item">
                      <span className="icon">💄</span>
                      <strong>{b.service}</strong>
                    </div>
                    {b.duration && (
                      <div className="customer-booking-detail-item">
                        <span className="icon">⏱</span>
                        <span>Duration: {b.duration}</span>
                      </div>
                    )}
                    {b.price && (
                      <div className="customer-booking-detail-item">
                        <span className="icon">💰</span>
                        <strong>₹{b.price.toLocaleString('en-IN')}</strong>
                      </div>
                    )}
                    <div className="customer-booking-detail-item">
                      <span className="icon">📅</span>
                      <span>{b.date} at {b.time}</span>
                    </div>
                    <div className="customer-booking-detail-item">
                      <span className="icon">👤</span>
                      <span>Guest: {b.name} ({b.phone})</span>
                    </div>
                    {b.email && (
                      <div className="customer-booking-detail-item">
                        <span className="icon">✉️</span>
                        <span>{b.email}</span>
                      </div>
                    )}
                  </div>
                  <div className="customer-booking-actions">
                    {b.status === 'confirmed' && (
                      <button 
                        onClick={() => handleCancelBooking(b.id)} 
                        className="customer-booking-cancel-btn"
                      >
                        Cancel Booking
                      </button>
                    )}
                    {b.reviewStatus === 'reviewable' && (
                      <>
                        <button 
                          onClick={() => handleOpenReviewModal(b)} 
                          className="customer-booking-review-btn"
                        >
                          ★ Leave Review
                        </button>
                        <button 
                          onClick={() => handleDismissReviewOption(b.id)} 
                          className="customer-booking-dismiss-review-btn"
                          title="Dismiss review option permanently"
                        >
                          ✕ Delete Option
                        </button>
                      </>
                    )}
                    {b.reviewStatus === 'reviewed' && (
                      <button 
                        onClick={() => handleDeleteReview(b.id)} 
                        className="customer-booking-delete-review-btn"
                        title="Delete your review"
                      >
                        🗑 Delete Review
                      </button>
                    )}
                    <a 
                      href={`https://wa.me/${(b.salon_phone || b.phone || '').replace(/[^0-9]/g, '')}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="customer-booking-contact-btn"
                    >
                      💬 WhatsApp Sanctuary
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Write Review Modal */}
      {selectedBookingForReview && (
        <div className="modal-overlay" onClick={() => setSelectedBookingForReview(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontFamily: 'var(--font-display)', color: 'var(--crimson)', margin: 0 }}>
                Review Your Experience
              </h3>
              <button className="modal-close" onClick={() => setSelectedBookingForReview(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '13px', color: 'var(--charcoal-light)', marginBottom: '16px', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                Share your feedback for <strong>{selectedBookingForReview.service}</strong> at <strong>{selectedBookingForReview.salon_name}</strong>.
              </p>

              {reviewError && (
                <div className="error-box" style={{ padding: '10px 14px', borderRadius: '4px', background: '#fdf2f2', color: '#ec4899', fontSize: '13px', marginBottom: '16px' }}>
                  {reviewError}
                </div>
              )}
              {reviewSuccess && (
                <div className="success-box" style={{ padding: '10px 14px', borderRadius: '4px', background: '#f0fdf4', color: '#16a34a', fontSize: '13px', marginBottom: '16px' }}>
                  {reviewSuccess}
                </div>
              )}

              <form onSubmit={handleReviewSubmit}>
                {/* Star Selection */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--charcoal)', marginBottom: '8px', textAlign: 'left' }}>
                    Your Rating:
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[1, 2, 3, 4, 5].map(num => (
                      <button
                        type="button"
                        key={num}
                        onClick={() => setReviewRating(num)}
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: '2rem',
                          cursor: 'pointer',
                          color: num <= reviewRating ? 'var(--gold)' : '#e0e0e0',
                          transition: 'color 0.2s ease',
                          padding: 0
                        }}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                {/* Commentary */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--charcoal)', marginBottom: '8px', textAlign: 'left' }}>
                    Review Commentary:
                  </label>
                  <textarea
                    rows="4"
                    placeholder="Tell us about the ambiance, service quality, and overall ritual experience (minimum 20 characters)..."
                    value={reviewText}
                    onChange={e => setReviewText(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--glass-border)',
                      fontSize: '14px',
                      fontFamily: 'var(--font-body)',
                      outline: 'none',
                      resize: 'vertical'
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '4px', color: 'var(--charcoal-light)' }}>
                    <span>Please write at least 20 characters</span>
                    <span style={{ color: reviewText.length >= 20 ? 'green' : 'red' }}>
                      {reviewText.length} / 20 characters
                    </span>
                  </div>
                </div>

                {/* Image Upload */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--charcoal)', marginBottom: '8px', textAlign: 'left' }}>
                    Add Photos (Optional):
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleReviewPhotoUpload}
                    style={{ fontSize: '13px', color: 'var(--charcoal-light)', display: 'block', width: '100%' }}
                  />
                  {reviewPhotos.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                      {reviewPhotos.map((photo, idx) => (
                        <div key={idx} style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                          <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button
                            type="button"
                            onClick={() => setReviewPhotos(prev => prev.filter((_, i) => i !== idx))}
                            style={{
                              position: 'absolute',
                              top: '2px',
                              right: '2px',
                              background: 'rgba(0,0,0,0.6)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '50%',
                              width: '16px',
                              height: '16px',
                              fontSize: '9px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => setSelectedBookingForReview(null)}
                    style={{ margin: 0 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={reviewSubmitting || reviewText.length < 20}
                    style={{ margin: 0 }}
                  >
                    {reviewSubmitting ? 'Submitting...' : 'Post Review ➔'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
