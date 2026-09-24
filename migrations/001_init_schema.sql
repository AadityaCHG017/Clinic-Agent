-- Migration 001: Initial Schema for Clinic Appointment System

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'PATIENT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS doctors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS doctor_availability (
    id SERIAL PRIMARY KEY,
    doctor_id INT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 1=Monday...
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration_minutes INT NOT NULL DEFAULT 30,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    patient_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doctor_id INT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'completed')),
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Unique indexes to strictly prevent double-booking at DB level for active appointments
CREATE UNIQUE INDEX IF NOT EXISTS idx_no_doctor_double_booking 
ON appointments (doctor_id, appointment_date, start_time) 
WHERE status = 'scheduled';

CREATE UNIQUE INDEX IF NOT EXISTS idx_no_patient_double_booking 
ON appointments (patient_id, appointment_date, start_time) 
WHERE status = 'scheduled';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date ON appointments(doctor_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_doctors_specialization ON doctors(LOWER(specialization));
