import React, { useState } from 'react'
import { Button, Card, Form, Input, Typography, message } from 'antd'
import { Link, useNavigate } from 'react-router-dom'
import { registerApi } from '../shared/api'

/**
 * 注册页：限制 PolyU 邮箱 + 昵称规则校验
 */
export const RegisterPage: React.FC = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

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
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 'calc(100vh - 64px)'
      }}
    >
      <Card title="WiseLearn 注册" style={{ width: 400 }}>
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
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码长度至少 6 位' }
            ]}
          >
            <Input.Password />
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
            <Input placeholder="你的昵称" />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
            >
              注册
            </Button>
          </Form.Item>
          <Typography.Text type="secondary">
            已有账号？<Link to="/login">返回登录</Link>
          </Typography.Text>
        </Form>
      </Card>
    </div>
  )
}

