import React, { useState, useEffect } from 'react'
import { Button, Card, Form, Input, Typography, Checkbox, message } from 'antd'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from './AuthContext'

/** 理工红主色 */
const POLYU_RED = '#C8102E'

/**
 * 登录页：独立全屏，不显示侧栏/顶栏；理工红主题
 */
export const LoginPage: React.FC = () => {
  const { t, i18n } = useTranslation()
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  const onFinish = async (values: {
    email: string
    password: string
    remember: boolean
  }): Promise<void> => {
    setLoading(true)
    try {
      await login(values.email, values.password, values.remember)
      message.success(t('auth.loginSuccess'))
      navigate('/')
    } catch (err) {
      message.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="wiselearn-auth-page"
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
      </div>
      <Card
        title={t('auth.loginTitle')}
        className="wiselearn-auth-card"
        style={{
          width: 400,
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
        <Form onFinish={onFinish} layout="vertical">
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
            label={t('auth.password')}
            name="password"
            rules={[{ required: true, message: t('auth.passwordRequired') }]}
          >
            <Input.Password size="large" />
          </Form.Item>
          <Form.Item name="remember" valuePropName="checked" initialValue>
            <Checkbox>{t('auth.remember')}</Checkbox>
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
              {t('auth.login')}
            </Button>
          </Form.Item>
          <Typography.Text type="secondary">
            {t('auth.noAccount')}<Link to="/register" style={{ color: POLYU_RED }}>{t('auth.goRegister')}</Link>
          </Typography.Text>
        </Form>
      </Card>
    </div>
  )
}
