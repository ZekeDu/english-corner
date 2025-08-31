/**
 * Authentication API tests
 */
import { POST as registerHandler } from '@/app/api/auth/register/route'
import { POST as loginHandler } from '@/app/api/auth/login/route'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

describe('Authentication API Tests', () => {
  beforeAll(async () => {
    await db.$connect()
  })

  afterAll(async () => {
    await db.$disconnect()
  })

  afterEach(async () => {
    // 清理测试用户
    await db.user.deleteMany({
      where: { email: { contains: '@test.com' } }
    })
  })

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@test.com',
          password: 'password123',
          nickname: 'Test User'
        })
      })

      const response = await registerHandler(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toHaveProperty('message', 'User created successfully')
      expect(data.user).toHaveProperty('email', 'test@test.com')
      expect(data.user).toHaveProperty('nickname', 'Test User')
    })

    it('should return 409 for duplicate email', async () => {
      // 先创建一个用户
      await db.user.create({
        data: {
          email: 'duplicate@test.com',
          passwordHash: 'hashed_password',
          nickname: 'Existing User'
        }
      })

      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'duplicate@test.com',
          password: 'password123'
        })
      })

      const response = await registerHandler(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data).toHaveProperty('error', 'User already exists')
    })

    it('should return 400 for invalid email format', async () => {
      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'password123'
        })
      })

      const response = await registerHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toHaveProperty('error', 'Invalid input')
    })

    it('should return 400 for short password', async () => {
      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@test.com',
          password: '123'
        })
      })

      const response = await registerHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toHaveProperty('error', 'Invalid input')
    })
  })

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // 创建测试用户
      const passwordHash = await bcrypt.hash('testpassword', 10)
      await db.user.create({
        data: {
          email: 'login@test.com',
          passwordHash,
          nickname: 'Login Test User'
        }
      })
    })

    it('should login with valid credentials', async () => {
      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'login@test.com',
          password: 'testpassword'
        })
      })

      const response = await loginHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('message', 'Login successful')
      expect(data.user).toHaveProperty('email', 'login@test.com')
    })

    it('should return 401 for invalid password', async () => {
      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'login@test.com',
          password: 'wrongpassword'
        })
      })

      const response = await loginHandler(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toHaveProperty('error', 'Invalid credentials')
    })

    it('should return 401 for non-existent user', async () => {
      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@test.com',
          password: 'password123'
        })
      })

      const response = await loginHandler(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toHaveProperty('error', 'Invalid credentials')
    })
  })

  describe('Password Hashing', () => {
    it('should hash passwords correctly', async () => {
      const password = 'testpassword'
      const hash = await bcrypt.hash(password, 10)
      
      expect(hash).not.toBe(password)
      expect(hash.length).toBeGreaterThan(50)
      expect(await bcrypt.compare(password, hash)).toBe(true)
    })

    it('should not match wrong password', async () => {
      const password = 'testpassword'
      const wrongPassword = 'wrongpassword'
      const hash = await bcrypt.hash(password, 10)
      
      expect(await bcrypt.compare(wrongPassword, hash)).toBe(false)
    })
  })
})