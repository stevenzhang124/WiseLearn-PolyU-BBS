import React, { useState, useEffect } from 'react'
import { App, Button, Card, Form, Input, Space, Typography } from 'antd'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { registerApi, sendVerificationCodeApi } from '../shared/api'
import { useAuth } from './AuthContext'

const POLYU_RED = '#C8102E'
const CODE_COOLDOWN_SEC = 60

/**
 * 注册页：邮箱验证码 + 理工红主题
 */
export const RegisterPage: React.FC = () => {
  const { message } = App.useApp()
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [codeLoading, setCodeLoading] = useState(false)
  const [codeCooldown, setCodeCooldown] = useState(0)
  const [form] = Form.useForm()

  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  useEffect(() => {
    if (codeCooldown <= 0) return
    const timer = setInterval(() => setCodeCooldown((c) => c - 1), 1000)
    return () => clearInterval(timer)
  }, [codeCooldown])

  const onSendCode = async () => {
    try {
      await form.validateFields(['email'])
    } catch {
      return
    }
    const email = form.getFieldValue('email')?.trim()
    if (!email) return
    setCodeLoading(true)
    try {
      await sendVerificationCodeApi(email)
      message.success(t('auth.codeSent'))
      setCodeCooldown(CODE_COOLDOWN_SEC)
    } catch (err) {
      message.error((err as Error).message)
    } finally {
      setCodeLoading(false)
    }
  }

  const onFinish = async (values: {
    email: string
    password: string
    nickname: string
    code: string
  }): Promise<void> => {
    setLoading(true)
    try {
      await registerApi({
        email: values.email.trim(),
        password: values.password,
        nickname: values.nickname,
        code: values.code.trim()
      })
      message.success(t('auth.registerSuccess'))
      navigate('/login')
    } catch (err) {
      const msg = (err as Error).message
      message.error(
        msg.includes('昵称') && msg.includes('已被使用')
          ? t('auth.nicknameTaken')
          : msg
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(160deg, #f8f4f4 0%, #eee 50%, #f5f0f0 100%)',
        padding: 24
      }}
    >
      <div style={{ position: 'absolute', top: 24, right: 24, display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={() => { i18n.changeLanguage('en'); localStorage.setItem('wiselearn_lang', 'en') }}
          style={{
            border: 'none',
            background: i18n.language === 'en' ? POLYU_RED : 'transparent',
            color: i18n.language === 'en' ? '#fff' : 'rgba(0,0,0,0.65)',
            padding: '6px 12px',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 14
          }}
        >
          {t('lang.en')}
        </button>
        <button
          type="button"
          onClick={() => { i18n.changeLanguage('zh'); localStorage.setItem('wiselearn_lang', 'zh') }}
          style={{
            border: 'none',
            background: i18n.language === 'zh' ? POLYU_RED : 'transparent',
            color: i18n.language === 'zh' ? '#fff' : 'rgba(0,0,0,0.65)',
            padding: '6px 12px',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 14
          }}
        >
          {t('lang.zh')}
        </button>
      </div>
      <Card
        title={t('auth.registerTitle')}
        className="wiselearn-auth-card"
        style={{
          width: '100%',
          maxWidth: 400,
          borderRadius: 16,
          boxShadow: '0 8px 24px rgba(200, 16, 46, 0.12)',
          border: '1px solid rgba(200, 16, 46, 0.2)'
        }}
        styles={{
          header: {
            background: POLYU_RED,
            color: '#fff',
            borderRadius: '16px 16px 0 0',
            borderBottom: 'none',
            padding: '16px 24px',
            fontSize: 18,
            fontWeight: 600
          }
        }}
      >
        <Form form={form} onFinish={onFinish} layout="vertical">
          <Form.Item
            label={t('auth.email')}
            name="email"
            rules={[
              { required: true, message: t('auth.emailRequired') },
              {
                pattern:
                  /^[a-zA-Z0-9._%+-]+@(polyu\.edu\.hk|connect\.polyu\.hk)$/,
                message: t('auth.emailInvalid')
              }
            ]}
          >
            <Input placeholder={t('auth.emailPlaceholder')} size="large" />
          </Form.Item>
          <Form.Item
            label={t('auth.verificationCode')}
            name="code"
            rules={[
              { required: true, message: t('auth.codeRequired') },
              { pattern: /^[0-9]{6}$/, message: t('auth.codeLength') }
            ]}
          >
            <Space.Compact style={{ width: '100%' }}>
              <Input
                placeholder={t('auth.codePlaceholder')}
                size="large"
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
                style={{ flex: 1 }}
              />
              <Button
                type="primary"
                size="large"
                onClick={onSendCode}
                loading={codeLoading}
                disabled={codeCooldown > 0}
                style={{
                  background: POLYU_RED,
                  borderColor: POLYU_RED,
                  minWidth: 120
                }}
              >
                {codeCooldown > 0
                  ? t('auth.codeCooldown', { sec: codeCooldown })
                  : t('auth.getCode')}
              </Button>
            </Space.Compact>
          </Form.Item>
          <Form.Item
            label={t('auth.password')}
            name="password"
            rules={[
              { required: true, message: t('auth.passwordRequired') },
              { min: 6, message: t('auth.passwordMin') }
            ]}
          >
            <Input.Password size="large" />
          </Form.Item>
          <Form.Item
            label={t('auth.nickname')}
            name="nickname"
            rules={[
              { required: true, message: t('auth.nicknameRequired') },
              {
                pattern: /^[\u4e00-\u9fa5A-Za-z0-9]{2,20}$/,
                message: t('auth.nicknameInvalid')
              }
            ]}
          >
            <Input placeholder={t('auth.nicknamePlaceholder')} size="large" maxLength={20} showCount />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={loading}
              style={{
                background: POLYU_RED,
                borderColor: POLYU_RED,
                height: 44
              }}
            >
              {t('auth.register')}
            </Button>
          </Form.Item>
          <Typography.Text type="secondary">
            {t('auth.hasAccount')}<Link to="/login" style={{ color: POLYU_RED }}>{t('auth.goLogin')}</Link>
          </Typography.Text>
        </Form>
      </Card>
    </div>
  )
}
