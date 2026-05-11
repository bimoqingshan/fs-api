package model

import (
	"time"
)

// RefreshToken 刷新令牌模型
type RefreshToken struct {
	Id        int        `json:"id" gorm:"primaryKey"`
	UserId    int        `json:"user_id" gorm:"index"`
	TokenHash string     `json:"-" gorm:"type:varchar(64);uniqueIndex"` // Token hash for security
	DeviceInfo string    `json:"device_info" gorm:"type:varchar(255)"`
	ExpiresAt time.Time  `json:"expires_at"`
	CreatedAt time.Time  `json:"created_at"`
	RevokedAt *time.Time `json:"revoked_at,omitempty"`
	IpAddress string     `json:"ip_address" gorm:"type:varchar(45)"`
	UserAgent string     `json:"user_agent" gorm:"type:varchar(512)"`
}

// TableName specifies the table name for GORM
func (RefreshToken) TableName() string {
	return "refresh_tokens"
}

// IsExpired checks if the refresh token has expired
func (rt *RefreshToken) IsExpired() bool {
	return time.Now().After(rt.ExpiresAt)
}

// IsValid checks if the refresh token is valid (not expired and not revoked)
func (rt *RefreshToken) IsValid() bool {
	return !rt.IsExpired() && rt.RevokedAt == nil
}