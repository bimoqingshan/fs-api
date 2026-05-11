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
import { Link, useNavigate } from 'react-router-dom';
import {
  API,
  getLogo,
  showError,
  showSuccess,
  getSystemName,
  setUserData,
  updateAPI,
} from '../../helpers';
import Turnstile from 'react-turnstile';
import { Button, Card, Form, Typography } from '@douyinfe/semi-ui';
import { IconMail, IconUser, IconLock } from '@douyinfe/semi-icons';
import { StatusContext } from '../../context/Status';
import { useTranslation } from 'react-i18next';
import { Activity } from 'lucide-react';
import { useActualTheme } from '../../context/Theme';

const { Text, Title } = Typography;

const Register = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [inputs, setInputs] = useState({
    username: '',
    email: '',
    verification_code: '',
    password: '',
    password2: '',
  });
  const { username, email, verification_code, password, password2 } = inputs;

  const [loading, setLoading] = useState(false);
  const [verificationCodeLoading, setVerificationCodeLoading] = useState(false);
  const [verificationCodeCountDown, setVerificationCodeCountDown] =
    useState(0);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
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
    setShowEmailVerification(!!status?.email_verification);
    if (status?.turnstile_check) {
      setTurnstileEnabled(true);
      setTurnstileSiteKey(status.turnstile_site_key);
    }
    setHasUserAgreement(status?.user_agreement_enabled || false);
    setHasPrivacyPolicy(status?.privacy_policy_enabled || false);
  }, [status]);

  useEffect(() => {
    let id = null;
    if (verificationCodeCountDown > 0) {
      id = setInterval(() => {
        setVerificationCodeCountDown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (id) clearInterval(id);
    };
  }, [verificationCodeCountDown]);

  function handleChange(name, value) {
    setInputs((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    if (!username || !email || !password) {
      showError(t('请填写所有必填项'));
      return;
    }
    if (password.length < 8) {
      showError(t('密码长度不得小于 8 位'));
      return;
    }
    if (password !== password2) {
      showError(t('两次输入的密码不一致'));
      return;
    }
    if ((hasUserAgreement || hasPrivacyPolicy) && !agreedToTerms) {
      showError(t('请先阅读并同意用户协议和隐私政策'));
      return;
    }
    if (showEmailVerification && !verification_code) {
      showError(t('请输入邮箱验证码'));
      return;
    }
    if (turnstileEnabled && turnstileToken === '') {
      showError(t('请稍后几秒重试，Turnstile 正在检查用户环境'));
      return;
    }

    let affCode = localStorage.getItem('aff');

    setLoading(true);
    try {
      const res = await API.post(
        `/api/user/register?turnstile=${turnstileToken}`,
        {
          username,
          email,
          verification_code,
          password,
          aff_code: affCode,
        },
      );
      const { success, message } = res.data;
      if (success) {
        showSuccess(t('注册成功！'));
        navigate('/login');
      } else {
        showError(message);
      }
    } catch (error) {
      showError(t('注册失败，请重试'));
    } finally {
      setLoading(false);
    }
  }

  async function handleSendVerificationCode() {
    if (!email) {
      showError(t('请先输入邮箱地址'));
      return;
    }
    if (turnstileEnabled && turnstileToken === '') {
      showError(t('请稍后几秒重试，Turnstile 正在检查用户环境'));
      return;
    }
    setVerificationCodeLoading(true);
    try {
      const res = await API.get(
        `/api/verification?email=${encodeURIComponent(email)}&turnstile=${turnstileToken}`,
      );
      const { success, message } = res.data;
      if (success) {
        showSuccess(t('验证码发送成功，请检查你的邮箱！'));
        setVerificationCodeCountDown(60);
      } else {
        showError(message);
      }
    } catch (error) {
      showError(t('发送验证码失败，请重试'));
    } finally {
      setVerificationCodeLoading(false);
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
                  {t('注册账号')}
                </Title>
              </div>

              <div className='px-6 py-4'>
                <Form className='space-y-4'>
                  <Form.Input
                    field='username'
                    label={t('用户名')}
                    placeholder={t('请输入用户名')}
                    name='username'
                    value={username}
                    onChange={(value) => handleChange('username', value)}
                    prefix={<IconUser />}
                    className='fs-auth-input'
                  />

                  <Form.Input
                    field='email'
                    label={t('邮箱')}
                    placeholder={t('请输入邮箱地址')}
                    name='email'
                    type='email'
                    value={email}
                    onChange={(value) => handleChange('email', value)}
                    prefix={<IconMail />}
                    className='fs-auth-input'
                  />

                  <Form.Input
                    field='password'
                    label={t('密码')}
                    placeholder={t('请输入密码（至少8位）')}
                    name='password'
                    type='password'
                    value={password}
                    onChange={(value) => handleChange('password', value)}
                    prefix={<IconLock />}
                    className='fs-auth-input'
                  />

                  {showEmailVerification && (
                    <>
                      <div className='relative'>
                        <Form.Input
                          field='verification_code'
                          label={t('邮箱验证码')}
                          placeholder={t('请输入邮箱验证码')}
                          name='verification_code'
                          value={verification_code}
                          onChange={(value) =>
                            handleChange('verification_code', value)
                          }
                          prefix={<IconMail />}
                          className='fs-auth-input'
                        />
                        <Button
                          size='small'
                          className='!rounded-md !absolute right-2 top-[41.5px]'
                          onClick={handleSendVerificationCode}
                          loading={verificationCodeLoading}
                          disabled={
                            verificationCodeLoading ||
                            verificationCodeCountDown > 0
                          }
                        >
                          {verificationCodeCountDown > 0
                            ? `${verificationCodeCountDown}s`
                            : t('获取验证码')}
                        </Button>
                      </div>
                    </>
                  )}

                  <Form.Input
                    field='password2'
                    label={t('确认密码')}
                    placeholder={t('请再次输入密码')}
                    name='password2'
                    type='password'
                    value={password2}
                    onChange={(value) => handleChange('password2', value)}
                    prefix={<IconLock />}
                    className='fs-auth-input'
                  />

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
                      {t('注册')}
                    </Button>
                  </div>
                </Form>

                <div className='mt-6 text-center text-sm'>
                  <Text type='tertiary' className='text-slate-400'>
                    {t('已有账号？')}{' '}
                    <Link
                      to='/login'
                      className='text-blue-400 hover:text-blue-300 font-medium'
                    >
                      {t('登录')}
                    </Link>
                  </Text>
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

export default Register;
