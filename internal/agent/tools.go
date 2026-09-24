package agent

type ToolDefinition struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Parameters  map[string]interface{} `json:"parameters"`
}

func GetAvailableTools() []ToolDefinition {
	return []ToolDefinition{
		{
			Name:        "find_doctors",
			Description: "Search for active clinic doctors by specialization (e.g. Dermatology, Cardiology, General Physician, Orthopedic, Pediatrics, ENT, Dentist).",
			Parameters: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"specialization": map[string]interface{}{
						"type":        "string",
						"description": "Specialties: Dermatology, Cardiology, General Physician, Orthopedic, Pediatrics, ENT, Dentist",
					},
				},
			},
		},
		{
			Name:        "get_doctor_availability",
			Description: "Get available 30-minute appointment slots for a doctor on a specific date.",
			Parameters: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"doctor_id": map[string]interface{}{
						"type":        "integer",
						"description": "ID of the doctor",
					},
					"date": map[string]interface{}{
						"type":        "string",
						"description": "Date in YYYY-MM-DD format",
					},
				},
				"required": []string{"doctor_id", "date"},
			},
		},
		{
			Name:        "get_patient_appointments",
			Description: "Retrieve all existing appointments (scheduled, cancelled, completed) for the authenticated patient.",
			Parameters: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "book_appointment",
			Description: "Book an appointment for the authenticated patient with a specified doctor on a date and start_time.",
			Parameters: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"doctor_id": map[string]interface{}{
						"type":        "integer",
						"description": "ID of the doctor",
					},
					"date": map[string]interface{}{
						"type":        "string",
						"description": "Date in YYYY-MM-DD format",
					},
					"start_time": map[string]interface{}{
						"type":        "string",
						"description": "Start time in HH:MM 24-hour format (e.g. 09:30, 14:00)",
					},
					"reason": map[string]interface{}{
						"type":        "string",
						"description": "Reason for the visit",
					},
				},
				"required": []string{"doctor_id", "date", "start_time"},
			},
		},
		{
			Name:        "reschedule_appointment",
			Description: "Reschedule an existing appointment of the authenticated patient to a new date and start_time.",
			Parameters: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"appointment_id": map[string]interface{}{
						"type":        "integer",
						"description": "ID of the appointment to reschedule",
					},
					"new_date": map[string]interface{}{
						"type":        "string",
						"description": "New date in YYYY-MM-DD format",
					},
					"new_start_time": map[string]interface{}{
						"type":        "string",
						"description": "New start time in HH:MM format",
					},
				},
				"required": []string{"appointment_id", "new_date", "new_start_time"},
			},
		},
		{
			Name:        "cancel_appointment",
			Description: "Cancel an existing appointment of the authenticated patient.",
			Parameters: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"appointment_id": map[string]interface{}{
						"type":        "integer",
						"description": "ID of the appointment to cancel",
					},
				},
				"required": []string{"appointment_id"},
			},
		},
	}
}
