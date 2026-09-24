package auth

import (
	"testing"
)

func TestPasswordStrengthValidation(t *testing.T) {
	tests := []struct {
		password string
		wantErr  bool
	}{
		{"Short1!", true},
		{"simplepassword", true},
		{"NOPUNCTUATION123", true},
		{"StrongPassword123!", false},
		{"ValidPass@2026", false},
	}

	for _, tt := range tests {
		err := ValidatePasswordStrength(tt.password)
		if (err != nil) != tt.wantErr {
			t.Errorf("ValidatePasswordStrength(%q) err = %v, wantErr %v", tt.password, err, tt.wantErr)
		}
	}
}

func TestPasswordHashing(t *testing.T) {
	password := "SecretPass123!"
	hash, err := HashPassword(password)
	if err != nil {
		t.Fatalf("HashPassword failed: %v", err)
	}

	if hash == password {
		t.Error("Hash should not equal raw password")
	}

	if !CheckPasswordHash(password, hash) {
		t.Error("CheckPasswordHash should return true for correct password")
	}

	if CheckPasswordHash("WrongPass123!", hash) {
		t.Error("CheckPasswordHash should return false for wrong password")
	}
}

func TestJWTTokenGenerationAndValidation(t *testing.T) {
	secret := "test-secret-key-123"
	userID := 42
	email := "testuser@example.com"
	role := "PATIENT"

	tokenStr, err := GenerateToken(userID, email, role, secret, 15)
	if err != nil {
		t.Fatalf("GenerateToken failed: %v", err)
	}

	claims, err := ValidateToken(tokenStr, secret)
	if err != nil {
		t.Fatalf("ValidateToken failed: %v", err)
	}

	if claims.UserID != userID {
		t.Errorf("Expected UserID %d, got %d", userID, claims.UserID)
	}

	if claims.Email != email {
		t.Errorf("Expected Email %s, got %s", email, claims.Email)
	}

	if claims.Role != role {
		t.Errorf("Expected Role %s, got %s", role, claims.Role)
	}

	// Test invalid secret
	_, err = ValidateToken(tokenStr, "wrong-secret-key")
	if err == nil {
		t.Error("Expected error when validating with wrong secret, got nil")
	}
}
