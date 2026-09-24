package auth

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	svc Service
}

func NewHandler(svc Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) RegisterRoutes(r *gin.RouterGroup, secret string) {
	authGroup := r.Group("/auth")
	{
		authGroup.POST("/register", h.Register)
		authGroup.POST("/login", h.Login)
	}

	protectedAuth := r.Group("/auth")
	protectedAuth.Use(AuthMiddleware(secret))
	{
		protectedAuth.POST("/change-password", h.ChangePassword)
		protectedAuth.GET("/me", h.GetProfile)
	}
}

func (h *Handler) Register(c *gin.Context) {
	var req RegisterRequest
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

	resp, err := h.svc.Register(req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "REGISTRATION_FAILED",
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    resp,
	})
}

func (h *Handler) Login(c *gin.Context) {
	var req LoginRequest
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

	resp, err := h.svc.Login(req)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "LOGIN_FAILED",
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

func (h *Handler) ChangePassword(c *gin.Context) {
	userIDVal, _ := c.Get(ContextUserIDKey)
	userID, _ := userIDVal.(int)

	var req ChangePasswordRequest
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

	if err := h.svc.ChangePassword(userID, req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "PASSWORD_CHANGE_FAILED",
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"message": "Password changed successfully",
		},
	})
}

func (h *Handler) GetProfile(c *gin.Context) {
	userIDVal, _ := c.Get(ContextUserIDKey)
	userID, _ := userIDVal.(int)

	profile, err := h.svc.GetProfile(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "USER_NOT_FOUND",
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    profile,
	})
}
