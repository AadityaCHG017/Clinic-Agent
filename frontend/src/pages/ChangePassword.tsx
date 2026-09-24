import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { changePassword } from '../api/auth';
import { ApiClientError } from '../api/client';

export default function ChangePassword() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (currentPassword === newPassword) {
      setError('New password must be different from your current password.');
      return;
    }

    setIsLoading(true);
    try {
      await changePassword({ current_password: currentPassword, new_password: newPassword });
      setSuccess(true);
      setTimeout(() => navigate('/profile'), 2500);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not change password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-container">
      <button className="back-btn" onClick={() => navigate('/profile')}>
        <ChevronLeft size={20} />
        Back to Profile
      </button>

      <div className="page-header">
        <h1 className="page-title">Change Password</h1>
        <p className="page-subtitle">Keep your account secure with a strong password</p>
      </div>

      <div className="auth-card page-form-card">
        {success ? (
          <div className="change-pw-success">
            <CheckCircle size={56} className="auth-success-icon" />
            <h2 className="auth-title">Password Changed!</h2>
            <p className="auth-subtitle">Your password has been updated successfully.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            {error && (
              <div className="auth-error" role="alert">
                <AlertCircle size={18} aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="current-password" className="form-label">Current Password</label>
              <div className="input-with-icon">
                <input
                  id="current-password"
                  type={showCurrent ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Your current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button type="button" className="input-icon-btn"
                  onClick={() => setShowCurrent((v) => !v)}
                  aria-label={showCurrent ? 'Hide password' : 'Show password'}>
                  {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="new-password" className="form-label">
                New Password
                <span className="form-hint">At least 6 characters</span>
              </label>
              <div className="input-with-icon">
                <input
                  id="new-password"
                  type={showNew ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Choose a new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  minLength={6}
                />
                <button type="button" className="input-icon-btn"
                  onClick={() => setShowNew((v) => !v)}
                  aria-label={showNew ? 'Hide password' : 'Show password'}>
                  {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={isLoading}
            >
              {isLoading ? 'Updating password...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
