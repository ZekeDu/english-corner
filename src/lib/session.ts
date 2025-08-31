import { auth } from '../../auth'
import { db } from './db'

export async function getCurrentUser() {
  const session = await auth()
  
  if (!session?.user?.email) {
    return null
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      nickname: true,
      apiKeyEncrypted: true,
      createdAt: true,
      updatedAt: true
    }
  })

  return user
}

export async function requireAuth() {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error('Unauthorized')
  }

  return user
}