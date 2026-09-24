package appointments

import "time"

type Appointment struct {
	ID              int       `json:"id"`
	PatientID       int       `json:"patient_id"`
	PatientName     string    `json:"patient_name,omitempty"`
	DoctorID        int       `json:"doctor_id"`
	DoctorName      string    `json:"doctor_name"`
	DoctorSpecialty string    `json:"doctor_specialty"`
	AppointmentDate string    `json:"appointment_date"` // YYYY-MM-DD
	StartTime       string    `json:"start_time"`       // HH:MM
	EndTime         string    `json:"end_time"`         // HH:MM
	Status          string    `json:"status"`           // scheduled, cancelled, completed
	Reason          string    `json:"reason"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type BookAppointmentRequest struct {
	DoctorID        int    `json:"doctor_id" binding:"required"`
	AppointmentDate string `json:"appointment_date" binding:"required"` // YYYY-MM-DD
	StartTime       string `json:"start_time" binding:"required"`       // HH:MM
	EndTime         string `json:"end_time"`                            // optional, auto-calculated to 30 mins if blank
	Reason          string `json:"reason"`
}

type RescheduleAppointmentRequest struct {
	NewDate      string `json:"new_date" binding:"required"`       // YYYY-MM-DD
	NewStartTime string `json:"new_start_time" binding:"required"` // HH:MM
	NewEndTime   string `json:"new_end_time"`                      // HH:MM
}
