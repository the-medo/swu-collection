import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

console.log(process.env.DATABASE_URL!);
const queryClient = postgres(process.env.DATABASE_URL!);

export const db = drizzle({ client: queryClient });
