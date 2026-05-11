# 额度管理与计费系统可用性审计报告

**任务**: T4.1 额度管理与计费系统可用性评估
**审计时间**: 2026-04-29
**项目**: fs-api (AI API 中转平台)

---

## 一、现有代码清单

### 1.1 核心计费引擎 `pkg/billingexpr/`

| 文件 | 行数 | 功能 |
|------|------|------|
| `types.go` | 66 | 数据类型定义：TokenParams, BillingSnapshot, TieredResult |
| `compile.go` | — | 表达式编译（基于 expr-lang/expr） |
| `run.go` | — | 表达式执行，含 `RunExprWithRequest()` |
| `settle.go` | — | 后结算（阶梯计费） |
| `round.go` | — | 舍入逻辑 |
| `expr.md` | 250 | 完整的表达式语言文档（含设计哲学、架构、示例） |
| `billingexpr_test.go` | ~1000+ | 完整测试覆盖 |

**评估**: ✅ **核心引擎已完整实现**，支持：
- 多变量表达式（p, c, len, cr, cc, cc1h, img, img_o, ai, ao）
- 阶梯计费（tier 函数）
- 请求上下文（param/header 函数）
- 时间条件函数（hour, weekday, month 等）
- AST 内省自动检测变量使用（零运行时开销）
- 表达式版本控制（v1: 前缀）
- 请求规则系统（`|||` 分隔的条件倍率）

### 1.2 服务层 `service/`

| 文件 | 功能 | 状态 |
|------|------|------|
| `billing.go` | PreConsumeBilling / SettleBilling 主入口 | ✅ 已实现 |
| `billing_session.go` | BillingSession 统一会话（预扣/结算/退款） | ✅ 已实现 |
| `funding_source.go` | WalletFunding / SubscriptionFunding 接口 | ✅ 已实现 |
| `quota.go` | 额度计算（AudioQuota）+ 后消费结算 | ✅ 已实现 |
| `text_quota.go` | 文本额度计算（支持阶梯 expr 结算） | ✅ 已实现 |
| `text_quota_test.go` | 文本额度测试 | ✅ 已实现 |
| `task_billing.go` | 任务计费 | ✅ 已实现 |
| `task_billing_test.go` | 任务计费测试 | ✅ 已实现 |
| `tool_billing.go` | 工具计费 | ✅ 存在 |
| `tiered_settle.go` | 阶梯结算（TryTieredSettle / BuildTieredTokenParams） | ✅ 已实现 |
| `tiered_settle_test.go` | 阶梯结算测试（完整覆盖） | ✅ 已实现 |

**FundingSource 接口**（`funding_source.go`）:
- `WalletFunding`: 用户钱包余额（DecreaseUserQuota/IncreaseUserQuota）
- `SubscriptionFunding`: 订阅额度（PreConsumeUserSubscription/PostConsumeUserSubscriptionDelta）

**BillingSession 生命周期**:
1. `NewBillingSession()` → 根据 BillingPreference 选择 funding source
2. `preConsume()` → 信任额度旁路 → 令牌预扣 → 资金来源预扣
3. `Reserve()` → 补充预扣（用于流式场景）
4. `Settle()` → 实际结算（资金 + 令牌两步提交）
5. `Refund()` → 异步退款（幂等安全）

### 1.3 配置层 `setting/`

| 文件 | 功能 |
|------|------|
| `billing_setting/tiered_billing.go` | 阶梯计费配置（ModelBillingMode / ModelBillingExpr 存储在 options 表） |
| `operation_setting/quota_setting.go` | 额度设置（min_topup, enable_online_topup 等） |
| `operation_setting/payment_setting.go` | 支付渠道配置 |
| `payment_stripe.go` | Stripe 支付集成 |
| `payment_waffo.go` | Waffo 支付集成 |
| `payment_waffo_pancake.go` | Waffo Pancake 支付集成 |
| `payment_creem.go` | Creem 支付集成 |

### 1.4 Relay 层 `relay/`

| 文件 | 功能 |
|------|------|
| `helper/billing_expr_request.go` | 表达式请求上下文构建（param/header 函数支持） |
| `helper/price.go` | 预扣费估算（modelPriceHelperTiered 等） |
| `common/billing.go` | 通用计费工具 |
| `channel/task/gemini/billing.go` | Gemini 渠道计费 |

### 1.5 Controller 层

| 文件 | 功能 |
|------|------|
| `controller/billing.go` | GetSubscription / GetUsage（OpenAI 兼容 API） |
| `controller/channel-billing.go` | 渠道计费查询 |
| `controller/topup.go` | 充值、退款、支付回调 |

### 1.6 前端 `web/src/`

| 文件 | 功能 |
|------|------|
| `constants/billing.constants.js` | 表达式变量常量（BILLING_VARS, BILLING_VAR_KEYS 等） |
| `helpers/quota.js` | 额度↔金额换算（quotaToDisplayAmount / displayAmountToQuota） |
| `pages/TopUp/index.jsx` | 完整充值页面（兑换码/在线充值/Stripe/Waffo/Creem） |
| `components/topup/RechargeCard.jsx` | 充值卡片组件 |
| `components/topup/SubscriptionPlansCard.jsx` | 订阅计划卡片 |
| `components/topup/InvitationCard.jsx` | 邀请奖励卡片 |
| `components/topup/modals/` | TransferModal, PaymentConfirmModal, TopupHistoryModal |
| `pages/Setting/Ratio/components/TieredPricingEditor.jsx` | **阶梯定价编辑器**（管理后台） |
| `pages/Setting/Ratio/components/ModelPricingEditor.jsx` | 模型定价编辑器 |

### 1.7 数据库模型

- `model.User`: `Quota` 字段（用户余额）
- `model.Token`: `RemainQuota` / `UsedQuota`（令牌维度额度）
- `model.Redemption`: 兑换码
- `model.QuotaData`: 日维度用量数据
- `model.Subscription` / `SubscriptionPlan`: 订阅系统

---

## 二、当前可用性评估

### ✅ 已完整实现的功能

1. **阶梯计费表达式引擎（billingexpr）**
   - 完整的表达式语言（含文档和测试）
   - 支持所有 token 类型（text/cache/image/audio）
   - 支持时间条件和请求上下文

2. **统一计费会话（BillingSession）**
   - 预扣费 → 结算 → 退款 完整生命周期
   - 信任额度旁路（额度充足时跳过预扣）
   - 原子性回滚保证

3. **双资金来源**
   - 钱包（WalletFunding）
   - 订阅（SubscriptionFunding）
   - 支持 BillingPreference 回退（subscription_first / wallet_first）

4. **多支付渠道**
   - 兑换码
   - 在线充值（自定义支付）
   - Stripe / Waffo / Waffo Pancake / Creem

5. **前端充值 UI**
   - 完整的充值页面（TopUp）
   - 充值历史、转让、邀请奖励
   - 订阅计划展示

6. **管理后台阶梯定价**
   - `TieredPricingEditor.jsx`（可视化 + 原始表达式双模式）
   - `ModelPricingCombined.jsx`（模型定价综合配置）

### ⬜ 缺失/未完成的功能

1. **用户额度查看 UI（前端）**
   - ✅ Dashboard 已具备额度展示能力（ChartsPanel / StatsCards / 用量趋势）

2. **管理后台充值管理**
   - ❌ 后台无法手动为用户充值（无专属管理页面）
   - ⚠️ `controller/user.go` 有 `UpdateQuota` 接口但无前端页面
   - ❌ 后台无法查看所有充值记录

3. **首次注册赠送额度**
   - ❌ 需后台配置或代码实现

4. **数据库迁移**
   - ⚠️ 无法验证数据库迁移是否已执行（Go 环境不可用）

---

## 三、缺失关键组件详情

### 3.1 用户额度仪表盘（部分实现）

`web/src/components/dashboard/` 已包含完整的 Dashboard 实现，包括：
- `loadQuotaData()` → 从 `/api/user/quota` 获取用户配额数据
- `loadUserQuotaData()` → 获取用户维度的配额消耗
- `consumeQuota` / `consumeTokens` 统计
- `ChartsPanel` → 用量趋势图表
- `StatsCards` → 统计数据卡片
- 搜索模态框 → 时间范围筛选

**评估**: ✅ Dashboard 已具备用户额度展示能力。

### 3.2 管理后台充值管理

当前管理后台 `/pages/Setting/` 下无充值管理模块。建议添加：
- 用户余额管理（手动调整）
- 充值记录查看
- 兑换码管理

### 3.3 充值配置界面

`setting/operation_setting/quota_setting.go` 中 `QuotaPerUnit` 等参数需要管理界面暴露。

---

## 四、建议实现优先级

### P0 — 核心阻塞（系统不可用）

| 优先级 | 组件 | 说明 |
|--------|------|------|
| P0 | 数据库迁移验证 | 确认 billing 相关的 table schema 已正确创建 |
| P0 | 表达式存储激活 | 确认 `options` 表中 `billing_setting.billing_mode` 和 `billing_setting.billing_expr` 已正确配置 |

### P1 — 高优先级（功能不可用）

| 优先级 | 组件 | 说明 |
|--------|------|------|
| P1 | 管理后台充值管理 | 管理员无法管理系统额度（手动充值/查看记录） |
| P1 | 首次注册赠送额度 | 新用户无初始额度无法使用 |

### P2 — 中优先级（体验不完整）

| 优先级 | 组件 | 说明 |
|--------|------|------|
| P2 | 充值成功通知 | 邮件/推送通知（checkAndSendQuotaNotify 已实现） |
| P2 | 消费明细导出 | 方便用户对账 |
| P2 | 充值配置界面 | QuotaPerUnit 等参数需管理界面暴露 |

### P3 — 低优先级（可选功能）

| 优先级 | 组件 | 说明 |
|--------|------|------|
| P3 | 额度转让 | 用户之间转移额度 |
| P3 | 自动充值 | 余额低于阈值自动充值 |

---

## 五、验证步骤建议

### 5.1 验证 billingexpr 引擎

```bash
cd /Users/apple/Desktop/workspace/fs-api
go test ./pkg/billingexpr/... -v
```

### 5.2 验证服务启动

```bash
# 确认数据库迁移
go run scripts/migrate.go  # 或对应的迁移脚本

# 启动服务
go run main.go
```

### 5.3 验证前端构建

```bash
cd web
npm run build
```

---

## 六、总结

**额度管理与计费系统的核心引擎（billingexpr + BillingSession）已完整实现**，包括：
- 表达式语言和执行引擎
- 预扣费 / 结算 / 退款生命周期
- 双资金来源（钱包 + 订阅）
- 多支付渠道集成
- 前端充值 UI

**主要缺失**集中于：
1. 管理后台的充值管理模块（无专属页面）
2. 首次注册赠送额度机制
3. 数据库迁移验证（需手动确认）

**建议优先完成 P0/P1 项目**，确保系统基本可用后再完善 P2/P3 功能。
