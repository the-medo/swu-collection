import { drizzle } from 'drizzle-orm/postgres-js';
// import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

// const migrationClient = postgres(process.env.DATABASE_URL!);
// migrate(drizzle(migrationClient), ...);

console.log(process.env.DATABASE_URL!);
const queryClient = postgres(process.env.DATABASE_URL!);

export const db = drizzle({ client: queryClient });
