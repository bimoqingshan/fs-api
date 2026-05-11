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

import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { UserContext } from '../../context/User';
import { StatusContext } from '../../context/Status';
import {
  API,
  getLogo,
  showError,
  showSuccess,
  setUserData,
  updateAPI,
  getSystemName,
} from '../../helpers';
import Turnstile from 'react-turnstile';
import { Button, Card, Checkbox, Form, Typography } from '@douyinfe/semi-ui';
import { IconMail, IconLock } from '@douyinfe/semi-icons';
import { useTranslation } from 'react-i18next';
import { Activity } from 'lucide-react';
import { useActualTheme } from '../../context/Theme';

const { Text, Title } = Typography;

const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [, userDispatch] = useContext(UserContext);

  const [inputs, setInputs] = useState({
    username: '',
    password: '',
  });
  const { username, password } = inputs;

  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [turnstileEnabled, setTurnstileEnabled] = useState(false);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [hasUserAgreement, setHasUserAgreement] = useState(false);
  const [hasPrivacyPolicy, setHasPrivacyPolicy] = useState(false);

  const logo = getLogo();
  const systemName = getSystemName();
  const actualTheme = useActualTheme();

  const status = useMemo(() => {
    try {
      const savedStatus = localStorage.getItem('status');
      return savedStatus ? JSON.parse(savedStatus) : {};
    } catch (err) {
      return {};
    }
  }, []);

  useEffect(() => {
    if (searchParams.get('expired')) {
      showError(t('未登录或登录已过期，请重新登录'));
    }
  }, [searchParams]);

  useEffect(() => {
    if (status?.turnstile_check) {
      setTurnstileEnabled(true);
      setTurnstileSiteKey(status.turnstile_site_key);
    }
    setHasUserAgreement(status?.user_agreement_enabled || false);
    setHasPrivacyPolicy(status?.privacy_policy_enabled || false);
  }, [status]);

  function handleChange(name, value) {
    setInputs((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    if (!username || !password) {
      showError(t('请输入用户名和密码'));
      return;
    }
    if ((hasUserAgreement || hasPrivacyPolicy) && !agreedToTerms) {
      showError(t('请先阅读并同意用户协议和隐私政策'));
      return;
    }
    if (turnstileEnabled && turnstileToken === '') {
      showError(t('请稍后几秒重试，Turnstile 正在检查用户环境'));
      return;
    }

    setLoading(true);
    try {
      const res = await API.post(
        `/api/user/login?turnstile=${turnstileToken}`,
        {
          username,
          password,
        },
      );
      const { success, message, data } = res.data;
      if (success) {
        // Store JWT token in localStorage if rememberMe is enabled
        if (rememberMe && data?.token) {
          localStorage.setItem('token', data.token);
        }
        if (data?.refresh_token) {
          localStorage.setItem('refresh_token', data.refresh_token);
        }

        userDispatch({ type: 'login', payload: data });
        setUserData(data);
        updateAPI();
        showSuccess(t('登录成功！'));
        navigate('/console');
      } else {
        showError(message);
      }
    } catch (error) {
      showError(t('登录失败，请重试'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={`fs-auth-page px-4 ${actualTheme === 'light' ? '!bg-[#f8fafc]' : '!bg-[#0d1117]'}`}
    >
      {/* Background blur effects */}
      <div className='fs-auth-grid-bg' />
      <div
        className='blur-ball blur-ball-indigo'
        style={{ top: '-100px', right: '-100px', transform: 'none' }}
      />
      <div
        className='blur-ball blur-ball-teal'
        style={{ bottom: '20%', left: '-150px' }}
      />

      <div className='w-full max-w-md mt-[-60px] fs-auth-content'>
        <div className='flex flex-col items-center'>
          <div className='w-full'>
            {/* Header */}
            <div className='flex flex-col items-center mb-8'>
              <div className='flex items-center gap-3 mb-4'>
                <img src={logo} alt='Logo' className='h-12 w-12 rounded-full' />
                <Title heading={2} className='m-0 !text-semi-color-text-0'>
                  {systemName}
                </Title>
              </div>
              <div className='flex items-center gap-2 text-xs text-semi-color-text-2'>
                <Activity size={12} className='text-green-400' />
                <span>Gateway Online</span>
              </div>
            </div>

            {/* Form Card */}
            <Card
              className={`fs-auth-card rounded-xl overflow-hidden ${actualTheme === 'light' ? '!bg-white' : '!bg-[#161b22]'}`}
            >
              <div className='flex justify-center pt-6 pb-2'>
                <Title heading={3} className='!text-semi-color-text-0'>
                  {t('登录账号')}
                </Title>
              </div>

              <div className='px-6 py-4'>
                <Form className='space-y-4'>
                  <Form.Input
                    field='username'
                    label={t('用户名 / 邮箱')}
                    placeholder={t('请输入用户名或邮箱')}
                    name='username'
                    value={username}
                    onChange={(value) => handleChange('username', value)}
                    prefix={<IconMail />}
                    className='fs-auth-input'
                  />

                  <Form.Input
                    field='password'
                    label={t('密码')}
                    placeholder={t('请输入密码')}
                    name='password'
                    type='password'
                    value={password}
                    onChange={(value) => handleChange('password', value)}
                    prefix={<IconLock />}
                    className='fs-auth-input'
                  />

                  {/* Remember me checkbox */}
                  <div className='flex items-center pt-1'>
                    <Checkbox
                      checked={rememberMe}
                      onChange={(checked) => setRememberMe(checked)}
                      className='fs-auth-checkbox'
                    >
                      <Text type='tertiary' className='text-slate-400 text-sm'>
                        {t('记住登录状态')}
                      </Text>
                    </Checkbox>
                  </div>

                  {/* Terms checkbox */}
                  {(hasUserAgreement || hasPrivacyPolicy) && (
                    <div className='flex items-start gap-2 pt-1'>
                      <Form.Checkbox
                        checked={agreedToTerms}
                        onChange={(checked) => setAgreedToTerms(checked)}
                        className='fs-auth-checkbox'
                      >
                        <Text type='tertiary' className='text-slate-400 text-xs'>
                          {t('我已阅读并同意')}
                          {hasUserAgreement && (
                            <Link
                              to='/user-agreement'
                              className='text-blue-400 hover:text-blue-300 ml-1'
                              target='_blank'
                            >
                              {t('用户协议')}
                            </Link>
                          )}
                          {hasUserAgreement && hasPrivacyPolicy && (
                            <span className='mx-1'>{t('和')}</span>
                          )}
                          {hasPrivacyPolicy && (
                            <Link
                              to='/privacy-policy'
                              className='text-blue-400 hover:text-blue-300'
                              target='_blank'
                            >
                              {t('隐私政策')}
                            </Link>
                          )}
                        </Text>
                      </Form.Checkbox>
                    </div>
                  )}

                  <div className='space-y-2 pt-2'>
                    <Button
                      theme='solid'
                      className='w-full !rounded-lg'
                      type='primary'
                      htmlType='submit'
                      onClick={handleSubmit}
                      loading={loading}
                    >
                      {t('登录')}
                    </Button>
                  </div>
                </Form>

                <div className='mt-4 flex justify-between text-sm'>
                  <Link
                    to='/register'
                    className='text-blue-400 hover:text-blue-300'
                  >
                    {t('注册账号')}
                  </Link>
                  <Link
                    to='/reset'
                    className='text-blue-400 hover:text-blue-300'
                  >
                    {t('忘记密码？')}
                  </Link>
                </div>
              </div>
            </Card>

            {/* Turnstile */}
            {turnstileEnabled && (
              <div className='flex justify-center mt-6'>
                <Turnstile
                  sitekey={turnstileSiteKey}
                  onVerify={(token) => {
                    setTurnstileToken(token);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
