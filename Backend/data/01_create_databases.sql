-- Create additional databases for Swasthya project
-- This runs before the main initialization script

-- Create MLflow tracking database (if it doesn't exist)
-- Note: PostgreSQL doesn't support IF NOT EXISTS for CREATE DATABASE
-- So we'll just create it - it will fail gracefully if it exists during init
CREATE DATABASE mlflow_db;

