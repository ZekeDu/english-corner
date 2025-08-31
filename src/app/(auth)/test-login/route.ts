import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    
    const user = await db.user.findUnique({
      where: { email }
    })

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: '用户不存在' }, { status: 401 })
    }

    const isValid = await bcrypt.compare(password, user.passwordHash)
    
    return NextResponse.json({
      email: user.email,
      isValid,
      message: isValid ? '验证成功' : '密码错误'
    })

  } catch (error) {
    console.error('测试登录错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}