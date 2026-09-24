package auth

import (
	"errors"
	"strings"

	"clinic-agent/internal/config"
)

type Service interface {
	Register(req RegisterRequest) (*AuthResponse, error)
	Login(req LoginRequest) (*AuthResponse, error)
	ChangePassword(userID int, req ChangePasswordRequest) error
	GetProfile(userID int) (*UserResponse, error)
}

type service struct {
	repo Repository
	cfg  *config.Config
}

func NewService(repo Repository, cfg *config.Config) Service {
	return &service{repo: repo, cfg: cfg}
}

func (s *service) Register(req RegisterRequest) (*AuthResponse, error) {
	if err := ValidatePasswordStrength(req.Password); err != nil {
		return nil, err
	}

	hash, err := HashPassword(req.Password)
	if err != nil {
		return nil, errors.New("failed to hash password")
	}

	email := strings.ToLower(strings.TrimSpace(req.Email))
	user, err := s.repo.CreateUser(req.Name, email, hash, "PATIENT")
	if err != nil {
		return nil, err
	}

	token, err := GenerateToken(user.ID, user.Email, user.Role, s.cfg.JWTSecret, s.cfg.JWTExpirationMinutes)
	if err != nil {
		return nil, errors.New("failed to generate authentication token")
	}

	return &AuthResponse{
		Token: token,
		User: UserResponse{
			ID:        user.ID,
			Name:      user.Name,
			Email:     user.Email,
			Role:      user.Role,
			CreatedAt: user.CreatedAt,
		},
	}, nil
}

func (s *service) Login(req LoginRequest) (*AuthResponse, error) {
	email := strings.ToLower(strings.TrimSpace(req.Email))
	user, err := s.repo.GetUserByEmail(email)
	if err != nil {
		return nil, errors.New("invalid email or password")
	}

	if !CheckPasswordHash(req.Password, user.PasswordHash) {
		return nil, errors.New("invalid email or password")
	}

	token, err := GenerateToken(user.ID, user.Email, user.Role, s.cfg.JWTSecret, s.cfg.JWTExpirationMinutes)
	if err != nil {
		return nil, errors.New("failed to generate authentication token")
	}

	return &AuthResponse{
		Token: token,
		User: UserResponse{
			ID:        user.ID,
			Name:      user.Name,
			Email:     user.Email,
			Role:      user.Role,
			CreatedAt: user.CreatedAt,
		},
	}, nil
}

func (s *service) ChangePassword(userID int, req ChangePasswordRequest) error {
	user, err := s.repo.GetUserByID(userID)
	if err != nil {
		return errors.New("user not found")
	}

	if !CheckPasswordHash(req.CurrentPassword, user.PasswordHash) {
		return errors.New("current password does not match")
	}

	if err := ValidatePasswordStrength(req.NewPassword); err != nil {
		return err
	}

	newHash, err := HashPassword(req.NewPassword)
	if err != nil {
		return errors.New("failed to hash new password")
	}

	return s.repo.UpdatePassword(userID, newHash)
}

func (s *service) GetProfile(userID int) (*UserResponse, error) {
	user, err := s.repo.GetUserByID(userID)
	if err != nil {
		return nil, err
	}
	return &UserResponse{
		ID:        user.ID,
		Name:      user.Name,
		Email:     user.Email,
		Role:      user.Role,
		CreatedAt: user.CreatedAt,
	}, nil
}
