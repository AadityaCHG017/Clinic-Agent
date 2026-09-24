package doctors

import "time"

type Doctor struct {
	ID             int       `json:"id"`
	Name           string    `json:"name"`
	Specialization string    `json:"specialization"`
	Email          string    `json:"email"`
	Phone          string    `json:"phone"`
	Status         string    `json:"status"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type DoctorAvailabilityRule struct {
	ID                  int    `json:"id"`
	DoctorID            int    `json:"doctor_id"`
	DayOfWeek           int    `json:"day_of_week"` // 0=Sun, 1=Mon ... 6=Sat
	StartTime           string `json:"start_time"`  // "09:00:00"
	EndTime             string `json:"end_time"`    // "17:00:00"
	SlotDurationMinutes int    `json:"slot_duration_minutes"`
}

type AvailableSlot struct {
	DoctorID       int    `json:"doctor_id"`
	DoctorName     string `json:"doctor_name"`
	Specialization string `json:"specialization"`
	Date           string `json:"date"`       // YYYY-MM-DD
	StartTime      string `json:"start_time"` // HH:MM
	EndTime        string `json:"end_time"`   // HH:MM
	IsAvailable    bool   `json:"is_available"`
}
