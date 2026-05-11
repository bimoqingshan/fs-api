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

import React, { useContext, useEffect, useState } from 'react';
import {
  Button,
  Typography,
  Input,
  ScrollList,
  ScrollItem,
  Tag,
} from '@douyinfe/semi-ui';
import {
  API,
  showError,
  copy,
  showSuccess,
  getSourceCodeURL,
} from '../../helpers';
import { useIsMobile } from '../../hooks/common/useIsMobile';
import { API_ENDPOINTS } from '../../constants/common.constant';
import { StatusContext } from '../../context/Status';
import { useActualTheme } from '../../context/Theme';
import { marked } from 'marked';
import { useTranslation } from 'react-i18next';
import {
  IconGithubLogo,
  IconCopy,
} from '@douyinfe/semi-icons';
import { Link } from 'react-router-dom';
import NoticeModal from '../../components/layout/NoticeModal';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Boxes,
  Gauge,
  KeyRound,
  Route,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from 'lucide-react';
import {
  Moonshot,
  OpenAI,
  XAI,
  Zhipu,
  Volcengine,
  Cohere,
  Claude,
  Gemini,
  Suno,
  Minimax,
  Wenxin,
  Spark,
  Qingyan,
  DeepSeek,
  Qwen,
  Midjourney,
  Grok,
  AzureAI,
  Hunyuan,
  Xinference,
} from '@lobehub/icons';

const { Text } = Typography;

const providerIcons = [
  Moonshot,
  OpenAI,
  XAI,
  Zhipu.Color,
  Volcengine.Color,
  Cohere.Color,
  Claude.Color,
  Gemini.Color,
  Suno,
  Minimax.Color,
  Wenxin.Color,
  Spark.Color,
  Qingyan.Color,
  DeepSeek.Color,
  Qwen.Color,
  Midjourney,
  Grok,
  AzureAI.Color,
  Hunyuan.Color,
  Xinference.Color,
];

const featureItems = [
  {
    icon: Route,
    title: '统一路由',
    description: 'OpenAI 兼容入口接入多家模型，减少 SDK、模型名和鉴权差异。',
  },
  {
    icon: Gauge,
    title: '故障切换',
    description: '渠道异常时切到可用供应商，降低单点模型服务波动带来的中断。',
  },
  {
    icon: BarChart3,
    title: '用量看板',
    description: '按用户、令牌、模型和渠道追踪调用、花费、错误与延迟。',
  },
  {
    icon: WalletCards,
    title: '成本治理',
    description: '额度、倍率、模型价格和充值流程集中管理，账目更清楚。',
  },
  {
    icon: ShieldCheck,
    title: '密钥隔离',
    description: '用户令牌和上游 Key 分离，便于回收、限额和审计。',
  },
  {
    icon: Sparkles,
    title: '多模态入口',
    description: '文本、图片、视频、重排等能力统一暴露给业务应用。',
  },
];

const setupSteps = [
  ['1', '注册账号', '进入控制台开通你的调用身份。'],
  ['2', '创建令牌', '为不同项目生成独立 API Key。'],
  ['3', '替换基址', '保留 OpenAI SDK，只改 baseURL。'],
];

const Home = () => {
  const { t, i18n } = useTranslation();
  const [statusState] = useContext(StatusContext);
  const actualTheme = useActualTheme();
  const [homePageContentLoaded, setHomePageContentLoaded] = useState(false);
  const [homePageContent, setHomePageContent] = useState('');
  const [noticeVisible, setNoticeVisible] = useState(false);
  const isMobile = useIsMobile();
  const isDemoSiteMode = statusState?.status?.demo_site_enabled || false;
  const sourceCodeURL =
    statusState?.status?.source_code_url ||
    getSourceCodeURL() ||
    'https://github.com/QuantumNous/new-api';
  const homeDemoModel =
    statusState?.status?.home_demo_model?.trim() || 'gpt-4o-mini';
  const serverAddress =
    statusState?.status?.server_address || `${window.location.origin}`;
  const endpointItems = API_ENDPOINTS.map((e) => ({ value: e }));
  const [endpointIndex, setEndpointIndex] = useState(0);

  const displayHomePageContent = async () => {
    setHomePageContent(localStorage.getItem('home_page_content') || '');
    const res = await API.get('/api/home_page_content');
    const { success, message, data } = res.data;
    if (success) {
      let content = data;
      if (!data.startsWith('https://')) {
        content = marked.parse(data);
      }
      setHomePageContent(content);
      localStorage.setItem('home_page_content', content);

      // 如果内容是 URL，则发送主题模式
      if (data.startsWith('https://')) {
        const iframe = document.querySelector('iframe');
        if (iframe) {
          iframe.onload = () => {
            iframe.contentWindow.postMessage({ themeMode: actualTheme }, '*');
            iframe.contentWindow.postMessage({ lang: i18n.language }, '*');
          };
        }
      }
    } else {
      showError(message);
      setHomePageContent(t('加载首页内容失败...'));
    }
    setHomePageContentLoaded(true);
  };

  const handleCopyBaseURL = async () => {
    const ok = await copy(serverAddress);
    if (ok) {
      showSuccess(t('已复制到剪切板'));
    }
  };

  useEffect(() => {
    const checkNoticeAndShow = async () => {
      const lastCloseDate = localStorage.getItem('notice_close_date');
      const today = new Date().toDateString();
      if (lastCloseDate !== today) {
        try {
          const res = await API.get('/api/notice');
          const { success, data } = res.data;
          if (success && data && data.trim() !== '') {
            setNoticeVisible(true);
          }
        } catch (error) {
          console.error('获取公告失败:', error);
        }
      }
    };

    checkNoticeAndShow();
  }, []);

  useEffect(() => {
    displayHomePageContent().then();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setEndpointIndex((prev) => (prev + 1) % endpointItems.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [endpointItems.length]);

  return (
    <div className='w-full overflow-x-hidden'>
      <NoticeModal
        visible={noticeVisible}
        onClose={() => setNoticeVisible(false)}
        isMobile={isMobile}
      />
      {homePageContentLoaded && homePageContent === '' ? (
        <div className='fs-home w-full overflow-x-hidden'>
          <section className='fs-home-hero relative border-b border-semi-color-border px-4 pb-16 pt-24 md:px-8 md:pb-20 md:pt-28'>
            <div className='mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.02fr_0.98fr]'>
              <div className='max-w-3xl'>
                <div className='mb-6 flex flex-wrap items-center gap-3'>
                  <Tag color='grey' size='large' shape='circle'>
                    FS API Gateway
                  </Tag>
                  <span className='fs-home-signal'>
                    <Activity size={14} />
                    {t('多渠道在线路由')}
                  </span>
                </div>
                <h1 className='fs-home-title text-semi-color-text-0'>
                  {t('把所有模型')}
                  <span>{t('接进一条稳定的')}</span>
                  <span>{t('API 主干')}</span>
                </h1>
                <p className='mt-6 max-w-2xl text-base leading-8 text-semi-color-text-1 md:text-lg'>
                  {t(
                    '统一 OpenAI 兼容入口，集中管理渠道、密钥、价格、额度和日志。业务侧只改 baseURL，就能获得多模型供应商的路由能力。',
                  )}
                </p>

                <div className='mt-8 max-w-2xl'>
                  <div className='mb-3 flex items-center justify-between gap-3 text-xs uppercase tracking-normal text-semi-color-text-2'>
                    <span>{t('基础地址')}</span>
                    <span className='hidden sm:inline'>
                      {t('兼容端点轮换展示')}
                    </span>
                  </div>
                  <Input
                    readOnly
                    value={serverAddress}
                    className='fs-home-base-input'
                    size={isMobile ? 'default' : 'large'}
                    suffix={
                      isMobile ? null : (
                        <div className='flex min-w-0 items-center gap-2'>
                          <ScrollList
                            bodyHeight={32}
                            style={{ border: 'unset', boxShadow: 'unset' }}
                          >
                            <ScrollItem
                              mode='wheel'
                              cycled={true}
                              list={endpointItems}
                              selectedIndex={endpointIndex}
                              onSelect={({ index }) =>
                                setEndpointIndex(index)
                              }
                            />
                          </ScrollList>
                          <Button
                            type='primary'
                            onClick={handleCopyBaseURL}
                            icon={<IconCopy />}
                            className='!rounded-md'
                          />
                        </div>
                      )
                    }
                  />
                  {isMobile && (
                    <div className='fs-home-mobile-endpoint'>
                      {endpointItems[endpointIndex]?.value}
                    </div>
                  )}
                </div>

                <div className='mt-8 flex flex-col gap-3 sm:flex-row'>
                  <Link to='/console' className='w-full sm:w-auto'>
                    <Button
                      theme='solid'
                      type='primary'
                      size={isMobile ? 'default' : 'large'}
                      className='fs-home-primary-btn'
                      icon={<KeyRound size={17} />}
                    >
                      {t('获取密钥')}
                    </Button>
                  </Link>
                  {isDemoSiteMode && statusState?.status?.version ? (
                    <Button
                      size={isMobile ? 'default' : 'large'}
                      className='fs-home-secondary-btn'
                      icon={<IconGithubLogo />}
                      onClick={() => window.open(sourceCodeURL, '_blank')}
                    >
                      {statusState.status.version}
                    </Button>
                  ) : null}
                </div>

                <div className='mt-10 grid max-w-2xl grid-cols-3 gap-px overflow-hidden rounded-lg border border-semi-color-border bg-semi-color-border'>
                  {[
                    ['30+', t('模型供应商')],
                    ['1', t('统一兼容入口')],
                    ['24h', t('用量追踪')],
                  ].map(([value, label]) => (
                    <div
                      key={label}
                      className='bg-semi-color-bg-0 px-4 py-4 text-center'
                    >
                      <div className='text-2xl font-semibold text-semi-color-text-0'>
                        {value}
                      </div>
                      <div className='mt-1 text-xs text-semi-color-text-2'>
                        {label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className='fs-home-routing-panel'>
                <div className='mb-5 flex items-center justify-between'>
                  <div>
                    <div className='text-xs uppercase tracking-normal text-semi-color-text-2'>
                      {t('实时路由看板')}
                    </div>
                    <div className='mt-1 text-lg font-semibold text-semi-color-text-0'>
                      {t('请求从这里进入，再被分发到最合适的渠道')}
                    </div>
                  </div>
                  <Boxes className='text-semi-color-text-1' size={24} />
                </div>

                <div className='fs-home-flow'>
                  <div className='fs-home-flow-node'>
                    <span>{t('客户端')}</span>
                    <strong>OpenAI SDK</strong>
                  </div>
                  <ArrowRight size={18} />
                  <div className='fs-home-flow-node active'>
                    <span>FS API</span>
                    <strong>{endpointItems[endpointIndex]?.value}</strong>
                  </div>
                  <ArrowRight size={18} />
                  <div className='fs-home-flow-node'>
                    <span>{t('供应商')}</span>
                    <strong>{t('自动路由')}</strong>
                  </div>
                </div>

                <div className='fs-home-code-panel mt-6 overflow-hidden rounded-lg border border-semi-color-border bg-[#0d1117] text-sm shadow-2xl'>
                  <div className='flex items-center gap-2 border-b border-white/10 px-4 py-3'>
                    <span className='h-2.5 w-2.5 rounded-full bg-[#8b8b8b]' />
                    <span className='h-2.5 w-2.5 rounded-full bg-[#b5b5b5]' />
                    <span className='h-2.5 w-2.5 rounded-full bg-[#d6d6d6]' />
                    <span className='ml-2 text-xs text-slate-400'>
                      sdk-config.ts
                    </span>
                  </div>
                  <pre className='m-0 overflow-x-auto p-5 leading-7'>
                    <code>{`const client = new OpenAI({
  apiKey: "sk-your-token",
  baseURL: "${serverAddress}/v1"
})

await client.responses.create({
  model: "${homeDemoModel}",
  input: "Ping FS API"
})`}</code>
                  </pre>
                </div>

                <div className='mt-5 grid gap-3 md:grid-cols-3'>
                  {[
                    ['p95', '1.2s'],
                    [t('故障切换'), t('开启')],
                    [t('成本'), t('已追踪')],
                  ].map(([label, value]) => (
                    <div key={label} className='fs-home-metric'>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className='border-b border-semi-color-border bg-semi-color-bg-0 px-4 py-12 md:px-8 md:py-16'>
            <div className='mx-auto max-w-7xl'>
              <div className='mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end'>
                <div>
                  <div className='mb-2 text-sm font-semibold uppercase tracking-normal text-semi-color-text-1'>
                    {t('模型网络')}
                  </div>
                  <h2 className='text-2xl font-semibold text-semi-color-text-0 md:text-4xl'>
                    {t('一个入口，接入多家模型能力')}
                  </h2>
                </div>
                <Text type='secondary' className='max-w-xl leading-7'>
                  {t(
                    '把供应商选择留给网关，把稳定输出留给业务。文本、图片、视频与任务类接口可以逐步收敛到同一套控制台。',
                  )}
                </Text>
              </div>

              <div className='fs-home-provider-grid'>
                {providerIcons.map((ProviderIcon, index) => (
                  <div key={index} className='fs-home-provider-logo'>
                    <ProviderIcon size={isMobile ? 28 : 36} />
                  </div>
                ))}
                <div className='fs-home-provider-logo text-lg font-semibold text-semi-color-text-0'>
                  30+
                </div>
              </div>
            </div>
          </section>

          <section className='bg-semi-color-bg-1 px-4 py-12 md:px-8 md:py-16'>
            <div className='mx-auto max-w-7xl'>
              <div className='mb-8 max-w-3xl'>
                <div className='mb-2 text-sm font-semibold uppercase tracking-normal text-semi-color-text-1'>
                  {t('网关工具箱')}
                </div>
                <h2 className='text-2xl font-semibold text-semi-color-text-0 md:text-4xl'>
                  {t('中转站该有的能力，直接放进控制台')}
                </h2>
              </div>

              <div className='grid gap-px overflow-hidden rounded-lg border border-semi-color-border bg-semi-color-border md:grid-cols-2 lg:grid-cols-3'>
                {featureItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className='fs-home-feature'>
                      <Icon size={22} />
                      <h3>{t(item.title)}</h3>
                      <p>{t(item.description)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className='border-t border-semi-color-border bg-semi-color-bg-0 px-4 py-12 md:px-8 md:py-16'>
            <div className='mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.75fr_1.25fr]'>
              <div>
                <div className='mb-2 text-sm font-semibold uppercase tracking-normal text-semi-color-text-1'>
                  {t('快速开始')}
                </div>
                <h2 className='text-2xl font-semibold text-semi-color-text-0 md:text-4xl'>
                  {t('三步接入你的第一个项目')}
                </h2>
              </div>
              <div className='grid gap-4 md:grid-cols-3'>
                {setupSteps.map(([step, title, description]) => (
                  <div key={step} className='fs-home-step'>
                    <span>{step}</span>
                    <h3>{t(title)}</h3>
                    <p>{t(description)}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      ) : (
        <div className='overflow-x-hidden w-full'>
          {homePageContent.startsWith('https://') ? (
            <iframe
              src={homePageContent}
              className='w-full h-screen border-none'
            />
          ) : (
            <div
              className='mt-[60px]'
              dangerouslySetInnerHTML={{ __html: homePageContent }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default Home;
