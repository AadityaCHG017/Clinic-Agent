import { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import { getMyAppointments, cancelAppointment, rescheduleAppointment } from '../api/appointments';
import type { Appointment, RescheduleAppointmentRequest } from '../types';
import AppointmentCard from '../components/appointments/AppointmentCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorState from '../components/ui/ErrorState';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { ApiClientError } from '../api/client';
import { AlertCircle } from 'lucide-react';

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');

  const [cancelTarget, setCancelTarget] = useState<number | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newStartTime, setNewStartTime] = useState('');
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState('');

  const fetchAppointments = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getMyAppointments();
      setAppointments(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Unable to load appointments.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAppointments(); }, []);

  const safeAppointments = Array.isArray(appointments) ? appointments : [];
  const upcoming = safeAppointments.filter((a) => a && a.status === 'scheduled');
  const past = safeAppointments.filter((a) => a && a.status === 'completed');
  const cancelled = safeAppointments.filter((a) => a && a.status === 'cancelled');

  const displayedList = tab === 'upcoming' ? upcoming : tab === 'past' ? past : cancelled;

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;
    setIsCancelling(true);
    setCancelError('');
    try {
      await cancelAppointment(cancelTarget);
      setAppointments((prev) =>
        prev.map((a) => (a.id === cancelTarget ? { ...a, status: 'cancelled' as const } : a))
      );
      setCancelTarget(null);
    } catch (err) {
      setCancelError(err instanceof ApiClientError ? err.message : 'Could not cancel. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleTarget || !newDate || !newStartTime) return;
    setIsRescheduling(true);
    setRescheduleError('');
    const req: RescheduleAppointmentRequest = {
      new_date: newDate,
      new_start_time: newStartTime,
    };
    try {
      const updated = await rescheduleAppointment(rescheduleTarget.id, req);
      setAppointments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setRescheduleTarget(null);
    } catch (err) {
      setRescheduleError(err instanceof ApiClientError ? err.message : 'Could not reschedule. Please try again.');
    } finally {
      setIsRescheduling(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">My Appointments</h1>
        <p className="page-subtitle">Manage all your healthcare appointments</p>
      </div>

      {/* Tabs */}
      <div className="appt-tabs" role="tablist">
        {[
          { key: 'upcoming', label: `Upcoming (${upcoming.length})` },
          { key: 'past', label: `Past (${past.length})` },
          { key: 'cancelled', label: `Cancelled (${cancelled.length})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            className={`appt-tab${tab === key ? ' active' : ''}`}
            onClick={() => setTab(key as typeof tab)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="center-content">
          <LoadingSpinner size="lg" label="Loading appointments..." />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchAppointments} />
      ) : displayedList.length === 0 ? (
        <EmptyState
          icon={<Calendar size={48} />}
          title={`No ${tab} appointments`}
          description={
            tab === 'upcoming'
              ? 'You have no upcoming appointments. Book one with our AI assistant!'
              : `No ${tab} appointments to display.`
          }
        />
      ) : (
        <div className="appointments-list">
          {displayedList.map((appt) => (
            <AppointmentCard
              key={appt.id}
              appointment={appt}
              onCancel={tab === 'upcoming' ? (id) => { setCancelTarget(id); setCancelError(''); } : undefined}
              onReschedule={tab === 'upcoming' ? (appt) => { setRescheduleTarget(appt); setRescheduleError(''); setNewDate(appt.appointment_date); setNewStartTime(appt.start_time); } : undefined}
            />
          ))}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title="Cancel Appointment"
        size="sm"
      >
        <div className="confirm-modal">
          <p className="confirm-modal-text">
            Are you sure you want to cancel this appointment? This action cannot be undone.
          </p>
          {cancelError && (
            <div className="auth-error" role="alert">
              <AlertCircle size={16} />
              <span>{cancelError}</span>
            </div>
          )}
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={() => setCancelTarget(null)}>
              Keep Appointment
            </button>
            <button
              className="btn btn-danger"
              onClick={handleCancelConfirm}
              disabled={isCancelling}
            >
              {isCancelling ? 'Cancelling...' : 'Cancel Appointment'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        isOpen={!!rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        title="Reschedule Appointment"
        size="md"
      >
        {rescheduleTarget && (
          <div className="reschedule-modal">
            <div className="reschedule-current">
              <p className="reschedule-label">Current appointment</p>
              <p className="reschedule-current-info">
                <strong>{rescheduleTarget.doctor_name}</strong> · {rescheduleTarget.appointment_date} at {rescheduleTarget.start_time}
              </p>
            </div>
            <div className="reschedule-arrow">↓</div>
            <p className="reschedule-label">New appointment time</p>

            <div className="form-group">
              <label htmlFor="new-date" className="form-label">New Date</label>
              <input
                id="new-date"
                type="date"
                className="form-input"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="form-group">
              <label htmlFor="new-time" className="form-label">New Start Time</label>
              <input
                id="new-time"
                type="time"
                className="form-input"
                value={newStartTime}
                onChange={(e) => setNewStartTime(e.target.value)}
              />
            </div>

            {rescheduleError && (
              <div className="auth-error" role="alert">
                <AlertCircle size={16} />
                <span>{rescheduleError}</span>
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setRescheduleTarget(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleReschedule}
                disabled={isRescheduling || !newDate || !newStartTime}
              >
                {isRescheduling ? 'Rescheduling...' : 'Confirm Reschedule'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
