
import 'dotenv/config'
import { PrismaClient, StoreType } from '../src/generated/prisma/client'

const prisma = new PrismaClient()

async function main() {
  const company = await prisma.company.upsert({
    where: { id: 'multi-store-company' },
    update: {},
    create: {
      id: 'multi-store-company',
      name: 'Multi-Store Business',
    },
  })

  const stores = [
    {
      code: 'FEEDS',
      name: 'Feeds Store',
      type: StoreType.FEEDS,
    },
    {
      code: 'LAUNDRY',
      name: 'Laundry Café',
      type: StoreType.LAUNDRY_CAFE,
    },
    {
      code: 'GROCERY',
      name: 'Grocery Store',
      type: StoreType.GROCERY,
    },
  ]

  for (const store of stores) {
    await prisma.store.upsert({
      where: { code: store.code },
      update: {
        name: store.name,
        type: store.type,
      },
      create: {
        ...store,
        companyId: company.id,
      },
    })
  }

  console.log('Company and three stores are ready.')

  const allStores = await prisma.store.findMany({
    where: { companyId: company.id },
    orderBy: { code: 'asc' },
  })

  console.table(
    allStores.map((store) => ({
      code: store.code,
      name: store.name,
      type: store.type,
    })),
  )
}

main()
  .catch((error) => {
    console.error('Seed failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
