package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
)

func RunMigrations(db *sql.DB, migrationsDir string) error {
	entries, err := os.ReadDir(migrationsDir)
	if err != nil {
		return fmt.Errorf("failed to read migrations directory: %w", err)
	}

	var sqlFiles []string
	for _, entry := range entries {
		if !entry.IsDir() && filepath.Ext(entry.Name()) == ".sql" {
			sqlFiles = append(sqlFiles, filepath.Join(migrationsDir, entry.Name()))
		}
	}
	sort.Strings(sqlFiles)

	for _, file := range sqlFiles {
		log.Printf("Executing migration: %s", filepath.Base(file))
		content, err := os.ReadFile(file)
		if err != nil {
			return fmt.Errorf("failed to read migration file %s: %w", file, err)
		}

		if _, err := db.Exec(string(content)); err != nil {
			return fmt.Errorf("failed to execute migration %s: %w", file, err)
		}
	}

	log.Println("All database migrations executed successfully")
	return nil
}
