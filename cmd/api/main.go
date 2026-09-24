package main

import (
	"log"
	"net/http"

	"clinic-agent/internal/agent"
	"clinic-agent/internal/appointments"
	"clinic-agent/internal/auth"
	"clinic-agent/internal/config"
	"clinic-agent/internal/database"
	"clinic-agent/internal/doctors"
	"clinic-agent/internal/middleware"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.LoadConfig()

	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	if err := database.RunMigrations(db, "migrations"); err != nil {
		log.Fatalf("Failed to run database migrations: %v", err)
	}

	// 1. Initialize Repositories
	authRepo := auth.NewRepository(db)
	docRepo := doctors.NewRepository(db)
	apptRepo := appointments.NewRepository(db)

	// 2. Initialize Services
	authSvc := auth.NewService(authRepo, cfg)
	docSvc := doctors.NewService(docRepo)
	apptSvc := appointments.NewService(apptRepo)

	// 3. Initialize Agent Tool Executor & Engine
	agentExecutor := agent.NewToolExecutor(docSvc, apptSvc)
	agentEngine := agent.NewAgent(cfg, agentExecutor)

	// 4. Initialize Handlers
	authHandler := auth.NewHandler(authSvc)
	docHandler := doctors.NewHandler(docSvc)
	apptHandler := appointments.NewHandler(apptSvc)
	agentHandler := agent.NewHandler(agentEngine)

	// 5. Initialize Middlewares
	rateLimiter := middleware.NewRateLimiter(60, 20) // 60 req/min, burst 20

	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.SecurityHeaders())
	r.Use(middleware.CORS(cfg.CORSAllowedOrigin))
	r.Use(middleware.StructuredLogger())

	// Health check
	r.GET("/healthz", func(c *gin.Context) {
		if err := db.Ping(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "DATABASE_UNAVAILABLE",
					"message": "Database ping failed",
				},
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data": gin.H{
				"status":  "healthy",
				"service": "clinic-appointment-agent",
			},
		})
	})

	// API v1 Router Group
	v1 := r.Group("/api/v1")
	{
		// Auth routes (Apply rate limiting to login & register)
		authGroup := v1.Group("")
		authGroup.Use(rateLimiter.Middleware())
		authHandler.RegisterRoutes(authGroup, cfg.JWTSecret)

		// Doctors public routes
		docHandler.RegisterRoutes(v1)

		// Appointments protected routes
		apptHandler.RegisterRoutes(v1, cfg.JWTSecret)

		// AI Agent chat route (Rate limited & Auth protected)
		agentGroup := v1.Group("")
		agentGroup.Use(rateLimiter.Middleware())
		agentHandler.RegisterRoutes(agentGroup, cfg.JWTSecret)
	}

	log.Printf("Starting Clinic Appointment Agent API Server on port %s...", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Server failed to run: %v", err)
	}
}
