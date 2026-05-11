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
import { Link } from 'react-router-dom';
import {
  API,
  getLogo,
  showError,
  showSuccess,
  getSystemName,
} from '../../helpers';
import Turnstile from 'react-turnstile';
import { Button, Card, Form, Typography } from '@douyinfe/semi-ui';
import { IconMail } from '@douyinfe/semi-icons';
import { useTranslation } from 'react-i18next';
import { Activity } from 'lucide-react';

const { Text, Title } = Typography;

const ForgotPassword = () => {
  const { t } = useTranslation();

  const [inputs, setInputs] = useState({
    email: '',
  });
  const { email } = inputs;

  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [turnstileEnabled, setTurnstileEnabled] = useState(false);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');

  const logo = getLogo();
  const systemName = getSystemName();

  useEffect(() => {
    try {
      const savedStatus = localStorage.getItem('status');
      if (savedStatus) {
        const status = JSON.parse(savedStatus);
        if (status.turnstile_check) {
          setTurnstileEnabled(true);
          setTurnstileSiteKey(status.turnstile_site_key);
        }
      }
    } catch (err) {
      // ignore
    }
  }, []);

  function handleChange(value) {
    setInputs({ email: value });
  }

  async function handleSubmit(e) {
    if (!email) {
      showError(t('请输入邮箱地址'));
      return;
    }
    if (turnstileEnabled && turnstileToken === '') {
      showError(t('请稍后几秒重试，Turnstile 正在检查用户环境'));
      return;
    }

    setLoading(true);
    try {
      const res = await API.get(
        `/api/reset_password?email=${encodeURIComponent(email)}&turnstile=${turnstileToken}`,
      );
      const { success, message } = res.data;
      if (success) {
        setSent(true);
        showSuccess(t('邮件已发送，请检查你的邮箱'));
      } else {
        showError(message);
      }
    } catch (error) {
      showError(t('发送失败，请重试'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className='relative overflow-hidden bg-[#0d1117] flex items-center justify-center min-h-screen px-4'>
      {/* Background blur effects */}
      <div
        className='blur-ball blur-ball-indigo'
        style={{ top: '-100px', right: '-100px', transform: 'none' }}
      />
      <div
        className='blur-ball blur-ball-teal'
        style={{ bottom: '20%', left: '-150px' }}
      />

      <div className='w-full max-w-md mt-[-60px]'>
        <div className='flex flex-col items-center'>
          <div className='w-full'>
            {/* Header */}
            <div className='flex flex-col items-center mb-8'>
              <div className='flex items-center gap-3 mb-4'>
                <img src={logo} alt='Logo' className='h-12 w-12 rounded-full' />
                <Title heading={2} className='!text-white m-0'>
                  {systemName}
                </Title>
              </div>
              <div className='flex items-center gap-2 text-xs text-slate-400'>
                <Activity size={12} className='text-green-400' />
                <span>Gateway Online</span>
              </div>
            </div>

            {/* Form Card */}
            <Card className='border border-semi-color-border bg-[#161b22] rounded-xl overflow-hidden'>
              <div className='flex justify-center pt-6 pb-2'>
                <Title heading={3} className='!text-white'>
                  {t('找回密码')}
                </Title>
              </div>

              <div className='px-6 py-4'>
                {sent ? (
                  <div className='text-center py-4'>
                    <div className='mb-4'>
                      <svg
                        className='mx-auto h-12 w-12 text-green-400'
                        fill='none'
                        viewBox='0 0 24 24'
                        stroke='currentColor'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
                        />
                      </svg>
                    </div>
                    <Title heading={4} className='!text-white mb-2'>
                      {t('邮件已发送')}
                    </Title>
                    <Text type='tertiary' className='text-slate-400'>
                      {t('重置链接已发送到您的邮箱，请点击链接重置密码')}
                    </Text>
                    <div className='mt-6'>
                      <Link
                        to='/login'
                        className='text-blue-400 hover:text-blue-300 font-medium'
                      >
                        {t('返回登录')}
                      </Link>
                    </div>
                  </div>
                ) : (
                  <>
                    <Text type='tertiary' className='text-slate-400 text-sm mb-4 block'>
                      {t('请输入您注册时使用的邮箱地址，我们将发送重置密码链接')}
                    </Text>
                    <Form className='space-y-4'>
                      <Form.Input
                        field='email'
                        label={t('邮箱')}
                        placeholder={t('请输入邮箱地址')}
                        name='email'
                        type='email'
                        value={email}
                        onChange={handleChange}
                        prefix={<IconMail />}
                        className='fs-auth-input'
                      />

                      <div className='space-y-2 pt-2'>
                        <Button
                          theme='solid'
                          className='w-full !rounded-lg'
                          type='primary'
                          htmlType='submit'
                          onClick={handleSubmit}
                          loading={loading}
                        >
                          {t('发送重置链接')}
                        </Button>
                      </div>
                    </Form>

                    <div className='mt-6 text-center text-sm'>
                      <Text type='tertiary' className='text-slate-400'>
                        {t('想起密码了？')}{' '}
                        <Link
                          to='/login'
                          className='text-blue-400 hover:text-blue-300 font-medium'
                        >
                          {t('登录')}
                        </Link>
                      </Text>
                    </div>
                  </>
                )}
              </div>
            </Card>

            {/* Turnstile */}
            {turnstileEnabled && !sent && (
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

export default ForgotPassword;
