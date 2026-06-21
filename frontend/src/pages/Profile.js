import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Profile({ user, onProfileUpdate, onSignOut }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'edit', 'security'
  
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
    gender: 'Not specified',
    avatar: ''
  });

  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    whatsapp: true
  });

  const [weddingDate, setWeddingDate] = useState(
    localStorage.getItem(`weddingDate_${user?.id}`) || ''
  );
  
  const handleSaveWeddingDate = (e) => {
    e.preventDefault();
    const dateInput = e.target.elements.weddingDateInput.value;
    if (dateInput) {
      localStorage.setItem(`weddingDate_${user.id}`, dateInput);
      setWeddingDate(dateInput);
    }
  };

  const calculateDaysRemaining = () => {
    if (!weddingDate) return null;
    const diffTime = new Date(weddingDate) - new Date();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

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
      navigate('/auth', { state: { from: '/profile' } });
    }
  }, [user, navigate]);

  // Fetch current profile details on mount
  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/profile', {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        });
        const data = await res.json();

        if (data.success) {
          setProfileData({
            name: data.data.name || '',
            email: data.data.email || '',
            phone: data.data.phone || '',
            bio: data.data.bio || '',
            gender: data.data.gender || 'Not specified',
            avatar: data.data.avatar || ''
          });
          if (data.data.notifications) {
            setNotifications(data.data.notifications);
          }
        } else {
          setProfileMessage({ type: 'error', text: data.message || 'Failed to load profile details.' });
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setProfileMessage({ type: 'error', text: 'Connection failed. Please ensure the backend is online.' });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const fetchBookings = async () => {
    if (!user || user.role !== 'customer') return;
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
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
    } finally {
      setBookingsLoading(false);
    }
  };

  // Fetch customer bookings on load / user change
  useEffect(() => {
    fetchBookings();
  }, [user]);

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
        // Update booking review status locally
        setBookings(prev => prev.map(b => 
          b.id === selectedBookingForReview.id 
            ? { ...b, reviewStatus: 'reviewed', isReviewed: true, isReviewable: false } 
            : b
        ));
        
        // Auto-close modal after 1.5 seconds
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

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.match('image.*')) {
      alert('Only image files (JPG, PNG, WEBP) are supported.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Compress using canvas to ensure small size (e.g. max 400px wide)
        const canvas = document.createElement('canvas');
        const max_size = 400;
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

        // Compress to JPEG with 70% quality
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        
        // Upload to server static folder
        setLoading(true);
        fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: file.name, base64: compressedBase64 })
        })
          .then(r => r.json())
          .then(async res => {
            if (res.success) {
              // Now call PUT /api/profile to save avatar URL
              const profileRes = await fetch('/api/profile', {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({
                  ...profileData,
                  avatar: res.url
                })
              });
              const profileDataRes = await profileRes.json();
              if (profileDataRes.success) {
                setProfileData(prev => ({ ...prev, avatar: res.url }));
                if (onProfileUpdate && profileDataRes.data) {
                  onProfileUpdate(profileDataRes.data);
                }
                setProfileMessage({ type: 'success', text: 'Profile picture updated successfully!' });
              } else {
                setProfileMessage({ type: 'error', text: profileDataRes.message || 'Failed to save profile picture.' });
              }
            } else {
              setProfileMessage({ type: 'error', text: res.message || 'Image upload failed' });
            }
          })
          .catch(() => setProfileMessage({ type: 'error', text: 'Image upload failed due to connection error' }))
          .finally(() => setLoading(false));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleProfileChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleNotificationChange = async (key) => {
    const updatedNotifications = {
      ...notifications,
      [key]: !notifications[key]
    };
    setNotifications(updatedNotifications);

    try {
      const res = await fetch('/api/profile/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ notifications: updatedNotifications })
      });
      const data = await res.json();
      if (!data.success) {
        // Rollback state if API fails
        setNotifications(notifications);
        console.error('Failed to save notification preferences:', data.message);
      }
    } catch (err) {
      // Rollback state if network call fails
      setNotifications(notifications);
      console.error('Error updating notification preferences:', err);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileMessage({ type: '', text: '' });
    
    if (!profileData.name || !profileData.email || !profileData.phone) {
      setProfileMessage({ type: 'error', text: 'Name, email, and phone number are required.' });
      return;
    }

    try {
      setSavingProfile(true);
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(profileData)
      });
      const data = await res.json();

      if (data.success) {
        setProfileMessage({ type: 'success', text: 'Your profile details have been saved successfully!' });
        if (onProfileUpdate && data.data) {
          onProfileUpdate(data.data);
        }
      } else {
        setProfileMessage({ type: 'error', text: data.message || 'Failed to save changes.' });
      }
    } catch (err) {
      console.error('Error saving profile:', err);
      setProfileMessage({ type: 'error', text: 'Connection failure. Please try again.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordMessage({ type: '', text: '' });

    if (!passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'All password fields are required.' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    try {
      setSavingPassword(true);
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          ...profileData,
          oldPassword: passwordData.oldPassword,
          newPassword: passwordData.newPassword
        })
      });
      const data = await res.json();

      if (data.success) {
        setPasswordMessage({ type: 'success', text: 'Your password has been changed successfully!' });
        setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
        if (onProfileUpdate && data.data) {
          onProfileUpdate(data.data);
        }
      } else {
        setPasswordMessage({ type: 'error', text: data.message || 'Failed to change password.' });
      }
    } catch (err) {
      console.error('Error updating password:', err);
      setPasswordMessage({ type: 'error', text: 'Connection failure. Please try again.' });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSignOutClick = () => {
    if (onSignOut) {
      onSignOut();
      navigate('/auth');
    }
  };

  const handleDeleteProfileClick = async () => {
    const confirmDelete = window.confirm(
      "Are you absolutely sure you want to delete your profile? This will permanently remove your account, bookings, and reviews. This action cannot be undone."
    );
    if (!confirmDelete) return;

    try {
      setLoading(true);
      const res = await fetch('/api/profile', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || "Your profile has been deleted successfully.");
        if (onSignOut) {
          onSignOut();
        }
        navigate('/auth');
      } else {
        setProfileMessage({ type: 'error', text: data.message || 'Failed to delete profile.' });
      }
    } catch (err) {
      console.error('Error deleting profile:', err);
      setProfileMessage({ type: 'error', text: 'Connection failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getRoleLabel = (role) => {
    if (role === 'owner') return 'Salon Owner';
    if (role === 'staff') return 'Salon Staff';
    return 'Customer';
  };

  if (!user) return null;

  return (
    <section className="section section-ivory profile-redesign-section" style={{ minHeight: '90vh', display: 'flex', alignItems: 'center' }}>
      <div className="jaali-pattern-bg" />
      
      <div className="container" style={{ position: 'relative', zIndex: 2, width: '100%' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          
          <div className="profile-redesign-card">
            
             {/* User Info Header Section */}
            <div className="profile-header-main">
              {profileMessage.text && profileMessage.type === 'success' && (
                <div className="status-alert alert-success" style={{ maxWidth: '400px', margin: '0 auto 16px auto', width: '100%' }}>
                  ✓ {profileMessage.text}
                </div>
              )}
              {profileMessage.text && profileMessage.type === 'error' && (
                <div className="status-alert alert-error" style={{ maxWidth: '400px', margin: '0 auto 16px auto', width: '100%' }}>
                  ✕ {profileMessage.text}
                </div>
              )}
              
              <div className="profile-avatar-large-container" style={{ position: 'relative', display: 'inline-block', margin: '0 auto 12px auto' }}>
                <div className="profile-avatar-large" style={{ position: 'relative', overflow: 'hidden' }}>
                  {profileData.avatar ? (
                    <img src={profileData.avatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    getInitials(profileData.name || user.name)
                  )}
                </div>
                <label className="avatar-edit-label" style={{
                  position: 'absolute',
                  bottom: '0px',
                  right: '0px',
                  background: 'var(--gold)',
                  color: 'var(--charcoal)',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  border: '2px solid var(--white)',
                  boxShadow: 'var(--shadow-md)',
                  transition: 'var(--transition)'
                }} title="Change Profile Picture">
                  📷
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleAvatarUpload} 
                    style={{ display: 'none' }} 
                  />
                </label>
              </div>
              <h2 className="profile-display-name">{profileData.name || user.name}</h2>
              <p className="profile-email-sub">{profileData.email || user.email}</p>
              <span className="profile-role-badge">{getRoleLabel(user.role)}</span>
            </div>

            {/* Navigation Tabs */}
            <div className="profile-tabs-header">
              <button 
                className={`profile-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                Overview
              </button>
              {user && user.role === 'customer' && (
                <Link to="/beauty-quiz" className="profile-tab-btn" style={{ textDecoration: 'none', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  Beauty Profile
                </Link>
              )}
              <button 
                className={`profile-tab-btn ${activeTab === 'edit' ? 'active' : ''}`}
                onClick={() => setActiveTab('edit')}
              >
                Edit Profile
              </button>
              <button 
                className={`profile-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
                onClick={() => setActiveTab('security')}
              >
                Security
              </button>
              {user && user.role === 'customer' && (
                <button 
                  className={`profile-tab-btn ${activeTab === 'journey' ? 'active' : ''}`}
                  onClick={() => setActiveTab('journey')}
                >
                  Bridal Journey
                </button>
              )}
              {user && (user.role === 'owner' || user.role === 'staff') && (
                <Link to="/admin" className="profile-tab-btn admin-link-tab" style={{ textDecoration: 'none', textAlign: 'center' }}>
                  Admin Dashboard ➔
                </Link>
              )}
            </div>

            {/* Tab Panels */}
            {loading ? (
              <div className="profile-loading" style={{ padding: '40px 0' }}>
                <div className="spinner"></div>
                <p>Gathering your settings...</p>
              </div>
            ) : (
              <div className="profile-tab-content">
                
                {/* 1. OVERVIEW TAB PANEL */}
                {activeTab === 'overview' && (
                  <div className="overview-panel animate-fade-in">
                    
                    {/* Beauty Profile Persona Card (For Customers) */}
                    {user.role === 'customer' && user.beautyProfile && (
                      <div className="settings-panel-box" style={{ border: '1px solid var(--gold)', background: 'rgba(201, 154, 75, 0.03)', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <h4 className="panel-box-title" style={{ color: 'var(--charcoal)', marginBottom: 0 }}>
                            My Beauty Persona
                          </h4>
                          <Link to="/beauty-quiz" className="btn-outline panel-action-btn" style={{ textDecoration: 'none', borderColor: 'rgba(122, 12, 46, 0.3)', padding: '6px 12px', fontSize: '12px' }}>
                            Retake Quiz
                          </Link>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ fontSize: '2.5rem' }}>{user.beautyProfile.emoji || '✨'}</div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '1.25rem', color: 'var(--charcoal)' }}>
                              {user.beautyProfile.persona}
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--charcoal-light)', fontStyle: 'italic', marginTop: '2px' }}>
                              Tailoring wellness suggestions based on your {user.beautyProfile.environment || 'preferred'} vibe
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* My Bookings Section */}
                    {user.role === 'customer' && (
                      <div className="settings-panel-box" style={{ background: 'transparent', border: 'none', padding: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <h4 className="panel-box-title" style={{ marginBottom: 0 }}>My Bookings</h4>
                          {bookings.length > 0 && (
                            <Link to="/salons" className="btn-outline panel-action-btn" style={{ textDecoration: 'none' }}>
                              + Book Another
                            </Link>
                          )}
                        </div>
                        
                        {bookingsLoading ? (
                          <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--charcoal-light)' }}>
                            <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
                            <p>Loading your appointments...</p>
                          </div>
                        ) : bookings.length === 0 ? (
                          <div className="settings-panel-box">
                            <p className="panel-box-desc">
                              No active bookings found. Find and book a luxury beauty sanctuary to get started.
                            </p>
                            <Link to="/salons" className="btn-outline panel-action-btn">
                              Explore Sanctuaries
                            </Link>
                          </div>
                        ) : (
                          <div className="customer-bookings-list">
                            {bookings.slice(0, 2).map(b => (
                              <div key={b.id} className="customer-booking-card">
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
                        {bookings.length > 0 && (
                          <div style={{ textAlign: 'center', marginTop: '16px' }}>
                            <Link to="/my-bookings" className="btn-outline" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none', padding: '8px 20px', fontSize: '13px' }}>
                              {bookings.length > 2 ? `View More Bookings (${bookings.length - 2} hidden) ➔` : 'View Full Booking History ➔'}
                            </Link>
                          </div>
                        )}
                      </div>
                    )}


                    {/* Notification Preferences */}
                    <div className="settings-panel-box">
                      <h4 className="panel-box-title">Notification Preferences</h4>
                      <p className="panel-box-desc" style={{ marginBottom: '16px' }}>
                        Choose how you would like to receive booking confirmations and sanctuary updates:
                      </p>
                      <div className="preferences-checkbox-grid">
                        <label className="checkbox-custom-container">
                          <input 
                            type="checkbox" 
                            checked={notifications.email} 
                            onChange={() => handleNotificationChange('email')} 
                          />
                          <span className="checkbox-checkmark"></span>
                          Email Notifications
                        </label>

                        <label className="checkbox-custom-container">
                          <input 
                            type="checkbox" 
                            checked={notifications.sms} 
                            onChange={() => handleNotificationChange('sms')} 
                          />
                          <span className="checkbox-checkmark"></span>
                          SMS Text Alerts
                        </label>

                        <label className="checkbox-custom-container">
                          <input 
                            type="checkbox" 
                            checked={notifications.whatsapp} 
                            onChange={() => handleNotificationChange('whatsapp')} 
                          />
                          <span className="checkbox-checkmark"></span>
                          WhatsApp Confirmations
                        </label>
                      </div>
                    </div>

                  </div>
                )}

                {/* 2. EDIT PROFILE TAB PANEL */}
                {activeTab === 'edit' && (
                  <div className="edit-panel animate-fade-in">
                    {profileMessage.text && (
                      <div className={`status-alert ${profileMessage.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                        {profileMessage.type === 'success' ? '✓ ' : '✕ '} {profileMessage.text}
                      </div>
                    )}

                    <form onSubmit={handleProfileSubmit} className="profile-form">
                      <div className="form-group">
                        <label htmlFor="name">Display Name</label>
                        <input 
                          type="text" 
                          id="name" 
                          name="name" 
                          value={profileData.name} 
                          onChange={handleProfileChange} 
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <input 
                          type="email" 
                          id="email" 
                          name="email" 
                          value={profileData.email} 
                          onChange={handleProfileChange} 
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="phone">Phone Number</label>
                        <input 
                          type="text" 
                          id="phone" 
                          name="phone" 
                          value={profileData.phone} 
                          onChange={handleProfileChange} 
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="gender">Gender</label>
                        <select 
                          id="gender" 
                          name="gender" 
                          value={profileData.gender} 
                          onChange={handleProfileChange}
                        >
                          <option value="Not specified">Not specified</option>
                          <option value="Female">Female</option>
                          <option value="Male">Male</option>
                          <option value="Non-binary">Non-binary</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label htmlFor="bio">Biography</label>
                        <textarea 
                          id="bio" 
                          name="bio" 
                          rows="3" 
                          value={profileData.bio} 
                          onChange={handleProfileChange} 
                          placeholder="Style preferences, hair type, beauty goals..."
                        />
                      </div>

                      <button 
                        type="submit" 
                        className="btn-primary" 
                        disabled={savingProfile}
                        style={{ marginTop: '10px' }}
                      >
                        {savingProfile ? 'Saving Details...' : 'Save Profile Details'}
                      </button>
                    </form>
                  </div>
                )}

                {/* 3. SECURITY TAB PANEL */}
                {activeTab === 'security' && (
                  <div className="security-panel animate-fade-in">
                    {passwordMessage.text && (
                      <div className={`status-alert ${passwordMessage.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                        {passwordMessage.type === 'success' ? '✓ ' : '✕ '} {passwordMessage.text}
                      </div>
                    )}

                    <form onSubmit={handlePasswordSubmit} className="profile-form">
                      <div className="form-group">
                        <label htmlFor="oldPassword">Current Password</label>
                        <div style={{ position: 'relative', width: '100%' }}>
                          <input 
                            type={showOldPassword ? "text" : "password"} 
                            id="oldPassword" 
                            name="oldPassword" 
                            value={passwordData.oldPassword} 
                            onChange={handlePasswordChange} 
                            required
                            style={{ paddingRight: '44px' }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowOldPassword(!showOldPassword)}
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
                            {showOldPassword ? (
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
                      </div>

                      <div className="form-group">
                        <label htmlFor="newPassword">New Password</label>
                        <div style={{ position: 'relative', width: '100%' }}>
                          <input 
                            type={showNewPassword ? "text" : "password"} 
                            id="newPassword" 
                            name="newPassword" 
                            value={passwordData.newPassword} 
                            onChange={handlePasswordChange} 
                            placeholder="Min 6 characters"
                            required
                            style={{ paddingRight: '44px' }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
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
                            {showNewPassword ? (
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
                      </div>

                      <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm New Password</label>
                        <div style={{ position: 'relative', width: '100%' }}>
                          <input 
                            type={showConfirmPassword ? "text" : "password"} 
                            id="confirmPassword" 
                            name="confirmPassword" 
                            value={passwordData.confirmPassword} 
                            onChange={handlePasswordChange} 
                            required
                            style={{ paddingRight: '44px' }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                            {showConfirmPassword ? (
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
                      </div>

                      <button 
                        type="submit" 
                        className="btn-primary" 
                        disabled={savingPassword}
                        style={{ marginTop: '10px', backgroundColor: 'var(--crimson)', justifyContent: 'center' }}
                      >
                        {savingPassword ? 'Updating...' : 'Update Password'}
                      </button>
                    </form>
                  </div>
                )}

                {/* 4. BRIDAL JOURNEY TAB PANEL */}
                {activeTab === 'journey' && user.role === 'customer' && (
                  <div className="journey-panel animate-fade-in">
                    {!weddingDate ? (
                      <div style={{ textAlign: 'center', padding: '32px 16px', background: 'var(--ivory)', border: '1px dashed var(--gold)', borderRadius: 'var(--radius-sm)' }}>
                        <span style={{ fontSize: '3rem', display: 'block', marginBottom: '16px' }}>💍</span>
                        <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--crimson)', marginBottom: '8px', marginTop: 0 }}>
                          Curate Your Bridal Glow Timeline
                        </h4>
                        <p style={{ fontSize: '14px', color: 'var(--charcoal-light)', marginBottom: '24px', fontWeight: 300, lineHeight: '1.6', maxWidth: '440px', margin: '0 auto 24px auto' }}>
                          Enter your wedding date to generate a tailored, month-by-month countdown checklist of wellness rituals and beauty preps.
                        </p>
                        <form onSubmit={handleSaveWeddingDate} style={{ display: 'flex', gap: '12px', justifyContent: 'center', maxWidth: '360px', margin: '0 auto' }}>
                          <input 
                            type="date" 
                            name="weddingDateInput" 
                            min={new Date().toISOString().split('T')[0]} 
                            required 
                            style={{ flex: 1, padding: '10px 14px', border: '1.5px solid var(--ivory-dark)', borderRadius: 'var(--radius-sm)', background: 'var(--white)' }}
                          />
                          <button type="submit" className="btn-primary" style={{ margin: 0 }}>
                            Generate ➔
                          </button>
                        </form>
                      </div>
                    ) : (
                      <div>
                        <div style={{ background: 'var(--ivory)', border: '1px solid var(--glass-border)', padding: '20px 24px', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                          <div>
                            <span style={{ fontSize: '13.5px', color: 'var(--charcoal-light)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
                              Bridal Countdown
                            </span>
                            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--crimson)', margin: '4px 0 0 0' }}>
                              💍 {calculateDaysRemaining() > 0 ? `${calculateDaysRemaining()} Days to the Big Day!` : 'Happy Wedding Day! ❀'}
                            </h3>
                            <span style={{ fontSize: '12.5px', color: 'var(--charcoal-light)', display: 'block', marginTop: '4px' }}>
                              Wedding Date: {new Date(weddingDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                          </div>
                          <button 
                            onClick={() => { localStorage.removeItem(`weddingDate_${user.id}`); setWeddingDate(''); }}
                            className="btn-outline"
                            style={{ 
                              padding: '8px 16px', 
                              fontSize: '13.5px', 
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            Reset Date
                          </button>
                        </div>

                        <div className="journey-timeline" style={{ position: 'relative', paddingLeft: '32px', borderLeft: '2px dashed var(--gold)', marginLeft: '12px' }}>
                          
                          {/* 3 Months Node */}
                          <div className="timeline-node" style={{ position: 'relative', marginBottom: '40px' }}>
                            <div className="timeline-dot" style={{ position: 'absolute', left: '-43px', top: '2px', background: calculateDaysRemaining() > 90 ? 'var(--gold)' : '#1a7a4a', color: 'white', width: '20px', height: '20px', borderRadius: '50%', border: '4px solid var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
                            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--crimson)', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              3 Months Prior: Skincare Prep & Hydration
                              {calculateDaysRemaining() <= 90 && <span style={{ fontSize: '12px', background: '#e6f4ea', color: '#1a7a4a', padding: '2px 8px', borderRadius: '50px', fontWeight: 600 }}>Completed</span>}
                            </h4>
                            <p style={{ fontSize: '13.5px', color: 'var(--charcoal-light)', lineHeight: '1.6', margin: '0 0 12px 0', fontWeight: 300 }}>
                              Begin professional hydrafacials, skin polishing, and deep dermal hydration at your chosen sanctuary to lay a pristine foundation for your bridal makeup.
                            </p>
                            <Link to="/salons" className="btn-outline" style={{ padding: '6px 14px', fontSize: '12.5px', display: 'inline-block', textDecoration: 'none' }}>
                              Explore Skincare Salons ➔
                            </Link>
                          </div>

                          {/* 1 Month Node */}
                          <div className="timeline-node" style={{ position: 'relative', marginBottom: '40px' }}>
                            <div className="timeline-dot" style={{ position: 'absolute', left: '-43px', top: '2px', background: calculateDaysRemaining() > 30 ? 'var(--gold)' : '#1a7a4a', color: 'white', width: '20px', height: '20px', borderRadius: '50%', border: '4px solid var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
                            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--crimson)', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              1 Month Prior: Hair & Makeup Trials
                              {calculateDaysRemaining() <= 30 && <span style={{ fontSize: '12px', background: '#e6f4ea', color: '#1a7a4a', padding: '2px 8px', borderRadius: '50px', fontWeight: 600 }}>Completed</span>}
                            </h4>
                            <p style={{ fontSize: '13.5px', color: 'var(--charcoal-light)', lineHeight: '1.6', margin: '0 0 12px 0', fontWeight: 300 }}>
                              Schedule visual trial runs for your hair buns, braids, and face tones. Match them directly against your uploaded lehenga and selected jewelry profiles.
                            </p>
                            <Link to="/salons" className="btn-outline" style={{ padding: '6px 14px', fontSize: '12.5px', display: 'inline-block', textDecoration: 'none' }}>
                              Book Makeup Trials ➔
                            </Link>
                          </div>

                          {/* 1 Week Node */}
                          <div className="timeline-node" style={{ position: 'relative', marginBottom: '40px' }}>
                            <div className="timeline-dot" style={{ position: 'absolute', left: '-43px', top: '2px', background: calculateDaysRemaining() > 7 ? 'var(--gold)' : '#1a7a4a', color: 'white', width: '20px', height: '20px', borderRadius: '50%', border: '4px solid var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
                            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--crimson)', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              1 Week Prior: Final Touch & Grooming
                              {calculateDaysRemaining() <= 7 && <span style={{ fontSize: '12px', background: '#e6f4ea', color: '#1a7a4a', padding: '2px 8px', borderRadius: '50px', fontWeight: 600 }}>Completed</span>}
                            </h4>
                            <p style={{ fontSize: '13.5px', color: 'var(--charcoal-light)', lineHeight: '1.6', margin: '0 0 12px 0', fontWeight: 300 }}>
                              Secure slots for manicures, pedicures, body polishing, and threading so your skin and nails look immaculate in high-definition bridal close-up shots.
                            </p>
                            <Link to="/salons" className="btn-outline" style={{ padding: '6px 14px', fontSize: '12.5px', display: 'inline-block', textDecoration: 'none' }}>
                              Schedule Grooming ➔
                            </Link>
                          </div>

                          {/* Wedding Day Node */}
                          <div className="timeline-node" style={{ position: 'relative', marginBottom: '12px' }}>
                            <div className="timeline-dot" style={{ position: 'absolute', left: '-43px', top: '2px', background: calculateDaysRemaining() > 0 ? 'var(--gold)' : '#1a7a4a', color: 'white', width: '20px', height: '20px', borderRadius: '50%', border: '4px solid var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
                            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--crimson)', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              Wedding Day: The Final Adornment
                              {calculateDaysRemaining() <= 0 && <span style={{ fontSize: '12px', background: '#e6f4ea', color: '#1a7a4a', padding: '2px 8px', borderRadius: '50px', fontWeight: 600 }}>Enjoy!</span>}
                            </h4>
                            <p style={{ fontSize: '13.5px', color: 'var(--charcoal-light)', lineHeight: '1.6', margin: '0 0 12px 0', fontWeight: 300 }}>
                              Indulge in your pre-booked bridal makeup ritual. Sit back, sip chamomile tea, and let our verified Delhi Glow artists illuminate your look!
                            </p>
                          </div>

                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}

            {/* Centered Sign Out and Delete Profile Actions at bottom of the profile card */}
            <div className="profile-redesign-footer">
              <button 
                onClick={handleSignOutClick}
                className="btn-signout-red-outline"
              >
                Sign Out
              </button>
              <button 
                onClick={handleDeleteProfileClick}
                className="btn-delete-account"
              >
                Delete Account
              </button>
            </div>

          </div>

        </div>
      </div>
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
