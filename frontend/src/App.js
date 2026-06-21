import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Salons from './pages/Salons';
import SalonDetail from './pages/SalonDetail';
import BookingSuccess from './pages/BookingSuccess';
import Admin from './pages/Admin';
import About from './pages/About';
import Partner from './pages/Partner';
import Contact from './pages/Contact';
import Auth from './pages/Auth';
import Profile from './pages/Profile';
import Bookings from './pages/Bookings';
import BeautyQuiz from './pages/BeautyQuiz';
import AIAssistant from './components/AIAssistant';
import './App.css';


function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function App() {
  const [user, setUser] = useState(null);

  // Read login state on startup
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('user');
      }
    }
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleProfileUpdate = (updatedUserData) => {
    setUser(updatedUserData);
    localStorage.setItem('user', JSON.stringify(updatedUserData));
  };

  const handleSignOut = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <Router>
      <ScrollToTop />
      <div className="app">
        <Navbar user={user} onSignOut={handleSignOut} />
        <main>
          <Routes>
            <Route path="/" element={user && (user.role === 'owner' || user.role === 'staff') ? <Navigate to="/admin" replace /> : <Home />} />
            <Route path="/salons" element={user && (user.role === 'owner' || user.role === 'staff') ? <Navigate to="/admin" replace /> : <Salons user={user} />} />
            <Route path="/salon/:id" element={<SalonDetail user={user} />} />
            <Route path="/booking-success" element={user && (user.role === 'owner' || user.role === 'staff') ? <Navigate to="/admin" replace /> : <BookingSuccess />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/about" element={<About />} />
            <Route path="/partner" element={<Partner />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/auth" element={
              user ? (
                (user.role === 'owner' || user.role === 'staff') ? <Navigate to="/admin" replace /> : <Navigate to="/" replace />
              ) : (
                <Auth onLoginSuccess={handleLoginSuccess} />
              )
            } />
            <Route path="/profile" element={<Profile user={user} onProfileUpdate={handleProfileUpdate} onSignOut={handleSignOut} />} />
            <Route path="/my-bookings" element={
              user ? (
                (user.role === 'owner' || user.role === 'staff') ? <Navigate to="/admin" replace /> : <Bookings user={user} />
              ) : (
                <Navigate to="/auth" state={{ from: '/my-bookings' }} replace />
              )
            } />
            <Route path="/beauty-quiz" element={
              user ? (
                user.role === 'customer' ? <BeautyQuiz user={user} onProfileUpdate={handleProfileUpdate} /> : <Navigate to="/admin" replace />
              ) : (
                <Navigate to="/auth" state={{ from: '/beauty-quiz' }} replace />
              )
            } />
          </Routes>
        </main>
        <Footer />
        <AIAssistant user={user} />
      </div>
    </Router>
  );
}

export default App;
