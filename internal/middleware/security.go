package middleware

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

func SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "1; mode=block")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Next()
	}
}

func CORS(allowedOrigin string) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		if origin != "" {
			c.Header("Access-Control-Allow-Origin", origin)
		} else if allowedOrigin != "" {
			c.Header("Access-Control-Allow-Origin", allowedOrigin)
		} else {
			c.Header("Access-Control-Allow-Origin", "http://localhost:5173")
		}
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Header("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, PATCH, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

type LogEntry struct {
	Timestamp  string `json:"timestamp"`
	RequestID  string `json:"request_id"`
	ClientIP   string `json:"client_ip"`
	Method     string `json:"method"`
	Path       string `json:"path"`
	Status     int    `json:"status"`
	LatencyMs  int64  `json:"latency_ms"`
	UserAgent  string `json:"user_agent"`
}

func StructuredLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		reqID := c.GetHeader("X-Request-ID")
		if reqID == "" {
			reqID = fmt.Sprintf("req-%d", start.UnixNano())
		}
		c.Header("X-Request-ID", reqID)

		c.Next()

		latency := time.Since(start).Milliseconds()

		entry := LogEntry{
			Timestamp:  time.Now().UTC().Format(time.RFC3339),
			RequestID:  reqID,
			ClientIP:   c.ClientIP(),
			Method:     c.Request.Method,
			Path:       c.Request.URL.Path,
			Status:     c.Writer.Status(),
			LatencyMs:  latency,
			UserAgent:  c.Request.UserAgent(),
		}

		jsonBytes, err := json.Marshal(entry)
		if err == nil {
			log.Println(string(jsonBytes))
		}
	}
}
