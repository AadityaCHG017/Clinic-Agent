import { useEffect, useState } from 'react';
import { checkHealth } from '../../api/client';

export default function HealthStatus() {
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const result = await checkHealth();
      if (mounted) setOnline(result);
    };
    check();
    const interval = setInterval(check, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (online === null) return null;

  return (
    <div className={`health-status ${online ? 'online' : 'offline'}`} aria-live="polite">
      <span className="health-dot" />
      <span className="health-label">
        {online ? 'Clinic services connected' : 'Backend unavailable'}
      </span>
    </div>
  );
}
