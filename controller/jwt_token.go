package controller

import (
	"errors"
	"net/http"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
)

// GetUserIdFromContext 从上下文获取用户ID
func GetUserIdFromContext(c *gin.Context) int {
	return c.GetInt("id")
}

// RefreshTokenRequest 刷新令牌请求
type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// RefreshTokenResponse 刷新令牌响应
type RefreshTokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	TokenType    string `json:"token_type"`
}

// TokenInfoResponse 令牌信息响应
type TokenInfoResponse struct {
	Tokens       []TokenInfo `json:"tokens"`
	AccessToken  string      `json:"access_token,omitempty"`
	RefreshToken string      `json:"refresh_token,omitempty"`
	ExpiresIn    int         `json:"expires_in,omitempty"`
	TokenType    string      `json:"token_type,omitempty"`
}

// TokenInfo 令牌信息
type TokenInfo struct {
	Id          int    `json:"id"`
	DeviceInfo  string `json:"device_info"`
	CreatedAt   string `json:"created_at"`
	ExpiresAt   string `json:"expires_at"`
	IpAddress   string `json:"ip_address"`
	IsCurrent   bool   `json:"is_current"`
}

// RefreshToken 刷新访问令牌
func RefreshToken(c *gin.Context) {
	var req RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}

	if req.RefreshToken == "" {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}

	jwtService := service.NewJWTService(model.DB)
	tokenPair, err := jwtService.RefreshTokenByRefreshToken(req.RefreshToken)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrInvalidToken):
			common.ApiErrorI18n(c, i18n.MsgUserInvalidToken)
		case errors.Is(err, service.ErrTokenExpired):
			common.ApiErrorI18n(c, i18n.MsgTokenExpired)
		case errors.Is(err, service.ErrRefreshTokenUsed):
			common.ApiErrorI18n(c, i18n.MsgUserRefreshTokenRevoked)
		case errors.Is(err, service.ErrUserNotFound):
			common.ApiErrorI18n(c, i18n.MsgUserNotFound)
		default:
			common.ApiErrorI18n(c, i18n.MsgDatabaseError)
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": map[string]interface{}{
			"access_token":  tokenPair.AccessToken,
			"refresh_token": tokenPair.RefreshToken,
			"expires_in":    tokenPair.ExpiresIn,
			"token_type":    tokenPair.TokenType,
		},
	})
}

// GetTokenList 获取用户的令牌列表
func GetTokenList(c *gin.Context) {
	userId := GetUserIdFromContext(c)
	if userId == 0 {
		common.ApiErrorI18n(c, i18n.MsgUserNotFound)
		return
	}

	jwtService := service.NewJWTService(model.DB)
	tokens, err := jwtService.GetUserActiveTokens(userId)
	if err != nil {
		common.ApiErrorI18n(c, i18n.MsgDatabaseError)
		return
	}

	tokenList := make([]TokenInfo, len(tokens))
	for i, t := range tokens {
		tokenList[i] = TokenInfo{
			Id:         t.Id,
			DeviceInfo: t.DeviceInfo,
			CreatedAt:  t.CreatedAt.Format("2006-01-02 15:04:05"),
			ExpiresAt:  t.ExpiresAt.Format("2006-01-02 15:04:05"),
			IpAddress:  t.IpAddress,
			IsCurrent:  false,
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": map[string]interface{}{
			"tokens": tokenList,
		},
	})
}

// RevokeToken 撤销特定的刷新令牌
func RevokeToken(c *gin.Context) {
	var req struct {
		TokenId int `json:"token_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}

	userId := GetUserIdFromContext(c)
	jwtService := service.NewJWTService(model.DB)

	// 获取该令牌信息
	var rt model.RefreshToken
	if err := model.DB.Where("id = ? AND user_id = ?", req.TokenId, userId).First(&rt).Error; err != nil {
		common.ApiErrorI18n(c, i18n.MsgUserInvalidToken)
		return
	}

	if err := jwtService.RevokeTokenById(req.TokenId); err != nil {
		common.ApiErrorI18n(c, i18n.MsgDatabaseError)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

// RevokeAllTokens 撤销用户所有令牌（退出所有设备）
func RevokeAllTokens(c *gin.Context) {
	userId := GetUserIdFromContext(c)
	jwtService := service.NewJWTService(model.DB)

	if err := jwtService.RevokeAllUserTokens(userId); err != nil {
		common.ApiErrorI18n(c, i18n.MsgDatabaseError)
		return
	}

	// 清除当前session
	session := sessions.Default(c)
	session.Clear()
	session.Save()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

// LogoutWithToken 使用令牌注销（不依赖session）
func LogoutWithToken(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refresh_token"`
		All          bool   `json:"all"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		// 如果没有请求体，只清除session
		session := sessions.Default(c)
		session.Clear()
		session.Save()
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "",
		})
		return
	}

	jwtService := service.NewJWTService(model.DB)

	if req.All {
		// 撤销所有令牌
		userId := GetUserIdFromContext(c)
		jwtService.RevokeAllUserTokens(userId)
	} else if req.RefreshToken != "" {
		// 只撤销当前令牌
		jwtService.RevokeRefreshToken(req.RefreshToken)
	}

	// 清除session
	session := sessions.Default(c)
	session.Clear()
	session.Save()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}
