import { Link } from 'react-router-dom';
import { Phone, Mail, ArrowRight } from 'lucide-react';
import type { Doctor } from '../../types';
import { getSpecialtyIcon } from '../../utils';

interface DoctorCardProps {
  doctor: Doctor;
}

export default function DoctorCard({ doctor }: DoctorCardProps) {
  return (
    <div className="doctor-card">
      <div className="doctor-card-header">
        <div className="doctor-avatar" aria-hidden="true">
          <span className="doctor-avatar-icon">{getSpecialtyIcon(doctor.specialization)}</span>
        </div>
        <div className="doctor-card-info">
          <h3 className="doctor-name">{doctor.name}</h3>
          <span className="doctor-specialty">{doctor.specialization}</span>
          {doctor.status === 'active' && (
            <span className="doctor-available-badge">● Available</span>
          )}
        </div>
      </div>

      <div className="doctor-card-contact">
        {doctor.phone && (
          <div className="contact-item">
            <Phone size={14} aria-hidden="true" />
            <span>{doctor.phone}</span>
          </div>
        )}
        {doctor.email && (
          <div className="contact-item">
            <Mail size={14} aria-hidden="true" />
            <span>{doctor.email}</span>
          </div>
        )}
      </div>

      <Link to={`/doctors/${doctor.id}`} className="btn btn-primary btn-full">
        View Doctor
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </div>
  );
}
