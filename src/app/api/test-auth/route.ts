import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    return NextResponse.json({
      authConfigured: true,
      nextAuthUrl: process.env.NEXTAUTH_URL,
      hasSecret: !!process.env.NEXTAUTH_SECRET
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    
    // 模拟认证
    const { db } = await import('@/lib/db')
    const bcrypt = await import('bcryptjs')
    
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
      userId: user.id
    })

  } catch (error) {
    console.error('测试认证错误:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}