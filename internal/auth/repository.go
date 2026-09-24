package auth

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

type Repository interface {
	CreateUser(name, email, passwordHash, role string) (*User, error)
	GetUserByEmail(email string) (*User, error)
	GetUserByID(id int) (*User, error)
	UpdatePassword(userID int, newPasswordHash string) error
}

type postgresRepository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) Repository {
	return &postgresRepository{db: db}
}

func (r *postgresRepository) CreateUser(name, email, passwordHash, role string) (*User, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	query := `
		INSERT INTO users (name, email, password_hash, role)
		VALUES ($1, $2, $3, $4)
		RETURNING id, name, email, password_hash, role, created_at, updated_at
	`
	var u User
	err := r.db.QueryRow(query, name, email, passwordHash, role).Scan(
		&u.ID, &u.Name, &u.Email, &u.PasswordHash, &u.Role, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate key") || strings.Contains(err.Error(), "unique constraint") {
			return nil, errors.New("user with this email already exists")
		}
		return nil, fmt.Errorf("failed to create user: %w", err)
	}
	return &u, nil
}

func (r *postgresRepository) GetUserByEmail(email string) (*User, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	query := `
		SELECT id, name, email, password_hash, role, created_at, updated_at
		FROM users
		WHERE email = $1
	`
	var u User
	err := r.db.QueryRow(query, email).Scan(
		&u.ID, &u.Name, &u.Email, &u.PasswordHash, &u.Role, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("user not found")
		}
		return nil, fmt.Errorf("failed to query user by email: %w", err)
	}
	return &u, nil
}

func (r *postgresRepository) GetUserByID(id int) (*User, error) {
	query := `
		SELECT id, name, email, password_hash, role, created_at, updated_at
		FROM users
		WHERE id = $1
	`
	var u User
	err := r.db.QueryRow(query, id).Scan(
		&u.ID, &u.Name, &u.Email, &u.PasswordHash, &u.Role, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("user not found")
		}
		return nil, fmt.Errorf("failed to query user by id: %w", err)
	}
	return &u, nil
}

func (r *postgresRepository) UpdatePassword(userID int, newPasswordHash string) error {
	query := `
		UPDATE users
		SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`
	res, err := r.db.Exec(query, newPasswordHash, userID)
	if err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}
	rows, err := res.RowsAffected()
	if err != nil || rows == 0 {
		return errors.New("user not found or password unchanged")
	}
	return nil
}
