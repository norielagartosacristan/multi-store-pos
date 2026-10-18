
import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import {
  requireRole,
  requireStoreAccess,
} from '../middleware/authorization.js'
import crypto from 'node:crypto'

const router = Router()

const PRODUCT_MANAGEMENT_ROLES = [
  'OWNER',
  'COMPANY_ADMIN',
  'STORE_MANAGER',
  'INVENTORY_STAFF',
] as const

function optionalText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

function validNonNegativeNumber(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0
  )
}

function generateSku(storeCode: string): string {
  const prefix = storeCode
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 12) || 'PROD'

  const suffix = crypto.randomUUID()
    .replace(/-/g, '')
    .slice(0, 8)
    .toUpperCase()

  return `${prefix}-${suffix}`
}

// GET /api/stores/:storeId/products
router.get(
  '/:storeId/products',
  requireAuth,
  requireStoreAccess,
  async (req, res, next) => {
    try {
      const storeId = req.params.storeId

if (typeof storeId !== 'string' || !storeId.trim()) {
  res.status(400).json({
    success: false,
    message: 'A valid store ID is required.',
  })
  return
}
      const user = res.locals.authenticatedUser as {
        companyId: string
      }

      const products = await prisma.product.findMany({
        where: {
          companyId: user.companyId,
          isActive: true,
          storeProducts: {
            some: { storeId },
          },
        },
        select: {
          id: true,
          name: true,
          sku: true,
          barcode: true,
          category: true,
          description: true,
          unit: true,
          storeProducts: {
            where: { storeId },
            select: {
              id: true,
              costPrice: true,
              retailPrice: true,
              wholesalePrice: true,
              stockQuantity: true,
              lowStockThreshold: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      })

      res.json({
        success: true,
        products,
      })
    } catch (error) {
      next(error)
    }
  },
)

// GET /api/stores/:storeId/products/search?q=milo
router.get(
  '/:storeId/products/search',
  requireAuth,
  requireStoreAccess,
  async (req, res, next) => {
    try {
      const storeId = req.params.storeId
      const query =
        typeof req.query.q === 'string'
          ? req.query.q.trim()
          : ''

      if (
        typeof storeId !== 'string' ||
        !storeId.trim() ||
        query.length < 2 ||
        query.length > 100
      ) {
        res.status(400).json({
          success: false,
          message: 'Maglagay ng product name na 2 hanggang 100 characters.',
        })
        return
      }

      const response = await fetch(
        'https://world.openfoodfacts.net/cgi/search.pl?' +
          new URLSearchParams({
            search_terms: query,
            search_simple: '1',
            action: 'process',
            json: '1',
            page_size: '10',
            fields:
              'code,product_name,brands,categories,image_front_url,image_url',
          }).toString(),
        {
         headers: {
            'User-Agent': 'MultiStorePOS/1.0 (product catalog search)',
            Authorization:
                'Basic ' + Buffer.from('off:off').toString('base64'),
            },
          signal: AbortSignal.timeout(10000),
        },
      )

      if (!response.ok) {
        res.status(502).json({
          success: false,
          message: 'Pansamantalang hindi available ang online product catalog.',
        })
        return
      }

      const result = (await response.json()) as {
        products?: Array<{
          code?: string
          product_name?: string
          brands?: string
          categories?: string
          image_front_url?: string
          image_url?: string
        }>
      }

      const products = (result.products ?? [])
        .filter((item) => item.product_name?.trim())
        .map((item) => ({
          barcode: item.code ?? '',
          name: item.product_name?.trim() ?? '',
          brand: item.brands?.trim() ?? '',
          category: item.categories?.split(',').pop()?.trim() ?? '',
          imageUrl: item.image_front_url || item.image_url || '',
        }))

      res.json({
        success: true,
        source: 'open_food_facts',
        products,
        message: products.length
          ? 'May nahanap na produkto.'
          : 'Walang nahanap na produkto sa online catalog.',
      })
    } catch (error) {
      next(error)
    }
  },
)

/**
 * GET /api/stores/:storeId/products/barcode/:barcode
 *
 * Checks the company's local product database first.
 * If not found, attempts an Open Food Facts lookup.
 */
router.get(
  '/:storeId/products/barcode/:barcode',
  requireAuth,
  requireStoreAccess,
  async (req, res, next) => {
    try {
      const storeId = req.params.storeId
      const barcode = req.params.barcode

      if (
        typeof storeId !== 'string' ||
        !storeId.trim() ||
        typeof barcode !== 'string' ||
        !/^\d{8,14}$/.test(barcode)
      ) {
        res.status(400).json({
          success: false,
          message: 'A valid store ID and barcode are required.',
        })
        return
      }

      const user = res.locals.authenticatedUser as {
        companyId: string
      }

      // 1. Search the company's local database first.
      const existingProduct = await prisma.product.findFirst({
        where: {
          companyId: user.companyId,
          barcode,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          sku: true,
          barcode: true,
          brand: true,
          imageUrl: true,
          category: true,
          description: true,
          unit: true,
          storeProducts: {
            where: { storeId },
            select: {
              id: true,
              costPrice: true,
              retailPrice: true,
              wholesalePrice: true,
              stockQuantity: true,
              lowStockThreshold: true,
            },
          },
        },
      })

      if (existingProduct) {
        res.json({
          success: true,
          source: 'local',
          alreadyExists: true,
          assignedToStore:
            existingProduct.storeProducts.length > 0,
          product: existingProduct,
        })
        return
      }

      // 2. Look up the barcode in Open Food Facts.
      const url = new URL(
        `https://world.openfoodfacts.org/api/v3/product/${encodeURIComponent(barcode)}`,
      )

      url.searchParams.set(
        'fields',
        'code,product_name,brands,categories,image_front_url,image_url',
      )

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'MultiStorePOS/1.0',
        },
        signal: AbortSignal.timeout(7000),
      })

      if (!response.ok) {
        res.status(502).json({
          success: false,
          message: 'External product lookup is temporarily unavailable.',
        })
        return
      }

      const result = (await response.json()) as {
        status?: number
        product?: {
          code?: string
          product_name?: string
          brands?: string
          categories?: string
          image_front_url?: string
          image_url?: string
        }
      }

      const externalProduct = result.product

      if (
        result.status !== 1 ||
        !externalProduct ||
        !externalProduct.product_name?.trim()
      ) {
        res.json({
          success: true,
          source: 'not_found',
          alreadyExists: false,
          product: {
            barcode,
            name: '',
            brand: '',
            imageUrl: '',
            category: '',
          },
          message:
            'Product not found in the catalog. Enter its details manually.',
        })
        return
      }

      // 3. Return suggestions only; do not save automatically.
      res.json({
        success: true,
        source: 'open_food_facts',
        alreadyExists: false,
        product: {
          barcode: externalProduct.code || barcode,
          name: externalProduct.product_name.trim(),
          brand: externalProduct.brands?.trim() || '',
          imageUrl:
            externalProduct.image_front_url ||
            externalProduct.image_url ||
            '',
          category:
            externalProduct.categories
              ?.split(',')
              .map((item) => item.trim())
              .filter(Boolean)[0] || '',
        },
        message: 'Product details found. Please review before saving.',
      })
    } catch (error) {
      next(error)
    }
  },
)


// POST /api/stores/:storeId/products
router.post(
  '/:storeId/products',
  requireAuth,
  requireStoreAccess,
  requireRole(...PRODUCT_MANAGEMENT_ROLES),
  async (req, res, next) => {
    try {
      const storeId = req.params.storeId

if (typeof storeId !== 'string' || !storeId.trim()) {
  res.status(400).json({
    success: false,
    message: 'A valid store ID is required.',
  })
  return
}
      const user = res.locals.authenticatedUser as {
        companyId: string
      }


      const {
        name,
        sku,
        barcode,
        brand,
        imageUrl,
        category,
        description,
        unit,
        costPrice,
        retailPrice,
        wholesalePrice,
        stockQuantity,
        lowStockThreshold,
      } = req.body ?? {}

      if (
        typeof name !== 'string' ||
        !name.trim() ||
        name.trim().length > 200
      ) {
        res.status(400).json({
          success: false,
          message: 'Product name is required and must not exceed 200 characters.',
        })
        return
      }

      const normalizedUnit =
        typeof unit === 'string' && unit.trim()
          ? unit.trim()
          : 'piece'

      if (normalizedUnit.length > 30) {
        res.status(400).json({
          success: false,
          message: 'Unit must not exceed 30 characters.',
        })
        return
      }

      const prices = {
        costPrice: costPrice ?? 0,
        retailPrice: retailPrice ?? 0,
        stockQuantity: stockQuantity ?? 0,
        lowStockThreshold: lowStockThreshold ?? 0,
      }

      for (const [field, value] of Object.entries(prices)) {
        if (!validNonNegativeNumber(value)) {
          res.status(400).json({
            success: false,
            message: `${field} must be a valid non-negative number.`,
          })
          return
        }
      }

      if (
        wholesalePrice !== undefined &&
        wholesalePrice !== null &&
        !validNonNegativeNumber(wholesalePrice)
      ) {
        res.status(400).json({
          success: false,
          message: 'wholesalePrice must be a valid non-negative number.',
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
    code: true,
  },
})

if (!store) {
  res.status(404).json({
    success: false,
    message: 'Store not found or inactive.',
  })
  return
}

      const product = await prisma.product.create({
        data: {
          companyId: user.companyId,
          name: name.trim(),
          sku: optionalText(sku) ?? generateSku(store.code),
          barcode: optionalText(barcode),
          brand: optionalText(brand),
          imageUrl: optionalText(imageUrl),
          category: optionalText(category),
          description: optionalText(description),
          unit: normalizedUnit,
          storeProducts: {
            create: {
              storeId,
              costPrice: prices.costPrice,
              retailPrice: prices.retailPrice,
              wholesalePrice:
                wholesalePrice === undefined ||
                wholesalePrice === null
                  ? null
                  : wholesalePrice,
              stockQuantity: prices.stockQuantity,
              lowStockThreshold: prices.lowStockThreshold,
            },
          },
        },
        select: {
          id: true,
          name: true,
          sku: true,
          barcode: true,
          brand: true,
          imageUrl: true,
          category: true,
          description: true,
          unit: true,
          storeProducts: {
            where: { storeId },
            select: {
              id: true,
              costPrice: true,
              retailPrice: true,
              wholesalePrice: true,
              stockQuantity: true,
              lowStockThreshold: true,
            },
          },
        },
      })

      res.status(201).json({
        success: true,
        message: 'Product added successfully.',
        product,
      })
    } catch (error) {
      // Handle duplicate SKU or barcode without exposing database details.
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        res.status(409).json({
          success: false,
          message: 'This SKU or barcode already exists in your company.',
        })
        return
      }

      next(error)
    }
  },
)

export default router
