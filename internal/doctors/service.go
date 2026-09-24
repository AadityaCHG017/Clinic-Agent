package doctors

import (
	"errors"
	"fmt"
	"time"
)

type Service interface {
	GetAllDoctors(specialization string) ([]Doctor, error)
	GetDoctorByID(id int) (*Doctor, error)
	GetAvailableSlots(doctorID int, dateStr string) ([]AvailableSlot, error)
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) GetAllDoctors(specialization string) ([]Doctor, error) {
	return s.repo.GetAllDoctors(specialization)
}

func (s *service) GetDoctorByID(id int) (*Doctor, error) {
	return s.repo.GetDoctorByID(id)
}

func (s *service) GetAvailableSlots(doctorID int, dateStr string) ([]AvailableSlot, error) {
	parsedDate, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return nil, errors.New("invalid date format, must be YYYY-MM-DD")
	}

	doc, err := s.repo.GetDoctorByID(doctorID)
	if err != nil {
		return nil, err
	}

	// Go time.Weekday: Sunday=0, Monday=1, ..., Saturday=6
	dayOfWeek := int(parsedDate.Weekday())

	rules, err := s.repo.GetDoctorAvailabilityRules(doctorID, dayOfWeek)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch availability rules: %w", err)
	}

	if len(rules) == 0 {
		// Doctor does not work on this day
		return []AvailableSlot{}, nil
	}

	bookedSlots, err := s.repo.GetBookedSlots(doctorID, dateStr)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch booked slots: %w", err)
	}

	bookedMap := make(map[string]bool)
	for _, b := range bookedSlots {
		bookedMap[b] = true
	}

	var slots []AvailableSlot
	for _, rule := range rules {
		// Parse rule start and end times (HH:MM:SS or HH:MM)
		startTimeStr := rule.StartTime
		if len(startTimeStr) > 5 {
			startTimeStr = startTimeStr[:5]
		}
		endTimeStr := rule.EndTime
		if len(endTimeStr) > 5 {
			endTimeStr = endTimeStr[:5]
		}

		startT, err := time.Parse("15:04", startTimeStr)
		if err != nil {
			continue
		}
		endT, err := time.Parse("15:04", endTimeStr)
		if err != nil {
			continue
		}

		duration := time.Duration(rule.SlotDurationMinutes) * time.Minute
		if duration <= 0 {
			duration = 30 * time.Minute
		}

		curr := startT
		for curr.Add(duration).Before(endT) || curr.Add(duration).Equal(endT) {
			slotStart := curr.Format("15:04")
			slotEnd := curr.Add(duration).Format("15:04")

			isAvail := !bookedMap[slotStart]

			slots = append(slots, AvailableSlot{
				DoctorID:       doc.ID,
				DoctorName:     doc.Name,
				Specialization: doc.Specialization,
				Date:           dateStr,
				StartTime:      slotStart,
				EndTime:        slotEnd,
				IsAvailable:    isAvail,
			})

			curr = curr.Add(duration)
		}
	}

	return slots, nil
}
