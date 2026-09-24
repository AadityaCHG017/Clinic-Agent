package doctors

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

type Repository interface {
	GetAllDoctors(specialization string) ([]Doctor, error)
	GetDoctorByID(id int) (*Doctor, error)
	GetDoctorAvailabilityRules(doctorID int, dayOfWeek int) ([]DoctorAvailabilityRule, error)
	GetBookedSlots(doctorID int, date string) ([]string, error)
}

type postgresRepository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) Repository {
	return &postgresRepository{db: db}
}

func (r *postgresRepository) GetAllDoctors(specialization string) ([]Doctor, error) {
	query := `
		SELECT id, name, specialization, email, phone, status, created_at, updated_at
		FROM doctors
		WHERE status = 'active'
	`
	var args []interface{}
	if strings.TrimSpace(specialization) != "" {
		query += " AND LOWER(specialization) LIKE $1"
		args = append(args, "%"+strings.ToLower(strings.TrimSpace(specialization))+"%")
	}
	query += " ORDER BY id ASC"

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query doctors: %w", err)
	}
	defer rows.Close()

	var docs []Doctor
	for rows.Next() {
		var d Doctor
		if err := rows.Scan(&d.ID, &d.Name, &d.Specialization, &d.Email, &d.Phone, &d.Status, &d.CreatedAt, &d.UpdatedAt); err != nil {
			return nil, err
		}
		docs = append(docs, d)
	}
	return docs, nil
}

func (r *postgresRepository) GetDoctorByID(id int) (*Doctor, error) {
	query := `
		SELECT id, name, specialization, email, phone, status, created_at, updated_at
		FROM doctors
		WHERE id = $1 AND status = 'active'
	`
	var d Doctor
	err := r.db.QueryRow(query, id).Scan(&d.ID, &d.Name, &d.Specialization, &d.Email, &d.Phone, &d.Status, &d.CreatedAt, &d.UpdatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("doctor not found")
		}
		return nil, err
	}
	return &d, nil
}

func (r *postgresRepository) GetDoctorAvailabilityRules(doctorID int, dayOfWeek int) ([]DoctorAvailabilityRule, error) {
	query := `
		SELECT id, doctor_id, day_of_week, start_time::text, end_time::text, slot_duration_minutes
		FROM doctor_availability
		WHERE doctor_id = $1 AND day_of_week = $2
	`
	rows, err := r.db.Query(query, doctorID, dayOfWeek)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rules []DoctorAvailabilityRule
	for rows.Next() {
		var rule DoctorAvailabilityRule
		if err := rows.Scan(&rule.ID, &rule.DoctorID, &rule.DayOfWeek, &rule.StartTime, &rule.EndTime, &rule.SlotDurationMinutes); err != nil {
			return nil, err
		}
		rules = append(rules, rule)
	}
	return rules, nil
}

func (r *postgresRepository) GetBookedSlots(doctorID int, date string) ([]string, error) {
	query := `
		SELECT start_time::text
		FROM appointments
		WHERE doctor_id = $1 AND appointment_date = $2 AND status = 'scheduled'
	`
	rows, err := r.db.Query(query, doctorID, date)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var booked []string
	for rows.Next() {
		var st string
		if err := rows.Scan(&st); err != nil {
			return nil, err
		}
		// Format start_time to HH:MM
		if len(st) >= 5 {
			st = st[:5]
		}
		booked = append(booked, st)
	}
	return booked, nil
}
