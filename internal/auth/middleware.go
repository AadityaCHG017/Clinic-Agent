package auth

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

const (
	ContextUserIDKey   = "user_id"
	ContextUserEmailKey = "user_email"
	ContextUserRoleKey  = "user_role"
)

func AuthMiddleware(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "UNAUTHORIZED",
					"message": "Authorization header is required",
				},
			})
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "INVALID_TOKEN_FORMAT",
					"message": "Authorization header must be Bearer token",
				},
			})
			return
		}

		claims, err := ValidateToken(parts[1], secret)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "INVALID_TOKEN",
					"message": "Token is invalid or expired",
				},
			})
			return
		}

		c.Set(ContextUserIDKey, claims.UserID)
		c.Set(ContextUserEmailKey, claims.Email)
		c.Set(ContextUserRoleKey, claims.Role)

		c.Next()
	}
}

func RequireRole(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, exists := c.Get(ContextUserRoleKey)
		if !exists {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "FORBIDDEN",
					"message": "User role identity missing",
				},
			})
			return
		}

		userRole, _ := roleVal.(string)
		for _, role := range allowedRoles {
			if strings.EqualFold(userRole, role) {
				c.Next()
				return
			}
		}

		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "FORBIDDEN",
				"message": "Insufficient privileges to perform this action",
			},
		})
	}
}
