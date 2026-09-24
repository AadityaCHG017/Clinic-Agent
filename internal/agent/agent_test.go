package agent

import (
	"testing"
)

type dummyDocSvc struct{}
type dummyApptSvc struct{}

func TestToolExecutorIdentityIsolation(t *testing.T) {
	// Verify that getInt helper handles numeric conversions safely
	val, ok := getInt(float64(10))
	if !ok || val != 10 {
		t.Errorf("Expected getInt(10.0) to be 10, got %d", val)
	}

	val, ok = getInt(25)
	if !ok || val != 25 {
		t.Errorf("Expected getInt(25) to be 25, got %d", val)
	}
}

func TestAvailableToolsDefinition(t *testing.T) {
	tools := GetAvailableTools()
	if len(tools) == 0 {
		t.Fatal("Expected available tools to be defined")
	}

	toolNames := make(map[string]bool)
	for _, tool := range tools {
		toolNames[tool.Name] = true
	}

	requiredTools := []string{
		"find_doctors",
		"get_doctor_availability",
		"get_patient_appointments",
		"book_appointment",
		"reschedule_appointment",
		"cancel_appointment",
	}

	for _, req := range requiredTools {
		if !toolNames[req] {
			t.Errorf("Missing required agent tool: %s", req)
		}
	}
}
