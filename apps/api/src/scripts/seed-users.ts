import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

interface SeedUser {
  email: string;
  name: string;
  password: string;
}

const DEFAULT_PASSWORD = process.env.SEED_PASSWORD || 'Fencetastic2024!';

if (!process.env.SEED_PASSWORD) {
  console.log('  Warning: Using default password. Set SEED_PASSWORD env var for production.');
}

const SEED_USERS: SeedUser[] = [
  {
    email: 'adnaan@fencetastic.com',
    name: 'Adnaan',
    password: DEFAULT_PASSWORD,
  },
  {
    email: 'meme@fencetastic.com',
    name: 'Meme',
    password: DEFAULT_PASSWORD,
  },
];

async function main() {
  console.log('Seeding users...\n');

  for (const user of SEED_USERS) {
    const existing = await prisma.user.findUnique({
      where: { email: user.email },
    });

    if (existing) {
      console.log(`  User ${user.email} already exists, skipping.`);
      continue;
    }

    const passwordHash = await bcrypt.hash(user.password, SALT_ROUNDS);

    const created = await prisma.user.create({
      data: {
        email: user.email,
        name: user.name,
        passwordHash,
      },
    });

    console.log(`  Created user: ${created.name} (${created.email}) — id: ${created.id}`);
  }

  const existingDebt = await prisma.aimannDebtLedger.findFirst();
  if (!existingDebt) {
    await prisma.aimannDebtLedger.create({
      data: {
        amount: 5988.41,
        runningBalance: 5988.41,
        note: 'Initial balance from Payout sheet — old owner credit card debt',
        date: new Date('2024-01-01T00:00:00Z'),
      },
    });
    console.log('\n  Seeded initial Aimann debt balance: $5,988.41');
  } else {
    console.log('\n  Aimann debt ledger already has entries, skipping seed.');
  }

  console.log('\nSeed complete!');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
