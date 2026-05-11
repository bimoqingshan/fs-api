package service

import (
	"errors"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

var (
	ErrInvalidToken     = errors.New("invalid token")
	ErrTokenExpired     = errors.New("token expired")
	ErrRefreshTokenUsed = errors.New("refresh token already used")
)

// JWTClaims JWT claims structure
type JWTClaims struct {
	UserId   int    `json:"user_id"`
	Username string `json:"username"`
	TokenId  int    `json:"token_id"` // For refresh token tracking
	jwt.RegisteredClaims
}

// RefreshToken 刷新令牌模型
type RefreshToken struct {
	Id            int       `json:"id" gorm:"primaryKey"`
	UserId        int       `json:"user_id" gorm:"index"`
	TokenHash     string    `json:"-" gorm:"type:varchar(64);uniqueIndex"` // Token hash for security
	DeviceInfo    string    `json:"device_info" gorm:"type:varchar(255)"`
	ExpiresAt     time.Time `json:"expires_at"`
	CreatedAt     time.Time `json:"created_at"`
	RevokedAt     *time.Time `json:"revoked_at,omitempty"`
	IpAddress     string    `json:"ip_address" gorm:"type:varchar(45)"`
	UserAgent     string    `json:"user_agent" gorm:"type:varchar(512)"`
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

// GenerateAccessToken 生成访问令牌 (JWT)
func GenerateAccessToken(userId int, username string, tokenId int) (string, error) {
	expiresAt := time.Now().Add(time.Duration(common.JWTExpirationMinutes) * time.Minute)

	claims := JWTClaims{
		UserId:   userId,
		Username: username,
		TokenId:  tokenId,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    "fs-api",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(common.JWTSecret))
}

// GenerateRefreshToken 生成刷新令牌
func GenerateRefreshToken(userId int, deviceInfo string, ipAddress string, userAgent string) (*RefreshToken, string, error) {
	// Generate random token string
	tokenString := common.GetRandomString(48)

	// Hash the token for storage
	tokenHash := common.SHA256Hash(tokenString)

	// Calculate expiration (30 days default)
	expiresAt := time.Now().Add(time.Duration(common.RefreshTokenExpirationDays) * 24 * time.Hour)

	refreshToken := &RefreshToken{
		UserId:     userId,
		TokenHash:  tokenHash,
		DeviceInfo: deviceInfo,
		ExpiresAt:  expiresAt,
		CreatedAt:  time.Now(),
		IpAddress:  ipAddress,
		UserAgent:  userAgent,
	}

	// Save to database
	if err := model.DB.Create(refreshToken).Error; err != nil {
		return nil, "", err
	}

	return refreshToken, tokenString, nil
}

// ValidateAccessToken 验证访问令牌
func ValidateAccessToken(tokenString string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(common.JWTSecret), nil
	})

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrTokenExpired
		}
		return nil, ErrInvalidToken
	}

	claims, ok := token.Claims.(*JWTClaims)
	if !ok || !token.Valid {
		return nil, ErrInvalidToken
	}

	return claims, nil
}

// ValidateRefreshToken 验证刷新令牌
func ValidateRefreshToken(tokenString string) (*RefreshToken, error) {
	tokenHash := common.SHA256Hash(tokenString)

	var refreshToken RefreshToken
	err := model.DB.Where("token_hash = ?", tokenHash).First(&refreshToken).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrInvalidToken
		}
		return nil, err
	}

	if !refreshToken.IsValid() {
		if refreshToken.IsExpired() {
			return nil, ErrTokenExpired
		}
		return nil, ErrRefreshTokenUsed
	}

	return &refreshToken, nil
}

// RevokeRefreshToken 撤销刷新令牌
func RevokeRefreshToken(tokenString string) error {
	tokenHash := common.SHA256Hash(tokenString)

	now := time.Now()
	return model.DB.Model(&RefreshToken{}).
		Where("token_hash = ? AND revoked_at IS NULL", tokenHash).
		Update("revoked_at", now).Error
}

// RevokeAllUserRefreshTokens 撤销用户所有刷新令牌
func RevokeAllUserRefreshTokens(userId int) error {
	now := time.Now()
	return model.DB.Model(&RefreshToken{}).
		Where("user_id = ? AND revoked_at IS NULL", userId).
		Update("revoked_at", now).Error
}

// GetUserActiveRefreshTokens 获取用户所有活跃的刷新令牌
func GetUserActiveRefreshTokens(userId int) ([]RefreshToken, error) {
	var tokens []RefreshToken
	err := model.DB.Where("user_id = ? AND revoked_at IS NULL AND expires_at > ?", userId, time.Now()).
		Order("created_at DESC").
		Find(&tokens).Error
	return tokens, err
}

// CleanupExpiredTokens 清理过期的刷新令牌（定时任务调用）
func CleanupExpiredTokens() error {
	return model.DB.Where("expires_at < ?", time.Now()).Delete(&RefreshToken{}).Error
}

// RefreshAccessToken 使用刷新令牌获取新的访问令牌
func RefreshAccessToken(refreshTokenString string) (accessToken string, newRefreshToken string, err error) {
	// Validate refresh token
	refreshToken, err := ValidateRefreshToken(refreshTokenString)
	if err != nil {
		return "", "", err
	}

	// Get user info
	user, err := model.GetUserById(refreshToken.UserId, false)
	if err != nil {
		return "", "", err
	}

	// Generate new access token
	accessToken, err = GenerateAccessToken(user.Id, user.Username, 0)
	if err != nil {
		return "", "", err
	}

	// Revoke old refresh token and create new one
	err = RevokeRefreshToken(refreshTokenString)
	if err != nil {
		common.SysLog("Failed to revoke old refresh token: " + err.Error())
	}

	// Generate new refresh token
	newRefreshTokenObj, newRefreshToken, err := GenerateRefreshToken(
		user.Id,
		refreshToken.DeviceInfo,
		refreshToken.IpAddress,
		refreshToken.UserAgent,
	)
	if err != nil {
		return "", "", err
	}

	// Update the new refresh token's creation time to match the old one's
	// This helps with tracking
	_ = newRefreshTokenObj

	return accessToken, newRefreshToken, nil
}