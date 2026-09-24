import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Mail, Shield, Calendar, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getMe } from '../api/auth';
import type { User as UserType } from '../types';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { formatDate } from '../utils';

export default function Profile() {
  const { user: authUser, login, token } = useAuth();
  const [profile, setProfile] = useState<UserType | null>(authUser);
  const [isLoading, setIsLoading] = useState(!authUser);

  useEffect(() => {
    getMe()
      .then((data) => {
        setProfile(data);
        if (token) login(token, data);
      })
      .catch(() => setProfile(authUser))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <div className="page-container center-content"><LoadingSpinner size="lg" label="Loading profile..." /></div>;
  }

  if (!profile) return null;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">My Profile</h1>
        <p className="page-subtitle">Your personal health account information</p>
      </div>

      {/* Profile Card */}
      <div className="profile-card">
        <div className="profile-avatar">
          {profile.name?.[0]?.toUpperCase() || 'U'}
        </div>
        <div className="profile-name">{profile.name}</div>
        <div className="profile-role">{profile.role === 'PATIENT' ? 'Patient' : profile.role}</div>
      </div>

      {/* Info */}
      <div className="profile-info-card">
        <h2 className="profile-section-title">Account Information</h2>
        <div className="profile-info-list">
          <div className="profile-info-item">
            <div className="profile-info-icon"><User size={20} aria-hidden="true" /></div>
            <div>
              <span className="profile-info-label">Full Name</span>
              <span className="profile-info-value">{profile.name}</span>
            </div>
          </div>
          <div className="profile-info-item">
            <div className="profile-info-icon"><Mail size={20} aria-hidden="true" /></div>
            <div>
              <span className="profile-info-label">Email Address</span>
              <span className="profile-info-value">{profile.email}</span>
            </div>
          </div>
          <div className="profile-info-item">
            <div className="profile-info-icon"><Shield size={20} aria-hidden="true" /></div>
            <div>
              <span className="profile-info-label">Role</span>
              <span className="profile-info-value">{profile.role}</span>
            </div>
          </div>
          <div className="profile-info-item">
            <div className="profile-info-icon"><Calendar size={20} aria-hidden="true" /></div>
            <div>
              <span className="profile-info-label">Member Since</span>
              <span className="profile-info-value">{formatDate(profile.created_at?.split('T')[0] || '')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="profile-actions-card">
        <h2 className="profile-section-title">Account Settings</h2>
        <Link to="/change-password" className="profile-action-link">
          <div className="profile-action-icon"><Shield size={20} aria-hidden="true" /></div>
          <div>
            <span className="profile-action-label">Change Password</span>
            <span className="profile-action-desc">Update your account password</span>
          </div>
          <ChevronRight size={20} className="profile-action-arrow" aria-hidden="true" />
        </Link>
        <Link to="/appointments" className="profile-action-link">
          <div className="profile-action-icon"><Calendar size={20} aria-hidden="true" /></div>
          <div>
            <span className="profile-action-label">My Appointments</span>
            <span className="profile-action-desc">View and manage your appointments</span>
          </div>
          <ChevronRight size={20} className="profile-action-arrow" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
