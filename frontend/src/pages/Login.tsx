import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Heart, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { login as apiLogin } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { ApiClientError } from '../api/client';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const data = await apiLogin({ email, password });
      login(data.token, data.user);
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Unable to sign in. Please check your connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <Heart size={32} className="auth-brand-icon" />
          <span className="auth-brand-name">CareConnect</span>
        </div>

        <div className="auth-header">
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Sign in to manage your appointments</p>
        </div>

        {error && (
          <div className="auth-error" role="alert">
            <AlertCircle size={18} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
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
            <label htmlFor="password" className="form-label">Password</label>
            <div className="input-with-icon">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
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
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account?{' '}
          <Link to="/register" className="auth-link">Create one here</Link>
        </p>

        <Link to="/" className="auth-back">← Back to home</Link>
      </div>
    </div>
  );
}
