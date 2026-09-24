import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Calendar, Clock, User, FileText, AlertCircle } from 'lucide-react';
import { getAppointment, cancelAppointment, rescheduleAppointment } from '../api/appointments';
import type { Appointment, RescheduleAppointmentRequest } from '../types';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorState from '../components/ui/ErrorState';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import { formatDate, formatTime, getSpecialtyIcon } from '../utils';
import { ApiClientError } from '../api/client';

export default function AppointmentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCancel, setShowCancel] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  const [showReschedule, setShowReschedule] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newStartTime, setNewStartTime] = useState('');
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState('');

  useEffect(() => {
    if (!id) return;
    getAppointment(parseInt(id))
      .then((data) => {
        setAppointment(data);
        setNewDate(data.appointment_date);
        setNewStartTime(data.start_time);
      })
      .catch((err) => setError(err instanceof ApiClientError ? err.message : 'Appointment not found.'))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleCancel = async () => {
    if (!appointment) return;
    setIsCancelling(true);
    setCancelError('');
    try {
      await cancelAppointment(appointment.id);
      setAppointment({ ...appointment, status: 'cancelled' });
      setShowCancel(false);
    } catch (err) {
      setCancelError(err instanceof ApiClientError ? err.message : 'Could not cancel. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleReschedule = async () => {
    if (!appointment || !newDate || !newStartTime) return;
    setIsRescheduling(true);
    setRescheduleError('');
    const req: RescheduleAppointmentRequest = { new_date: newDate, new_start_time: newStartTime };
    try {
      const updated = await rescheduleAppointment(appointment.id, req);
      setAppointment(updated);
      setShowReschedule(false);
    } catch (err) {
      setRescheduleError(err instanceof ApiClientError ? err.message : 'Could not reschedule. Please try again.');
    } finally {
      setIsRescheduling(false);
    }
  };

  if (isLoading) return <div className="page-container center-content"><LoadingSpinner size="lg" label="Loading appointment..." /></div>;
  if (error) return <div className="page-container"><ErrorState message={error} onRetry={() => navigate('/appointments')} /></div>;
  if (!appointment) return null;

  const canModify = appointment.status === 'scheduled';

  return (
    <div className="page-container">
      <button className="back-btn" onClick={() => navigate('/appointments')}>
        <ChevronLeft size={20} />
        Back to Appointments
      </button>

      <div className="appt-detail-card">
        {/* Header */}
        <div className="appt-detail-header">
          <div className="appt-detail-doctor">
            <span className="appt-detail-icon" aria-hidden="true">
              {getSpecialtyIcon(appointment.doctor_specialty)}
            </span>
            <div>
              <h1 className="appt-detail-name">{appointment.doctor_name}</h1>
              <span className="appt-detail-specialty">{appointment.doctor_specialty}</span>
            </div>
          </div>
          <StatusBadge status={appointment.status} />
        </div>

        {/* Details */}
        <div className="appt-detail-grid">
          <div className="appt-detail-row">
            <Calendar size={20} className="appt-detail-row-icon" aria-hidden="true" />
            <div>
              <span className="appt-detail-row-label">Date</span>
              <span className="appt-detail-row-value">{formatDate(appointment.appointment_date)}</span>
            </div>
          </div>
          <div className="appt-detail-row">
            <Clock size={20} className="appt-detail-row-icon" aria-hidden="true" />
            <div>
              <span className="appt-detail-row-label">Time</span>
              <span className="appt-detail-row-value">
                {formatTime(appointment.start_time)}
                {appointment.end_time ? ` – ${formatTime(appointment.end_time)}` : ''}
              </span>
            </div>
          </div>
          <div className="appt-detail-row">
            <User size={20} className="appt-detail-row-icon" aria-hidden="true" />
            <div>
              <span className="appt-detail-row-label">Appointment ID</span>
              <span className="appt-detail-row-value">#{appointment.id}</span>
            </div>
          </div>
          {appointment.reason && (
            <div className="appt-detail-row">
              <FileText size={20} className="appt-detail-row-icon" aria-hidden="true" />
              <div>
                <span className="appt-detail-row-label">Reason</span>
                <span className="appt-detail-row-value">{appointment.reason}</span>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {canModify && (
          <div className="appt-detail-actions">
            <button className="btn btn-secondary" onClick={() => { setShowReschedule(true); setRescheduleError(''); }}>
              Reschedule Appointment
            </button>
            <button className="btn btn-danger" onClick={() => { setShowCancel(true); setCancelError(''); }}>
              Cancel Appointment
            </button>
          </div>
        )}
      </div>

      {/* Cancel Modal */}
      <Modal isOpen={showCancel} onClose={() => setShowCancel(false)} title="Cancel Appointment" size="sm">
        <div className="confirm-modal">
          <p className="confirm-modal-text">
            Are you sure you want to cancel your appointment with <strong>{appointment.doctor_name}</strong>?
          </p>
          {cancelError && (
            <div className="auth-error" role="alert">
              <AlertCircle size={16} />
              <span>{cancelError}</span>
            </div>
          )}
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={() => setShowCancel(false)}>Keep Appointment</button>
            <button className="btn btn-danger" onClick={handleCancel} disabled={isCancelling}>
              {isCancelling ? 'Cancelling...' : 'Cancel Appointment'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reschedule Modal */}
      <Modal isOpen={showReschedule} onClose={() => setShowReschedule(false)} title="Reschedule Appointment" size="md">
        <div className="reschedule-modal">
          <div className="reschedule-current">
            <p className="reschedule-label">Current appointment</p>
            <p className="reschedule-current-info">
              {formatDate(appointment.appointment_date)} at {formatTime(appointment.start_time)}
            </p>
          </div>
          <div className="reschedule-arrow">↓</div>
          <p className="reschedule-label">New appointment time</p>
          <div className="form-group">
            <label htmlFor="new-date-detail" className="form-label">New Date</label>
            <input id="new-date-detail" type="date" className="form-input" value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]} />
          </div>
          <div className="form-group">
            <label htmlFor="new-time-detail" className="form-label">New Start Time</label>
            <input id="new-time-detail" type="time" className="form-input" value={newStartTime}
              onChange={(e) => setNewStartTime(e.target.value)} />
          </div>
          {rescheduleError && (
            <div className="auth-error" role="alert">
              <AlertCircle size={16} />
              <span>{rescheduleError}</span>
            </div>
          )}
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={() => setShowReschedule(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleReschedule}
              disabled={isRescheduling || !newDate || !newStartTime}>
              {isRescheduling ? 'Rescheduling...' : 'Confirm Reschedule'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
