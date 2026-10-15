export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatShortDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTime(timeStr: string): string {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(hours, minutes);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function formatDateTime(dateStr: string, startTime: string, endTime?: string): string {
  const datePart = formatDate(dateStr);
  const timePart = endTime
    ? `${formatTime(startTime)} – ${formatTime(endTime)}`
    : formatTime(startTime);
  return `${datePart} · ${timePart}`;
}

export function isToday(dateStr: string): boolean {
  const today = new Date();
  const d = new Date(dateStr + 'T00:00:00');
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

export function isTomorrow(dateStr: string): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const d = new Date(dateStr + 'T00:00:00');
  return (
    d.getDate() === tomorrow.getDate() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getFullYear() === tomorrow.getFullYear()
  );
}

export function isPastDate(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + 'T00:00:00');
  return d < today;
}

export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function getDateLabel(dateStr: string): string {
  if (isToday(dateStr)) return 'Today';
  if (isTomorrow(dateStr)) return 'Tomorrow';
  return formatShortDate(dateStr);
}

export function getTimeOfDay(timeStr: string): 'Morning' | 'Afternoon' | 'Evening' {
  const [hours] = timeStr.split(':').map(Number);
  if (hours < 12) return 'Morning';
  if (hours < 17) return 'Afternoon';
  return 'Evening';
}

export function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function tomorrowStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

export function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getSpecialtyIcon(specialization: string): string {
  const map: Record<string, string> = {
    Cardiology: '',
    Dermatology: '',
    'General Physician': '',
    Orthopedic: '',
    Pediatrics: '',
    ENT: '',
    Dentist: '',
    Neurology: '',
    Ophthalmology: '',
    Gynecology: '',
    Psychiatry: '',
    Radiology: '',
  };
  return map[specialization] || '🏥';
}
