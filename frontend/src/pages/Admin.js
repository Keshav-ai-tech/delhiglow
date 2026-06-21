import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const DELHI_AREAS = ['South Delhi', 'West Delhi', 'Central Delhi', 'North Delhi', 'East Delhi'];

export default function Admin() {
  const navigate = useNavigate();
  
  // Auth & Session state
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');
  
  // Domain data state
  const [bookings, setBookings] = useState([]);
  const [salon, setSalon] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dashboard navigation state
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics', 'services', 'reviews', 'staff'
  
  // Search & Filter state (for bookings table)
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Reviews list and reply states
  const [reviews, setReviews] = useState([]);
  const [replyTexts, setReplyTexts] = useState({}); // reviewId -> replyText
  const [replyErrors, setReplyErrors] = useState({});
  const [replySuccess, setReplySuccess] = useState('');
  const [staffCanReplySetting, setStaffCanReplySetting] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState('');

  // Concierge booking form state
  const [showForm, setShowForm] = useState(false);
  const [newBooking, setNewBooking] = useState({ service: '', name: '', phone: '', email: '', date: '', time: '' });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Service management state
  const [showAddService, setShowAddService] = useState(false);
  const [serviceForm, setServiceForm] = useState({ name: '', price: '', duration: '1 hr' });
  const [editingService, setEditingService] = useState(null);
  const [editServiceForm, setEditServiceForm] = useState({ name: '', price: '', duration: '' });
  const [serviceError, setServiceError] = useState('');
  
  // Timing management state
  const [timingForm, setTimingForm] = useState({ timings: '', closed_on: '' });
  const [timingSuccess, setTimingSuccess] = useState('');

  // Staff management state
  const [staffForm, setStaffForm] = useState({ name: '', email: '', phone: '' });
  const [generatedStaffCreds, setGeneratedStaffCreds] = useState(null);
  const [staffError, setStaffError] = useState('');

  // ================= ONBOARDING WIZARD STATE =================
  const [onboardStep, setOnboardStep] = useState(1);
  const [onboardForm, setOnboardForm] = useState({
    name: '',
    speciality: 'Bridal & HD Makeup',
    city: 'New Delhi',
    area: 'South Delhi',
    location: '',
    latitude: 28.6139,
    longitude: 77.2090,
    contact: '',
    email: '',
    whatsapp: '',
    timings: '10:00 AM – 8:00 PM',
    closed_on: 'None',
    about: '',
    image: '',
    photos: [],
    services: []
  });
  const [onboardServiceInput, setOnboardServiceInput] = useState({ name: '', price: '', duration: '1 hr' });
  const [onboardError, setOnboardError] = useState('');
  const [onboardSubmitting, setOnboardSubmitting] = useState(false);

  // Map refs
  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markerRef = useRef(null);

  const fetchReviewsList = (salonId) => {
    fetch(`/api/reviews/salon/${salonId}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setReviews(d.data || []);
      })
      .catch(err => console.error('Failed to load reviews:', err));
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
      navigate('/auth', { state: { from: '/admin' } });
      return;
    }
    
    const userObj = JSON.parse(savedUser);
    if (userObj.role !== 'owner' && userObj.role !== 'staff') {
      navigate('/');
      return;
    }
    
    setUser(userObj);
    setToken(userObj.token);
    
    const headers = { 'Authorization': `Bearer ${userObj.token}` };
    
    Promise.all([
      fetch('/api/admin/bookings', { headers }).then(r => r.json()),
      fetch('/api/admin/salon', { headers }).then(r => r.json()),
      userObj.role === 'owner' ? fetch('/api/admin/staff', { headers }).then(r => r.json()) : Promise.resolve({ data: [] })
    ])
      .then(([bookingsRes, salonRes, staffRes]) => {
        if (bookingsRes.success) setBookings(bookingsRes.data || []);
        if (salonRes.success && salonRes.data) {
          setSalon(salonRes.data);
          setStaffCanReplySetting(!!salonRes.data.staff_can_reply);
          setTimingForm({
            timings: salonRes.data.timings || '10:00 AM – 8:00 PM',
            closed_on: salonRes.data.closed_on || 'None'
          });
          setOnboardForm(prev => ({
            ...prev,
            name: salonRes.data.name || '',
            area: salonRes.data.area || 'South Delhi',
            location: salonRes.data.location || '',
            contact: salonRes.data.contact || userObj.phone || '',
            email: salonRes.data.email || userObj.email || '',
            timings: salonRes.data.timings || '10:00 AM – 8:00 PM',
            closed_on: salonRes.data.closed_on || 'None'
          }));
          fetchReviewsList(salonRes.data.id);
        }
        if (staffRes.success) setStaffList(staffRes.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to retrieve dashboard registry data:', err);
        setLoading(false);
      });
  }, [navigate]);

  // ================= LEAFLET MAP PICKER =================
  useEffect(() => {
    // Only initialize map if we are on step 2, container is rendered, and Leaflet is available
    if (onboardStep === 2 && mapContainerRef.current && window.L && !leafletMapRef.current) {
      const initialLat = onboardForm.latitude;
      const initialLng = onboardForm.longitude;

      try {
        const map = window.L.map(mapContainerRef.current).setView([initialLat, initialLng], 13);
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        const marker = window.L.marker([initialLat, initialLng], { draggable: true }).addTo(map);

        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          setOnboardForm(prev => ({ ...prev, latitude: pos.lat, longitude: pos.lng }));
          
          // Reverse geocode to fetch formatted address
          fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.lat}&lon=${pos.lng}&format=json`)
            .then(r => r.json())
            .then(data => {
              if (data && data.display_name) {
                setOnboardForm(prev => ({ ...prev, location: data.display_name }));
              }
            })
            .catch(() => {});
        });

        leafletMapRef.current = map;
        markerRef.current = marker;
      } catch (err) {
        console.error('Failed to initialize Leaflet Map:', err);
      }
    }

    // Cleanup map on unmount/step change
    return () => {
      if (onboardStep !== 2 && leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [onboardStep]);

  // Search address and update map marker
  const handleMapSearch = async (e) => {
    e.preventDefault();
    const query = onboardForm.location;
    if (!query) return;

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setOnboardForm(prev => ({
          ...prev,
          latitude: lat,
          longitude: lon,
          location: data[0].display_name
        }));

        if (leafletMapRef.current && markerRef.current) {
          leafletMapRef.current.setView([lat, lon], 14);
          markerRef.current.setLatLng([lat, lon]);
        }
      } else {
        alert('Location not found. Please try entering a different landmark or address.');
      }
    } catch {
      alert('Location search failed. Please drop a pin manually on the map.');
    }
  };

  // ================= ONBOARDING PHOTO COMPRESSION =================
  const handleOnboardPhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    if (onboardForm.photos.length + files.length > 6) {
      alert('You can upload a maximum of 6 photos.');
      return;
    }

    files.forEach(file => {
      if (!file.type.match('image.*')) {
        alert('Only image files (JPG, PNG, WEBP) are supported.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Compress using canvas to ensure lightweight uploads
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

          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.72);
          
          // Upload to server static folder
          fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: file.name, base64: compressedBase64 })
          })
            .then(r => r.json())
            .then(res => {
              if (res.success) {
                setOnboardForm(prev => {
                  const newPhotos = [...prev.photos, res.url];
                  return {
                    ...prev,
                    photos: newPhotos,
                    image: prev.image || res.url // first photo becomes cover
                  };
                });
              } else {
                alert(res.message || 'Image upload failed');
              }
            })
            .catch(() => alert('Image upload failed due to connection error'));
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const removeOnboardPhoto = (idx) => {
    setOnboardForm(prev => {
      const newPhotos = prev.photos.filter((_, i) => i !== idx);
      return {
        ...prev,
        photos: newPhotos,
        image: prev.image === prev.photos[idx] ? (newPhotos[0] || '') : prev.image
      };
    });
  };

  // ================= ONBOARDING SERVICE MANAGEMENT =================
  const addOnboardService = () => {
    if (!onboardServiceInput.name || !onboardServiceInput.price) {
      alert('Please fill service name and price.');
      return;
    }
    setOnboardForm(prev => ({
      ...prev,
      services: [...prev.services, { 
        name: onboardServiceInput.name, 
        price: parseInt(onboardServiceInput.price), 
        duration: onboardServiceInput.duration || '1 hr' 
      }]
    }));
    setOnboardServiceInput({ name: '', price: '', duration: '1 hr' });
  };

  const removeOnboardService = (idx) => {
    setOnboardForm(prev => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== idx)
    }));
  };

  // ================= SUBMIT ONBOARDING WIZARD =================
  const handleOnboardingSubmit = async () => {
    setOnboardError('');
    
    // Validations
    if (onboardForm.services.length < 3) {
      setOnboardError('Onboarding requires adding at least 3 beauty/bridal services.');
      setOnboardStep(4);
      return;
    }
    if (onboardForm.photos.length < 3) {
      setOnboardError('Onboarding requires uploading at least 3 high-quality sanctuary photos.');
      setOnboardStep(5);
      return;
    }
    const bioLength = onboardForm.about.trim().length;
    if (bioLength < 150 || bioLength > 200) {
      setOnboardError(`Short description/bio must be between 150 and 200 characters (current length: ${bioLength}).`);
      setOnboardStep(1);
      return;
    }

    setOnboardSubmitting(true);
    try {
      const res = await fetch('/api/admin/salon/onboard', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(onboardForm)
      });
      const data = await res.json();
      if (data.success) {
        setSalon(data.data);
        setTimingForm({ timings: data.data.timings, closed_on: data.data.closed_on });
        // Successful onboarding redirects to active admin view
      } else {
        setOnboardError(data.message || 'Onboarding submission failed.');
      }
    } catch {
      setOnboardError('Network error. Please try submitting again.');
    } finally {
      setOnboardSubmitting(false);
    }
  };

  // ================= GENERAL BUSINESS CONTROLS =================

  // Price lookup helper based on salon services
  const getServicePrice = (booking) => {
    if (salon) {
      const service = salon.services.find(svc => svc.name === booking.service);
      if (service) return service.price;
    }
    return 3500;
  };

  // Status transition handler (PATCH route integration)
  const handleStatusChange = (bookingId, newStatus) => {
    fetch(`/api/admin/bookings/${bookingId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: newStatus })
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
        }
      })
      .catch(err => console.error('Error updating status:', err));
  };

  // Concierge manual booking form submit handler
  const handleConciergeBook = (e) => {
    e.preventDefault();
    setFormError('');

    if (!salon) return;
    if (!newBooking.service) {
      setFormError('Please select an adornment service ritual.');
      return;
    }
    if (!newBooking.name || !newBooking.phone || !newBooking.date || !newBooking.time) {
      setFormError('Please fill in all required fields.');
      return;
    }

    setFormSubmitting(true);
    fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newBooking,
        salon_id: salon.id,
        salon_name: salon.name
      })
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setBookings(prev => [res.data, ...prev]);
          setShowForm(false);
          setNewBooking({ service: '', name: '', phone: '', email: '', date: '', time: '' });
        } else {
          setFormError(res.message || 'Failed to create booking.');
        }
        setFormSubmitting(false);
      })
      .catch(err => {
        console.error('Error creating concierge booking:', err);
        setFormError('Network error. Please try again.');
        setFormSubmitting(false);
      });
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('All');
  };

  // ================= RITUAL SERVICES MANAGEMENT =================
  const handleAddService = (e) => {
    e.preventDefault();
    setServiceError('');

    if (!serviceForm.name || !serviceForm.price || !serviceForm.duration) {
      setServiceError('Please fill in all service details.');
      return;
    }

    fetch('/api/admin/services', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(serviceForm)
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setSalon(prev => ({ ...prev, services: res.data }));
          setServiceForm({ name: '', price: '', duration: '1 hr' });
          setShowAddService(false);
        } else {
          setServiceError(res.message || 'Failed to add service.');
        }
      })
      .catch(() => setServiceError('Network error.'));
  };

  const handleEditServiceSubmit = (e) => {
    e.preventDefault();
    setServiceError('');

    const payload = {
      newName: editServiceForm.name,
      duration: editServiceForm.duration,
      ...(user.role === 'owner' && { price: editServiceForm.price })
    };

    fetch(`/api/admin/services/${encodeURIComponent(editingService)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setSalon(prev => ({ ...prev, services: res.data }));
          setEditingService(null);
        } else {
          setServiceError(res.message || 'Failed to modify service.');
        }
      })
      .catch(() => setServiceError('Network error.'));
  };

  const handleDeleteService = (serviceName) => {
    if (!window.confirm(`Are you sure you want to remove the service "${serviceName}"?`)) return;

    fetch(`/api/admin/services/${encodeURIComponent(serviceName)}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setSalon(prev => ({ ...prev, services: res.data }));
        } else {
          alert(res.message || 'Failed to delete service.');
        }
      })
      .catch(() => alert('Network error.'));
  };

  // ================= SALON PHOTOS GALLERY MANAGEMENT =================
  const updateSalonPhotosApi = (updatedPhotos, updatedCover) => {
    fetch('/api/admin/salon/photos', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ photos: updatedPhotos, image: updatedCover })
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setSalon(prev => ({ ...prev, photos: res.data.photos, image: res.data.image }));
        } else {
          alert(res.message || 'Failed to update salon photos.');
        }
      })
      .catch(() => alert('Network error updating salon photos.'));
  };

  const handleSetCover = (photoUrl) => {
    const updatedPhotos = salon?.photos || [];
    updateSalonPhotosApi(updatedPhotos, photoUrl);
  };

  const handleRemoveSalonPhoto = (photoUrl) => {
    if (!window.confirm('Are you sure you want to remove this photo?')) return;
    const updatedPhotos = (salon?.photos || []).filter(ph => ph !== photoUrl);
    let updatedCover = salon?.image;
    if (updatedCover === photoUrl) {
      updatedCover = updatedPhotos[0] || '';
    }
    updateSalonPhotosApi(updatedPhotos, updatedCover);
  };

  const handleAddSalonPhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.match('image.*')) {
      alert('Only image files (JPG, PNG, WEBP) are supported.');
      return;
    }

    if ((salon?.photos || []).length >= 6) {
      alert('You can upload a maximum of 6 photos.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
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

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.72);
        
        fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: file.name, base64: compressedBase64 })
        })
          .then(r => r.json())
          .then(res => {
            if (res.success) {
              const updatedPhotos = [...(salon?.photos || []), res.url];
              const updatedCover = salon?.image || res.url;
              updateSalonPhotosApi(updatedPhotos, updatedCover);
            } else {
              alert(res.message || 'Image upload failed.');
            }
          })
          .catch(() => alert('Image upload failed due to connection error.'));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // ================= SALON TIMINGS EDITORS =================
  const handleTimingSubmit = (e) => {
    e.preventDefault();
    setTimingSuccess('');

    fetch('/api/admin/salon/timings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(timingForm)
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setSalon(prev => ({ ...prev, timings: res.data.timings, closed_on: res.data.closed_on }));
          setTimingSuccess('Sanctuary hours updated successfully!');
          setTimeout(() => setTimingSuccess(''), 3000);
        }
      })
      .catch(() => alert('Failed to update timings.'));
  };

  // ================= REVIEWS MANAGEMENT (REPLY & SETTINGS) =================
  const handleReplySubmit = (reviewId) => {
    const text = replyTexts[reviewId];
    if (!text || text.trim() === '') {
      alert('Reply content cannot be empty.');
      return;
    }

    setReplyErrors(prev => ({ ...prev, [reviewId]: '' }));
    fetch(`/api/admin/reviews/${reviewId}/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ text })
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setReplySuccess('Reply published successfully!');
          setReplyTexts(prev => ({ ...prev, [reviewId]: '' }));
          fetchReviewsList(salon.id);
          setTimeout(() => setReplySuccess(''), 3000);
        } else {
          setReplyErrors(prev => ({ ...prev, [reviewId]: res.message || 'Failed to reply.' }));
        }
      })
      .catch(() => setReplyErrors(prev => ({ ...prev, [reviewId]: 'Network error' })));
  };

  const handleToggleStaffReply = (value) => {
    setSettingsSuccess('');
    fetch('/api/admin/salon/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ staff_can_reply: value })
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setStaffCanReplySetting(value);
          setSalon(prev => ({ ...prev, staff_can_reply: value }));
          setSettingsSuccess(`Staff reply permissions have been ${value ? 'enabled' : 'disabled'}!`);
          setTimeout(() => setSettingsSuccess(''), 3000);
        }
      })
      .catch(() => alert('Failed to update settings.'));
  };

  // ================= STAFF REGISTRATION =================
  const handleAddStaff = (e) => {
    e.preventDefault();
    setStaffError('');
    setGeneratedStaffCreds(null);

    if (!staffForm.name || !staffForm.email || !staffForm.phone) {
      setStaffError('Please provide all staff contact details.');
      return;
    }

    fetch('/api/admin/staff', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(staffForm)
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setStaffList(prev => [...prev, {
            id: res.data.id,
            name: res.data.name,
            email: res.data.email,
            phone: res.data.phone
          }]);
          setGeneratedStaffCreds({
            name: res.data.name,
            email: res.data.email,
            password: res.data.generatedPassword
          });
          setStaffForm({ name: '', email: '', phone: '' });
        } else {
          setStaffError(res.message || 'Failed to create staff member.');
        }
      })
      .catch(() => setStaffError('Network error.'));
  };

  const handleDeleteStaff = (staffId, staffName) => {
    if (!window.confirm(`Are you sure you want to delete staff account for "${staffName}"?`)) return;

    fetch(`/api/admin/staff/${staffId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setStaffList(prev => prev.filter(s => s.id !== staffId));
        } else {
          alert(res.message || 'Failed to remove staff.');
        }
      })
      .catch(() => alert('Network error.'));
  };

  if (loading) {
    return (
      <section className="section section-ivory" style={{ minHeight: '90vh' }}>
        <div className="container" style={{ textAlign: 'center', paddingTop: '100px' }}>
          <div className="loading">Retrieving registry database...</div>
        </div>
      </section>
    );
  }

  // ================= ONBOARDING SETUP WIZARD VIEW =================
  if (salon && salon.active === false) {
    const minPrice = onboardForm.services.length > 0 
      ? Math.min(...onboardForm.services.map(s => s.price)) 
      : 0;

    return (
      <section className="section section-ivory" style={{ minHeight: '90vh', position: 'relative' }}>
        <div className="jaali-pattern-bg" />
        
        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          
          <div className="filter-section-header" style={{ marginBottom: '36px' }}>
            <h1 className="section-title">Configure Your <span>Sanctuary</span></h1>
            <p className="section-sub">
              Onboard your beauty business to the DelhiGlow directory. Please complete the mandatory details.
            </p>
          </div>

          {onboardError && (
            <div style={{ background: '#FFF0F2', border: '1px solid rgba(122, 12, 46, 0.2)', color: 'var(--crimson)', padding: '16px 20px', borderRadius: 'var(--radius-sm)', fontSize: '14px', marginBottom: '28px', maxWidth: '1000px', margin: '0 auto 28px' }}>
              ✕ {onboardError}
            </div>
          )}

          {/* Onboarding progress bar */}
          <div className="onboarding-progress-container" style={{ maxWidth: '1000px', margin: '0 auto 32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '14px' }}>
              <span>Onboarding Progress</span>
              <span>Step {onboardStep} of 5</span>
            </div>
            <div className="onboarding-progress-bar-bg">
              <div className="onboarding-progress-bar-fill" style={{ width: `${onboardStep * 20}%` }} />
            </div>
            <div className="onboarding-step-indicator">
              <span className={onboardStep === 1 ? 'active' : ''}>1. Bio</span>
              <span className={onboardStep === 2 ? 'active' : ''}>2. Location</span>
              <span className={onboardStep === 3 ? 'active' : ''}>3. Schedule</span>
              <span className={onboardStep === 4 ? 'active' : ''}>4. Catalogue</span>
              <span className={onboardStep === 5 ? 'active' : ''}>5. Media</span>
            </div>
          </div>

          <div className="onboarding-container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            
            {/* Left: Wizard Form Card */}
            <div className="luxury-card" style={{ padding: '36px' }}>
              
              {/* STEP 1: GENERAL & BIO */}
              {onboardStep === 1 && (
                <div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--crimson)', borderBottom: '1px solid var(--ivory-dark)', paddingBottom: '12px', marginBottom: '24px' }}>
                    ✦ Section I: General Profile & Bio
                  </h3>
                  
                  <div className="form-group">
                    <label>Salon / Sanctuary Name *</label>
                    <input
                      type="text"
                      value={onboardForm.name}
                      onChange={e => setOnboardForm({ ...onboardForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Couture Speciality *</label>
                    <input
                      type="text"
                      placeholder="e.g. Bridal & HD Makeup, Luxury Hair Transformations"
                      value={onboardForm.speciality}
                      onChange={e => setOnboardForm({ ...onboardForm, speciality: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Marketplace City *</label>
                    <select 
                      value={onboardForm.city}
                      onChange={e => setOnboardForm({ ...onboardForm, city: e.target.value })}
                      required
                    >
                      <option value="New Delhi">New Delhi</option>
                      <option value="Noida">Noida</option>
                      <option value="Gurugram">Gurugram</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Delhi Region/Quarter *</label>
                    <select 
                      value={onboardForm.area}
                      onChange={e => setOnboardForm({ ...onboardForm, area: e.target.value })}
                      required
                    >
                      {DELHI_AREAS.map(area => (
                        <option key={area} value={area}>{area}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Short Description / Biography * (Must be 150-200 characters)</label>
                    <textarea
                      placeholder="Describe your beauty philosophy, experience, and the premium nature of your studio..."
                      value={onboardForm.about}
                      onChange={e => setOnboardForm({ ...onboardForm, about: e.target.value })}
                      required
                      style={{ width: '100%', height: '110px', padding: '12px', border: '1.5px solid var(--ivory-dark)', borderRadius: 'var(--radius-sm)', background: 'var(--ivory)', outline: 'none', fontFamily: 'var(--font-body)', fontSize: '14.5px' }}
                    />
                    <div style={{ fontSize: '12px', color: onboardForm.about.trim().length >= 150 && onboardForm.about.trim().length <= 200 ? '#1a7a4a' : 'var(--crimson)', marginTop: '4px', textAlign: 'right' }}>
                      {onboardForm.about.trim().length} / 200 characters (min 150)
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: LOCATION & MAP PICKER */}
              {onboardStep === 2 && (
                <div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--crimson)', borderBottom: '1px solid var(--ivory-dark)', paddingBottom: '12px', marginBottom: '24px' }}>
                    ✦ Section II: Sanctuary Location & Coordinate Registry
                  </h3>

                  <div className="form-group">
                    <label>Search and drop a pin on the map or enter full address *</label>
                    <form onSubmit={handleMapSearch} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                      <input
                        type="text"
                        placeholder="Enter street address, quarter, landmark..."
                        value={onboardForm.location}
                        onChange={e => setOnboardForm({ ...onboardForm, location: e.target.value })}
                        required
                        style={{ flex: 1 }}
                      />
                      <button type="submit" className="filter-btn active" style={{ padding: '0 20px', borderRadius: 'var(--radius-sm)' }}>Find Address</button>
                    </form>
                  </div>

                  {/* Leaflet Map Div */}
                  <div className="form-group">
                    <label>Interactive Map Pick (Drag marker to pin exact location):</label>
                    <div ref={mapContainerRef} className="map-picker-container" id="map-picker" />
                    <div className="map-coords-badge">
                      Coordinates: Latitude {onboardForm.latitude.toFixed(6)}, Longitude {onboardForm.longitude.toFixed(6)}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: CONTACT & HOURS */}
              {onboardStep === 3 && (
                <div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--crimson)', borderBottom: '1px solid var(--ivory-dark)', paddingBottom: '12px', marginBottom: '24px' }}>
                    ✦ Section III: Contact Desk & Timings
                  </h3>

                  <div className="form-group">
                    <label>Contact Phone Number *</label>
                    <input
                      type="tel"
                      value={onboardForm.contact}
                      onChange={e => setOnboardForm({ ...onboardForm, contact: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Business Email Desk *</label>
                    <input
                      type="email"
                      value={onboardForm.email}
                      onChange={e => setOnboardForm({ ...onboardForm, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>WhatsApp Concierge Number (Optional)</label>
                    <input
                      type="tel"
                      placeholder="+91 XXXXX XXXXX"
                      value={onboardForm.whatsapp}
                      onChange={e => setOnboardForm({ ...onboardForm, whatsapp: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Operating Hours *</label>
                    <input
                      type="text"
                      placeholder="e.g. 10:00 AM – 8:00 PM"
                      value={onboardForm.timings}
                      onChange={e => setOnboardForm({ ...onboardForm, timings: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Weekly Closed Days *</label>
                    <input
                      type="text"
                      placeholder="e.g. Monday, or None"
                      value={onboardForm.closed_on}
                      onChange={e => setOnboardForm({ ...onboardForm, closed_on: e.target.value })}
                      required
                    />
                  </div>
                </div>
              )}

              {/* STEP 4: SERVICES & PRICING */}
              {onboardStep === 4 && (
                <div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--crimson)', borderBottom: '1px solid var(--ivory-dark)', paddingBottom: '12px', marginBottom: '24px' }}>
                    ✦ Section IV: Service Curation Catalog (Add Minimum 3)
                  </h3>

                  <div style={{ background: 'var(--ivory)', padding: '20px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', marginBottom: '24px' }}>
                    <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: '12px', color: 'var(--crimson)' }}>
                      Add Adornment Ritual
                    </h4>
                    
                    <div className="form-group">
                      <label>Ritual / Service Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Royal Airbrush Bridal Makeup"
                        value={onboardServiceInput.name}
                        onChange={e => setOnboardServiceInput({ ...onboardServiceInput, name: e.target.value })}
                      />
                    </div>

                    <div className="admin-input-grid">
                      <div className="form-group">
                        <label>Price (₹) *</label>
                        <input
                          type="number"
                          placeholder="e.g. 15000"
                          value={onboardServiceInput.price}
                          onChange={e => setOnboardServiceInput({ ...onboardServiceInput, price: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label>Duration *</label>
                        <input
                          type="text"
                          placeholder="e.g. 3 hrs"
                          value={onboardServiceInput.duration}
                          onChange={e => setOnboardServiceInput({ ...onboardServiceInput, duration: e.target.value })}
                        />
                      </div>
                    </div>

                    <button type="button" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={addOnboardService}>
                      Add Service Curation
                    </button>
                  </div>

                  <div>
                    <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', marginBottom: '12px' }}>Added Services ({onboardForm.services.length})</h4>
                    {onboardForm.services.length === 0 ? (
                      <p style={{ fontSize: '13.5px', color: 'var(--crimson)', fontStyle: 'italic' }}>Please add at least 3 services to satisfy onboarding.</p>
                    ) : (
                      <div style={{ display: 'grid', gap: '8px' }}>
                        {onboardForm.services.map((s, idx) => (
                          <div key={idx} style={{ background: 'var(--white)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--ivory-dark)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontWeight: 600 }}>{s.name}</div>
                              <div style={{ fontSize: '12px', color: 'var(--charcoal-light)' }}>Duration: {s.duration}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                              <strong style={{ color: 'var(--crimson)' }}>₹{s.price}</strong>
                              <button type="button" className="btn-outline" style={{ padding: '2px 8px', fontSize: '11px', borderColor: 'rgba(122,12,46,0.2)' }} onClick={() => removeOnboardService(idx)}>✕</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 5: PHOTO GALLERY */}
              {onboardStep === 5 && (
                <div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--crimson)', borderBottom: '1px solid var(--ivory-dark)', paddingBottom: '12px', marginBottom: '24px' }}>
                    ✦ Section V: Visual Gallery (Add Minimum 3)
                  </h3>

                  <div className="form-group">
                    <label>Select Cover and Gallery Photos *</label>
                    <input
                      type="file"
                      accept="image/jpeg, image/png, image/webp"
                      onChange={handleOnboardPhotoUpload}
                      multiple
                      disabled={onboardForm.photos.length >= 6}
                    />
                    <div style={{ fontSize: '11px', color: 'var(--charcoal-light)', marginTop: '6px' }}>
                      Upload at least 3 photos. First uploaded image serves as the Directory cover. Previews are compressed upon selection.
                    </div>
                  </div>

                  {onboardForm.photos.length > 0 && (
                    <div>
                      <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', marginBottom: '12px' }}>Sanctuary Photo Feed</h4>
                      <div className="photo-preview-grid">
                        {onboardForm.photos.map((ph, idx) => (
                          <div key={idx} className="photo-preview-item" style={{ width: '100px', height: '100px' }}>
                            <img src={ph} className="photo-preview-img" alt="Gallery preview" />
                            {onboardForm.image === ph && (
                              <span style={{ position: 'absolute', bottom: '0', left: '0', right: '0', background: 'var(--gold)', color: 'var(--charcoal)', fontSize: '9px', fontWeight: 700, textAlign: 'center', padding: '2px 0', textTransform: 'uppercase' }}>Cover</span>
                            )}
                            <button type="button" className="photo-preview-remove" onClick={() => removeOnboardPhoto(idx)}>✕</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Navigation controls */}
              <div className="onboarding-nav-btns">
                {onboardStep > 1 ? (
                  <button type="button" className="btn-outline" onClick={() => setOnboardStep(onboardStep - 1)}>
                    ➔ Back
                  </button>
                ) : <div />}
                
                {onboardStep < 5 ? (
                  <button type="button" className="btn-primary" onClick={() => setOnboardStep(onboardStep + 1)}>
                    Continue ➔
                  </button>
                ) : (
                  <button type="button" className="btn-primary" onClick={handleOnboardingSubmit} disabled={onboardSubmitting || onboardForm.services.length < 3 || onboardForm.photos.length < 3}>
                    {onboardSubmitting ? 'Submitting profiles...' : 'Publish Sanctuary Live ✦'}
                  </button>
                )}
              </div>

            </div>

            {/* Right: Live Preview Panel */}
            <div className="onboarding-preview-col">
              <div style={{ position: 'sticky', top: '110px' }}>
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', marginBottom: '16px', borderLeft: '3px solid var(--gold)', paddingLeft: '8px' }}>
                  Live Marketplace Preview
                </h4>
                
                {/* Mock Card */}
                <div className="salon-card" style={{ cursor: 'default' }}>
                  <div className="salon-card-image-wrapper" style={{ height: '200px' }}>
                    <img 
                      className="salon-card-img" 
                      src={onboardForm.image || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600'} 
                      alt="Placeholder cover" 
                    />
                    <div className="salon-card-overlay" />
                    <span className="gold-badge salon-card-badge">{onboardForm.speciality || 'Luxury Studio'}</span>
                  </div>
                  
                  <div className="salon-card-body" style={{ padding: '20px' }}>
                    <div className="salon-card-top">
                      <div className="salon-card-name" style={{ fontSize: '1.15rem' }}>{onboardForm.name || 'Your Sanctuary Name'}</div>
                      <div className="salon-card-price" style={{ fontSize: '12px' }}>Starting: ₹{minPrice.toLocaleString('en-IN')}</div>
                    </div>
                    
                    <div className="salon-card-location" style={{ fontSize: '12px', margin: '4px 0 12px' }}>
                      <span>📍</span> {onboardForm.location ? (onboardForm.location.slice(0, 45) + '...') : 'Quarter location address details...'}
                    </div>
                    
                    <div className="salon-card-rating" style={{ fontSize: '13px', borderTop: '1px dashed var(--ivory-dark)', paddingTop: '8px', paddingBottom: '0', marginBottom: '0' }}>
                      <span className="star">★</span>
                      <span className="salon-card-rating-num" style={{ fontWeight: 600 }}>5.0</span>
                      <span style={{ color: 'var(--charcoal-light)', fontSize: '11px', fontWeight: 300 }}>
                        (0 reviews)
                      </span>
                      <span style={{ marginLeft: 'auto', fontWeight: 600, color: 'var(--gold)', fontSize: '12px' }}>
                        ₹₹₹
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '16px', background: 'var(--white)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', fontSize: '12.5px', color: 'var(--charcoal-light)', lineHeight: '1.5' }}>
                  <strong>Bio Preview:</strong> "{onboardForm.about || 'A short description of your salon. Must be between 150 and 200 characters.'}"
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>
    );
  }

  // ================= STANDARD ADMIN DASHBOARD PANEL =================
  const nonCancelledBookings = bookings.filter(b => b.status !== 'cancelled');
  const estimatedRevenue = nonCancelledBookings.reduce((sum, b) => sum + getServicePrice(b), 0);
  const platformCommission = Math.round(estimatedRevenue * 0.15);
  const activeCount = bookings.filter(b => b.status === 'confirmed').length;
  const completedCount = bookings.filter(b => b.status === 'completed').length;
  const cancelledCount = bookings.filter(b => b.status === 'cancelled').length;

  const totalBookingsCount = bookings.length || 1;
  const bookingsByService = {};
  if (salon) {
    salon.services.forEach(svc => { bookingsByService[svc.name] = 0; });
  }
  bookings.forEach(b => {
    if (bookingsByService[b.service] !== undefined) {
      bookingsByService[b.service]++;
    } else {
      bookingsByService[b.service] = 1;
    }
  });

  const filteredBookings = bookings.filter(b => {
    const matchesSearch = 
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.phone.includes(search) ||
      b.service.toLowerCase().includes(search.toLowerCase()) ||
      String(b.id).includes(search);
    const matchesStatus = statusFilter === 'All' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const isFilterActive = search !== '' || statusFilter !== 'All';

  return (
    <section className="section section-ivory" style={{ minHeight: '90vh', position: 'relative' }}>
      <div className="jaali-pattern-bg" />
      
      <div className="container" style={{ position: 'relative', zIndex: 2 }}>
        
        {/* Header Title */}
        <div className="filter-section-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '28px' }}>
          <h1 className="section-title">
            {salon?.name} <span>Registry Portal</span>
          </h1>
          <p className="section-sub" style={{ marginBottom: '16px' }}>
            Administrative command center for {user?.role === 'owner' ? 'Salon Owner' : 'Salon Staff'} operations.
          </p>
          <span className="gold-badge" style={{ textTransform: 'uppercase', letterSpacing: '2px', padding: '6px 20px', fontSize: '11px', fontWeight: 600 }}>
            Role: {user?.role === 'owner' ? 'Owner (Full Access)' : 'Staff (Limited Access)'}
          </span>
        </div>

        {/* Dynamic Tab Switcher */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--ivory-dark)', marginBottom: '32px', paddingBottom: '2px', overflowX: 'auto' }}>
          <button 
            onClick={() => setActiveTab('analytics')}
            style={{
              padding: '12px 24px',
              background: activeTab === 'analytics' ? 'var(--white)' : 'transparent',
              border: '1px solid transparent',
              borderBottom: activeTab === 'analytics' ? '3px solid var(--gold)' : 'none',
              fontFamily: 'var(--font-display)',
              fontSize: '1.1rem',
              fontWeight: activeTab === 'analytics' ? 700 : 500,
              color: activeTab === 'analytics' ? 'var(--crimson)' : 'var(--charcoal-light)',
              cursor: 'pointer',
              borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
              whiteSpace: 'nowrap'
            }}
          >
            ❀ Registry & Analytics
          </button>
          <button 
            onClick={() => setActiveTab('services')}
            style={{
              padding: '12px 24px',
              background: activeTab === 'services' ? 'var(--white)' : 'transparent',
              border: '1px solid transparent',
              borderBottom: activeTab === 'services' ? '3px solid var(--gold)' : 'none',
              fontFamily: 'var(--font-display)',
              fontSize: '1.1rem',
              fontWeight: activeTab === 'services' ? 700 : 500,
              color: activeTab === 'services' ? 'var(--crimson)' : 'var(--charcoal-light)',
              cursor: 'pointer',
              borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
              whiteSpace: 'nowrap'
            }}
          >
            ✦ Profile & Service Catalog
          </button>
          
          <button 
            onClick={() => setActiveTab('reviews')}
            style={{
              padding: '12px 24px',
              background: activeTab === 'reviews' ? 'var(--white)' : 'transparent',
              border: '1px solid transparent',
              borderBottom: activeTab === 'reviews' ? '3px solid var(--gold)' : 'none',
              fontFamily: 'var(--font-display)',
              fontSize: '1.1rem',
              fontWeight: activeTab === 'reviews' ? 700 : 500,
              color: activeTab === 'reviews' ? 'var(--crimson)' : 'var(--charcoal-light)',
              cursor: 'pointer',
              borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
              whiteSpace: 'nowrap'
            }}
          >
            ❀ Customer Reviews
          </button>

          {user?.role === 'owner' && (
            <button 
              onClick={() => setActiveTab('staff')}
              style={{
                padding: '12px 24px',
                background: activeTab === 'staff' ? 'var(--white)' : 'transparent',
                border: '1px solid transparent',
                borderBottom: activeTab === 'staff' ? '3px solid var(--gold)' : 'none',
                fontFamily: 'var(--font-display)',
                fontSize: '1.1rem',
                fontWeight: activeTab === 'staff' ? 700 : 500,
                color: activeTab === 'staff' ? 'var(--crimson)' : 'var(--charcoal-light)',
                cursor: 'pointer',
                borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                whiteSpace: 'nowrap'
              }}
            >
              👥 Staff Registry
            </button>
          )}
        </div>

        {/* TAB 1: REGISTRY & ANALYTICS */}
        {activeTab === 'analytics' && (
          <>
            {/* Interactive Analytics Cards */}
            <div className="admin-metrics-grid">
              <div className="admin-metric-card">
                <div className="admin-metric-icon">❀</div>
                <div className="admin-metric-info">
                  <h3>{bookings.length}</h3>
                  <span>Total Sessions</span>
                </div>
              </div>

              <div className="admin-metric-card">
                <div className="admin-metric-icon">₹</div>
                <div className="admin-metric-info">
                  <h3>₹{estimatedRevenue.toLocaleString('en-IN')}</h3>
                  <span>Secured Est. Value</span>
                </div>
              </div>

              <div className="admin-metric-card">
                <div className="admin-metric-icon">✦</div>
                <div className="admin-metric-info">
                  <h3>₹{platformCommission.toLocaleString('en-IN')}</h3>
                  <span>Glow Commission (15%)</span>
                </div>
              </div>

              <div className="admin-metric-card">
                <div className="admin-metric-icon">✓</div>
                <div className="admin-metric-info">
                  <h3>{activeCount} / {completedCount}</h3>
                  <span>Active / Completed</span>
                </div>
              </div>
            </div>

            {/* Performance charts widgets */}
            {bookings.length > 0 && (
              <div className="admin-charts-grid">
                
                {/* Chart 1: Service share inside this salon */}
                <div className="admin-chart-card">
                  <h3>Service Curation Share</h3>
                  <div style={{ marginTop: '20px' }}>
                    {Object.entries(bookingsByService)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 4)
                      .map(([svcName, count]) => {
                        const pct = Math.round((count / totalBookingsCount) * 100);
                        return (
                          <div key={svcName} className="admin-chart-row">
                            <div className="admin-chart-row-label">
                              <span style={{ fontWeight: 500 }}>{svcName}</span>
                              <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{count} ({pct}%)</span>
                            </div>
                            <div className="admin-chart-bar-bg">
                              <div className="admin-chart-bar-fill" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Chart 2: Status Breakdown */}
                <div className="admin-chart-card">
                  <h3>Status Lifecycle</h3>
                  <div style={{ marginTop: '20px' }}>
                    {[
                      { name: 'Confirmed Slots', count: activeCount, color: 'var(--gold)' },
                      { name: 'Completed Rituals', count: completedCount, color: '#1e62a1' },
                      { name: 'Cancelled Sessions', count: cancelledCount, color: 'var(--crimson)' }
                    ].map(st => {
                      const pct = Math.round((st.count / totalBookingsCount) * 100);
                      return (
                        <div key={st.name} className="admin-chart-row">
                          <div className="admin-chart-row-label">
                            <span style={{ fontWeight: 500 }}>{st.name}</span>
                            <span style={{ color: st.color, fontWeight: 600 }}>{st.count} ({pct}%)</span>
                          </div>
                          <div className="admin-chart-bar-bg">
                            <div className="admin-chart-bar-fill" style={{ width: `${pct}%`, background: st.color }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}

            {/* Quick entry toggle */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
              <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
                {showForm ? '✕ Close Concierge Form' : '✦ New Manual Booking'}
              </button>
            </div>

            {/* Concierge Manual Booking Form */}
            {showForm && (
              <div className="glass-filters-panel" style={{ marginBottom: '32px', animation: 'fadeIn 0.3s ease' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--crimson)', borderBottom: '1px solid var(--ivory-dark)', paddingBottom: '12px', marginBottom: '20px' }}>
                  ✦ Concierge Manual Booking Entry
                </h3>
                {formError && (
                  <div style={{ background: '#FFF0F2', border: '1px solid rgba(122, 12, 46, 0.2)', color: 'var(--crimson)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', fontSize: '13.5px', marginBottom: '20px' }}>
                    ✕ {formError}
                  </div>
                )}
                <form onSubmit={handleConciergeBook} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div className="form-group">
                    <label>Select Service *</label>
                    <select 
                      value={newBooking.service} 
                      onChange={e => setNewBooking({ ...newBooking, service: e.target.value })}
                      required
                    >
                      <option value="">Choose ritual...</option>
                      {salon?.services.map(svc => (
                        <option key={svc.name} value={svc.name}>{svc.name} (₹{svc.price})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Customer Name *</label>
                    <input
                      type="text"
                      placeholder="Enter name"
                      value={newBooking.name}
                      onChange={e => setNewBooking({ ...newBooking, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Contact Phone *</label>
                    <input
                      type="tel"
                      placeholder="+91 XXXXX XXXXX"
                      value={newBooking.phone}
                      onChange={e => setNewBooking({ ...newBooking, phone: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      placeholder="name@domain.com"
                      value={newBooking.email}
                      onChange={e => setNewBooking({ ...newBooking, email: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Preferred Date *</label>
                    <input
                      type="date"
                      value={newBooking.date}
                      onChange={e => setNewBooking({ ...newBooking, date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Preferred Time Slot *</label>
                    <select 
                      value={newBooking.time} 
                      onChange={e => setNewBooking({ ...newBooking, time: e.target.value })}
                      required
                    >
                      <option value="">Choose slot...</option>
                      {['10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button 
                      type="submit" 
                      className="btn-primary" 
                      style={{ width: '100%', height: '48px', justifyContent: 'center' }} 
                      disabled={formSubmitting}
                    >
                      {formSubmitting ? 'Securing...' : '✦ Confirm Entry'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Filter and Search Bar */}
            <div className="glass-filters-panel" style={{ marginBottom: '28px' }}>
              <div className="admin-filters-grid">
                
                <div className="search-bar-wrapper">
                  <input
                    type="text"
                    placeholder="Search customer name, contact phone, or service ritual..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div className="sort-select-wrapper" style={{ flex: 1 }}>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                      <option value="All">Filter: All Statuses</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  {isFilterActive && (
                    <button 
                      className="btn-outline" 
                      onClick={handleResetFilters}
                      style={{ padding: '0 16px', height: '48px', fontSize: '13.5px', borderRadius: 'var(--radius-lg)', whiteSpace: 'nowrap' }}
                    >
                      Reset
                    </button>
                  )}
                </div>

              </div>
            </div>

            {/* Bookings Table */}
            {filteredBookings.length === 0 ? (
              <div className="empty-state" style={{ background: 'var(--white)', padding: '64px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>❀</div>
                <h3>No registry items found</h3>
                <p style={{ marginTop: '8px', color: 'var(--charcoal-light)' }}>Try refining your search text or removing the filters.</p>
              </div>
            ) : (
              <div className="admin-table-container">
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        {['Registry ID', 'Service Ritual', 'Customer Name', 'Contact Info', 'Date / Time', 'Est. Value', 'Status Actions'].map(h => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBookings.map((b) => {
                        const price = getServicePrice(b);
                        return (
                          <tr key={b.id}>
                            <td style={{ color: 'var(--gold)', fontWeight: 500 }}>#{String(b.id).slice(-6)}</td>
                            <td style={{ fontStyle: 'italic', fontFamily: 'var(--font-display)', color: 'var(--crimson)' }}>{b.service}</td>
                            <td>{b.name}</td>
                            <td style={{ fontSize: '13.5px' }}>
                              <div>📞 {b.phone}</div>
                              {b.email && <div style={{ color: 'var(--charcoal-light)', fontSize: '12px' }}>✉ {b.email}</div>}
                            </td>
                            <td>
                              <div style={{ fontWeight: 500 }}>📅 {b.date}</div>
                              <div style={{ color: 'var(--charcoal-light)', fontSize: '12.5px' }}>⏱ {b.time}</div>
                            </td>
                            <td style={{ fontWeight: 600, color: 'var(--charcoal)' }}>₹{price.toLocaleString('en-IN')}</td>
                            <td>
                              <select 
                                value={b.status} 
                                onChange={e => handleStatusChange(b.id, e.target.value)}
                                className={`admin-table-select ${b.status}`}
                              >
                                <option value="confirmed">✓ Confirmed</option>
                                <option value="completed">✦ Completed</option>
                                <option value="cancelled">✕ Cancelled</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* TAB 2: PROFILE & SERVICE CATALOG */}
        {activeTab === 'services' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '32px' }}>
            
            {/* Left Column: Salon Profile Details (Timings) */}
            <div style={{ background: 'var(--white)', padding: '32px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--crimson)', borderBottom: '1px solid var(--ivory-dark)', paddingBottom: '12px', marginBottom: '24px' }}>
                ✦ Sanctuary Operating Details
              </h3>
              
              {timingSuccess && (
                <div style={{ background: '#E6F4EA', border: '1px solid rgba(26, 122, 74, 0.2)', color: '#1a7a4a', padding: '12px 16px', borderRadius: 'var(--radius-sm)', fontSize: '13.5px', marginBottom: '20px' }}>
                  ✓ {timingSuccess}
                </div>
              )}

              <form onSubmit={handleTimingSubmit}>
                <div className="form-group">
                  <label>Operating Timings</label>
                  <input
                    type="text"
                    value={timingForm.timings}
                    onChange={e => setTimingForm({ ...timingForm, timings: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Weekly Closed On</label>
                  <input
                    type="text"
                    value={timingForm.closed_on}
                    onChange={e => setTimingForm({ ...timingForm, closed_on: e.target.value })}
                    placeholder="e.g. Monday, or None"
                    required
                  />
                </div>
                <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}>
                  Save operating details ✦
                </button>
              </form>

              {/* Sanctuary Photos Gallery Section */}
              <div style={{ marginTop: '32px', borderTop: '1px dashed var(--ivory-dark)', paddingTop: '24px' }}>
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', marginBottom: '16px', color: 'var(--crimson)' }}>
                  ✦ Sanctuary Photos Gallery
                </h4>
                
                {salon?.photos && salon.photos.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                    {salon.photos.map((ph, idx) => (
                      <div key={idx} style={{ position: 'relative', width: '100%', aspectRatio: '1', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-xs)' }}>
                        <img src={ph} alt={`Salon gallery ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        
                        {/* Cover Selector */}
                        {salon.image === ph ? (
                          <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'var(--gold)', color: 'var(--charcoal)', fontSize: '8px', fontWeight: 700, textAlign: 'center', padding: '2px 0', textTransform: 'uppercase' }}>
                            Cover
                          </span>
                        ) : (
                          <button 
                            type="button"
                            onClick={() => handleSetCover(ph)}
                            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: 'var(--white)', fontSize: '8px', fontWeight: 500, textAlign: 'center', padding: '2px 0', border: 'none', cursor: 'pointer' }}
                            title="Make Cover Image"
                          >
                            Set Cover
                          </button>
                        )}
                        
                        {/* Remove Photo */}
                        <button 
                          type="button"
                          onClick={() => handleRemoveSalonPhoto(ph)}
                          style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(220,53,69,0.85)', color: 'var(--white)', border: 'none', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', cursor: 'pointer', fontWeight: 700 }}
                          title="Remove Image"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ background: 'var(--ivory)', border: '1px dashed var(--gold)', borderRadius: 'var(--radius-sm)', padding: '16px', textAlign: 'center', fontSize: '13px', color: 'var(--charcoal-light)', marginBottom: '16px' }}>
                    No photos uploaded. Upload up to 6 gallery photos below.
                  </div>
                )}

                {/* Add Photo Button */}
                {(!salon?.photos || salon.photos.length < 6) ? (
                  <label className="btn-outline" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', textAlign: 'center', gap: '6px', width: '100%', boxSizing: 'border-box' }}>
                    📷 Add Sanctuary Photo
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleAddSalonPhoto} 
                      style={{ display: 'none' }} 
                    />
                  </label>
                ) : (
                  <p style={{ fontSize: '12.5px', color: 'var(--charcoal-light)', fontStyle: 'italic', margin: 0, textAlign: 'center' }}>
                    ✦ Maximum limit of 6 gallery photos reached.
                  </p>
                )}
              </div>

              <div style={{ marginTop: '32px', borderTop: '1px dashed var(--ivory-dark)', paddingTop: '24px' }}>
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', marginBottom: '8px' }}>Location Info</h4>
                <p style={{ fontSize: '14.5px', color: 'var(--charcoal-light)', lineHeight: '1.6' }}>
                  📍 {salon?.location} ({salon?.area})
                </p>
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', marginBottom: '8px', marginTop: '16px' }}>Speciality</h4>
                <p style={{ fontSize: '14.5px', color: 'var(--charcoal-light)' }}>
                  ✨ {salon?.speciality}
                </p>
              </div>
            </div>

            {/* Right Column: Service List */}
            <div style={{ background: 'var(--white)', padding: '32px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-sm)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--ivory-dark)', paddingBottom: '12px', marginBottom: '24px' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--crimson)', margin: 0 }}>
                  ✦ Service Catalogue
                </h3>
                {user?.role === 'owner' && (
                  <button className="filter-btn active" onClick={() => { setShowAddService(!showAddService); setEditingService(null); }}>
                    {showAddService ? '✕ Cancel' : '+ Add Service'}
                  </button>
                )}
              </div>

              {serviceError && (
                <div style={{ background: '#FFF0F2', border: '1px solid rgba(122, 12, 46, 0.2)', color: 'var(--crimson)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', fontSize: '13.5px', marginBottom: '20px' }}>
                  ✕ {serviceError}
                </div>
              )}

              {/* Service Add Form */}
              {showAddService && user?.role === 'owner' && (
                <div style={{ background: 'var(--ivory)', padding: '20px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', marginBottom: '24px' }}>
                  <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: '12px', color: 'var(--crimson)' }}>
                    Add New Adornment Ritual
                  </h4>
                  <form onSubmit={handleAddService}>
                    <div className="form-group">
                      <label>Ritual Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Royal Gold Facial"
                        value={serviceForm.name}
                        onChange={e => setServiceForm({ ...serviceForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="admin-input-grid">
                      <div className="form-group">
                        <label>Price (₹) *</label>
                        <input
                          type="number"
                          placeholder="e.g. 4000"
                          value={serviceForm.price}
                          onChange={e => setServiceForm({ ...serviceForm, price: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Duration *</label>
                        <input
                          type="text"
                          placeholder="e.g. 1.5 hrs"
                          value={serviceForm.duration}
                          onChange={e => setServiceForm({ ...serviceForm, duration: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}>
                      Confirm service addition ✦
                    </button>
                  </form>
                </div>
              )}

              {/* Services List Display */}
              <div style={{ display: 'grid', gap: '16px' }}>
                {salon?.services.map((svc) => (
                  <div key={svc.name} style={{ background: 'var(--ivory)', padding: '16px 20px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
                    {editingService === svc.name ? (
                      /* Editing Form Row */
                      <form onSubmit={handleEditServiceSubmit}>
                        <div className="form-group">
                          <label>Service Name</label>
                          <input
                            type="text"
                            value={editServiceForm.name}
                            onChange={e => setEditServiceForm({ ...editServiceForm, name: e.target.value })}
                            required
                          />
                        </div>
                        <div className="admin-input-grid">
                          <div className="form-group">
                            <label>
                              Price (₹) 
                              {user.role === 'staff' && <span style={{ color: 'var(--crimson)', marginLeft: '4px' }}>🔒</span>}
                            </label>
                            <input
                              type="number"
                              value={editServiceForm.price}
                              onChange={e => setEditServiceForm({ ...editServiceForm, price: e.target.value })}
                              disabled={user.role === 'staff'}
                              title={user.role === 'staff' ? "Only the salon owner can change pricing" : ""}
                              required
                            />
                            {user.role === 'staff' && (
                              <div style={{ fontSize: '11px', color: 'var(--crimson)', marginTop: '4px' }}>
                                Only the salon owner can change pricing.
                              </div>
                            )}
                          </div>
                          <div className="form-group">
                            <label>Duration</label>
                            <input
                              type="text"
                              value={editServiceForm.duration}
                              onChange={e => setEditServiceForm({ ...editServiceForm, duration: e.target.value })}
                              required
                            />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                          <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Save</button>
                          <button type="button" className="btn-outline" onClick={() => setEditingService(null)}>Cancel</button>
                        </div>
                      </form>
                    ) : (
                      /* Normal Row */
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', margin: 0 }}>
                            {svc.name}
                          </h4>
                          <strong style={{ color: 'var(--crimson)' }}>₹{svc.price}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', color: 'var(--charcoal-light)' }}>
                            Duration: ⏱ {svc.duration}
                          </span>
                          
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              className="filter-btn" 
                              style={{ padding: '4px 12px', fontSize: '11.5px' }}
                              onClick={() => {
                                  setEditingService(svc.name);
                                  setEditServiceForm({ name: svc.name, price: svc.price, duration: svc.duration });
                              }}
                            >
                              Edit Details
                            </button>
                            {user?.role === 'owner' && (
                              <button 
                                className="btn-outline" 
                                style={{ padding: '4px 12px', fontSize: '11.5px', color: 'var(--crimson)', borderColor: 'rgba(182, 43, 50, 0.15)' }}
                                onClick={() => handleDeleteService(svc.name)}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

            </div>

          </div>
        )}

        {/* TAB 3: CUSTOMER REVIEWS & OWNER REPLIES */}
        {activeTab === 'reviews' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
            
            {/* Reviews settings (Owner only) */}
            {user?.role === 'owner' && (
              <div className="luxury-card" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', marginBottom: '4px' }}>Staff Access Permissions</h4>
                  <p style={{ fontSize: '13.5px', color: 'var(--charcoal-light)' }}>Toggle whether delegated staff members can post replies to reviews.</p>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {settingsSuccess && (
                    <span style={{ color: '#1a7a4a', fontSize: '13px', fontWeight: 500 }}>✓ {settingsSuccess}</span>
                  )}
                  <button 
                    onClick={() => handleToggleStaffReply(!staffCanReplySetting)}
                    className={`filter-btn ${staffCanReplySetting ? 'active' : ''}`}
                    style={{ padding: '10px 24px', fontSize: '13.5px' }}
                  >
                    {staffCanReplySetting ? 'Staff replies: Allowed' : 'Staff replies: Locked'}
                  </button>
                </div>
              </div>
            )}

            <div className="luxury-card" style={{ padding: '32px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--crimson)', borderBottom: '1px solid var(--ivory-dark)', paddingBottom: '12px', marginBottom: '24px' }}>
                ✦ Customer Feedback Log
              </h3>

              {replySuccess && (
                <div style={{ background: '#E6F4EA', border: '1px solid rgba(26, 122, 74, 0.2)', color: '#1a7a4a', padding: '12px 16px', borderRadius: 'var(--radius-sm)', fontSize: '13.5px', marginBottom: '20px' }}>
                  ✓ {replySuccess}
                </div>
              )}

              {reviews.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--charcoal-light)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>❀</div>
                  <h4>No feedback received yet</h4>
                  <p style={{ fontSize: '13.5px', marginTop: '4px' }}>Reviews submitted by customers with completed bookings will list here.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '24px' }}>
                  {reviews.map(rev => {
                    const hasReply = !!rev.reply;
                    const canReply = user.role === 'owner' || staffCanReplySetting;

                    return (
                      <div key={rev.id} style={{ background: 'var(--ivory)', padding: '24px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                          <div>
                            <span style={{ fontWeight: 600 }}>{rev.user_name}</span>
                            <span style={{ color: 'var(--gold)', marginLeft: '12px', fontSize: '14px' }}>
                              {Array.from({ length: 5 }).map((_, i) => (i < rev.rating ? '★' : '☆'))}
                            </span>
                          </div>
                          <div style={{ fontSize: '12.5px', color: 'var(--charcoal-light)' }}>
                            📅 {new Date(rev.date).toLocaleDateString()}
                          </div>
                        </div>

                        <p style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--charcoal)', fontWeight: 300 }}>
                          "{rev.text}"
                        </p>

                        {rev.photos && rev.photos.length > 0 && (
                          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                            {rev.photos.map((p, idx) => (
                              <img key={idx} src={p} alt="Review attachment" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--ivory-dark)' }} />
                            ))}
                          </div>
                        )}

                        {/* Owner Reply Block */}
                        {hasReply ? (
                          <div style={{ marginTop: '16px', background: 'var(--white)', padding: '12px 18px', borderLeft: '3px solid var(--crimson)', borderRadius: '0 4px 4px 0' }}>
                            <div style={{ fontSize: '11px', color: 'var(--crimson)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                              Published response ({rev.reply.replied_by === 'owner' ? 'Owner' : 'Staff'}):
                            </div>
                            <p style={{ fontSize: '13.5px', fontStyle: 'italic', margin: 0 }}>"{rev.reply.text}"</p>
                          </div>
                        ) : null}

                        {/* Reply Form */}
                        {!hasReply && (
                          <div style={{ marginTop: '20px', borderTop: '1px dashed var(--ivory-dark)', paddingTop: '16px' }}>
                            {canReply ? (
                              <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--charcoal-light)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                                  Write Public Reply:
                                </label>
                                {replyErrors[rev.id] && (
                                  <div style={{ color: 'var(--crimson)', fontSize: '12px', marginBottom: '8px' }}>✕ {replyErrors[rev.id]}</div>
                                )}
                                <div style={{ display: 'flex', gap: '12px' }}>
                                  <input 
                                    type="text"
                                    placeholder="Enter your professional response..."
                                    value={replyTexts[rev.id] || ''}
                                    onChange={e => setReplyTexts(prev => ({ ...prev, [rev.id]: e.target.value }))}
                                    style={{ flex: 1, padding: '10px 14px', fontSize: '13.5px', border: '1px solid var(--ivory-dark)', borderRadius: 'var(--radius-sm)' }}
                                  />
                                  <button 
                                    type="button" 
                                    className="btn-primary" 
                                    style={{ padding: '0 24px', fontSize: '13px', borderRadius: 'var(--radius-sm)' }}
                                    onClick={() => handleReplySubmit(rev.id)}
                                  >
                                    Publish
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p style={{ fontSize: '12px', color: 'var(--crimson)', fontStyle: 'italic', margin: 0 }}>
                                🔒 Staff reply permissions are disabled by the salon owner.
                              </p>
                            )}
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 4: STAFF REGISTRY (OWNERS ONLY) */}
        {activeTab === 'staff' && user?.role === 'owner' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '32px' }}>
            
            {/* Left Column: Invite / Register Staff Form */}
            <div style={{ background: 'var(--white)', padding: '32px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-sm)', height: 'fit-content' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--crimson)', borderBottom: '1px solid var(--ivory-dark)', paddingBottom: '12px', marginBottom: '24px' }}>
                ✦ Onboard Staff Member
              </h3>

              {staffError && (
                <div style={{ background: '#FFF0F2', border: '1px solid rgba(122, 12, 46, 0.2)', color: 'var(--crimson)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', fontSize: '13.5px', marginBottom: '20px' }}>
                  ✕ {staffError}
                </div>
              )}

              {generatedStaffCreds ? (
                <div style={{ background: '#FFFDF9', border: '1px solid var(--gold)', borderRadius: 'var(--radius-sm)', padding: '24px', marginBottom: '24px', animation: 'fadeIn 0.3s' }}>
                  <div style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: '12px' }}>❀</div>
                  <h4 style={{ textAlign: 'center', marginBottom: '12px', color: 'var(--charcoal)' }}>Staff Account Created!</h4>
                  <p style={{ fontSize: '13.5px', color: 'var(--charcoal-light)', lineHeight: '1.6', marginBottom: '16px' }}>
                    A unique account for <strong>{generatedStaffCreds.name}</strong> has been registered. Share these credentials with them:
                  </p>
                  <div style={{ background: 'var(--ivory)', padding: '16px', borderRadius: 'var(--radius-sm)', fontSize: '14px', border: '1px solid var(--ivory-dark)' }}>
                    <div style={{ marginBottom: '8px' }}><strong>Username/Email:</strong> {generatedStaffCreds.email}</div>
                    <div><strong>Temporary Password:</strong> <code style={{ background: '#e9e4d9', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>{generatedStaffCreds.password}</code></div>
                  </div>
                  <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '20px' }} onClick={() => setGeneratedStaffCreds(null)}>
                    Onboard another staff
                  </button>
                </div>
              ) : (
                <form onSubmit={handleAddStaff}>
                  <div className="form-group">
                    <label>Staff Full Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Kavita Sharma"
                      value={staffForm.name}
                      onChange={e => setStaffForm({ ...staffForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email Address *</label>
                    <input
                      type="email"
                      placeholder="staff@domain.com"
                      value={staffForm.email}
                      onChange={e => setStaffForm({ ...staffForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Contact Phone *</label>
                    <input
                      type="tel"
                      placeholder="+91 XXXXX XXXXX"
                      value={staffForm.phone}
                      onChange={e => setStaffForm({ ...staffForm, phone: e.target.value })}
                      required
                    />
                  </div>
                  <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}>
                    Generate credentials ✦
                  </button>
                </form>
              )}
            </div>

            {/* Right Column: List of current Staff */}
            <div style={{ background: 'var(--white)', padding: '32px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--crimson)', borderBottom: '1px solid var(--ivory-dark)', paddingBottom: '12px', marginBottom: '24px' }}>
                ✦ Registered Staff Registry
              </h3>

              {staffList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--charcoal-light)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>👥</div>
                  <h4>No staff registered</h4>
                  <p style={{ fontSize: '13.5px', marginTop: '4px' }}>Add staff members on the left to delegate administrative access.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '16px' }}>
                  {staffList.map(st => (
                    <div key={st.id} style={{ background: 'var(--ivory)', padding: '20px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', margin: '0 0 6px 0' }}>{st.name}</h4>
                        <div style={{ fontSize: '13.5px', color: 'var(--charcoal-light)', marginBottom: '4px' }}>✉ {st.email}</div>
                        <div style={{ fontSize: '13.5px', color: 'var(--charcoal-light)' }}>📞 {st.phone}</div>
                      </div>
                      <button 
                        className="btn-outline"
                        style={{ padding: '6px 14px', fontSize: '12.5px', color: 'var(--crimson)', borderColor: 'rgba(182, 43, 50, 0.15)' }}
                        onClick={() => handleDeleteStaff(st.id, st.name)}
                      >
                        Terminate
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </section>
  );
}
