package auth

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID int    `json:"sub"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	JTI    string `json:"jti"`
	jwt.RegisteredClaims
}

func GenerateToken(userID int, email, role, secret string, expMinutes int) (string, error) {
	now := time.Now()
	jti := fmt.Sprintf("%d-%d", userID, now.UnixNano())

	claims := &Claims{
		UserID: userID,
		Email:  email,
		Role:   role,
		JTI:    jti,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(time.Duration(expMinutes) * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now.Add(-1 * time.Minute)),
			Subject:   fmt.Sprintf("%d", userID),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func ValidateToken(tokenStr, secret string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(secret), nil
	})

	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token claims")
	}

	return claims, nil
}
