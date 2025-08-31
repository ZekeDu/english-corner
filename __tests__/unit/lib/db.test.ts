/**
 * Database connection and model tests
 */
import { db } from '@/lib/db'

describe('Database Tests', () => {
  beforeAll(async () => {
    await db.$connect()
  })

  afterAll(async () => {
    await db.$disconnect()
  })

  describe('Environment Variables', () => {
    it('should have required environment variables', () => {
      const requiredVars = ['DATABASE_URL']
      const missingVars = requiredVars.filter(varName => !process.env[varName])
      expect(missingVars).toHaveLength(0)
    })
  })

  describe('Database Connection', () => {
    it('should connect to database successfully', async () => {
      await expect(db.$connect()).resolves.not.toThrow()
    })
  })

  describe('User Model', () => {
    let testUser: any

    afterEach(async () => {
      if (testUser) {
        await db.user.delete({ where: { id: testUser.id } }).catch(() => {})
      }
    })

    it('should create a user', async () => {
      testUser = await db.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hashed_password_123',
          nickname: 'Test User'
        }
      })

      expect(testUser).toHaveProperty('id')
      expect(testUser.email).toBe('test@example.com')
    })

    it('should read a user', async () => {
      testUser = await db.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hashed_password_123',
          nickname: 'Test User'
        }
      })

      const foundUser = await db.user.findUnique({
        where: { id: testUser.id }
      })

      expect(foundUser).not.toBeNull()
      expect(foundUser?.email).toBe('test@example.com')
    })

    it('should update a user', async () => {
      testUser = await db.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hashed_password_123',
          nickname: 'Test User'
        }
      })

      const updatedUser = await db.user.update({
        where: { id: testUser.id },
        data: { nickname: 'Updated Test User' }
      })

      expect(updatedUser.nickname).toBe('Updated Test User')
    })

    it('should delete a user', async () => {
      testUser = await db.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hashed_password_123',
          nickname: 'Test User'
        }
      })

      await db.user.delete({ where: { id: testUser.id } })

      const foundUser = await db.user.findUnique({
        where: { id: testUser.id }
      })

      expect(foundUser).toBeNull()
    })
  })

  describe('Conversation Model', () => {
    let testUser: any
    let testConversation: any

    beforeEach(async () => {
      testUser = await db.user.create({
        data: {
          email: 'conv-test@example.com',
          passwordHash: 'hashed_password_456',
          nickname: 'Conversation Test User'
        }
      })
    })

    afterEach(async () => {
      if (testConversation) {
        await db.conversation.delete({ where: { id: testConversation.id } }).catch(() => {})
      }
      if (testUser) {
        await db.user.delete({ where: { id: testUser.id } }).catch(() => {})
      }
    })

    it('should create a conversation with relation', async () => {
      testConversation = await db.conversation.create({
        data: {
          userId: testUser.id,
          title: 'Test Conversation',
          messages: [
            { role: 'user', content: 'Hello, how are you?' },
            { role: 'assistant', content: 'I am doing well, thank you!' }
          ]
        }
      })

      expect(testConversation).toHaveProperty('id')
      expect(testConversation.userId).toBe(testUser.id)
    })

    it('should load conversation with user relation', async () => {
      testConversation = await db.conversation.create({
        data: {
          userId: testUser.id,
          title: 'Test Conversation',
          messages: [{ role: 'user', content: 'Hello' }]
        }
      })

      const conversationWithUser = await db.conversation.findFirst({
        where: { id: testConversation.id },
        include: { user: true }
      })

      expect(conversationWithUser).not.toBeNull()
      expect(conversationWithUser?.user.email).toBe('conv-test@example.com')
    })
  })

  describe('Invite Model', () => {
    let testUser: any
    let testInvite: any

    beforeEach(async () => {
      testUser = await db.user.create({
        data: {
          email: 'invite-test@example.com',
          passwordHash: 'hashed_password_789'
        }
      })
    })

    afterEach(async () => {
      if (testInvite) {
        await db.invite.delete({ where: { id: testInvite.id } }).catch(() => {})
      }
      if (testUser) {
        await db.user.delete({ where: { id: testUser.id } }).catch(() => {})
      }
    })

    it('should create an invite', async () => {
      testInvite = await db.invite.create({
        data: {
          inviterId: testUser.id,
          inviteCode: 'TEST_INVITE_123',
          invitedEmail: 'newuser@example.com'
        }
      })

      expect(testInvite).toHaveProperty('id')
      expect(testInvite.inviteCode).toBe('TEST_INVITE_123')
    })

    it('should enforce unique invite code constraint', async () => {
      testInvite = await db.invite.create({
        data: {
          inviterId: testUser.id,
          inviteCode: 'TEST_INVITE_123',
          invitedEmail: 'newuser@example.com'
        }
      })

      await expect(
        db.invite.create({
          data: {
            inviterId: testUser.id,
            inviteCode: 'TEST_INVITE_123',
            invitedEmail: 'another@example.com'
          }
        })
      ).rejects.toThrow()
    })
  })
})