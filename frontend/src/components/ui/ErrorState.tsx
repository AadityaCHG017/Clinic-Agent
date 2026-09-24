import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="error-state" role="alert">
      <AlertCircle size={40} className="error-state-icon" />
      <p className="error-state-message">{message}</p>
      {onRetry && (
        <button className="btn btn-outline" onClick={onRetry}>
          <RefreshCw size={16} />
          Try Again
        </button>
      )}
    </div>
  );
}
