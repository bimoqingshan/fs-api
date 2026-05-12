/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React from 'react';
import {
  Card,
  Typography,
  Tag,
  Tabs,
  Collapse,
  Button,
  Toast,
} from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';
import { StatusContext } from '../../context/Status';
import { copy } from '../../helpers';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Panel } = Collapse;

const toolGuides = [
  {
    key: 'codex',
    title: 'Codex CLI / App',
    type: 'openai',
    summary: '适合 OpenAI 兼容方式，配置最直接。',
    steps: [
      '在控制台创建 Token，并确认该 Token 允许调用当前示例模型。',
      'Codex CLI 设置 `OPENAI_BASE_URL` 为当前基础地址 `/v1`，并配置 `OPENAI_API_KEY`。',
      'Codex App 新建 OpenAI Compatible Provider，填同样 baseURL、key、model。',
      '先跑一次最小请求（chat/completions），成功后再启用工具调用与流式。',
    ],
    snippet: (baseUrl, modelName) => `# Codex CLI
export OPENAI_API_KEY="sk-xxxx"
export OPENAI_BASE_URL="${baseUrl}/v1"

# 连通性验证
curl -s ${baseUrl}/v1/chat/completions \\
  -H "Authorization: Bearer sk-xxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model":"${modelName}",
    "messages":[{"role":"user","content":"ping"}]
  }'`,
  },
  {
    key: 'claude',
    title: 'Claude Code',
    type: 'anthropic',
    summary: '走 Anthropic 协议时，使用 `/v1/messages`。',
    steps: [
      '网关地址填「当前基础地址 + /v1/messages」。',
      '请求头增加 `anthropic-version: 2023-06-01`。',
      '若模型返回不一致，先查渠道模型映射和 Token 模型白名单。',
    ],
    snippet: (baseUrl, modelName) => `curl -s ${baseUrl}/v1/messages \\
  -H "Authorization: Bearer sk-xxxx" \\
  -H "Content-Type: application/json" \\
  -H "anthropic-version: 2023-06-01" \\
  -d '{
    "model":"${modelName}",
    "max_tokens":128,
    "messages":[{"role":"user","content":"reply ok"}]
  }'`,
  },
  {
    key: 'opencode',
    title: 'OpenCode',
    type: 'openai',
    summary: '推荐 OpenAI Compatible 模式。',
    steps: [
      'Provider 选择 OpenAI Compatible。',
      'Base URL 使用「当前基础地址 + /v1」。',
      '模型先从已验证可用别名开始，再逐步扩展。',
    ],
    snippet: (baseUrl, modelName) => `{
  "provider": "openai-compatible",
  "baseURL": "${baseUrl}/v1",
  "apiKey": "sk-xxxx",
  "model": "${modelName}"
}`,
  },
  {
    key: 'openclaw',
    title: 'OpenClaw',
    type: 'hybrid',
    summary: '支持 OpenAI 兼容和 Anthropic 两种接法。',
    steps: [
      '主配置写 `~/.openclaw/config.yml`，自定义提供商写 `models.providers`。',
      '如果要精细到 agent 级别，可写 `~/.openclaw/agents/<agentId>/agent/models.json`。',
      'provider 类型按协议选：`openai-completions` / `openai-responses` / `anthropic-messages`。',
      '改了模型列表后，重启 OpenClaw Gateway，避免热更新未生效。',
    ],
    snippet: (baseUrl, modelName) => `# ~/.openclaw/config.yml
models:
  mode: "merge"
  providers:
    "fs-gateway-openai":
      baseUrl: "${baseUrl}/v1"
      apiKey: "\${FS_API_KEY}"
      api: "openai-completions"
      models:
        - id: "${modelName}"
          name: "FS ${modelName}"
          reasoning: false
          input: ["text"]
          contextWindow: 128000
          maxTokens: 8192
    "fs-gateway-anthropic":
      baseUrl: "${baseUrl}/v1"
      apiKey: "\${FS_API_KEY}"
      api: "anthropic-messages"
      models:
        - id: "${modelName}"
          name: "FS ${modelName} (Anthropic API)"
          reasoning: false
          input: ["text"]
          contextWindow: 128000
          maxTokens: 8192

agents:
  defaults:
    model:
      primary: "fs-gateway-openai/${modelName}"
      fallbacks:
        - "fs-gateway-anthropic/${modelName}"`,
  },
  {
    key: 'hermes',
    title: 'Hermes',
    type: 'router',
    summary: 'Hermes 使用 `~/.hermes/config.yaml` 作为主配置入口。',
    steps: [
      '编辑 `~/.hermes/config.yaml`，主模型使用 `provider: custom` + `base_url`。',
      '`model.default` 直接填当前示例模型，避免使用硬编码占位符。',
      '可选配置 `fallback_model`，主模型异常时自动切换到备选模型。',
      '密钥建议放 `~/.hermes/.env`，并在 `config.yaml` 用 `${FS_API_KEY}` 引用。',
    ],
    snippet: (baseUrl, modelName) => `# ~/.hermes/config.yaml
model:
  default: "${modelName}"
  provider: custom
  base_url: "${baseUrl}/v1"
  api_key: "\${FS_API_KEY}"

fallback_model:
  provider: custom
  model: "${modelName}"
  base_url: "${baseUrl}/v1"
  key_env: FS_API_KEY`,
  },
];

export default function Guide() {
  const { t } = useTranslation();
  const [statusState] = React.useContext(StatusContext);
  const baseUrl =
    statusState?.status?.server_address?.trim() || window.location.origin;
  const modelName =
    statusState?.status?.home_demo_model?.trim() || 'gpt-4o-mini';
  const quickTypes = [
    { key: 'openai', label: 'OpenAI 兼容' },
    { key: 'anthropic', label: 'Anthropic 协议' },
    { key: 'hybrid', label: '双协议' },
    { key: 'router', label: '资源池/路由' },
  ];

  const handleCopy = async (content) => {
    const ok = await copy(content);
    if (ok) Toast.success(t('已复制到剪贴板'));
  };

  return (
    <div className='w-full px-4 py-24 md:px-8 bg-semi-color-bg-0'>
      <div className='mx-auto w-full max-w-6xl space-y-4'>
        <Card bordered bodyStyle={{ padding: 20 }}>
          <div className='flex flex-wrap items-center gap-2 mb-3'>
            {quickTypes.map((item) => (
              <Tag key={item.key} size='large' color='grey'>
                {item.label}
              </Tag>
            ))}
          </div>
          <Title heading={2} style={{ marginBottom: 8 }}>
            {t('配置说明')}
          </Title>
          <Text type='secondary'>
            {t('按客户端切换查看配置方式。示例中的网关地址会自动读取当前站点配置。')}
          </Text>
          <div className='mt-4 rounded-md border border-semi-color-border bg-semi-color-fill-0 px-3 py-2'>
            <Text>{t('当前基础地址')}: </Text>
            <Text strong>{baseUrl}</Text>
            <Text style={{ marginLeft: 12 }}>{t('当前示例模型')}: </Text>
            <Text strong>{modelName}</Text>
          </div>
        </Card>

        <Card bordered bodyStyle={{ padding: 20 }}>
          <Tabs type='line' lazyRender>
            {toolGuides.map((guide) => (
              <TabPane tab={guide.title} itemKey={guide.key} key={guide.key}>
                <div className='space-y-3'>
                  <div className='flex items-center justify-between gap-2'>
                    <Text>{t(guide.summary)}</Text>
                    <Tag color='blue' shape='circle'>
                      {guide.type}
                    </Tag>
                  </div>

                  <Collapse defaultActiveKey={['steps', 'snippet']}>
                    <Panel header={t('配置步骤')} itemKey='steps'>
                      {guide.steps.map((step) => (
                        <Text
                          key={step}
                          style={{ display: 'block', lineHeight: '26px' }}
                        >
                          {t(step)}
                        </Text>
                      ))}
                    </Panel>
                    <Panel header={t('配置示例')} itemKey='snippet'>
                      <div className='mb-2 flex justify-end'>
                        <Button
                          size='small'
                          theme='light'
                          onClick={() => handleCopy(guide.snippet(baseUrl, modelName))}
                        >
                          {t('复制示例')}
                        </Button>
                      </div>
                      <pre className='overflow-x-auto rounded-md border border-semi-color-border bg-semi-color-bg-1 p-3 text-xs leading-6 text-semi-color-text-0'>
                        {guide.snippet(baseUrl, modelName)}
                      </pre>
                    </Panel>
                  </Collapse>
                </div>
              </TabPane>
            ))}
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
