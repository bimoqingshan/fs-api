-- Migration: v0.4 to v0.5
-- Description: Add refresh_tokens table for JWT refresh token mechanism
-- Created: v0.4 phase

-- Create refresh_tokens table
CREATE TABLE IF NOT EXISTS `refresh_tokens` (
    `id` INTEGER PRIMARY KEY AUTOINCREMENT,
    `user_id` INTEGER NOT NULL,
    `token_hash` VARCHAR(64) NOT NULL UNIQUE,
    `device_info` VARCHAR(255),
    `expires_at` DATETIME NOT NULL,
    `created_at` DATETIME NOT NULL,
    `revoked_at` DATETIME,
    `ip_address` VARCHAR(45),
    `user_agent` VARCHAR(512),
    INDEX `idx_refresh_tokens_user_id` (`user_id`),
    INDEX `idx_refresh_tokens_token_hash` (`token_hash`),
    INDEX `idx_refresh_tokens_expires_at` (`expires_at`)
);

-- For MySQL/PostgreSQL (handled by GORM AutoMigrate, but documented here)
-- For MySQL, ensure proper engine and charset if needed
-- For PostgreSQL, serial primary key is default