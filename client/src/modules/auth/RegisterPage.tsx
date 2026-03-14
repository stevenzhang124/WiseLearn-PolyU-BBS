import React, { useState, useEffect } from 'react'
import { Button, Card, Form, Input, Typography, message } from 'antd'
import { Link, useNavigate } from 'react-router-dom'
import { registerApi } from '../shared/api'
import { useAuth } from './AuthContext'

const POLYU_RED = '#C8102E'

/**
 * 注册页：独立全屏，理工红主题
 */
export const RegisterPage: React.FC = () => {
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
      message.success('注册成功，请登录')
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
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(160deg, #f8f4f4 0%, #eee 50%, #f5f0f0 100%)',
        padding: 24
      }}
    >
      <Card
        title="WiseLearn 注册"
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
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码长度至少 6 位' }
            ]}
          >
            <Input.Password size="large" />
          </Form.Item>
          <Form.Item
            label="昵称"
            name="nickname"
            rules={[
              { required: true, message: '请输入昵称' },
              {
                pattern: /^[\u4e00-\u9fa5A-Za-z0-9]{2,20}$/,
                message: '2-20 位中英文或数字，禁止特殊符号'
              }
            ]}
          >
            <Input placeholder="你的昵称" size="large" />
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
              注册
            </Button>
          </Form.Item>
          <Typography.Text type="secondary">
            已有账号？<Link to="/login" style={{ color: POLYU_RED }}>返回登录</Link>
          </Typography.Text>
        </Form>
      </Card>
    </div>
  )
}
