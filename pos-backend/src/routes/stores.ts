
import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.get('/', requireAuth, async (_req, res, next) => {
  try {
    const user = res.locals.authenticatedUser as {
      id: string
      companyId: string
      role: string
    }

    const canViewAllStores =
      user.role === 'OWNER' || user.role === 'COMPANY_ADMIN'

    const stores = await prisma.store.findMany({
      where: {
        companyId: user.companyId,
        isActive: true,
        ...(canViewAllStores
          ? {}
          : {
              userAccess: {
                some: {
                  userId: user.id,
                },
              },
            }),
      },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        address: true,
      },
      orderBy: {
        code: 'asc',
      },
    })

    res.json({
      success: true,
      stores,
    })
  } catch (error) {
    next(error)
  }
})

export default router
