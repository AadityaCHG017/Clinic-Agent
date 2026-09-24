import type { AppointmentStatus } from '../../types';

interface StatusBadgeProps {
  status: AppointmentStatus;
}

const statusConfig = {
  scheduled: { label: 'Upcoming', className: 'badge-scheduled' },
  completed: { label: 'Completed', className: 'badge-completed' },
  cancelled: { label: 'Cancelled', className: 'badge-cancelled' },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: 'badge-default' };
  return (
    <span className={`status-badge ${config.className}`} aria-label={`Status: ${config.label}`}>
      {config.label}
    </span>
  );
}
