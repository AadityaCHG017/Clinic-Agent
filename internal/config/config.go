package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                 string
	DatabaseURL          string
	JWTSecret            string
	JWTExpirationMinutes int
	LLMAPIKey            string
	LLMModel             string
	CORSAllowedOrigin    string
}

func LoadConfig() *Config {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using default/system environment variables")
	}

	jwtExp, err := strconv.Atoi(getEnv("JWT_EXPIRATION_MINUTES", "30"))
	if err != nil {
		jwtExp = 30
	}

	return &Config{
		Port:                 getEnv("PORT", "8080"),
		DatabaseURL:          getEnv("DATABASE_URL", "postgres://postgres@127.0.0.1:5432/clinic_db?sslmode=disable"),
		JWTSecret:            getEnv("JWT_SECRET", "super-secret-clinic-key-change-in-prod"),
		JWTExpirationMinutes: jwtExp,
		LLMAPIKey:            getEnv("LLM_API_KEY", ""),
		LLMModel:             getEnv("LLM_MODEL", "gemini-2.5-flash"),
		CORSAllowedOrigin:    getEnv("CORS_ALLOWED_ORIGIN", "http://localhost:3000"),
	}
}

func getEnv(key, defaultValue string) string {
	if val, exists := os.LookupEnv(key); exists && val != "" {
		return val
	}
	return defaultValue
}
