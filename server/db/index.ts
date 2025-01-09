import { drizzle } from 'drizzle-orm/postgres-js';
// import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

// const migrationClient = postgres(process.env.DATABASE_URL!);
// migrate(drizzle(migrationClient), ...);

const queryClient = postgres(process.env.DATABASE_URL!);

export const db = drizzle({ client: queryClient });
const result = await db.execute('select 1');
