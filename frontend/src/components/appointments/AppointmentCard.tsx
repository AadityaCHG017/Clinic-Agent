import { Link } from 'react-router-dom';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import type { Appointment } from '../../types';
import StatusBadge from '../ui/StatusBadge';
import { formatShortDate, formatTime, getSpecialtyIcon } from '../../utils';

interface AppointmentCardProps {
  appointment: Appointment;
  onCancel?: (id: number) => void;
  onReschedule?: (appointment: Appointment) => void;
  showActions?: boolean;
}

export default function AppointmentCard({
  appointment,
  onCancel,
  onReschedule,
  showActions = true,
}: AppointmentCardProps) {
  const canModify = appointment.status === 'scheduled';

  return (
    <div className={`appointment-card status-${appointment.status}`}>
      <div className="appointment-card-header">
        <div className="appointment-doctor-info">
          <span className="appointment-doctor-icon" aria-hidden="true">
            {getSpecialtyIcon(appointment.doctor_specialty)}
          </span>
          <div>
            <h3 className="appointment-doctor-name">{appointment.doctor_name}</h3>
            <span className="appointment-specialty">{appointment.doctor_specialty}</span>
          </div>
        </div>
        <StatusBadge status={appointment.status} />
      </div>

      <div className="appointment-card-details">
        <div className="appointment-detail">
          <Calendar size={16} aria-hidden="true" />
          <span>{formatShortDate(appointment.appointment_date)}</span>
        </div>
        <div className="appointment-detail">
          <Clock size={16} aria-hidden="true" />
          <span>
            {formatTime(appointment.start_time)}
            {appointment.end_time ? ` – ${formatTime(appointment.end_time)}` : ''}
          </span>
        </div>
      </div>

      {appointment.reason && (
        <p className="appointment-reason">
          <strong>Reason:</strong> {appointment.reason}
        </p>
      )}

      {showActions && (
        <div className="appointment-card-actions">
          <Link to={`/appointments/${appointment.id}`} className="btn btn-outline btn-sm">
            View Details
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
          {canModify && onReschedule && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onReschedule(appointment)}
            >
              Reschedule
            </button>
          )}
          {canModify && onCancel && (
            <button
              className="btn btn-danger btn-sm"
              onClick={() => onCancel(appointment.id)}
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
}
