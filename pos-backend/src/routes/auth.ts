
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.post('/login', async (req, res, next) => {
  try {
    const email =
      typeof req.body?.email === 'string'
        ? req.body.email.trim().toLowerCase()
        : ''

    const password =
      typeof req.body?.password === 'string'
        ? req.body.password
        : ''

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      })
      return
    }

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (
      !user ||
      !user.isActive ||
      !(await bcrypt.compare(password, user.passwordHash))
    ) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      })
      return
    }

    req.session.regenerate((sessionError) => {
      if (sessionError) {
        next(sessionError)
        return
      }

      req.session.userId = user.id

      req.session.save((saveError) => {
        if (saveError) {
          next(saveError)
          return
        }

        res.json({
          success: true,
          message: 'Login successful.',
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            companyId: user.companyId,
          },
        })
      })
    })
  } catch (error) {
    next(error)
  }
})

router.get('/me', requireAuth, async (_req, res) => {
  const user = res.locals.authenticatedUser

  res.json({
    success: true,
    user,
  })
})

router.post('/logout', (req, res, next) => {
  req.session.destroy((error) => {
    if (error) {
      next(error)
      return
    }

    res.clearCookie('pos.sid', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    })

    res.json({
      success: true,
      message: 'Logout successful.',
    })
  })
})

export default router
