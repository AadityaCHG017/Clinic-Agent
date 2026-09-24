import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { getDoctors } from '../api/doctors';
import type { Doctor } from '../types';
import DoctorCard from '../components/doctors/DoctorCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorState from '../components/ui/ErrorState';
import EmptyState from '../components/ui/EmptyState';
import { Stethoscope } from 'lucide-react';
import { ApiClientError } from '../api/client';

const SPECIALTIES = [
  'All',
  'Cardiology',
  'Dermatology',
  'General Physician',
  'Orthopedic',
  'Pediatrics',
  'ENT',
  'Dentist',
  'Neurology',
];

export default function Doctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filtered, setFiltered] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedSpec, setSelectedSpec] = useState('All');

  const fetchDoctors = async (spec?: string) => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getDoctors(spec && spec !== 'All' ? spec : undefined);
      setDoctors(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Unable to load doctors. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    let list = Array.isArray(doctors) ? doctors : [];
    if (selectedSpec !== 'All') {
      list = list.filter((d) => d && d.specialization === selectedSpec);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          d &&
          (d.name?.toLowerCase().includes(q) ||
            d.specialization?.toLowerCase().includes(q))
      );
    }
    setFiltered(list);
  }, [doctors, selectedSpec, search]);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Our Doctors</h1>
        <p className="page-subtitle">Browse our team of qualified healthcare professionals</p>
      </div>

      {/* Search and Filter */}
      <div className="doctors-controls">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" aria-hidden="true" />
          <input
            type="search"
            className="form-input search-input"
            placeholder="Search by name or specialty..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search doctors"
          />
        </div>

        <div className="specialty-filters" role="group" aria-label="Filter by specialty">
          {SPECIALTIES.map((spec) => (
            <button
              key={spec}
              className={`filter-btn${selectedSpec === spec ? ' active' : ''}`}
              onClick={() => setSelectedSpec(spec)}
              aria-pressed={selectedSpec === spec}
            >
              {spec}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="center-content">
          <LoadingSpinner size="lg" label="Loading doctors..." />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchDoctors()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Stethoscope size={48} />}
          title="No doctors found"
          description={search || selectedSpec !== 'All' ? 'Try adjusting your search or filters.' : 'No doctors are available at this time.'}
        />
      ) : (
        <>
          <p className="results-count" aria-live="polite">
            {filtered.length} doctor{filtered.length !== 1 ? 's' : ''} found
          </p>
          <div className="doctors-grid">
            {filtered.map((doctor) => (
              <DoctorCard key={doctor.id} doctor={doctor} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
