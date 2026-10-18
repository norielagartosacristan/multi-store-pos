
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { input, password } from '@inquirer/prompts'
import { PrismaClient, UserRole } from '../src/generated/prisma/client.js'

const prisma = new PrismaClient()

async function main() {
  const company = await prisma.company.findUnique({
    where: { id: 'multi-store-company' },
  })

  if (!company) {
    throw new Error('Company not found. Run npm run seed first.')
  }

  const stores = await prisma.store.findMany({
    where: {
      companyId: company.id,
      isActive: true,
    },
  })

  const requiredCodes = ['FEEDS', 'LAUNDRY', 'GROCERY']
  const missingStores = requiredCodes.filter(
    (code) => !stores.some((store) => store.code === code),
  )

  if (missingStores.length > 0) {
    throw new Error(
      `Missing stores: ${missingStores.join(', ')}. Run npm run seed first.`,
    )
  }

  const name = (
    await input({
      message: 'Owner full name:',
      validate: (value) =>
        value.trim().length >= 2 || 'Enter at least 2 characters.',
    })
  ).trim()

  const email = (
    await input({
      message: 'Owner email:',
      validate: (value) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ||
        'Enter a valid email address.',
    })
  ).trim().toLowerCase()

  const existingUser = await prisma.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    throw new Error(
      'This email already exists. No user or password was changed.',
    )
  }

  const ownerPassword = await password({
    message: 'Owner password (minimum 12 characters):',
    mask: '*',
    validate: (value) =>
      value.length >= 12 || 'Password must be at least 12 characters.',
  })

  const confirmPassword = await password({
    message: 'Confirm owner password:',
    mask: '*',
  })

  if (ownerPassword !== confirmPassword) {
    throw new Error('Passwords do not match. No account was created.')
  }

  const passwordHash = await bcrypt.hash(ownerPassword, 12)

  await prisma.$transaction(async (tx) => {
    const owner = await tx.user.create({
      data: {
        companyId: company.id,
        name,
        email,
        passwordHash,
        role: UserRole.OWNER,
        isActive: true,
      },
    })

    await tx.userStoreAccess.createMany({
      data: stores.map((store) => ({
        userId: owner.id,
        storeId: store.id,
      })),
    })
  })

  console.log('\nOwner account created successfully.')
  console.log(`Email: ${email}`)
  console.log('Role: OWNER')
  console.log('Store access: FEEDS, LAUNDRY, GROCERY')
  console.log('Password was stored as a hash, not plain text.')
}

main()
  .catch((error) => {
    console.error('\nOwner setup failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
