package agent

import (
	"encoding/json"
	"errors"
	"fmt"

	"clinic-agent/internal/appointments"
	"clinic-agent/internal/doctors"
)

type ToolExecutor struct {
	docSvc  doctors.Service
	apptSvc appointments.Service
}

func NewToolExecutor(docSvc doctors.Service, apptSvc appointments.Service) *ToolExecutor {
	return &ToolExecutor{
		docSvc:  docSvc,
		apptSvc: apptSvc,
	}
}

func (e *ToolExecutor) ExecuteTool(name string, rawArgs string, patientID int) (interface{}, error) {
	var args map[string]interface{}
	if rawArgs != "" && rawArgs != "{}" {
		if err := json.Unmarshal([]byte(rawArgs), &args); err != nil {
			return nil, fmt.Errorf("invalid tool JSON arguments: %w", err)
		}
	} else {
		args = make(map[string]interface{})
	}

	switch name {
	case "find_doctors":
		spec, _ := args["specialization"].(string)
		return e.docSvc.GetAllDoctors(spec)

	case "get_doctor_availability":
		docID, ok := getInt(args["doctor_id"])
		if !ok {
			return nil, errors.New("doctor_id is required and must be an integer")
		}
		date, _ := args["date"].(string)
		if date == "" {
			return nil, errors.New("date (YYYY-MM-DD) is required")
		}
		return e.docSvc.GetAvailableSlots(docID, date)

	case "get_patient_appointments":
		// CRITICAL SECURITY ENFORCEMENT: Ignore LLM args for patient_id, use patientID from JWT context
		return e.apptSvc.GetPatientAppointments(patientID)

	case "book_appointment":
		docID, ok := getInt(args["doctor_id"])
		if !ok {
			return nil, errors.New("doctor_id is required")
		}
		date, _ := args["date"].(string)
		startTime, _ := args["start_time"].(string)
		reason, _ := args["reason"].(string)

		req := appointments.BookAppointmentRequest{
			DoctorID:        docID,
			AppointmentDate: date,
			StartTime:       startTime,
			Reason:          reason,
		}
		// CRITICAL SECURITY ENFORCEMENT: Enforce authenticated patientID from JWT
		return e.apptSvc.BookAppointment(patientID, req)

	case "reschedule_appointment":
		apptID, ok := getInt(args["appointment_id"])
		if !ok {
			return nil, errors.New("appointment_id is required")
		}
		newDate, _ := args["new_date"].(string)
		newStartTime, _ := args["new_start_time"].(string)

		req := appointments.RescheduleAppointmentRequest{
			NewDate:      newDate,
			NewStartTime: newStartTime,
		}
		// CRITICAL SECURITY ENFORCEMENT: Enforce authenticated patientID from JWT
		return e.apptSvc.RescheduleAppointment(apptID, patientID, req)

	case "cancel_appointment":
		apptID, ok := getInt(args["appointment_id"])
		if !ok {
			return nil, errors.New("appointment_id is required")
		}
		// CRITICAL SECURITY ENFORCEMENT: Enforce authenticated patientID from JWT
		if err := e.apptSvc.CancelAppointment(apptID, patientID); err != nil {
			return nil, err
		}
		return map[string]string{
			"status":  "cancelled",
			"message": fmt.Sprintf("Appointment #%d successfully cancelled", apptID),
		}, nil

	default:
		return nil, fmt.Errorf("unknown tool: %s", name)
	}
}

func getInt(val interface{}) (int, bool) {
	if val == nil {
		return 0, false
	}
	switch v := val.(type) {
	case float64:
		return int(v), true
	case int:
		return v, true
	case int64:
		return int(v), true
	default:
		return 0, false
	}
}
