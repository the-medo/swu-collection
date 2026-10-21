import { sql } from 'drizzle-orm';
import type { Database } from '../../server/lib/creators/types.ts';

// PostgreSQL row locks normally require UPDATE on the locked table. This narrow
// function permits the shared services' existing user lock without granting the
// MCP role permission to modify authentication records.
export async function mcpLockUser(database: Database, userId: string) {
  await database.execute(sql`select public.mcp_lock_user(${userId})`);
}

export async function mcpPrepareImageQuota(database: Database, userId: string) {
  await database.execute(sql`select public.mcp_prepare_image_quota(${userId})`);
}
