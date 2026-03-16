import React, { useState, useEffect } from 'react'
import { Button, Card, Form, Input, Typography, message } from 'antd'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { registerApi } from '../shared/api'
import { useAuth } from './AuthContext'

const POLYU_RED = '#C8102E'

/**
 * 注册页：独立全屏，理工红主题
 */
export const RegisterPage: React.FC = () => {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  const onFinish = async (values: {
    email: string
    password: string
    nickname: string
  }): Promise<void> => {
    setLoading(true)
    try {
      await registerApi(values)
      message.success(t('auth.registerSuccess'))
      navigate('/login')
    } catch (err) {
      message.error((err as Error).message)
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
        title={t('auth.registerTitle')}
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
            <Input placeholder={t('auth.nicknamePlaceholder')} size="large" />
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
