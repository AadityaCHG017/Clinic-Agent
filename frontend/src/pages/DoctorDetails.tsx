import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Phone, Mail, Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { getDoctor, getDoctorAvailability } from '../api/doctors';
import { bookAppointment } from '../api/appointments';
import type { Doctor, AvailableSlot } from '../types';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorState from '../components/ui/ErrorState';
import Modal from '../components/ui/Modal';
import { getSpecialtyIcon, todayStr, tomorrowStr, formatShortDate, formatTime, getTimeOfDay } from '../utils';
import { ApiClientError } from '../api/client';

type DateOption = { label: string; value: string };

function getDateOptions(): DateOption[] {
  const today = new Date();
  const options: DateOption[] = [
    { label: 'Today', value: todayStr() },
    { label: 'Tomorrow', value: tomorrowStr() },
  ];
  for (let i = 2; i <= 6; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const val = d.toISOString().split('T')[0];
    options.push({
      label: d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
      value: val,
    });
  }
  return options;
}

export default function DoctorDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [isLoadingDoctor, setIsLoadingDoctor] = useState(true);
  const [doctorError, setDoctorError] = useState('');

  const [selectedDate, setSelectedDate] = useState(tomorrowStr());
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState('');

  const [bookingSlot, setBookingSlot] = useState<AvailableSlot | null>(null);
  const [reason, setReason] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const dateOptions = getDateOptions();

  useEffect(() => {
    if (!id) return;
    getDoctor(parseInt(id))
      .then(setDoctor)
      .catch((err) => setDoctorError(err instanceof ApiClientError ? err.message : 'Doctor not found.'))
      .finally(() => setIsLoadingDoctor(false));
  }, [id]);

  useEffect(() => {
    if (!id || !selectedDate) return;
    setIsLoadingSlots(true);
    setSlotsError('');
    getDoctorAvailability(parseInt(id), selectedDate)
      .then((data) => setSlots(data.filter((s) => s.is_available)))
      .catch((err) => setSlotsError(err instanceof ApiClientError ? err.message : 'Unable to load availability.'))
      .finally(() => setIsLoadingSlots(false));
  }, [id, selectedDate]);

  const handleBook = async () => {
    if (!bookingSlot || !doctor) return;
    setIsBooking(true);
    setBookingError('');
    try {
      await bookAppointment({
        doctor_id: doctor.id,
        appointment_date: bookingSlot.date,
        start_time: bookingSlot.start_time,
        end_time: bookingSlot.end_time,
        reason: reason || undefined,
      });
      setBookingSuccess(true);
    } catch (err) {
      setBookingError(err instanceof ApiClientError ? err.message : 'Booking failed. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };

  const groupByTimeOfDay = (slots: AvailableSlot[]) => {
    const groups: Record<string, AvailableSlot[]> = { Morning: [], Afternoon: [], Evening: [] };
    slots.forEach((s) => {
      const tod = getTimeOfDay(s.start_time);
      groups[tod].push(s);
    });
    return groups;
  };

  if (isLoadingDoctor) return <div className="page-container center-content"><LoadingSpinner size="lg" label="Loading doctor..." /></div>;
  if (doctorError) return <div className="page-container"><ErrorState message={doctorError} onRetry={() => navigate('/doctors')} /></div>;
  if (!doctor) return null;

  const grouped = groupByTimeOfDay(slots);

  return (
    <div className="page-container">
      <button className="back-btn" onClick={() => navigate('/doctors')}>
        <ChevronLeft size={20} />
        Back to Doctors
      </button>

      {/* Doctor Profile */}
      <div className="doctor-profile-card">
        <div className="doctor-profile-avatar" aria-hidden="true">
          <span className="doctor-profile-icon">{getSpecialtyIcon(doctor.specialization)}</span>
        </div>
        <div className="doctor-profile-info">
          <h1 className="doctor-profile-name">{doctor.name}</h1>
          <span className="doctor-profile-specialty">{doctor.specialization}</span>
          {doctor.status === 'active' && (
            <span className="doctor-available-badge">● Available</span>
          )}
          <div className="doctor-profile-contacts">
            {doctor.phone && (
              <div className="contact-item">
                <Phone size={16} aria-hidden="true" />
                <span>{doctor.phone}</span>
              </div>
            )}
            {doctor.email && (
              <div className="contact-item">
                <Mail size={16} aria-hidden="true" />
                <span>{doctor.email}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Availability */}
      <div className="availability-section">
        <h2 className="section-title">
          <Calendar size={20} aria-hidden="true" />
          Check Availability
        </h2>

        {/* Date selector */}
        <div className="date-tabs" role="tablist" aria-label="Select date">
          {dateOptions.map((opt) => (
            <button
              key={opt.value}
              role="tab"
              aria-selected={selectedDate === opt.value}
              className={`date-tab${selectedDate === opt.value ? ' active' : ''}`}
              onClick={() => setSelectedDate(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <p className="selected-date-label">
          <Calendar size={14} aria-hidden="true" />
          {formatShortDate(selectedDate)}
        </p>

        {isLoadingSlots ? (
          <LoadingSpinner label="Checking availability..." />
        ) : slotsError ? (
          <ErrorState message={slotsError} />
        ) : slots.length === 0 ? (
          <div className="no-slots">
            <AlertCircle size={32} />
            <p>No available slots on this date. Please try another day.</p>
          </div>
        ) : (
          <div className="time-groups">
            {(['Morning', 'Afternoon', 'Evening'] as const).map((tod) =>
              grouped[tod].length > 0 ? (
                <div key={tod} className="time-group">
                  <h3 className="time-group-label">
                    {tod === 'Morning' ? '🌅' : tod === 'Afternoon' ? '☀️' : '🌙'} {tod}
                  </h3>
                  <div className="slots-grid">
                    {grouped[tod].map((slot) => (
                      <button
                        key={`${slot.date}-${slot.start_time}`}
                        className="slot-btn"
                        onClick={() => { setBookingSlot(slot); setBookingError(''); setBookingSuccess(false); }}
                        aria-label={`Book appointment at ${formatTime(slot.start_time)}`}
                      >
                        <Clock size={14} aria-hidden="true" />
                        {formatTime(slot.start_time)}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null
            )}
          </div>
        )}
      </div>

      {/* Booking Modal */}
      <Modal
        isOpen={!!bookingSlot && !bookingSuccess}
        onClose={() => setBookingSlot(null)}
        title="Book Appointment"
        size="md"
      >
        {bookingSlot && (
          <div className="booking-modal">
            <div className="booking-summary">
              <div className="booking-summary-item">
                <span className="booking-summary-label">Doctor</span>
                <span className="booking-summary-value">{doctor.name}</span>
              </div>
              <div className="booking-summary-item">
                <span className="booking-summary-label">Specialty</span>
                <span className="booking-summary-value">{doctor.specialization}</span>
              </div>
              <div className="booking-summary-item">
                <span className="booking-summary-label">Date</span>
                <span className="booking-summary-value">{formatShortDate(bookingSlot.date)}</span>
              </div>
              <div className="booking-summary-item">
                <span className="booking-summary-label">Time</span>
                <span className="booking-summary-value">
                  {formatTime(bookingSlot.start_time)} – {formatTime(bookingSlot.end_time)}
                </span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reason" className="form-label">
                Reason for Visit <span className="form-optional">(Optional)</span>
              </label>
              <textarea
                id="reason"
                className="form-input form-textarea"
                placeholder="e.g., Annual check-up, follow-up..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>

            {bookingError && (
              <div className="auth-error" role="alert">
                <AlertCircle size={16} />
                <span>{bookingError}</span>
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setBookingSlot(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleBook}
                disabled={isBooking}
              >
                {isBooking ? 'Booking...' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Success Modal */}
      <Modal
        isOpen={bookingSuccess}
        onClose={() => { setBookingSuccess(false); setBookingSlot(null); }}
        title="Appointment Booked!"
        size="sm"
      >
        <div className="booking-success">
          <CheckCircle size={56} className="booking-success-icon" />
          <p className="booking-success-text">
            Your appointment with <strong>{doctor.name}</strong> has been successfully booked!
          </p>
          <div className="modal-actions">
            <Link to="/appointments" className="btn btn-primary btn-full">
              View My Appointments
            </Link>
          </div>
        </div>
      </Modal>
    </div>
  );
}
