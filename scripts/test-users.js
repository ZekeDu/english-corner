import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function seedTestUsers() {
  console.log('🌱 Seeding test users...')

  const testUsers = [
    {
      email: 'admin@test.com',
      password: 'admin123',
      nickname: '系统管理员'
    },
    {
      email: 'alice@test.com',
      password: 'alice123',
      nickname: 'Alice'
    },
    {
      email: 'bob@test.com',
      password: 'bob123',
      nickname: 'Bob'
    },
    {
      email: 'charlie@test.com',
      password: 'charlie123',
      nickname: 'Charlie'
    }
  ]

  for (const userData of testUsers) {
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email }
    })

    if (!existingUser) {
      const passwordHash = await bcrypt.hash(userData.password, 10)
      
      await prisma.user.create({
        data: {
          email: userData.email,
          passwordHash,
          nickname: userData.nickname
        }
      })

      console.log(`✅ Created user: ${userData.email} (${userData.nickname})`)
    } else {
      console.log(`⚠️ User already exists: ${userData.email}`)
    }
  }

  console.log('🎉 Test users seeded successfully!')
}

async function cleanupTestUsers() {
  console.log('🧹 Cleaning up test users...')
  
  const result = await prisma.user.deleteMany({
    where: { email: { contains: '@test.com' } }
  })

  console.log(`🗑️ Deleted ${result.count} test users`)
}

// CLI支持
if (process.argv[2] === 'seed') {
  seedTestUsers()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
}

if (process.argv[2] === 'cleanup') {
  cleanupTestUsers()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
}

export { seedTestUsers, cleanupTestUsers }