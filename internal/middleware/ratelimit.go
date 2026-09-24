package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type ipLimiter struct {
	tokens     float64
	lastRefill time.Time
}

type RateLimiter struct {
	mu         sync.Mutex
	clients    map[string]*ipLimiter
	rate       float64 // tokens per second
	burstCapacity float64
}

func NewRateLimiter(requestsPerMinute int, burst int) *RateLimiter {
	rl := &RateLimiter{
		clients:       make(map[string]*ipLimiter),
		rate:          float64(requestsPerMinute) / 60.0,
		burstCapacity: float64(burst),
	}

	// Periodic cleanup of stale client IPs
	go func() {
		for {
			time.Sleep(5 * time.Minute)
			rl.mu.Lock()
			now := time.Now()
			for ip, lim := range rl.clients {
				if now.Sub(lim.lastRefill) > 10*time.Minute {
					delete(rl.clients, ip)
				}
			}
			rl.mu.Unlock()
		}
	}()

	return rl
}

func (rl *RateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()

		rl.mu.Lock()
		lim, exists := rl.clients[ip]
		now := time.Now()

		if !exists {
			lim = &ipLimiter{
				tokens:     rl.burstCapacity - 1.0,
				lastRefill: now,
			}
			rl.clients[ip] = lim
			rl.mu.Unlock()
			c.Next()
			return
		}

		// Refill tokens based on elapsed time
		elapsed := now.Sub(lim.lastRefill).Seconds()
		lim.tokens += elapsed * rl.rate
		if lim.tokens > rl.burstCapacity {
			lim.tokens = rl.burstCapacity
		}
		lim.lastRefill = now

		if lim.tokens >= 1.0 {
			lim.tokens -= 1.0
			rl.mu.Unlock()
			c.Next()
			return
		}

		rl.mu.Unlock()
		c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "RATE_LIMIT_EXCEEDED",
				"message": "Too many requests. Please slow down and try again later.",
			},
		})
	}
}
