import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Eye, EyeOff, AlertCircle, CheckCircle, Check, X } from 'lucide-react';
import { register as apiRegister } from '../api/auth';
import { ApiClientError } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  // Password requirement checks
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumberOrSpecial = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const isPasswordValid = hasMinLength && hasUpper && hasLower && hasNumberOrSpecial;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (name.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!isPasswordValid) {
      setError('Please make sure your password meets all requirements listed below.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiRegister({ name: name.trim(), email: email.trim().toLowerCase(), password });
      login(res.token, res.user);
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Registration failed. Please check your connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card auth-success-card">
          <CheckCircle size={56} className="auth-success-icon" />
          <h1 className="auth-title">Account Created Successfully!</h1>
          <p className="auth-subtitle">Welcome to CareConnect. Signing you in and taking you to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <Heart size={32} className="auth-brand-icon" />
          <span className="auth-brand-name">CareConnect</span>
        </div>

        <div className="auth-header">
          <h1 className="auth-title">Create your account</h1>
          <p className="auth-subtitle">Join CareConnect and take charge of your healthcare</p>
        </div>

        {error && (
          <div className="auth-error" role="alert">
            <AlertCircle size={20} aria-hidden="true" style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-group">
            <label htmlFor="name" className="form-label">Full Name</label>
            <input
              id="name"
              type="text"
              className="form-input"
              placeholder="e.g. John Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              minLength={2}
              maxLength={100}
              aria-required="true"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">Email Address</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              aria-required="true"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <div className="input-with-icon">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                aria-required="true"
              />
              <button
                type="button"
                className="input-icon-btn"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Password strength checklist */}
            <div className="password-checklist">
              <span className="checklist-title">Password must contain:</span>
              <div className="checklist-items">
                <div className={`checklist-item ${hasMinLength ? 'valid' : ''}`}>
                  {hasMinLength ? <Check size={14} /> : <X size={14} />}
                  <span>At least 8 characters</span>
                </div>
                <div className={`checklist-item ${hasUpper ? 'valid' : ''}`}>
                  {hasUpper ? <Check size={14} /> : <X size={14} />}
                  <span>An uppercase letter (A-Z)</span>
                </div>
                <div className={`checklist-item ${hasLower ? 'valid' : ''}`}>
                  {hasLower ? <Check size={14} /> : <X size={14} />}
                  <span>A lowercase letter (a-z)</span>
                </div>
                <div className={`checklist-item ${hasNumberOrSpecial ? 'valid' : ''}`}>
                  {hasNumberOrSpecial ? <Check size={14} /> : <X size={14} />}
                  <span>A number (0-9) or symbol (!@#$)</span>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Sign in here</Link>
        </p>

        <Link to="/" className="auth-back">← Back to home</Link>
      </div>
    </div>
  );
}
