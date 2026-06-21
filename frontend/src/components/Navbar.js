import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar({ user, onSignOut }) {
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isPlayingSound, setIsPlayingSound] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Web Audio refs
  const audioCtxRef = useRef(null);
  const droneOsc1Ref = useRef(null);
  const droneOsc2Ref = useRef(null);
  const mainGainNodeRef = useRef(null);
  const chimeIntervalRef = useRef(null);

  // Toggle scrolled state on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Sitar-like Chime Synthesizer
  const playRandomChime = (ctx, destination) => {
    // C major pentatonic scale frequencies
    const pentatonic = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];
    const freq = pentatonic[Math.floor(Math.random() * pentatonic.length)];

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    // Sitar-like timbre uses triangle or saw wave filtered
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    // Filter to make it warm
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, ctx.currentTime);

    // Gain envelope (pluck sound: instant attack, long decay)
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.02); // gentle volume
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 3.0); // 3 seconds fade out

    // Connect nodes
    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 3.1);
  };

  const startSoundscape = () => {
    try {
      // 1. Create context
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;

      // 2. Main gain node (acts as master volume control)
      const mainGain = ctx.createGain();
      mainGain.gain.setValueAtTime(0, ctx.currentTime);
      // Fade in master volume
      mainGain.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 1.5);
      mainGain.connect(ctx.destination);
      mainGainNodeRef.current = mainGain;

      // 3. Periodically play chimes/sitar plucks (every 4.5 seconds)
      playRandomChime(ctx, mainGain); // immediate first chime
      chimeIntervalRef.current = setInterval(() => {
        if (ctx.state === 'running') {
          playRandomChime(ctx, mainGain);
        }
      }, 4500);

      setIsPlayingSound(true);
    } catch (err) {
      console.error('Failed to initialize ambient soundscape:', err);
    }
  };

  const stopSoundscape = () => {
    const ctx = audioCtxRef.current;
    const mainGain = mainGainNodeRef.current;

    if (ctx && mainGain) {
      // Fade out master volume, then close
      mainGain.gain.setValueAtTime(mainGain.gain.value, ctx.currentTime);
      mainGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);

      setTimeout(() => {
        try {
          if (chimeIntervalRef.current) clearInterval(chimeIntervalRef.current);
          if (ctx.state !== 'closed') ctx.close();
        } catch (e) {
          // ignore
        }
        audioCtxRef.current = null;
        mainGainNodeRef.current = null;
        setIsPlayingSound(false);
      }, 1300);
    }
  };

  const toggleSoundscape = () => {
    if (isPlayingSound) {
      stopSoundscape();
    } else {
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
        setIsPlayingSound(true);
      } else {
        startSoundscape();
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chimeIntervalRef.current) clearInterval(chimeIntervalRef.current);
    };
  }, []);

  const handleHowItWorksClick = (e) => {
    e.preventDefault();
    setIsMobileMenuOpen(false);
    if (window.location.pathname === '/') {
      const el = document.getElementById('how-it-works');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.location.href = '/#how-it-works';
    }
  };

  return (
    <>
      <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
        <div className="navbar-inner">
          <Link to={user && (user.role === 'owner' || user.role === 'staff') ? "/admin" : "/"} className="navbar-logo">
            <span style={{ fontStyle: 'normal', color: 'var(--gold)', marginRight: '2px' }}>❀</span>
            Delhi<span>Glow</span>
          </Link>
          
          <ul className="navbar-links">
            {user && (user.role === 'owner' || user.role === 'staff') ? (
              <>
                <li><Link to="/admin">Dashboard</Link></li>
                <li><Link to={`/salon/${user.salon_id}`}>My Salon</Link></li>
              </>
            ) : (
              <>
                <li><Link to="/">Home</Link></li>
                <li><Link to="/salons">Find Sanctuaries</Link></li>
                <li><a href="#how-it-works" onClick={handleHowItWorksClick}>How it Works</a></li>
              </>
            )}
          </ul>

          <div className="navbar-right" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {user ? (
              <Link to="/profile" className="navbar-avatar-circle" title="View Profile" style={{ overflow: 'hidden', padding: 0 }}>
                {user.avatar ? (
                  <img src={user.avatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  getInitials(user.name)
                )}
              </Link>
            ) : (
              <Link to="/auth" className="navbar-signin-link">Sign In</Link>
            )}
            
            {/* Mobile Menu Toggle Button */}
            <button 
              className="mobile-menu-toggle"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="mobile-drawer" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="mobile-drawer-content" onClick={e => e.stopPropagation()}>
            <div className="mobile-drawer-header">
              <Link to={user && (user.role === 'owner' || user.role === 'staff') ? "/admin" : "/"} className="navbar-logo" onClick={() => setIsMobileMenuOpen(false)} style={{ textDecoration: 'none' }}>
                <span style={{ fontStyle: 'normal', color: 'var(--gold)', marginRight: '2px' }}>❀</span> Delhi<span>Glow</span>
              </Link>
              <button className="mobile-drawer-close" onClick={() => setIsMobileMenuOpen(false)}>✕</button>
            </div>
            <ul className="mobile-drawer-links">
              {user && (user.role === 'owner' || user.role === 'staff') ? (
                <>
                  <li><Link to="/admin" onClick={() => setIsMobileMenuOpen(false)}>Dashboard</Link></li>
                  <li><Link to={`/salon/${user.salon_id}`} onClick={() => setIsMobileMenuOpen(false)}>My Salon</Link></li>
                </>
              ) : (
                <>
                  <li><Link to="/" onClick={() => setIsMobileMenuOpen(false)}>Home</Link></li>
                  <li><Link to="/salons" onClick={() => setIsMobileMenuOpen(false)}>Find Sanctuaries</Link></li>
                  <li><a href="#how-it-works" onClick={handleHowItWorksClick}>How it Works</a></li>
                  {!user && (
                    <li><Link to="/auth" onClick={() => setIsMobileMenuOpen(false)} style={{ color: 'var(--gold)', fontWeight: 500 }}>Sign In</Link></li>
                  )}
                </>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Floating control on bottom right as well, just in case user misses it */}
      <div className="ambient-toggle-wrapper">
        <button className="ambient-sound-btn" onClick={toggleSoundscape}>
          <span className="sound-waves">
            <span className={`sound-wave-bar ${isPlayingSound ? 'playing' : ''}`}></span>
            <span className={`sound-wave-bar ${isPlayingSound ? 'playing' : ''}`}></span>
            <span className={`sound-wave-bar ${isPlayingSound ? 'playing' : ''}`}></span>
            <span className={`sound-wave-bar ${isPlayingSound ? 'playing' : ''}`}></span>
          </span>
          <span>{isPlayingSound ? "Mute Delhi Sitar Chimes" : "Play Delhi Sitar Chimes"}</span>
        </button>
      </div>
    </>
  );
}
