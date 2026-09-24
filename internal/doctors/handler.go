package doctors

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	svc Service
}

func NewHandler(svc Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) RegisterRoutes(r *gin.RouterGroup) {
	docs := r.Group("/doctors")
	{
		docs.GET("", h.ListDoctors)
		docs.GET("/:id", h.GetDoctor)
		docs.GET("/:id/availability", h.GetDoctorAvailability)
	}
}

func (h *Handler) ListDoctors(c *gin.Context) {
	spec := c.Query("specialization")
	list, err := h.svc.GetAllDoctors(spec)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DOCTORS_FETCH_FAILED",
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

func (h *Handler) GetDoctor(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_ID",
				"message": "Doctor ID must be an integer",
			},
		})
		return
	}

	doc, err := h.svc.GetDoctorByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DOCTOR_NOT_FOUND",
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    doc,
	})
}

func (h *Handler) GetDoctorAvailability(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_ID",
				"message": "Doctor ID must be an integer",
			},
		})
		return
	}

	dateStr := c.Query("date")
	if dateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "MISSING_DATE",
				"message": "Query parameter 'date' (YYYY-MM-DD) is required",
			},
		})
		return
	}

	slots, err := h.svc.GetAvailableSlots(id, dateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "AVAILABILITY_FETCH_FAILED",
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    slots,
	})
}
