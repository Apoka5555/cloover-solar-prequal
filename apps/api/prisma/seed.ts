import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import argon2 from 'argon2';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { priceQuote } from '../src/quotes/pricing.js';
import { eurosToCents } from '@cloover/contracts';

config({ path: new URL('../../../.env', import.meta.url).pathname, quiet: true });

const connectionString = process.env['DATABASE_URL'];

if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Copy .env.example to .env first.');
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

interface SeedUser {
  email: string;
  fullName: string;
  password: string;
  role: 'USER' | 'ADMIN';
}

interface SeedQuote {
  ownerEmail: string;
  address: string;
  monthlyConsumptionKwh: number;
  systemSizeKw: number;
  downPayment: number;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. See .env.example.`);
  }
  return value;
}

const users: SeedUser[] = [
  {
    email: requireEnv('SEED_ADMIN_EMAIL'),
    fullName: process.env['SEED_ADMIN_NAME'] ?? 'Cloover Admin',
    password: requireEnv('SEED_ADMIN_PASSWORD'),
    role: 'ADMIN',
  },
  {
    email: requireEnv('SEED_USER_EMAIL'),
    fullName: process.env['SEED_USER_NAME'] ?? 'Sam Homeowner',
    password: requireEnv('SEED_USER_PASSWORD'),
    role: 'USER',
  },
  {
    email: 'mia@test.com',
    fullName: 'Mia Fischer',
    password: 'User123!pass',
    role: 'USER',
  },
];

// Chosen to land in each risk band, so the seeded data exercises every rate.
const quotes: SeedQuote[] = [
  {
    ownerEmail: 'user@test.com',
    address: 'Hauptstrasse 1, 10115 Berlin',
    monthlyConsumptionKwh: 450,
    systemSizeKw: 6,
    downPayment: 1200,
  },
  {
    ownerEmail: 'user@test.com',
    address: 'Hauptstrasse 1, 10115 Berlin',
    monthlyConsumptionKwh: 620,
    systemSizeKw: 9.5,
    downPayment: 0,
  },
  {
    ownerEmail: 'mia@test.com',
    address: 'Lindenweg 12, 80331 Munich',
    monthlyConsumptionKwh: 180,
    systemSizeKw: 4,
    downPayment: 500,
  },
  {
    ownerEmail: 'mia@test.com',
    address: 'Lindenweg 12, 80331 Munich',
    monthlyConsumptionKwh: 400,
    systemSizeKw: 5.5,
    downPayment: 2000,
  },
];

async function main(): Promise<void> {
  const seeded = new Map<string, { id: string; fullName: string; email: string }>();

  for (const user of users) {
    const email = user.email.toLowerCase();
    const passwordHash = await argon2.hash(user.password, {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });

    const record = await prisma.user.upsert({
      where: { email },
      // Re-running the seed refreshes the demo credentials rather than
      // failing, so a partially seeded database can always be repaired.
      update: { fullName: user.fullName, passwordHash, role: user.role },
      create: { email, fullName: user.fullName, passwordHash, role: user.role },
    });

    seeded.set(email, record);
    console.log(`seeded ${record.role.toLowerCase()} ${record.email}`);
  }

  // Quotes are replaced wholesale so repeated seeding does not pile up rows.
  await prisma.quote.deleteMany({
    where: { user: { email: { in: [...seeded.keys()] } } },
  });

  for (const quote of quotes) {
    const owner = seeded.get(quote.ownerEmail.toLowerCase());

    if (!owner) {
      throw new Error(`No seeded user for ${quote.ownerEmail}`);
    }

    const systemSizeWatts = Math.round(quote.systemSizeKw * 1000);
    const pricing = priceQuote({
      monthlyConsumptionKwh: quote.monthlyConsumptionKwh,
      systemSizeWatts,
      downPaymentCents: eurosToCents(quote.downPayment),
    });

    await prisma.quote.create({
      data: {
        userId: owner.id,
        fullName: owner.fullName,
        email: owner.email,
        address: quote.address,
        monthlyConsumptionKwh: quote.monthlyConsumptionKwh,
        systemSizeWatts,
        downPaymentCents: pricing.downPaymentCents,
        systemPriceCents: pricing.systemPriceCents,
        principalCents: pricing.principalCents,
        riskBand: pricing.riskBand,
        aprBps: pricing.aprBps,
        pricingVersion: pricing.pricingVersion,
        offers: { create: pricing.offers },
      },
    });

    console.log(
      `seeded band ${pricing.riskBand} quote for ${owner.email} (${quote.systemSizeKw} kW)`,
    );
  }
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
