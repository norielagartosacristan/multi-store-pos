
import type { Request, Response, NextFunction } from 'express'
import prisma from '../lib/prisma.js'

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.session.userId

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Please log in first.',
      })
      return
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        companyId: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    })

    if (!user || !user.isActive) {
      req.session.destroy(() => {})
      res.status(401).json({
        success: false,
        message: 'Your session is invalid or your account is inactive.',
      })
      return
    }

    res.locals.authenticatedUser = user
    next()
  } catch (error) {
    next(error)
  }
}
