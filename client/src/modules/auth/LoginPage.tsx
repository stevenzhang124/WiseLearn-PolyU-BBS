import React, { useState, useEffect } from 'react'
import { App, Button, Card, Form, Input, Typography, Checkbox, Modal } from 'antd'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from './AuthContext'
import { getNavigateAfterAuth } from './returnPathAfterAuth'
import { sendResetCodeApi, resetPasswordApi, updateUserLanguageApi } from '../shared/api'

/** 理工红主色 */
const POLYU_RED = '#C8102E'

/**
 * 登录页：独立全屏，不显示侧栏/顶栏；理工红主题；含忘记密码（邮箱 6 位验证码重置）
 */
export const LoginPage: React.FC = () => {
  const { message } = App.useApp()
  const { t, i18n } = useTranslation()
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [resetStep, setResetStep] = useState<1 | 2>(1)
  const [resetEmail, setResetEmail] = useState('')
  const [resetCodeCooldown, setResetCodeCooldown] = useState(0)
  const [resetForm] = Form.useForm()
  const [sendingCode, setSendingCode] = useState(false)
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    if (!user) return
    const { to, state } = getNavigateAfterAuth(location)
    navigate(to, { replace: true, ...(state ? { state } : {}) })
  }, [user, navigate, location])

  useEffect(() => {
    if (!resetModalOpen || resetCodeCooldown <= 0) return
    const timer = setInterval(() => {
      setResetCodeCooldown((s) => (s <= 1 ? 0 : s - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [resetModalOpen, resetCodeCooldown])

  const onFinish = async (values: {
    email: string
    password: string
    remember: boolean
  }): Promise<void> => {
    setLoading(true)
    try {
      await login(values.email, values.password, values.remember)
      const lng = i18n.language === 'en' ? 'en' : 'zh'
      void updateUserLanguageApi(lng).catch(() => {
        // ignore: language persistence is best-effort
      })
      message.success(t('auth.loginSuccess'))
    } catch (err) {
      message.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const openResetModal = () => {
    setResetStep(1)
    setResetEmail('')
    setResetCodeCooldown(0)
    resetForm.resetFields()
    setResetModalOpen(true)
  }

  const sendResetCode = async () => {
    const email = resetForm.getFieldValue('resetEmail')?.trim?.()
    if (!email || !/^[a-zA-Z0-9._%+-]+@(polyu\.edu\.hk|connect\.polyu\.hk)$/.test(email)) {
      message.warning(t('auth.emailInvalid'))
      return
    }
    setSendingCode(true)
    try {
      await sendResetCodeApi(email)
      setResetEmail(email)
      setResetStep(2)
      setResetCodeCooldown(60)
      message.success(t('auth.codeSent'))
      resetForm.setFieldsValue({ resetCode: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      const msg = (err as Error).message
      if (msg.includes('秒后再获取')) {
        const sec = parseInt(msg.replace(/\D/g, ''), 10) || 60
        setResetCodeCooldown(sec)
      }
      message.error(msg)
    } finally {
      setSendingCode(false)
    }
  }

  const onResetPassword = async () => {
    const code = resetForm.getFieldValue('resetCode')
    const newPassword = resetForm.getFieldValue('newPassword')
    const confirmPassword = resetForm.getFieldValue('confirmPassword')
    if (!code || String(code).trim().length !== 6) {
      message.warning(t('auth.codeLength'))
      return
    }
    if (newPassword?.length < 6) {
      message.warning(t('auth.passwordMin'))
      return
    }
    if (newPassword !== confirmPassword) {
      message.warning(t('auth.passwordMismatch'))
      return
    }
    setResetting(true)
    try {
      await resetPasswordApi({
        email: resetEmail,
        code: String(code).trim(),
        password: newPassword
      })
      message.success(t('auth.resetSuccess'))
      setResetModalOpen(false)
    } catch (err) {
      message.error((err as Error).message)
    } finally {
      setResetting(false)
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
        padding: 24,
        position: 'relative'
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
        title={t('auth.loginTitle')}
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
          <Form.Item style={{ marginBottom: 8 }}>
            <Typography.Link
              onClick={openResetModal}
              style={{ color: POLYU_RED, fontSize: 13 }}
            >
              {t('auth.forgetPassword')}
            </Typography.Link>
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
            {t('auth.noAccount')}
            <Link to="/register" state={location.state} style={{ color: POLYU_RED }}>
              {t('auth.goRegister')}
            </Link>
          </Typography.Text>
        </Form>
      </Card>

      <Typography.Text
        type="secondary"
        style={{ marginTop: 24, fontSize: 12, color: 'rgba(0,0,0,0.4)', textAlign: 'center' }}
      >
        The Hong Kong Polytechnic University. 2026
      </Typography.Text>

      <Modal
        title={t('auth.resetPasswordTitle')}
        open={resetModalOpen}
        onCancel={() => setResetModalOpen(false)}
        footer={null}
        destroyOnHidden
        width={400}
      >
        <Form form={resetForm} layout="vertical">
          {resetStep === 1 ? (
            <>
              <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                {t('auth.resetStep1')}
              </Typography.Text>
              <Form.Item
                name="resetEmail"
                label={t('auth.email')}
                rules={[
                  { required: true, message: t('auth.emailRequired') },
                  {
                    pattern: /^[a-zA-Z0-9._%+-]+@(polyu\.edu\.hk|connect\.polyu\.hk)$/,
                    message: t('auth.emailInvalid')
                  }
                ]}
              >
                <Input placeholder={t('auth.emailPlaceholder')} size="large" />
              </Form.Item>
              <Button
                type="primary"
                block
                size="large"
                loading={sendingCode}
                disabled={resetCodeCooldown > 0}
                onClick={sendResetCode}
                style={{ background: POLYU_RED, borderColor: POLYU_RED }}
              >
                {resetCodeCooldown > 0
                  ? t('auth.codeCooldown', { sec: resetCodeCooldown })
                  : t('auth.sendResetCode')}
              </Button>
            </>
          ) : (
            <>
              <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                {t('auth.resetStep2')}
              </Typography.Text>
              <Form.Item label={t('auth.email')}>
                <Input value={resetEmail} disabled size="large" />
              </Form.Item>
              <Form.Item
                name="resetCode"
                label={t('auth.verificationCode')}
                rules={[
                  { required: true, message: t('auth.codeRequired') },
                  { len: 6, message: t('auth.codeLength') }
                ]}
              >
                <Input placeholder={t('auth.codePlaceholder')} maxLength={6} size="large" />
              </Form.Item>
              <Form.Item
                name="newPassword"
                label={t('auth.newPassword')}
                rules={[
                  { required: true, message: t('auth.passwordRequired') },
                  { min: 6, message: t('auth.passwordMin') }
                ]}
              >
                <Input.Password size="large" />
              </Form.Item>
              <Form.Item
                name="confirmPassword"
                label={t('auth.confirmPassword')}
                rules={[
                  { required: true, message: t('auth.passwordRequired') },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) return Promise.resolve()
                      return Promise.reject(new Error(t('auth.passwordMismatch')))
                    }
                  })
                ]}
              >
                <Input.Password size="large" />
              </Form.Item>
              <Button
                type="primary"
                block
                size="large"
                loading={resetting}
                onClick={onResetPassword}
                style={{ background: POLYU_RED, borderColor: POLYU_RED }}
              >
                {t('auth.resetSubmit')}
              </Button>
            </>
          )}
        </Form>
      </Modal>
    </div>
  )
}
