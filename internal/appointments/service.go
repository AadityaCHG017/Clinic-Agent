package appointments

import (
	"errors"
	"time"
)

type Service interface {
	BookAppointment(patientID int, req BookAppointmentRequest) (*Appointment, error)
	GetPatientAppointments(patientID int) ([]Appointment, error)
	GetAppointmentForPatient(id, patientID int) (*Appointment, error)
	GetAppointmentForAdmin(id int) (*Appointment, error)
	RescheduleAppointment(id, patientID int, req RescheduleAppointmentRequest) (*Appointment, error)
	CancelAppointment(id, patientID int) error
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) BookAppointment(patientID int, req BookAppointmentRequest) (*Appointment, error) {
	parsedDate, err := time.Parse("2006-01-02", req.AppointmentDate)
	if err != nil {
		return nil, errors.New("invalid appointment date format, must be YYYY-MM-DD")
	}

	today := time.Now().Truncate(24 * time.Hour)
	if parsedDate.Before(today) {
		return nil, errors.New("cannot book an appointment in the past")
	}

	// Calculate end_time (30 minutes default)
	startTime := req.StartTime
	if len(startTime) == 5 {
		startTime = startTime + ":00"
	}
	startT, err := time.Parse("15:04:05", startTime)
	if err != nil {
		return nil, errors.New("invalid start_time format, must be HH:MM")
	}

	endTime := req.EndTime
	if endTime == "" {
		endTime = startT.Add(30 * time.Minute).Format("15:04:05")
	} else if len(endTime) == 5 {
		endTime = endTime + ":00"
	}

	return s.repo.BookAppointmentTx(patientID, req.DoctorID, req.AppointmentDate, startTime, endTime, req.Reason)
}

func (s *service) GetPatientAppointments(patientID int) ([]Appointment, error) {
	return s.repo.GetAppointmentsByPatient(patientID)
}

func (s *service) GetAppointmentForPatient(id, patientID int) (*Appointment, error) {
	return s.repo.GetAppointmentByIDAndPatient(id, patientID)
}

func (s *service) GetAppointmentForAdmin(id int) (*Appointment, error) {
	return s.repo.GetAppointmentByID(id)
}

func (s *service) RescheduleAppointment(id, patientID int, req RescheduleAppointmentRequest) (*Appointment, error) {
	parsedDate, err := time.Parse("2006-01-02", req.NewDate)
	if err != nil {
		return nil, errors.New("invalid new date format, must be YYYY-MM-DD")
	}

	today := time.Now().Truncate(24 * time.Hour)
	if parsedDate.Before(today) {
		return nil, errors.New("cannot reschedule an appointment to a date in the past")
	}

	startTime := req.NewStartTime
	if len(startTime) == 5 {
		startTime = startTime + ":00"
	}
	startT, err := time.Parse("15:04:05", startTime)
	if err != nil {
		return nil, errors.New("invalid start time format")
	}

	endTime := req.NewEndTime
	if endTime == "" {
		endTime = startT.Add(30 * time.Minute).Format("15:04:05")
	} else if len(endTime) == 5 {
		endTime = endTime + ":00"
	}

	return s.repo.RescheduleAppointmentTx(id, patientID, req.NewDate, startTime, endTime)
}

func (s *service) CancelAppointment(id, patientID int) error {
	return s.repo.CancelAppointment(id, patientID)
}
