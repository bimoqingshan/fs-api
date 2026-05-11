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

import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  TextArea,
  Typography,
  Modal,
} from '@douyinfe/semi-ui';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Copy,
  Download,
  Image as ImageIcon,
  KeyRound,
  Loader2,
  Palette,
  Sparkles,
} from 'lucide-react';
import { API, copy, showError, showSuccess } from '../../helpers';
import { fetchTokenKey } from '../../helpers/token';

const { Text, Title } = Typography;

const tokenKeyOf = (value) => {
  if (!value) return '';
  const trimmed = String(value).trim();
  return trimmed.startsWith('sk-') ? trimmed.slice(3) : trimmed;
};

const imageSrcOf = (item) => {
  if (item?.url) return item.url;
  if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
  return '';
};

const modelPresets = [
  { label: 'gpt-image-1', value: 'gpt-image-1' },
  { label: 'dall-e-3', value: 'dall-e-3' },
  { label: 'dall-e-2', value: 'dall-e-2' },
  { label: 'imagen-4', value: 'imagen-4' },
  { label: 'cogview-4', value: 'cogview-4' },
];

const sizeOptions = [
  { label: '1024 x 1024', value: '1024x1024' },
  { label: '1024 x 1536', value: '1024x1536' },
  { label: '1536 x 1024', value: '1536x1024' },
  { label: '1024 x 1792', value: '1024x1792' },
  { label: '1792 x 1024', value: '1792x1024' },
];

const qualityOptions = [
  { label: 'auto', value: 'auto' },
  { label: 'standard', value: 'standard' },
  { label: 'hd', value: 'hd' },
  { label: 'high', value: 'high' },
  { label: 'medium', value: 'medium' },
  { label: 'low', value: 'low' },
];

const responseFormatOptions = [
  { label: 'url', value: 'url' },
  { label: 'b64_json', value: 'b64_json' },
];

const ImageGeneration = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isLoggedIn = Boolean(localStorage.getItem('user'));
  const [tokens, setTokens] = useState([]);
  const [tokensLoading, setTokensLoading] = useState(false);
  const [selectedTokenId, setSelectedTokenId] = useState(
    localStorage.getItem('image_generation_token_id') || '',
  );
  const [manualKey, setManualKey] = useState('');
  const [model, setModel] = useState(
    localStorage.getItem('image_generation_model') || 'gpt-image-1',
  );
  const [prompt, setPrompt] = useState(
    localStorage.getItem('image_generation_prompt') || '',
  );
  const [size, setSize] = useState(
    localStorage.getItem('image_generation_size') || '1024x1024',
  );
  const [quality, setQuality] = useState(
    localStorage.getItem('image_generation_quality') || 'auto',
  );
  const [responseFormat, setResponseFormat] = useState(
    localStorage.getItem('image_generation_response_format') || 'url',
  );
  const [count, setCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loginPromptVisible, setLoginPromptVisible] = useState(false);
  const [images, setImages] = useState([]);
  const [rawResponse, setRawResponse] = useState(null);

  const tokenOptions = useMemo(
    () =>
      tokens.map((token) => ({
        label: `${token.name || `Token #${token.id}`} · ${
          token.status === 1 ? '启用' : '停用'
        }`,
        value: String(token.id),
        disabled: token.status !== 1,
      })),
    [tokens],
  );

  const hasCredential = selectedTokenId || manualKey.trim();

  const loadTokens = async () => {
    setTokensLoading(true);
    try {
      const res = await API.get('/api/token/?p=1&size=100');
      const { success, data, message } = res.data;
      if (!success) {
        showError(message);
        return;
      }
      const items = Array.isArray(data) ? data : data.items || [];
      setTokens(items);
      if (!selectedTokenId) {
        const firstEnabled = items.find((item) => item.status === 1);
        if (firstEnabled) {
          setSelectedTokenId(String(firstEnabled.id));
        }
      }
    } catch (error) {
      showError(error?.message || '令牌加载失败');
    } finally {
      setTokensLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadTokens();
    } else {
      setTokens([]);
      setTokensLoading(false);
    }
    localStorage.removeItem('image_generation_manual_key');
  }, [isLoggedIn]);

  useEffect(() => {
    localStorage.setItem('image_generation_token_id', selectedTokenId || '');
  }, [selectedTokenId]);

  useEffect(() => {
    localStorage.setItem('image_generation_model', model);
  }, [model]);

  useEffect(() => {
    localStorage.setItem('image_generation_prompt', prompt);
  }, [prompt]);

  useEffect(() => {
    localStorage.setItem('image_generation_size', size);
  }, [size]);

  useEffect(() => {
    localStorage.setItem('image_generation_quality', quality);
  }, [quality]);

  useEffect(() => {
    localStorage.setItem(
      'image_generation_response_format',
      responseFormat,
    );
  }, [responseFormat]);

  const getRequestKey = async () => {
    if (manualKey.trim()) {
      return tokenKeyOf(manualKey);
    }
    if (!selectedTokenId) {
      throw new Error('请选择令牌或填写 API Key');
    }
    return fetchTokenKey(selectedTokenId);
  };

  const submit = async () => {
    const normalizedPrompt = prompt.trim();
    if (!normalizedPrompt) {
      showError('请输入提示词');
      return;
    }
    if (!isLoggedIn) {
      setLoginPromptVisible(true);
      return;
    }
    if (!hasCredential) {
      showError('请选择令牌或填写 API Key');
      return;
    }

    setLoading(true);
    setRawResponse(null);
    try {
      const key = await getRequestKey();
      const payload = {
        model: model.trim(),
        prompt: normalizedPrompt,
        n: count,
        size,
        quality,
        response_format: responseFormat,
      };
      const res = await API.post('/v1/images/generations', payload, {
        headers: {
          Authorization: `Bearer sk-${key}`,
        },
        timeout: 180000,
        skipErrorHandler: true,
      });

      setRawResponse(res.data);
      const nextImages = Array.isArray(res.data?.data) ? res.data.data : [];
      setImages(nextImages);
      if (nextImages.length === 0) {
        showError('未返回图片结果');
      } else {
        showSuccess('图片生成完成');
      }
    } catch (error) {
      const message =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        '图片生成失败';
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  const copyImage = async (item) => {
    const value = item?.url || item?.b64_json || '';
    if (!value) return;
    if (await copy(value)) {
      showSuccess('已复制');
    }
  };

  const downloadImage = (item, index) => {
    const src = imageSrcOf(item);
    if (!src) return;
    const anchor = document.createElement('a');
    anchor.href = src;
    anchor.download = `fs-api-image-${index + 1}.png`;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  return (
    <div className='mt-[60px] px-2 pb-8'>
      <Modal
        title='登录后生成图片'
        visible={loginPromptVisible}
        okText='去登录'
        cancelText='先看看'
        onCancel={() => setLoginPromptVisible(false)}
        onOk={() =>
          navigate('/login', {
            state: { from: location },
          })
        }
      >
        <Text type='secondary'>
          图片生成会消耗额度并调用你的令牌，登录后就可以继续生成。
        </Text>
      </Modal>

      <div className='mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between'>
        <div>
          <div className='mb-2 flex items-center gap-2'>
            <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-semi-color-primary-light-default text-semi-color-primary'>
              <Palette size={18} />
            </div>
            <Tag color='cyan' shape='circle'>
              /v1/images/generations
            </Tag>
          </div>
          <Title heading={3} className='!mb-1'>
            图片生成
          </Title>
          <Text type='secondary'>模型、令牌和出图参数集中在一个工作台。</Text>
        </div>
        <Space>
          <Button
            icon={<KeyRound size={16} />}
            onClick={() =>
              isLoggedIn
                ? window.open('/console/token', '_blank')
                : setLoginPromptVisible(true)
            }
          >
            令牌
          </Button>
          <Button
            type='primary'
            theme='solid'
            icon={loading ? <Loader2 size={16} /> : <Sparkles size={16} />}
            loading={loading}
            disabled={!prompt.trim() || (isLoggedIn && !hasCredential)}
            onClick={submit}
          >
            生成
          </Button>
        </Space>
      </div>

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={9} xl={8}>
          <Card className='!rounded-lg' bodyStyle={{ padding: 20 }}>
            <div className='mb-4 flex items-center justify-between'>
              <Text strong>请求配置</Text>
              {tokensLoading && <Spin size='small' />}
            </div>

            <div className='space-y-4'>
              <div>
                <Text strong className='mb-2 block text-sm'>
                  令牌
                </Text>
                <Select
                  value={selectedTokenId}
                  placeholder='选择已启用令牌'
                  optionList={tokenOptions}
                  loading={tokensLoading}
                  disabled={!isLoggedIn}
                  filter
                  allowClear
                  onChange={(value) => setSelectedTokenId(value || '')}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <Text strong className='mb-2 block text-sm'>
                  API Key
                </Text>
                <Input
                  value={manualKey}
                  placeholder='sk-...'
                  mode='password'
                  autoComplete='new-password'
                  onChange={setManualKey}
                />
              </div>

              <div>
                <Text strong className='mb-2 block text-sm'>
                  模型
                </Text>
                <Select
                  value={model}
                  placeholder='选择或输入模型'
                  optionList={modelPresets}
                  filter
                  allowCreate
                  onChange={setModel}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <Text strong className='mb-2 block text-sm'>
                  提示词
                </Text>
                <TextArea
                  value={prompt}
                  autosize={{ minRows: 7, maxRows: 12 }}
                  placeholder='一张安静的产品摄影图，柔和侧光，真实材质，浅景深'
                  onChange={setPrompt}
                />
              </div>

              <Row gutter={[12, 12]}>
                <Col span={12}>
                  <Text strong className='mb-2 block text-sm'>
                    尺寸
                  </Text>
                  <Select
                    value={size}
                    optionList={sizeOptions}
                    onChange={setSize}
                    style={{ width: '100%' }}
                  />
                </Col>
                <Col span={12}>
                  <Text strong className='mb-2 block text-sm'>
                    质量
                  </Text>
                  <Select
                    value={quality}
                    optionList={qualityOptions}
                    onChange={setQuality}
                    style={{ width: '100%' }}
                  />
                </Col>
                <Col span={12}>
                  <Text strong className='mb-2 block text-sm'>
                    数量
                  </Text>
                  <InputNumber
                    min={1}
                    max={4}
                    value={count}
                    onChange={(value) => setCount(Number(value) || 1)}
                    style={{ width: '100%' }}
                  />
                </Col>
                <Col span={12}>
                  <Text strong className='mb-2 block text-sm'>
                    返回
                  </Text>
                  <Select
                    value={responseFormat}
                    optionList={responseFormatOptions}
                    onChange={setResponseFormat}
                    style={{ width: '100%' }}
                  />
                </Col>
              </Row>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={15} xl={16}>
          <Card
            className='min-h-[620px] !rounded-lg'
            bodyStyle={{ padding: 20 }}
          >
            <div className='mb-4 flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <ImageIcon size={18} />
                <Text strong>生成结果</Text>
              </div>
              {images.length > 0 && (
                <Text type='secondary' size='small'>
                  {images.length} 张
                </Text>
              )}
            </div>

            {loading ? (
              <div className='flex min-h-[520px] items-center justify-center'>
                <Spin size='large' tip='生成中' />
              </div>
            ) : images.length > 0 ? (
              <Row gutter={[16, 16]}>
                {images.map((item, index) => {
                  const src = imageSrcOf(item);
                  return (
                    <Col xs={24} md={12} xl={8} key={`${src}-${index}`}>
                      <div className='overflow-hidden rounded-lg border border-semi-color-border bg-semi-color-bg-1'>
                        <div className='aspect-square bg-semi-color-fill-0'>
                          {src ? (
                            <img
                              src={src}
                              alt={`生成图片 ${index + 1}`}
                              className='h-full w-full object-cover'
                            />
                          ) : (
                            <div className='flex h-full items-center justify-center text-semi-color-text-2'>
                              无预览
                            </div>
                          )}
                        </div>
                        <div className='flex items-center justify-between gap-2 p-3'>
                          <Text
                            ellipsis={{ showTooltip: true }}
                            className='min-w-0 text-xs'
                            type='secondary'
                          >
                            {item?.revised_prompt || prompt}
                          </Text>
                          <Space spacing={4}>
                            <Button
                              icon={<Copy size={14} />}
                              size='small'
                              type='tertiary'
                              onClick={() => copyImage(item)}
                            />
                            <Button
                              icon={<Download size={14} />}
                              size='small'
                              type='tertiary'
                              onClick={() => downloadImage(item, index)}
                            />
                          </Space>
                        </div>
                      </div>
                    </Col>
                  );
                })}
              </Row>
            ) : (
              <div className='flex min-h-[520px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-semi-color-border bg-semi-color-fill-0 text-center'>
                <ImageIcon size={42} className='text-semi-color-text-2' />
                <Text type='secondary'>生成后的图片会显示在这里</Text>
              </div>
            )}

            {rawResponse && (
              <Card
                className='mt-4 !rounded-lg'
                bodyStyle={{ padding: 14 }}
                title='响应摘要'
              >
                <pre className='max-h-52 overflow-auto whitespace-pre-wrap text-xs text-semi-color-text-1'>
                  {JSON.stringify(rawResponse, null, 2)}
                </pre>
              </Card>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ImageGeneration;
