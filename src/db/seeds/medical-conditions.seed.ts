import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { medicalConditions } from '../schema/medical';
import { config } from 'dotenv';

if (process.env.NODE_ENV !== 'production') {
  config({ path: '.env.development.local' });
}

const CONDITIONS = [
  { name: "Addison's Disease", category: 'DISEASE' as const, sortOrder: 1 },
  { name: 'Nut Allergy', category: 'ALLERGY' as const, sortOrder: 2 },
  { name: 'Soya Allergy', category: 'ALLERGY' as const, sortOrder: 3 },
  { name: 'High Blood Pressure', category: 'CONDITION' as const, sortOrder: 4 },
  { name: 'Liver Disease', category: 'DISEASE' as const, sortOrder: 5 },
  { name: 'Kidney Disease', category: 'DISEASE' as const, sortOrder: 6 },
  { name: 'Breast Lump', category: 'CONDITION' as const, sortOrder: 7 },
  { name: 'I am pregnant or there is a risk I could get pregnant', category: 'CONDITION' as const, sortOrder: 8 },
  { name: 'Heart Disease', category: 'DISEASE' as const, sortOrder: 9 },
];

async function seed() {
  const client = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(client);

  await db
    .insert(medicalConditions)
    .values(CONDITIONS)
    .onConflictDoNothing();

  console.log(`Seeded ${CONDITIONS.length} medical conditions`);
  await client.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
