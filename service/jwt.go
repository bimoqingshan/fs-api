package service

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
)

var ErrUserNotFound = errors.New("user not found")

// JWTClaims JWT访问令牌声明
type jwtServiceClaims struct {
	UserId    int    `json:"user_id"`
	Email     string `json:"email"`
	TokenId   int    `json:"token_id"` // Refresh token ID for revocation
	TokenType string `json:"token_type"` // "access" or "refresh"
	jwt.RegisteredClaims
}

// JWTService JWT服务
type JWTService struct {
	DB *gorm.DB
}

// NewJWTService 创建JWT服务实例
func NewJWTService(db *gorm.DB) *JWTService {
	return &JWTService{DB: db}
}

// GenerateTokenPair 生成访问令牌和刷新令牌对
func (s *JWTService) GenerateTokenPair(userId int, email, deviceInfo, ipAddress, userAgent string) (*TokenPair, error) {
	// 生成刷新令牌
	refreshToken := generateSecureToken(32)
	refreshTokenHash := common.SHA256Hash(refreshToken)

	// 计算过期时间
	refreshExpiresAt := time.Now().Add(time.Duration(common.RefreshTokenExpirationDays) * 24 * time.Hour)

	// 保存刷新令牌到数据库
	rt := &model.RefreshToken{
		UserId:     userId,
		TokenHash:  refreshTokenHash,
		DeviceInfo: deviceInfo,
		ExpiresAt:  refreshExpiresAt,
		CreatedAt:  time.Now(),
		IpAddress:  ipAddress,
		UserAgent:  userAgent,
	}

	if err := s.DB.Create(rt).Error; err != nil {
		return nil, err
	}

	// 生成访问令牌
	accessToken, err := s.generateAccessToken(userId, email, rt.Id)
	if err != nil {
		// 如果生成访问令牌失败，撤销刷新令牌
		s.DB.Model(&model.RefreshToken{}).Where("id = ?", rt.Id).Update("revoked_at", time.Now())
		return nil, err
	}

	return &TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    common.JWTExpirationMinutes * 60,
		TokenType:    "Bearer",
	}, nil
}

// generateAccessToken 生成访问令牌
func (s *JWTService) generateAccessToken(userId int, email string, refreshTokenId int) (string, error) {
	claims := jwtServiceClaims{
		UserId:    userId,
		Email:     email,
		TokenId:   refreshTokenId,
		TokenType: "access",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(common.JWTExpirationMinutes) * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    "fs-api",
			Subject:   email,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(common.JWTSecret))
}

// ValidateAccessToken 验证访问令牌
func (s *JWTService) ValidateAccessToken(tokenString string) (*jwtServiceClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &jwtServiceClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return []byte(common.JWTSecret), nil
	})

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrTokenExpired
		}
		return nil, ErrInvalidToken
	}

	claims, ok := token.Claims.(*jwtServiceClaims)
	if !ok || !token.Valid {
		return nil, ErrInvalidToken
	}

	if claims.TokenType != "access" {
		return nil, ErrInvalidToken
	}

	return claims, nil
}

// RefreshTokenByRefreshToken 使用刷新令牌获取新的令牌对
func (s *JWTService) RefreshTokenByRefreshToken(refreshToken string) (*TokenPair, error) {
	refreshTokenHash := common.SHA256Hash(refreshToken)

	var rt model.RefreshToken
	if err := s.DB.Where("token_hash = ?", refreshTokenHash).First(&rt).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrInvalidToken
		}
		return nil, err
	}

	// 检查刷新令牌是否有效
	if !rt.IsValid() {
		if rt.IsExpired() {
			return nil, ErrTokenExpired
		}
		return nil, ErrRefreshTokenUsed
	}

	// 获取用户信息
	var user model.User
	if err := s.DB.Where("id = ?", rt.UserId).First(&user).Error; err != nil {
		return nil, ErrUserNotFound
	}

	// 撤销旧刷新令牌（刷新令牌轮换）
	now := time.Now()
	s.DB.Model(&model.RefreshToken{}).Where("id = ?", rt.Id).Update("revoked_at", now)

	// 生成新的令牌对
	return s.GenerateTokenPair(user.Id, user.Email, rt.DeviceInfo, rt.IpAddress, rt.UserAgent)
}

// RevokeRefreshToken 撤销刷新令牌
func (s *JWTService) RevokeRefreshToken(refreshToken string) error {
	refreshTokenHash := common.SHA256Hash(refreshToken)

	result := s.DB.Model(&model.RefreshToken{}).
		Where("token_hash = ? AND revoked_at IS NULL", refreshTokenHash).
		Update("revoked_at", time.Now())

	if result.RowsAffected == 0 {
		return ErrInvalidToken
	}
	return nil
}

// RevokeAllUserTokens 撤销用户的所有刷新令牌
func (s *JWTService) RevokeAllUserTokens(userId int) error {
	return s.DB.Model(&model.RefreshToken{}).
		Where("user_id = ? AND revoked_at IS NULL", userId).
		Update("revoked_at", time.Now()).Error
}

// RevokeTokenById 通过ID撤销刷新令牌
func (s *JWTService) RevokeTokenById(tokenId int) error {
	return s.DB.Model(&model.RefreshToken{}).
		Where("id = ? AND revoked_at IS NULL", tokenId).
		Update("revoked_at", time.Now()).Error
}

// GetUserActiveTokens 获取用户活跃的刷新令牌列表
func (s *JWTService) GetUserActiveTokens(userId int) ([]model.RefreshToken, error) {
	var tokens []model.RefreshToken
	err := s.DB.Where("user_id = ? AND revoked_at IS NULL AND expires_at > ?", userId, time.Now()).
		Order("created_at DESC").
		Find(&tokens).Error
	return tokens, err
}

// generateSecureToken 生成安全的随机令牌
func generateSecureToken(length int) string {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		// Fallback to time-based if crypto/rand fails
		h := md5Hash(time.Now().String())
		return h[:length*2]
	}
	return hex.EncodeToString(bytes)
}

// md5Hash 计算MD5哈希
func md5Hash(input string) string {
	data := []byte(input)
	const pad = "a1b2c3d4e5f6"
	for len(data) < 64 {
		data = append(data, pad...)
	}
	h := uint64(0)
	for i, c := range data[:64] {
		h = h*31 + uint64(c) + uint64(i)*17
	}
	result := make([]byte, 32)
	for i := range result {
		result[i] = byte(h >> uint((i % 8) * 8))
		h *= 33
	}
	return hex.EncodeToString(result)
}

// TokenPair 令牌对
type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	TokenType    string `json:"token_type"`
}
