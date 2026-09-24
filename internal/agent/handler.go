package agent

import (
	"net/http"

	"clinic-agent/internal/auth"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	agent *Agent
}

func NewHandler(agent *Agent) *Handler {
	return &Handler{agent: agent}
}

func (h *Handler) RegisterRoutes(r *gin.RouterGroup, secret string) {
	agentGroup := r.Group("/agent")
	agentGroup.Use(auth.AuthMiddleware(secret))
	{
		agentGroup.POST("/chat", h.Chat)
	}
}

func (h *Handler) Chat(c *gin.Context) {
	patientIDVal, _ := c.Get(auth.ContextUserIDKey)
	patientID, _ := patientIDVal.(int)

	var req ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": "Message is required",
			},
		})
		return
	}

	resp, err := h.agent.ProcessMessage(req.Message, patientID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "AGENT_ERROR",
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    resp,
	})
}
