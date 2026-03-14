import React, { useState, useEffect } from 'react'
import { Button, Card, Form, Input, Typography, Checkbox, message } from 'antd'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from './AuthContext'

/** 理工红主色 */
const POLYU_RED = '#C8102E'

/**
 * 登录页：独立全屏，不显示侧栏/顶栏；理工红主题
 */
export const LoginPage: React.FC = () => {
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
      message.success('登录成功')
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
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(160deg, #f8f4f4 0%, #eee 50%, #f5f0f0 100%)',
        padding: 24
      }}
    >
      <Card
        title="WiseLearn 登录"
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
            label="PolyU 邮箱"
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              {
                pattern:
                  /^[a-zA-Z0-9._%+-]+@(polyu\.edu\.hk|connect\.polyu\.hk)$/,
                message: '仅支持 polyu.edu.hk / connect.polyu.hk 邮箱'
              }
            ]}
          >
            <Input placeholder="yourid@polyu.edu.hk" size="large" />
          </Form.Item>
          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password size="large" />
          </Form.Item>
          <Form.Item name="remember" valuePropName="checked" initialValue>
            <Checkbox>记住我（7 天内自动登录）</Checkbox>
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
              登录
            </Button>
          </Form.Item>
          <Typography.Text type="secondary">
            还没有账号？<Link to="/register" style={{ color: POLYU_RED }}>立即注册</Link>
          </Typography.Text>
        </Form>
      </Card>
    </div>
  )
}
