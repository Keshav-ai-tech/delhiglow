import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import SalonCard from '../components/SalonCard';

const AREAS = ['All', 'South Delhi', 'West Delhi', 'Central Delhi', 'North Delhi', 'East Delhi'];
const TAGS = ['All', 'Bridal', 'Luxury', 'Spa', 'Hair', 'Skin', 'Nail Art', 'Affordable'];

export default function Salons({ user }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [salons, setSalons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [activeArea, setActiveArea] = useState(searchParams.get('area') || 'All');
  const [activeTag, setActiveTag] = useState(searchParams.get('tag') || 'All');
  const defaultSort = (user && user.beautyProfile) ? 'match' : 'rating';
  const [sort, setSort] = useState(searchParams.get('sort') || defaultSort);
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  // Debounce search term and map to area/tag filters if matching
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = search.trim();
      const matchedArea = AREAS.find(a => a.toLowerCase() === trimmed.toLowerCase() && a !== 'All');
      const matchedTag = TAGS.find(t => t.toLowerCase() === trimmed.toLowerCase() && t !== 'All');

      if (matchedArea) {
        setActiveArea(matchedArea);
        setSearch('');
      } else if (matchedTag) {
        setActiveTag(matchedTag);
        setSearch('');
      } else {
        setDebouncedSearch(trimmed);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Sync URL changes to local state (handles browser back/forward or navigation from homepage/navbar)
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    const urlArea = searchParams.get('area') || 'All';
    const urlTag = searchParams.get('tag') || 'All';
    const defaultSort = (user && user.beautyProfile) ? 'match' : 'rating';
    const urlSort = searchParams.get('sort') || defaultSort;

    if (urlSearch !== search) setSearch(urlSearch);
    if (urlArea !== activeArea) setActiveArea(urlArea);
    if (urlTag !== activeTag) setActiveTag(urlTag);
    if (urlSort !== sort) setSort(urlSort);
  }, [searchParams, user]);

  // Fetch and update URL search params in one unified useEffect
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (activeArea !== 'All') params.set('area', activeArea);
    if (activeTag !== 'All') params.set('tag', activeTag);
    if (debouncedSearch) params.set('search', debouncedSearch);
    
    const defaultSort = (user && user.beautyProfile) ? 'match' : 'rating';
    if (sort !== defaultSort) params.set('sort', sort);

    // Sync URL in address bar only if parameters actually differ to prevent loop
    const currentParams = new URLSearchParams(window.location.search);
    const paramsStr = params.toString();
    if (paramsStr !== currentParams.toString()) {
      setSearchParams(params, { replace: true });
    }

    const headers = {};
    if (user && user.token) {
      headers['Authorization'] = `Bearer ${user.token}`;
    }

    fetch(`/api/salons?${paramsStr}`, { headers })
      .then(r => r.json())
      .then(d => { 
        setSalons(d.data || []); 
        setLoading(false); 
      })
      .catch(() => setLoading(false));
  }, [activeArea, activeTag, debouncedSearch, sort, user]);

  const handleSearch = (e) => setSearch(e.target.value);

  return (
    <section className="section section-ivory" style={{ minHeight: '90vh' }}>
      <div className="jaali-pattern-bg" />
      <div className="container" style={{ position: 'relative', zIndex: 2 }}>
        
        <div className="filter-section-header">
          <h1 className="section-title">Delhi's <span>Beauty Directory</span></h1>
          <p className="section-sub" style={{ marginBottom: '24px' }}>
            Find and book your personal ritual from our list of {salons.length} premier beauty sanctuaries.
          </p>
        </div>

        {/* Immersive Glass Filter Panel */}
        <div className="glass-filters-panel">
          
          {/* Row 1: Search & Sort */}
          <div className="filters-row search-row">
            <div className="search-bar-wrapper">
              <span className="search-icon-inside">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search by name, landmark, or specific services..."
                value={search}
                onChange={handleSearch}
              />
              {search && (
                <button 
                  className="clear-search-btn" 
                  onClick={() => { setSearch(''); setDebouncedSearch(''); }}
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}
            </div>
            
            <div className="sort-select-wrapper">
              <select value={sort} onChange={e => setSort(e.target.value)}>
                {user && user.beautyProfile && <option value="match">Sort: My Beauty Match</option>}
                <option value="rating">Sort: Top Rated</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="reviews">Most Reviewed</option>
              </select>
            </div>
          </div>

          {/* Row 2: Area Selection */}
          <div className="filters-row">
            <span className="filters-label">Quarters:</span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {AREAS.map(area => (
                <button
                  key={area}
                  className={`filter-btn ${activeArea === area ? 'active' : ''}`}
                  onClick={() => setActiveArea(area)}
                >
                  {area}
                </button>
              ))}
            </div>
          </div>

          {/* Row 3: Tag Selection */}
          <div className="filters-row">
            <span className="filters-label">Adornments:</span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {TAGS.map(tag => (
                <button
                  key={tag}
                  className={`filter-btn ${activeTag === tag ? 'active' : ''}`}
                  onClick={() => setActiveTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Results List */}
        {loading ? (
          <div className="loading">Arranging the boutique catalogs...</div>
        ) : salons.length === 0 ? (
          <div className="empty-state" style={{ background: 'var(--white)', padding: '64px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>❀</div>
            <h3>No sanctuaries found matching your criteria</h3>
            <p style={{ marginTop: '8px', color: 'var(--charcoal-light)' }}>Try refining your search term or selecting another Delhi quarter.</p>
          </div>
        ) : (
          <div className="salons-grid">
            {salons.map(salon => <SalonCard key={salon.id} salon={salon} />)}
          </div>
        )}
      </div>
    </section>
  );
}
