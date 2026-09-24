package appointments

import (
	"net/http"
	"strconv"

	"clinic-agent/internal/auth"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	svc Service
}

func NewHandler(svc Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) RegisterRoutes(r *gin.RouterGroup, secret string) {
	protected := r.Group("")
	protected.Use(auth.AuthMiddleware(secret))

	// Patient appointment routes
	protected.GET("/patients/me/appointments", h.GetMyAppointments)
	protected.POST("/appointments", h.BookAppointment)
	protected.GET("/appointments/:id", h.GetAppointmentByID)
	protected.PATCH("/appointments/:id/reschedule", h.RescheduleAppointment)
	protected.POST("/appointments/:id/cancel", h.CancelAppointment)
}

func (h *Handler) BookAppointment(c *gin.Context) {
	patientIDVal, _ := c.Get(auth.ContextUserIDKey)
	patientID, _ := patientIDVal.(int)

	var req BookAppointmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": err.Error(),
			},
		})
		return
	}

	appt, err := h.svc.BookAppointment(patientID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "BOOKING_FAILED",
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    appt,
	})
}

func (h *Handler) GetMyAppointments(c *gin.Context) {
	patientIDVal, _ := c.Get(auth.ContextUserIDKey)
	patientID, _ := patientIDVal.(int)

	list, err := h.svc.GetPatientAppointments(patientID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "FETCH_FAILED",
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    list,
	})
}

func (h *Handler) GetAppointmentByID(c *gin.Context) {
	patientIDVal, _ := c.Get(auth.ContextUserIDKey)
	patientID, _ := patientIDVal.(int)
	roleVal, _ := c.Get(auth.ContextUserRoleKey)
	role, _ := roleVal.(string)

	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_ID",
				"message": "Appointment ID must be an integer",
			},
		})
		return
	}

	var appt *Appointment
	if role == "ADMIN" {
		appt, err = h.svc.GetAppointmentForAdmin(id)
	} else {
		// Strict IDOR protection
		appt, err = h.svc.GetAppointmentForPatient(id, patientID)
	}

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "APPOINTMENT_NOT_FOUND",
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    appt,
	})
}

func (h *Handler) RescheduleAppointment(c *gin.Context) {
	patientIDVal, _ := c.Get(auth.ContextUserIDKey)
	patientID, _ := patientIDVal.(int)

	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_ID",
				"message": "Appointment ID must be an integer",
			},
		})
		return
	}

	var req RescheduleAppointmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": err.Error(),
			},
		})
		return
	}

	appt, err := h.svc.RescheduleAppointment(id, patientID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "RESCHEDULE_FAILED",
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    appt,
	})
}

func (h *Handler) CancelAppointment(c *gin.Context) {
	patientIDVal, _ := c.Get(auth.ContextUserIDKey)
	patientID, _ := patientIDVal.(int)

	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_ID",
				"message": "Appointment ID must be an integer",
			},
		})
		return
	}

	if err := h.svc.CancelAppointment(id, patientID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "CANCELLATION_FAILED",
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"message": "Appointment successfully cancelled",
		},
	})
}
