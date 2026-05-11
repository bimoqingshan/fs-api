# FS API 部署文档

本文档详细介绍 FS API 的部署流程，涵盖环境要求、Docker 部署、手动部署及配置说明。

---

## 📋 环境要求

| 组件 | 版本要求 | 说明 |
|------|---------|------|
| **Go** | ≥ 1.22 | 后端编译（手动部署时需要） |
| **Node.js** | ≥ 18 | 前端构建（手动部署时需要） |
| **MySQL** | ≥ 5.7.8 / 8.0+ | 推荐使用 MySQL 8.4 |
| **Redis** | 最新版 | 可选，用于缓存加速 |
| **Docker** | ≥ 20.10 | 容器化部署 |
| **Docker Compose** | ≥ 2.0 | 推荐使用 docker-compose v2 |

---

## 🔧 前置准备

### 1. MySQL 数据库创建

```sql
-- 登录 MySQL
mysql -u root -p

-- 创建数据库
CREATE DATABASE fs_api CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建用户（推荐）
CREATE USER 'fs_api'@'%' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON fs_api.* TO 'fs_api'@'%';
FLUSH PRIVILEGES;
```

> ⚠️ **重要**：生产环境请务必使用强密码，并限制用户访问来源。

### 2. GitHub OAuth App 创建

1. 访问 [GitHub Developer Settings](https://github.com/settings/developers)
2. 点击 **New OAuth App**
3. 填写信息：
   - **Application Name**: FS API
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/oauth/github/callback`
4. 注册后获取 **Client ID** 和 **Client Secret**

### 3. Discord OAuth App 创建

1. 访问 [Discord Developer Portal](https://discord.com/developers/applications)
2. 点击 **New Application**
3. 在 **OAuth2** 设置中添加 redirect URL：
   - `http://localhost:3000/api/oauth/discord/callback`
4. 复制 **Client ID** 和 **Client Secret**

### 4. LinuxDO OAuth 创建

1. 访问 [LinuxDo Developer](https://dev.luoli.dev/)
2. 创建应用，获取 Client ID 和 Client Secret
3. Redirect URI 设置为：`http://localhost:3000/api/oauth/linuxdo/callback`

### 5. OIDC / Google OAuth（可选）

如需支持 Google Workspace 或企业 SSO，请参考 [OIDC 配置文档](https://docs.newapi.pro/en/docs/installation/config-maintenance/environment-variables)。

---

## 🐳 Docker 部署（推荐）

### 快速启动

```bash
# 克隆项目
git clone https://github.com/your-org/fs-api.git
cd fs-api

# 编辑配置文件（修改默认密码）
nano docker-compose.yml

# 启动所有服务
docker-compose up -d
```

服务启动后访问：`http://localhost:3000`

默认管理员账号：`root` / `123456`（请立即修改）

### docker-compose.yml 结构说明

```yaml
services:
  fs-api:        # 主后端服务（Go + Gin）
  mysql:         # MySQL 8.4 数据库
  redis:         # Redis 缓存（可选）

volumes:
  mysql_data:    # MySQL 数据持久化
```

### 常用命令

```bash
# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f fs-api

# 重启服务
docker-compose restart fs-api

# 停止服务
docker-compose down

# 完整重建
docker-compose down -v && docker-compose up -d --build
```

---

## 🔨 手动部署

适用于需要深度定制或无法使用 Docker 的场景。

### 1. 后端编译

```bash
# 安装 Go 1.22+
go version

# 克隆代码
git clone https://github.com/your-org/fs-api.git
cd fs-api

# 编译后端
go build -ldflags "-s -w -X 'github.com/QuantumNous/new-api/common.Version=$(cat VERSION)'" -o fs-api

# 二进制文件位于 ./fs-api
```

### 2. 前端构建

```bash
cd web

# 安装依赖
npm install
# 或使用 bun
bun install

# 构建生产版本
npm run build
# 或
bun run build
```

构建产物位于 `web/dist/`

### 3. 数据库初始化

确保 MySQL 数据库 `fs_api` 已创建，后端首次启动时会自动执行数据库迁移。

### 4. 启动服务

```bash
# 创建数据目录
mkdir -p data logs

# 启动后端
./fs-api --log-dir ./logs

# 或使用 systemd
cp fs-api.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable fs-api
systemctl start fs-api
```

---

## ⚙️ 环境变量配置

### 必需配置

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `SQL_DSN` | MySQL 连接字符串 | `root:password@tcp(localhost:3306)/fs_api?charset=utf8mb4&parseTime=True&loc=Local` |
| `REDIS_CONN_STRING` | Redis 连接字符串 | `redis://:password@localhost:6379` |
| `TZ` | 时区 | `Asia/Shanghai` |

### 可选配置

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `SESSION_SECRET` | Session 密钥（多机部署必须） | 自动生成 |
| `CRYPTO_SECRET` | 加密密钥（Redis 部署必须） | 自动生成 |
| `ERROR_LOG_ENABLED` | 启用错误日志 | `false` |
| `BATCH_UPDATE_ENABLED` | 启用批量更新 | `true` |
| `NODE_NAME` | 节点名称（多节点部署标识） | `fs-api-node-1` |
| `STREAMING_TIMEOUT` | 流式超时（秒） | `300` |
| `MAX_REQUEST_BODY_MB` | 最大请求体大小（MB） | `32` |

### Docker 环境变量示例

```yaml
environment:
  - SQL_DSN=root:your_password@tcp(mysql:3306)/fs_api?charset=utf8mb4&parseTime=True&loc=Local
  - REDIS_CONN_STRING=redis://:your_password@redis:6379
  - TZ=Asia/Shanghai
  - ERROR_LOG_ENABLED=true
  - BATCH_UPDATE_ENABLED=true
  - NODE_NAME=fs-api-node-1
```

---

## ✅ 验证部署成功

### 1. 检查服务状态

```bash
curl http://localhost:3000/api/status
```

正常响应：
```json
{
  "success": true,
  "data": {
    "version": "x.x.x",
    "status": "running"
  }
}
```

### 2. 测试 API 调用

```bash
# 测试 Chat Completions API
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

### 3. 检查数据库连接

登录管理后台 `http://localhost:3000` → `系统管理` → `渠道管理`，确认渠道状态正常。

---

## 🔒 生产环境安全建议

1. **修改所有默认密码**（MySQL、Redis、后台管理员账号）
2. **配置 `SESSION_SECRET` 和 `CRYPTO_SECRET`**（多机部署必须）
3. **启用 HTTPS**（使用 Nginx/Caddy 反向代理）
4. **配置防火墙**，限制数据库和 Redis 端口访问
5. **定期备份数据库**
6. **关注版本更新**，及时打安全补丁

---

## 🆘 常见问题

### Q: 启动后数据库报错 "Unknown database"
**A**: 请确认 MySQL 中已创建 `fs_api` 数据库，或检查 `SQL_DSN` 配置是否正确。

### Q: 第三方登录无法回调
**A**: 检查 OAuth App 的 Callback URL 是否与实际部署地址完全匹配，包括协议（http/https）和端口。

### Q: 流式接口无响应
**A**: 尝试增加 `STREAMING_TIMEOUT` 值，或检查网络代理是否支持 WebSocket。

### Q: 多机部署 session 不一致
**A**: 必须设置 `SESSION_SECRET` 环境变量，并使用共享 Redis。

---

## 📚 相关链接

- [官方文档](https://docs.newapi.pro/en/docs)
- [GitHub 仓库](https://github.com/QuantumNous/new-api)
- [问题反馈](https://github.com/Calcium-Ion/new-api/issues)
