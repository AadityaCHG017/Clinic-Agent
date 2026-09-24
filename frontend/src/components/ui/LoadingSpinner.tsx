interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export default function LoadingSpinner({ size = 'md', label }: LoadingSpinnerProps) {
  return (
    <div className={`spinner-wrapper spinner-${size}`} role="status" aria-label={label || 'Loading'}>
      <div className="spinner" />
      {label && <span className="spinner-label">{label}</span>}
    </div>
  );
}
