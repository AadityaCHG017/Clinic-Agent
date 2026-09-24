import { Link } from 'react-router-dom';
import { Heart, Bot, Stethoscope, Calendar, Clock, Shield, ArrowRight, CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { checkHealth } from '../api/client';

const features = [
  {
    icon: <Stethoscope size={28} />,
    title: 'Find the Right Doctor',
    description: 'Browse our network of qualified specialists and general physicians.',
  },
  {
    icon: <Clock size={28} />,
    title: 'Check Availability',
    description: 'See real-time availability for any doctor on any date.',
  },
  {
    icon: <Calendar size={28} />,
    title: 'Easy Booking',
    description: 'Book, reschedule, or cancel appointments with a single tap.',
  },
  {
    icon: <Bot size={28} />,
    title: 'AI-Powered Assistant',
    description: 'Just tell our AI what you need — it handles the rest for you.',
  },
  {
    icon: <Shield size={28} />,
    title: 'Safe & Secure',
    description: 'Your health information is always private and protected.',
  },
  {
    icon: <CheckCircle size={28} />,
    title: 'Appointment Tracking',
    description: 'Keep track of all your upcoming and past appointments easily.',
  },
];

export default function Landing() {
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  useEffect(() => {
    checkHealth().then(setBackendOnline);
  }, []);

  return (
    <div className="landing">
      {/* Navigation */}
      <header className="landing-nav">
        <div className="landing-nav-brand">
          <Heart size={24} className="landing-logo-icon" />
          <span className="landing-logo-text">CareConnect</span>
        </div>
        <div className="landing-nav-actions">
          <Link to="/login" className="btn btn-ghost">Sign In</Link>
          <Link to="/register" className="btn btn-primary">Get Started</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-hero-content">
          <div className="landing-hero-badge">
            <Bot size={16} />
            <span>AI-Powered Healthcare Assistant</span>
          </div>
          <h1 className="landing-hero-title">
            Healthcare appointments,<br />
            <span className="landing-hero-accent">made simple.</span>
          </h1>
          <p className="landing-hero-subtitle">
            Find the right doctor, check availability, and book appointments — all through a friendly AI assistant that understands plain English.
          </p>
          <div className="landing-hero-actions">
            <Link to="/register" className="btn btn-primary btn-lg">
              <Bot size={20} />
              Talk to AI Assistant
            </Link>
            <Link to="/register" className="btn btn-outline btn-lg">
              Find a Doctor
              <ArrowRight size={18} />
            </Link>
          </div>

          {backendOnline !== null && (
            <div className={`landing-status ${backendOnline ? 'online' : 'offline'}`}>
              <span className="health-dot" />
              <span>{backendOnline ? 'System Online · Clinic services connected' : 'Clinic services currently unavailable'}</span>
            </div>
          )}
        </div>

        <div className="landing-hero-visual" aria-hidden="true">
          <div className="hero-card-1">
            <div className="hero-mini-card">
              <span className="hero-mini-icon">❤️</span>
              <div>
                <div className="hero-mini-title">Dr. Sharma</div>
                <div className="hero-mini-sub">Cardiology · Available Today</div>
              </div>
            </div>
            <div className="hero-mini-card">
              <span className="hero-mini-icon">🔬</span>
              <div>
                <div className="hero-mini-title">Dr. Patel</div>
                <div className="hero-mini-sub">Dermatology · Tomorrow 2:30 PM</div>
              </div>
            </div>
          </div>
          <div className="hero-chat-preview">
            <div className="hero-chat-msg assistant">
              <Heart size={14} />
              <span>I found 3 cardiologists available tomorrow. Shall I book Dr. Sharma at 10:00 AM?</span>
            </div>
            <div className="hero-chat-msg user">
              <span>Yes, please book that!</span>
            </div>
            <div className="hero-chat-msg assistant">
              <Heart size={14} />
              <span>✓ Appointment booked with Dr. Sharma for tomorrow at 10:00 AM.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="landing-features">
        <div className="landing-section-header">
          <h2 className="landing-section-title">Everything you need, all in one place</h2>
          <p className="landing-section-subtitle">Simple healthcare management designed with you in mind.</p>
        </div>
        <div className="features-grid">
          {features.map((f, i) => (
            <div key={i} className="feature-card">
              <div className="feature-icon" aria-hidden="true">{f.icon}</div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-description">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="landing-cta">
        <h2 className="landing-cta-title">Ready to take control of your health?</h2>
        <p className="landing-cta-subtitle">Join thousands of patients who use CareConnect every day.</p>
        <Link to="/register" className="btn btn-primary btn-xl">
          Create Your Account — It's Free
          <ArrowRight size={20} />
        </Link>
        <p className="landing-cta-note">Already have an account? <Link to="/login">Sign in here</Link></p>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-brand">
          <Heart size={18} />
          <span>CareConnect</span>
        </div>
        <p className="landing-footer-text">© 2026 CareConnect. AI-powered healthcare appointments.</p>
      </footer>
    </div>
  );
}
