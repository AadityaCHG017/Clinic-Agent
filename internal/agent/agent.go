package agent

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"clinic-agent/internal/appointments"
	"clinic-agent/internal/config"
	"clinic-agent/internal/doctors"
)

type Agent struct {
	cfg      *config.Config
	executor *ToolExecutor
}

func NewAgent(cfg *config.Config, executor *ToolExecutor) *Agent {
	return &Agent{
		cfg:      cfg,
		executor: executor,
	}
}

type ChatRequest struct {
	Message string `json:"message" binding:"required"`
}

type ChatResponse struct {
	Reply     string        `json:"reply"`
	ToolsUsed []ToolCallLog `json:"tools_used,omitempty"`
}

type ToolCallLog struct {
	ToolName string      `json:"tool_name"`
	Input    string      `json:"input"`
	Output   interface{} `json:"output"`
}

func (a *Agent) ProcessMessage(userMessage string, patientID int) (*ChatResponse, error) {
	todayStr := time.Now().Format("2006-01-02")
	fullPrompt := fmt.Sprintf("%s\n\n[TODAY'S DATE CONTEXT: %s]", SystemPrompt, todayStr)

	// If LLM_API_KEY is configured, attempt Gemini LLM function calling loop
	if a.cfg.LLMAPIKey != "" {
		reply, logs, err := a.runGeminiLoop(fullPrompt, userMessage, patientID)
		if err == nil && reply != "" {
			return &ChatResponse{Reply: reply, ToolsUsed: logs}, nil
		}
		log.Printf("Gemini API call failed or unavailable (%v), using deterministic agent engine", err)
	}

	// Deterministic Agent Reasoning & Execution Engine
	reply, logs, err := a.runDeterministicAgent(userMessage, patientID)
	if err != nil {
		return nil, err
	}
	return &ChatResponse{Reply: reply, ToolsUsed: logs}, nil
}

func (a *Agent) runDeterministicAgent(userMsg string, patientID int) (string, []ToolCallLog, error) {
	lowerMsg := strings.ToLower(strings.TrimSpace(userMsg))
	var logs []ToolCallLog

	// Fetch active appointments
	apptsRaw, err := a.executor.ExecuteTool("get_patient_appointments", "{}", patientID)
	var activeAppts []appointments.Appointment
	if err == nil {
		jsonBytes, _ := json.Marshal(apptsRaw)
		var allAppts []appointments.Appointment
		json.Unmarshal(jsonBytes, &allAppts)
		for _, appt := range allAppts {
			if appt.Status == "scheduled" {
				activeAppts = append(activeAppts, appt)
			}
		}
	}

	// Fetch all clinic doctors
	docsRaw, _ := a.executor.ExecuteTool("find_doctors", "{}", patientID)
	docsBytes, _ := json.Marshal(docsRaw)
	var allDocs []doctors.Doctor
	json.Unmarshal(docsBytes, &allDocs)

	// 1. CANCEL INTENT ("cancel", "cancel appointment", "cancel Dr. Sarah")
	if strings.Contains(lowerMsg, "cancel") {
		if len(activeAppts) == 0 {
			return "You currently have no scheduled appointments to cancel.", logs, nil
		}

		targetAppt := findMatchingAppointment(userMsg, activeAppts)

		if targetAppt != nil {
			argsJSON := fmt.Sprintf(`{"appointment_id":%d}`, targetAppt.ID)
			res, err := a.executor.ExecuteTool("cancel_appointment", argsJSON, patientID)
			if err != nil {
				return fmt.Sprintf("⚠️ Could not cancel appointment: %s", err.Error()), logs, nil
			}
			logs = append(logs, ToolCallLog{ToolName: "cancel_appointment", Input: argsJSON, Output: res})
			return fmt.Sprintf("✅ **Appointment Cancelled Successfully**\n\nYour appointment with **%s** (%s) on **%s at %s** has been cancelled.", targetAppt.DoctorName, targetAppt.DoctorSpecialty, formatDateFriendly(targetAppt.AppointmentDate), formatTimeFriendly(targetAppt.StartTime)), logs, nil
		}

		logs = append(logs, ToolCallLog{ToolName: "get_patient_appointments", Input: "{}", Output: apptsRaw})
		var sb strings.Builder
		sb.WriteString("You have multiple scheduled appointments. Which one would you like to cancel?\n\n")
		for _, appt := range activeAppts {
			sb.WriteString(fmt.Sprintf("• **%s** (%s) — Date: %s at %s\n", appt.DoctorName, appt.DoctorSpecialty, formatDateFriendly(appt.AppointmentDate), formatTimeFriendly(appt.StartTime)))
		}
		sb.WriteString("\n*Reply with:* **\"Cancel appointment with " + activeAppts[0].DoctorName + "\"**")
		return sb.String(), logs, nil
	}

	// 2. RESCHEDULE INTENT ("reschedule Dr. Sarah to tomorrow at 10:00")
	if strings.Contains(lowerMsg, "reschedule") || strings.Contains(lowerMsg, "change time") || strings.Contains(lowerMsg, "move appointment") {
		if len(activeAppts) == 0 {
			return "You currently have no scheduled appointments to reschedule.", logs, nil
		}

		dateStr := extractDate(userMsg)
		timeStr := extractTime(userMsg)

		// Enforce 1 week max booking window limit
		if dateStr != "" {
			if limitMsg := validateDateWithinLimit(dateStr); limitMsg != "" {
				return limitMsg, logs, nil
			}
		}

		targetAppt := findMatchingAppointment(userMsg, activeAppts)

		if targetAppt != nil && dateStr != "" && timeStr != "" {
			argsJSON := fmt.Sprintf(`{"appointment_id":%d,"new_date":"%s","new_start_time":"%s"}`, targetAppt.ID, dateStr, timeStr)
			res, err := a.executor.ExecuteTool("reschedule_appointment", argsJSON, patientID)
			if err != nil {
				return fmt.Sprintf("⚠️ Could not reschedule appointment: %s", err.Error()), logs, nil
			}
			logs = append(logs, ToolCallLog{ToolName: "reschedule_appointment", Input: argsJSON, Output: res})
			return fmt.Sprintf("✅ **Appointment Rescheduled Successfully**\n\nYour appointment with **%s** has been moved to **%s at %s**.", targetAppt.DoctorName, formatDateFriendly(dateStr), formatTimeFriendly(timeStr)), logs, nil
		}

		if targetAppt != nil {
			return fmt.Sprintf("What new date and time would you like for your appointment with **%s**? (Must be within 1 week)\n\n*Example reply:* **\"Reschedule to tomorrow at 10:00 AM\"**", targetAppt.DoctorName), logs, nil
		}

		var sb strings.Builder
		sb.WriteString("Which appointment would you like to reschedule?\n\n")
		for _, appt := range activeAppts {
			sb.WriteString(fmt.Sprintf("• **%s** (%s) — Date: %s at %s\n", appt.DoctorName, appt.DoctorSpecialty, formatDateFriendly(appt.AppointmentDate), formatTimeFriendly(appt.StartTime)))
		}
		sb.WriteString("\n*Reply with:* **\"Reschedule " + activeAppts[0].DoctorName + " to tomorrow at 10:00 AM\"**")
		return sb.String(), logs, nil
	}

	// 3. BOOK INTENT ("book Dr. Rajesh on 28th at 09:30")
	if strings.Contains(lowerMsg, "book") || strings.Contains(lowerMsg, "schedule") {
		dateStr := extractDate(userMsg)
		timeStr := extractTime(userMsg)

		// Enforce 1 week max booking window limit
		if dateStr != "" {
			if limitMsg := validateDateWithinLimit(dateStr); limitMsg != "" {
				return limitMsg, logs, nil
			}
		}

		targetDoc := findMatchingDoctor(userMsg, allDocs)

		if targetDoc != nil && dateStr != "" && timeStr != "" {
			argsJSON := fmt.Sprintf(`{"doctor_id":%d,"date":"%s","start_time":"%s"}`, targetDoc.ID, dateStr, timeStr)
			res, err := a.executor.ExecuteTool("book_appointment", argsJSON, patientID)
			if err != nil {
				return fmt.Sprintf("⚠️ Could not book appointment: %s", err.Error()), logs, nil
			}
			logs = append(logs, ToolCallLog{ToolName: "book_appointment", Input: argsJSON, Output: res})
			return fmt.Sprintf("🎉 **Appointment Successfully Booked!**\n\n• **Doctor**: %s (%s)\n• **Date**: %s\n• **Time**: %s\n\nYou can view your appointment reminder at the top of your screen.", targetDoc.Name, targetDoc.Specialization, formatDateFriendly(dateStr), formatTimeFriendly(timeStr)), logs, nil
		}

		if targetDoc != nil {
			if dateStr == "" {
				dateStr = time.Now().AddDate(0, 0, 1).Format("2006-01-02")
			}
			availArgs := fmt.Sprintf(`{"doctor_id":%d,"date":"%s"}`, targetDoc.ID, dateStr)
			availRes, err := a.executor.ExecuteTool("get_doctor_availability", availArgs, patientID)
			if err == nil {
				logs = append(logs, ToolCallLog{ToolName: "get_doctor_availability", Input: availArgs, Output: availRes})
			}
			return formatSingleDoctorAvailability(targetDoc, dateStr, availRes), logs, nil
		}
	}

	// 4. VIEW APPOINTMENTS INTENT
	if strings.Contains(lowerMsg, "appointment") && (strings.Contains(lowerMsg, "my") || strings.Contains(lowerMsg, "show") || strings.Contains(lowerMsg, "view") || strings.Contains(lowerMsg, "list") || strings.Contains(lowerMsg, "have")) {
		logs = append(logs, ToolCallLog{ToolName: "get_patient_appointments", Input: "{}", Output: apptsRaw})
		formattedAppts := formatAppointmentsList(apptsRaw)
		if formattedAppts == "" {
			return "You currently have no scheduled appointments. Would you like me to show available doctors?", logs, nil
		}
		return fmt.Sprintf("Here are your current appointments:\n\n%s", formattedAppts), logs, nil
	}

	// 5. FIND DOCTORS / SHOW DOCTORS / SHOW ALL DOCTORS INTENT
	targetDate := extractDate(userMsg)
	if targetDate != "" {
		if limitMsg := validateDateWithinLimit(targetDate); limitMsg != "" {
			return limitMsg, logs, nil
		}
	} else {
		targetDate = time.Now().AddDate(0, 0, 1).Format("2006-01-02") // Default tomorrow
	}

	matchedSpec := extractSpecialty(userMsg)

	// Fetch doctors & availabilities for all matching doctors
	docArgs := "{}"
	if matchedSpec != "" {
		docArgs = fmt.Sprintf(`{"specialization":"%s"}`, matchedSpec)
	}
	docRes, err := a.executor.ExecuteTool("find_doctors", docArgs, patientID)
	if err != nil {
		return "", nil, err
	}
	logs = append(logs, ToolCallLog{ToolName: "find_doctors", Input: docArgs, Output: docRes})

	var matchingDocs []doctors.Doctor
	dBytes, _ := json.Marshal(docRes)
	json.Unmarshal(dBytes, &matchingDocs)

	// Multi-doctor 7-day availability view
	availMap := make(map[int]interface{})
	for _, doc := range matchingDocs {
		availArgs := fmt.Sprintf(`{"doctor_id":%d,"date":"%s"}`, doc.ID, targetDate)
		aRes, err := a.executor.ExecuteTool("get_doctor_availability", availArgs, patientID)
		if err == nil {
			availMap[doc.ID] = aRes
			logs = append(logs, ToolCallLog{ToolName: "get_doctor_availability", Input: availArgs, Output: aRes})
		}
	}

	return formatMultiDoctorAvailability(matchedSpec, targetDate, matchingDocs, availMap), logs, nil
}

// Gemini Function Calling Loop
func (a *Agent) runGeminiLoop(systemPrompt, userMsg string, patientID int) (string, []ToolCallLog, error) {
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", a.cfg.LLMModel, a.cfg.LLMAPIKey)

	toolsDecl := []map[string]interface{}{
		{
			"functionDeclarations": GetAvailableTools(),
		},
	}

	contents := []map[string]interface{}{
		{
			"role": "user",
			"parts": []map[string]interface{}{
				{"text": fmt.Sprintf("%s\n\nUser: %s", systemPrompt, userMsg)},
			},
		},
	}

	reqBody := map[string]interface{}{
		"contents": contents,
		"tools":    toolsDecl,
	}

	jsonBytes, err := json.Marshal(reqBody)
	if err != nil {
		return "", nil, err
	}

	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonBytes))
	if err != nil {
		return "", nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return "", nil, fmt.Errorf("gemini api error status %d: %s", resp.StatusCode, string(body))
	}

	var geminiResp struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text         string `json:"text"`
					FunctionCall *struct {
						Name string                 `json:"name"`
						Args map[string]interface{} `json:"args"`
					} `json:"functionCall"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}

	if err := json.Unmarshal(body, &geminiResp); err != nil {
		return "", nil, err
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return "", nil, errors.New("empty response from Gemini")
	}

	var logs []ToolCallLog
	part := geminiResp.Candidates[0].Content.Parts[0]

	if part.FunctionCall != nil {
		fn := part.FunctionCall
		argsBytes, _ := json.Marshal(fn.Args)
		res, err := a.executor.ExecuteTool(fn.Name, string(argsBytes), patientID)
		if err != nil {
			res = map[string]string{"error": err.Error()}
		}
		logs = append(logs, ToolCallLog{
			ToolName: fn.Name,
			Input:    string(argsBytes),
			Output:   res,
		})

		if fn.Name == "get_patient_appointments" {
			return fmt.Sprintf("Here are your appointments:\n\n%s", formatAppointmentsList(res)), logs, nil
		}
		if fn.Name == "cancel_appointment" {
			return "✅ The appointment has been successfully cancelled.", logs, nil
		}
		if fn.Name == "book_appointment" {
			return "🎉 The appointment has been successfully booked!", logs, nil
		}
		if fn.Name == "reschedule_appointment" {
			return "✅ The appointment has been successfully rescheduled.", logs, nil
		}

		resJSON, _ := json.Marshal(res)
		return fmt.Sprintf("I executed '%s'. Result: %s", fn.Name, string(resJSON)), logs, nil
	}

	return part.Text, logs, nil
}

// --- HELPER PARSERS & MATCHERS ---

func validateDateWithinLimit(dateStr string) string {
	now := time.Now().Truncate(24 * time.Hour)
	maxDate := now.AddDate(0, 0, 7) // 1 week (7 days max)

	parsed, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return ""
	}

	if parsed.Before(now) {
		return "⚠️ Appointments cannot be booked for past dates. Please select a date between Today and 1 week from now."
	}
	if parsed.After(maxDate) {
		return fmt.Sprintf("📅 **1-Week Limit Exceeded**: Appointments can only be booked up to **1 week in advance** (between Today and %s). Please choose a date within the next 7 days.", maxDate.Format("Mon, Jan 2, 2006"))
	}
	return ""
}

func findMatchingDoctor(text string, allDocs []doctors.Doctor) *doctors.Doctor {
	lower := strings.ToLower(text)

	// First try explicit doctor ID if user said "doctor 2" or "#2"
	docID := extractID(text, `(?:doctor|doc|#)\s*#?(\d+)`)
	if docID > 0 {
		for i := range allDocs {
			if allDocs[i].ID == docID {
				return &allDocs[i]
			}
		}
	}

	// Try matching doctor first or last name (ignoring "dr", "dr.", "doctor")
	for i := range allDocs {
		nameLower := strings.ToLower(allDocs[i].Name)
		parts := strings.Fields(nameLower)
		for _, part := range parts {
			clean := strings.Trim(part, ".,")
			if clean == "dr" || clean == "doctor" || len(clean) < 3 {
				continue
			}
			if strings.Contains(lower, clean) {
				return &allDocs[i]
			}
		}
	}

	// Try matching doctor specialization
	for i := range allDocs {
		specLower := strings.ToLower(allDocs[i].Specialization)
		if len(specLower) >= 4 && strings.Contains(lower, specLower) {
			return &allDocs[i]
		}
	}

	return nil
}

func findMatchingAppointment(text string, activeAppts []appointments.Appointment) *appointments.Appointment {
	lower := strings.ToLower(text)

	// 1. Try appointment ID match if provided
	apptID := extractID(text, `(?:appointment|#|id)?\s*#?(\d+)`)
	if apptID > 0 {
		for i := range activeAppts {
			if activeAppts[i].ID == apptID {
				return &activeAppts[i]
			}
		}
	}

	// 2. Try doctor name match
	for i := range activeAppts {
		docNameLower := strings.ToLower(activeAppts[i].DoctorName)
		parts := strings.Fields(docNameLower)
		for _, part := range parts {
			clean := strings.Trim(part, ".,")
			if clean == "dr" || len(clean) < 3 {
				continue
			}
			if strings.Contains(lower, clean) {
				return &activeAppts[i]
			}
		}
	}

	// 3. If user has ONLY 1 active appointment, target it directly
	if len(activeAppts) == 1 {
		return &activeAppts[0]
	}

	return nil
}

func extractSpecialty(text string) string {
	specialties := map[string]string{
		"dermatologist": "Dermatology",
		"dermatology":   "Dermatology",
		"cardiologist":  "Cardiology",
		"cardiology":    "Cardiology",
		"physician":     "General Physician",
		"general":       "General Physician",
		"orthopedic":    "Orthopedic",
		"pediatrician":  "Pediatrics",
		"pediatrics":    "Pediatrics",
		"ent":           "ENT",
		"dentist":       "Dentist",
		"neurology":     "Neurology",
	}

	lower := strings.ToLower(text)
	for kw, spec := range specialties {
		if strings.Contains(lower, kw) {
			return spec
		}
	}
	return ""
}

func extractID(text, pattern string) int {
	re := regexp.MustCompile(pattern)
	matches := re.FindStringSubmatch(strings.ToLower(text))
	if len(matches) > 1 {
		id, err := strconv.Atoi(matches[1])
		if err == nil {
			return id
		}
	}
	return 0
}

func extractDate(text string) string {
	lower := strings.ToLower(text)
	now := time.Now()

	if strings.Contains(lower, "today") {
		return now.Format("2006-01-02")
	}
	if strings.Contains(lower, "tomorrow") {
		return now.AddDate(0, 0, 1).Format("2006-01-02")
	}

	// YYYY-MM-DD
	reISO := regexp.MustCompile(`\b(\d{4}-\d{2}-\d{2})\b`)
	if m := reISO.FindString(text); m != "" {
		return m
	}

	// Match "in X days"
	reInDays := regexp.MustCompile(`\bin\s+(\d+)\s+days?\b`)
	if m := reInDays.FindStringSubmatch(lower); len(m) > 1 {
		days, err := strconv.Atoi(m[1])
		if err == nil {
			return now.AddDate(0, 0, days).Format("2006-01-02")
		}
	}

	// Match day numbers like "30", "30th", "on 30", "28th", "for 30"
	reDay := regexp.MustCompile(`\b(?:on|for|date|day)?\s*(\d{1,2})(?:st|nd|rd|th)?\b`)
	matches := reDay.FindAllStringSubmatch(lower, -1)
	for _, match := range matches {
		if len(match) > 1 {
			dayNum, err := strconv.Atoi(match[1])
			if err == nil && dayNum >= 1 && dayNum <= 31 {
				year, month, currentDay := now.Date()
				if dayNum < currentDay {
					target := time.Date(year, month+1, dayNum, 0, 0, 0, 0, now.Location())
					return target.Format("2006-01-02")
				}
				target := time.Date(year, month, dayNum, 0, 0, 0, 0, now.Location())
				return target.Format("2006-01-02")
			}
		}
	}

	return ""
}

func extractTime(text string) string {
	re := regexp.MustCompile(`\b([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?\b`)
	m := re.FindString(text)
	if m != "" {
		parts := strings.Split(m, ":")
		if len(parts) >= 2 {
			h, _ := strconv.Atoi(parts[0])
			min, _ := strconv.Atoi(parts[1])
			return fmt.Sprintf("%02d:%02d", h, min)
		}
	}
	return ""
}

func formatAppointmentsList(raw interface{}) string {
	if raw == nil {
		return ""
	}

	jsonBytes, err := json.Marshal(raw)
	if err != nil {
		return ""
	}

	var appts []appointments.Appointment
	if err := json.Unmarshal(jsonBytes, &appts); err != nil || len(appts) == 0 {
		return ""
	}

	var sb strings.Builder
	for _, a := range appts {
		sb.WriteString(fmt.Sprintf("• **%s** (%s)\n", a.DoctorName, a.DoctorSpecialty))
		sb.WriteString(fmt.Sprintf("  📅 **Date**: %s at %s\n", formatDateFriendly(a.AppointmentDate), formatTimeFriendly(a.StartTime)))
		sb.WriteString(fmt.Sprintf("  📌 **Status**: %s\n\n", strings.Title(a.Status)))
	}
	return strings.TrimSpace(sb.String())
}

func formatSingleDoctorAvailability(doc *doctors.Doctor, dateStr string, availRaw interface{}) string {
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("Availability for **%s** (%s) on **%s**:\n\n", doc.Name, doc.Specialization, formatDateFriendly(dateStr)))

	availBytes, _ := json.Marshal(availRaw)
	var slotsList []doctors.AvailableSlot
	json.Unmarshal(availBytes, &slotsList)

	var availSlots []doctors.AvailableSlot
	for _, s := range slotsList {
		if s.IsAvailable {
			availSlots = append(availSlots, s)
		}
	}

	if len(availSlots) > 0 {
		sb.WriteString("⏰ **Available Times**:\n")
		var times []string
		for _, s := range availSlots {
			times = append(times, fmt.Sprintf("`%s`", formatTimeFriendly(s.StartTime)))
		}
		sb.WriteString(strings.Join(times, "  •  "))
		sb.WriteString("\n\n")
		sb.WriteString(fmt.Sprintf("💡 *Reply:* **\"Book %s on %s at %s\"**", doc.Name, formatDateFriendly(dateStr), formatTimeFriendly(availSlots[0].StartTime)))
	} else {
		sb.WriteString("No open slots available on this date. Please select another day within 1 week.")
	}

	return sb.String()
}

func formatMultiDoctorAvailability(spec, targetDate string, matchingDocs []doctors.Doctor, availMap map[int]interface{}) string {
	var sb strings.Builder

	if spec != "" {
		sb.WriteString(fmt.Sprintf("Available **%s** specialists for **%s** (Bookings open up to 1 week):\n\n", spec, formatDateFriendly(targetDate)))
	} else {
		sb.WriteString(fmt.Sprintf("Available clinic doctors for **%s** (Bookings open up to 1 week):\n\n", formatDateFriendly(targetDate)))
	}

	if len(matchingDocs) == 0 {
		return "No doctors found matching your request."
	}

	for _, doc := range matchingDocs {
		sb.WriteString(fmt.Sprintf("👨‍⚕️ **%s** (%s)\n", doc.Name, doc.Specialization))

		availRaw := availMap[doc.ID]
		availBytes, _ := json.Marshal(availRaw)
		var slotsList []doctors.AvailableSlot
		json.Unmarshal(availBytes, &slotsList)

		var openTimes []string
		for _, s := range slotsList {
			if s.IsAvailable {
				openTimes = append(openTimes, formatTimeFriendly(s.StartTime))
			}
		}

		if len(openTimes) > 0 {
			// Show top 4 times for brevity
			if len(openTimes) > 4 {
				openTimes = openTimes[:4]
			}
			var chips []string
			for _, t := range openTimes {
				chips = append(chips, fmt.Sprintf("`%s`", t))
			}
			sb.WriteString(fmt.Sprintf("  ⏰ Times: %s\n", strings.Join(chips, "  •  ")))
			sb.WriteString(fmt.Sprintf("  👉 *Reply:* **\"Book %s on %s at %s\"**\n\n", doc.Name, dateStrShort(targetDate), openTimes[0]))
		} else {
			sb.WriteString("  ❌ No slots open on this date.\n\n")
		}
	}

	return sb.String()
}

func dateStrShort(dateStr string) string {
	t, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return dateStr
	}
	return t.Format("Jan 2")
}

func formatDateFriendly(dateStr string) string {
	t, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return dateStr
	}
	return t.Format("Mon, Jan 2, 2006")
}

func formatTimeFriendly(timeStr string) string {
	if len(timeStr) >= 5 {
		timeStr = timeStr[:5]
	}
	t, err := time.Parse("15:04", timeStr)
	if err != nil {
		return timeStr
	}
	return t.Format("3:04 PM")
}
