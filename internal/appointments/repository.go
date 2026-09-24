package appointments

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
)

type Repository interface {
	BookAppointmentTx(patientID, doctorID int, date, startTime, endTime, reason string) (*Appointment, error)
	GetAppointmentsByPatient(patientID int) ([]Appointment, error)
	GetAppointmentByIDAndPatient(id, patientID int) (*Appointment, error)
	GetAppointmentByID(id int) (*Appointment, error)
	RescheduleAppointmentTx(id, patientID int, newDate, newStartTime, newEndTime string) (*Appointment, error)
	CancelAppointment(id, patientID int) error
}

type postgresRepository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) Repository {
	return &postgresRepository{db: db}
}

func (r *postgresRepository) BookAppointmentTx(patientID, doctorID int, date, startTime, endTime, reason string) (*Appointment, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// 1. Lock doctor row & verify status
	var docName, docSpec, docStatus string
	err = tx.QueryRow(`
		SELECT name, specialization, status
		FROM doctors
		WHERE id = $1
		FOR SHARE
	`, doctorID).Scan(&docName, &docSpec, &docStatus)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("doctor not found")
		}
		return nil, fmt.Errorf("failed to verify doctor: %w", err)
	}
	if docStatus != "active" {
		return nil, errors.New("doctor is currently not active")
	}

	// 2. Check doctor availability rule for that day of week
	parsedDate, err := time.Parse("2006-01-02", date)
	if err != nil {
		return nil, errors.New("invalid appointment date format")
	}
	dow := int(parsedDate.Weekday())

	var ruleCount int
	err = tx.QueryRow(`
		SELECT COUNT(*)
		FROM doctor_availability
		WHERE doctor_id = $1 AND day_of_week = $2
		  AND $3::TIME >= start_time AND $4::TIME <= end_time
	`, doctorID, dow, startTime, endTime).Scan(&ruleCount)
	if err != nil || ruleCount == 0 {
		return nil, errors.New("selected time slot is outside the doctor's working hours")
	}

	// 3. Check doctor existing conflicting scheduled appointment
	var doctorConflict int
	err = tx.QueryRow(`
		SELECT COUNT(*)
		FROM appointments
		WHERE doctor_id = $1 AND appointment_date = $2 AND status = 'scheduled'
		  AND start_time = $3::TIME
	`, doctorID, date, startTime).Scan(&doctorConflict)
	if err != nil {
		return nil, fmt.Errorf("failed to check doctor schedule conflict: %w", err)
	}
	if doctorConflict > 0 {
		return nil, errors.New("doctor is already booked for this time slot")
	}

	// 4. Check patient existing conflicting scheduled appointment
	var patientConflict int
	err = tx.QueryRow(`
		SELECT COUNT(*)
		FROM appointments
		WHERE patient_id = $1 AND appointment_date = $2 AND status = 'scheduled'
		  AND start_time = $3::TIME
	`, patientID, date, startTime).Scan(&patientConflict)
	if err != nil {
		return nil, fmt.Errorf("failed to check patient schedule conflict: %w", err)
	}
	if patientConflict > 0 {
		return nil, errors.New("you already have another appointment scheduled at this exact time")
	}

	// 5. Insert appointment
	insertQuery := `
		INSERT INTO appointments (patient_id, doctor_id, appointment_date, start_time, end_time, status, reason)
		VALUES ($1, $2, $3, $4::TIME, $5::TIME, 'scheduled', $6)
		RETURNING id, patient_id, doctor_id, appointment_date::text, start_time::text, end_time::text, status, reason, created_at, updated_at
	`
	var appt Appointment
	err = tx.QueryRow(insertQuery, patientID, doctorID, date, startTime, endTime, reason).Scan(
		&appt.ID, &appt.PatientID, &appt.DoctorID, &appt.AppointmentDate, &appt.StartTime, &appt.EndTime,
		&appt.Status, &appt.Reason, &appt.CreatedAt, &appt.UpdatedAt,
	)
	if err != nil {
		if strings.Contains(err.Error(), "unique constraint") || strings.Contains(err.Error(), "idx_no_doctor_double_booking") {
			return nil, errors.New("slot was concurrently booked by another patient")
		}
		return nil, fmt.Errorf("failed to create appointment: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	appt.DoctorName = docName
	appt.DoctorSpecialty = docSpec
	if len(appt.StartTime) >= 5 {
		appt.StartTime = appt.StartTime[:5]
	}
	if len(appt.EndTime) >= 5 {
		appt.EndTime = appt.EndTime[:5]
	}

	return &appt, nil
}

func (r *postgresRepository) GetAppointmentsByPatient(patientID int) ([]Appointment, error) {
	query := `
		SELECT a.id, a.patient_id, u.name as patient_name, a.doctor_id, d.name as doctor_name, d.specialization as doctor_specialty,
		       a.appointment_date::text, a.start_time::text, a.end_time::text, a.status, COALESCE(a.reason, '') as reason, a.created_at, a.updated_at
		FROM appointments a
		JOIN users u ON a.patient_id = u.id
		JOIN doctors d ON a.doctor_id = d.id
		WHERE a.patient_id = $1
		ORDER BY a.appointment_date DESC, a.start_time DESC
	`
	rows, err := r.db.Query(query, patientID)
	if err != nil {
		return nil, fmt.Errorf("failed to query patient appointments: %w", err)
	}
	defer rows.Close()

	var appts []Appointment
	for rows.Next() {
		var a Appointment
		if err := rows.Scan(&a.ID, &a.PatientID, &a.PatientName, &a.DoctorID, &a.DoctorName, &a.DoctorSpecialty,
			&a.AppointmentDate, &a.StartTime, &a.EndTime, &a.Status, &a.Reason, &a.CreatedAt, &a.UpdatedAt); err != nil {
			return nil, err
		}
		if len(a.StartTime) >= 5 {
			a.StartTime = a.StartTime[:5]
		}
		if len(a.EndTime) >= 5 {
			a.EndTime = a.EndTime[:5]
		}
		appts = append(appts, a)
	}
	return appts, nil
}

func (r *postgresRepository) GetAppointmentByIDAndPatient(id, patientID int) (*Appointment, error) {
	query := `
		SELECT a.id, a.patient_id, u.name as patient_name, a.doctor_id, d.name as doctor_name, d.specialization as doctor_specialty,
		       a.appointment_date::text, a.start_time::text, a.end_time::text, a.status, COALESCE(a.reason, '') as reason, a.created_at, a.updated_at
		FROM appointments a
		JOIN users u ON a.patient_id = u.id
		JOIN doctors d ON a.doctor_id = d.id
		WHERE a.id = $1 AND a.patient_id = $2
	`
	var a Appointment
	err := r.db.QueryRow(query, id, patientID).Scan(
		&a.ID, &a.PatientID, &a.PatientName, &a.DoctorID, &a.DoctorName, &a.DoctorSpecialty,
		&a.AppointmentDate, &a.StartTime, &a.EndTime, &a.Status, &a.Reason, &a.CreatedAt, &a.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("appointment not found or access unauthorized")
		}
		return nil, err
	}
	if len(a.StartTime) >= 5 {
		a.StartTime = a.StartTime[:5]
	}
	if len(a.EndTime) >= 5 {
		a.EndTime = a.EndTime[:5]
	}
	return &a, nil
}

func (r *postgresRepository) GetAppointmentByID(id int) (*Appointment, error) {
	query := `
		SELECT a.id, a.patient_id, u.name as patient_name, a.doctor_id, d.name as doctor_name, d.specialization as doctor_specialty,
		       a.appointment_date::text, a.start_time::text, a.end_time::text, a.status, COALESCE(a.reason, '') as reason, a.created_at, a.updated_at
		FROM appointments a
		JOIN users u ON a.patient_id = u.id
		JOIN doctors d ON a.doctor_id = d.id
		WHERE a.id = $1
	`
	var a Appointment
	err := r.db.QueryRow(query, id).Scan(
		&a.ID, &a.PatientID, &a.PatientName, &a.DoctorID, &a.DoctorName, &a.DoctorSpecialty,
		&a.AppointmentDate, &a.StartTime, &a.EndTime, &a.Status, &a.Reason, &a.CreatedAt, &a.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("appointment not found")
		}
		return nil, err
	}
	if len(a.StartTime) >= 5 {
		a.StartTime = a.StartTime[:5]
	}
	if len(a.EndTime) >= 5 {
		a.EndTime = a.EndTime[:5]
	}
	return &a, nil
}

func (r *postgresRepository) RescheduleAppointmentTx(id, patientID int, newDate, newStartTime, newEndTime string) (*Appointment, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback()

	// Verify ownership and get current appt
	var doctorID int
	var status string
	err = tx.QueryRow(`
		SELECT doctor_id, status
		FROM appointments
		WHERE id = $1 AND patient_id = $2
		FOR UPDATE
	`, id, patientID).Scan(&doctorID, &status)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("appointment not found or access unauthorized")
		}
		return nil, err
	}

	if status == "cancelled" {
		return nil, errors.New("cannot reschedule a cancelled appointment")
	}

	// Verify doctor availability rule
	parsedDate, err := time.Parse("2006-01-02", newDate)
	if err != nil {
		return nil, errors.New("invalid date format")
	}
	dow := int(parsedDate.Weekday())

	var ruleCount int
	err = tx.QueryRow(`
		SELECT COUNT(*)
		FROM doctor_availability
		WHERE doctor_id = $1 AND day_of_week = $2
		  AND $3::TIME >= start_time AND $4::TIME <= end_time
	`, doctorID, dow, newStartTime, newEndTime).Scan(&ruleCount)
	if err != nil || ruleCount == 0 {
		return nil, errors.New("new time slot is outside the doctor's working hours")
	}

	// Check conflict for doctor (excluding current appt id)
	var docConflict int
	err = tx.QueryRow(`
		SELECT COUNT(*)
		FROM appointments
		WHERE doctor_id = $1 AND appointment_date = $2 AND status = 'scheduled'
		  AND start_time = $3::TIME AND id != $4
	`, doctorID, newDate, newStartTime, id).Scan(&docConflict)
	if err != nil {
		return nil, err
	}
	if docConflict > 0 {
		return nil, errors.New("doctor is already booked for the new time slot")
	}

	// Check conflict for patient (excluding current appt id)
	var patConflict int
	err = tx.QueryRow(`
		SELECT COUNT(*)
		FROM appointments
		WHERE patient_id = $1 AND appointment_date = $2 AND status = 'scheduled'
		  AND start_time = $3::TIME AND id != $4
	`, patientID, newDate, newStartTime, id).Scan(&patConflict)
	if err != nil {
		return nil, err
	}
	if patConflict > 0 {
		return nil, errors.New("you already have another appointment scheduled at the new time slot")
	}

	// Update appointment
	updateQuery := `
		UPDATE appointments
		SET appointment_date = $1, start_time = $2::TIME, end_time = $3::TIME, updated_at = CURRENT_TIMESTAMP
		WHERE id = $4 AND patient_id = $5
	`
	_, err = tx.Exec(updateQuery, newDate, newStartTime, newEndTime, id, patientID)
	if err != nil {
		return nil, fmt.Errorf("failed to update appointment slot: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit reschedule transaction: %w", err)
	}

	return r.GetAppointmentByIDAndPatient(id, patientID)
}

func (r *postgresRepository) CancelAppointment(id, patientID int) error {
	query := `
		UPDATE appointments
		SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND patient_id = $2 AND status = 'scheduled'
	`
	res, err := r.db.Exec(query, id, patientID)
	if err != nil {
		return fmt.Errorf("failed to cancel appointment: %w", err)
	}
	rows, err := res.RowsAffected()
	if err != nil || rows == 0 {
		return errors.New("appointment not found, already cancelled, or unauthorized")
	}
	return nil
}
