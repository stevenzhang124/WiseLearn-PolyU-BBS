import nodemailer from 'nodemailer'

/**
 * 发送注册验证码邮件
 * 若未配置 SMTP，则在控制台打印验证码（开发用）
 */
export async function sendVerificationEmail(
  to: string,
  code: string
): Promise<void> {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT) || 587
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from = process.env.MAIL_FROM || user || 'noreply@wiselearn.polyu.edu.hk'

  const subject = 'WiseLearn 注册验证码 / Registration Verification Code'
  const text = `您的验证码是：${code}\n有效期 10 分钟。\n\nYour verification code is: ${code}\nValid for 10 minutes.`
  const html = `
    <p>您的验证码是：<strong>${code}</strong></p>
    <p>有效期 10 分钟，请勿泄露。</p>
    <hr/>
    <p>Your verification code is: <strong>${code}</strong></p>
    <p>Valid for 10 minutes. Do not share.</p>
  `

  if (!host || !user || !pass) {
    // eslint-disable-next-line no-console
    console.log('[WiseLearn] No SMTP configured. Verification code for', to, ':', code)
    return
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  })

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html
  })
}

/**
 * 发送找回密码验证码邮件
 * 未配置 SMTP 时在控制台打印验证码（开发用）
 */
export async function sendPasswordResetEmail(to: string, code: string): Promise<void> {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT) || 587
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from = process.env.MAIL_FROM || user || 'noreply@wiselearn.polyu.edu.hk'

  const subject = 'WiseLearn 找回密码验证码 / Password Reset Code'
  const text = `您的找回密码验证码是：${code}\n有效期 10 分钟。\n\nYour password reset code is: ${code}\nValid for 10 minutes.`
  const html = `
    <p>您的找回密码验证码是：<strong>${code}</strong></p>
    <p>有效期 10 分钟，请勿泄露。</p>
    <hr/>
    <p>Your password reset code is: <strong>${code}</strong></p>
    <p>Valid for 10 minutes. Do not share.</p>
  `

  if (!host || !user || !pass) {
    // eslint-disable-next-line no-console
    console.log('[WiseLearn] No SMTP configured. Password reset code for', to, ':', code)
    return
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  })

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html
  })
}
