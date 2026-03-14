import React, { useState } from 'react'
import { Button, Card, Form, Input, Typography, Checkbox, message } from 'antd'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from './AuthContext'

/**
 * 登录页：邮箱 + 密码，支持“记住我”
 */
export const LoginPage: React.FC = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

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
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 'calc(100vh - 64px)'
      }}
    >
      <Card title="WiseLearn 登录" style={{ width: 400 }}>
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
            <Input placeholder="yourid@polyu.edu.hk" />
          </Form.Item>
          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item name="remember" valuePropName="checked" initialValue>
            <Checkbox>记住我（7 天内自动登录）</Checkbox>
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
            >
              登录
            </Button>
          </Form.Item>
          <Typography.Text type="secondary">
            还没有账号？<Link to="/register">立即注册</Link>
          </Typography.Text>
        </Form>
      </Card>
    </div>
  )
}

