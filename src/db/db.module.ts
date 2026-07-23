import { Global, Module } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { PgQueryResultHKT, PgTransaction } from 'drizzle-orm/pg-core';
import { env } from '../config/env';
import * as schema from './schema';

export const DB = Symbol('DB');
export type Database = ReturnType<typeof drizzle<typeof schema>>;
export type DbTransaction = PgTransaction<PgQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>;

@Global()
@Module({
  providers: [
    {
      provide: DB,
      useFactory: () => {
        const client = postgres(env().DATABASE_URL, {
          max: 10,
          idle_timeout: 30,
          connect_timeout: 10,
        });
        return drizzle(client, { schema });
      },
    },
  ],
  exports: [DB],
})
export class DbModule {}
