import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Stethoscope, Calendar, User, ArrowRight, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getMyAppointments } from '../api/appointments';
import type { Appointment } from '../types';
import { getGreeting, formatShortDate, formatTime, getSpecialtyIcon } from '../utils';
import HealthStatus from '../components/ui/HealthStatus';
import StatusBadge from '../components/ui/StatusBadge';

const quickActions = [
  { to: '/assistant', icon: Bot, label: 'Talk to AI Assistant', description: 'Book, reschedule, or cancel in plain English', highlight: true },
  { to: '/assistant', icon: Stethoscope, label: 'Find Doctors via AI', description: 'Ask AI for specialists & availability' },
  { to: '/appointments', icon: Calendar, label: 'My Appointments', description: 'View & manage your bookings' },
  { to: '/profile', icon: User, label: 'My Profile', description: 'View account details' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getMyAppointments()
      .then((data) => setAppointments(Array.isArray(data) ? data : []))
      .catch(() => setAppointments([]))
      .finally(() => setIsLoading(false));
  }, []);

  const safeAppointments = Array.isArray(appointments) ? appointments : [];
  const upcoming = safeAppointments
    .filter((a) => a && a.status === 'scheduled')
    .sort((a, b) => {
      const da = new Date(`${a.appointment_date}T${a.start_time}`);
      const db = new Date(`${b.appointment_date}T${b.start_time}`);
      return da.getTime() - db.getTime();
    })
    .slice(0, 1);

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="page-container">
      {/* Greeting */}
      <section className="dashboard-hero">
        <div>
          <h1 className="dashboard-greeting">
            {getGreeting()}, {firstName} 👋
          </h1>
          <p className="dashboard-subtitle">How can your AI Health Assistant help you today?</p>
        </div>
        <Link to="/assistant" className="btn btn-primary btn-lg dashboard-hero-btn">
          <Bot size={22} />
          Talk to AI Assistant
        </Link>
      </section>

      {/* Upcoming Appointment */}
      <section className="dashboard-section">
        <div className="section-header">
          <h2 className="section-title">
            <Calendar size={20} aria-hidden="true" />
            Next Appointment
          </h2>
          <Link to="/appointments" className="section-link">View all →</Link>
        </div>

        {isLoading ? (
          <div className="dashboard-appt-loading">
            <div className="skeleton skeleton-card" style={{ height: 120, borderRadius: '1rem' }} />
          </div>
        ) : upcoming.length > 0 ? (
          <div className="upcoming-appointment-card">
            <div className="upcoming-appt-header">
              <div className="upcoming-appt-doctor">
                <span className="upcoming-appt-icon" aria-hidden="true">
                  {getSpecialtyIcon(upcoming[0].doctor_specialty)}
                </span>
                <div>
                  <h3 className="upcoming-appt-name">{upcoming[0].doctor_name}</h3>
                  <span className="upcoming-appt-specialty">{upcoming[0].doctor_specialty}</span>
                </div>
              </div>
              <StatusBadge status={upcoming[0].status} />
            </div>

            <div className="upcoming-appt-details">
              <div className="upcoming-appt-detail">
                <Calendar size={16} aria-hidden="true" />
                <span>{formatShortDate(upcoming[0].appointment_date)}</span>
              </div>
              <div className="upcoming-appt-detail">
                <Clock size={16} aria-hidden="true" />
                <span>{formatTime(upcoming[0].start_time)}</span>
              </div>
            </div>

            <Link
              to="/appointments"
              className="btn btn-outline btn-full"
            >
              Manage Appointments
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <div className="dashboard-empty-appt">
            <Calendar size={40} className="dashboard-empty-icon" aria-hidden="true" />
            <p className="dashboard-empty-text">No upcoming appointments</p>
            <Link to="/assistant" className="btn btn-primary">
              <Bot size={18} />
              Book with AI Assistant
            </Link>
          </div>
        )}
      </section>

      {/* Quick Actions */}
      <section className="dashboard-section">
        <h2 className="section-title">
          Quick Actions
        </h2>
        <div className="quick-actions-grid">
          {quickActions.map(({ to, icon: Icon, label, description, highlight }, idx) => (
            <Link
              key={idx}
              to={to}
              className={`quick-action-card${highlight ? ' highlighted' : ''}`}
            >
              <div className={`quick-action-icon${highlight ? ' highlighted' : ''}`}>
                <Icon size={26} aria-hidden="true" />
              </div>
              <div className="quick-action-text">
                <span className="quick-action-label">{label}</span>
                <span className="quick-action-desc">{description}</span>
              </div>
              <ArrowRight size={18} className="quick-action-arrow" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      {/* System Status */}
      <section className="dashboard-section dashboard-status">
        <h2 className="section-title">System Status</h2>
        <HealthStatus />
      </section>
    </div>
  );
}
