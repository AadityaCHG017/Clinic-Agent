-- Migration 002: Seed Doctor and Availability Data (7 Days a Week)

INSERT INTO doctors (id, name, specialization, email, phone, status) VALUES
(1, 'Dr. Sarah Jenkins', 'Dermatology', 'sarah.jenkins@clinic.com', '+1-555-0101', 'active'),
(2, 'Dr. Rajesh Sharma', 'Cardiology', 'rajesh.sharma@clinic.com', '+1-555-0102', 'active'),
(3, 'Dr. Emily Chen', 'General Physician', 'emily.chen@clinic.com', '+1-555-0103', 'active'),
(4, 'Dr. Michael Vance', 'Orthopedic', 'michael.vance@clinic.com', '+1-555-0104', 'active'),
(5, 'Dr. Priya Patel', 'Pediatrics', 'priya.patel@clinic.com', '+1-555-0105', 'active'),
(6, 'Dr. Alan Grant', 'ENT', 'alan.grant@clinic.com', '+1-555-0106', 'active'),
(7, 'Dr. Olivia Taylor', 'Dentist', 'olivia.taylor@clinic.com', '+1-555-0107', 'active')
ON CONFLICT (id) DO NOTHING;

-- Reset sequence for doctors
SELECT setval('doctors_id_seq', (SELECT MAX(id) FROM doctors));

-- Seed Doctor Availability (Sunday=0 through Saturday=6, 09:00 to 17:00, 30 min slots)
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes)
SELECT d.id, dow.day, '09:00:00'::TIME, '17:00:00'::TIME, 30
FROM doctors d
CROSS JOIN (VALUES (0), (1), (2), (3), (4), (5), (6)) AS dow(day)
ON CONFLICT DO NOTHING;
