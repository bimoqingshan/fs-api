# FS API

FS API 是基于 `QuantumNous/new-api` 的二开项目，目标是作为可持续维护的模型中转 API 网关基线。

## 当前定位

- 统一管理 OpenAI、Claude、Gemini、DeepSeek 等兼容模型渠道。
- 保留上游 New API 的渠道、令牌、额度、日志、计费、后台等基础能力。
- 在上游基础上逐步加入 FS API 自有业务能力。

## 快速启动

推荐使用 Docker Compose，默认使用 MySQL：

```bash
docker compose up -d
```

首次启动后访问：

```text
http://localhost:3000
```

## 生产环境必改配置

上线前至少修改这些配置：

```bash
SESSION_SECRET=replace-with-random-string
REDIS_CONN_STRING=redis://:replace-password@redis:6379
SQL_DSN=fs_api:replace-password@tcp(127.0.0.1:3306)/fs_api?charset=utf8mb4&parseTime=True&loc=Local
SOURCE_CODE_URL=https://github.com/your-org/fs-api
```

`SOURCE_CODE_URL` 用于在前端展示当前修改版源码地址。若对外提供网络服务，请确保该地址指向当前部署版本对应的源码仓库或源码包。

## 本地 MySQL 开发

当前本地开发库：

```text
database: fs_api
user: fs_api
password: fs_api_dev
dsn: fs_api:fs_api_dev@tcp(127.0.0.1:3306)/fs_api?charset=utf8mb4&parseTime=True&loc=Local
```

启动 MySQL：

```bash
brew services start mysql
```

启动 FS API：

```bash
./fs-api --port 3000 --log-dir ./logs
```

## 上游同步

当前上游 remote：

```bash
git remote -v
```

建议同步流程：

```bash
git fetch upstream
git switch fs-api-main
git merge upstream/main
```

## 许可证

本项目基于 New API 二次开发，继续遵循 `AGPL-3.0`。如果修改后的服务通过网络提供给外部用户使用，需要向这些用户提供对应源码。

上游项目：

- https://github.com/QuantumNous/new-api
- https://github.com/songquanpeng/one-api
