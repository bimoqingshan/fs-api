# FS API 二开说明

本项目基于 `QuantumNous/new-api` 二次开发，继续遵循上游项目的 `AGPL-3.0` 许可证。

## 分支与上游同步

- `upstream` remote 指向 `https://github.com/QuantumNous/new-api.git`。
- 本地二开分支为 `fs-api-main`。
- 建议把业务改动集中放在独立模块、配置层或少量入口文件中，减少后续合并上游时的冲突。

常用同步流程：

```bash
git fetch upstream
git switch fs-api-main
git merge upstream/main
```

## 第一阶段改动

- 默认系统名称改为 `FS API`。
- 前端默认页面标题改为 `FS API`。
- Docker Compose 改为本地构建 `fs-api:local` 镜像，避免继续拉取上游公开镜像。
- systemd 服务样例改为 `fs-api.service`。
- 新增 `SOURCE_CODE_URL` 环境变量，用于在前端展示当前修改版源码地址。

## 许可证提醒

如果修改后的服务通过网络提供给外部用户使用，需要向这些用户提供对应源码。密钥、用户数据、运行时环境变量和数据库内容不应提交到源码仓库。

建议生产环境配置：

```bash
SOURCE_CODE_URL=https://github.com/your-org/fs-api
```
