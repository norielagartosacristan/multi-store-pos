
import type { Request, Response, NextFunction } from 'express'
import prisma from '../lib/prisma.js'

type UserRole =
  | 'OWNER'
  | 'COMPANY_ADMIN'
  | 'STORE_MANAGER'
  | 'CASHIER'
  | 'INVENTORY_STAFF'
  | 'LAUNDRY_STAFF'

type AuthenticatedUser = {
  id: string
  companyId: string
  name: string
  email: string
  role: UserRole
  isActive: boolean
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (_req: Request, res: Response, next: NextFunction) => {
    const user = res.locals.authenticatedUser as
      | AuthenticatedUser
      | undefined

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      })
      return
    }

    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action.',
      })
      return
    }

    next()
  }
}

export async function requireStoreAccess(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = res.locals.authenticatedUser as
      | AuthenticatedUser
      | undefined

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      })
      return
    }

    const storeId = req.params.storeId

if (typeof storeId !== 'string' || !storeId.trim()) {
  res.status(400).json({
    success: false,
    message: 'A valid store ID is required.',
  })
  return
}

    const store = await prisma.store.findFirst({
      where: {
        id: storeId,
        companyId: user.companyId,
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        companyId: true,
      },
    })

    if (!store) {
      res.status(404).json({
        success: false,
        message: 'Store not found.',
      })
      return
    }

    if (user.role !== 'OWNER' && user.role !== 'COMPANY_ADMIN') {
      const access = await prisma.userStoreAccess.findUnique({
        where: {
          userId_storeId: {
            userId: user.id,
            storeId: store.id,
          },
        },
      })

      if (!access) {
        res.status(403).json({
          success: false,
          message: 'You do not have access to this store.',
        })
        return
      }
    }

    res.locals.authorizedStore = store
    next()
  } catch (error) {
    next(error)
  }
}
