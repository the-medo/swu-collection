import postgres, { type Sql } from 'postgres';
import { z } from 'zod';
import { hasActiveAccountRestriction } from '../server/auth/accountRestriction.ts';
import { MCP_SCOPE } from '../shared/mcp/config.ts';

const identityClaims = z.object({
  sub: z.string().min(1).max(256),
  azp: z.string().min(1).max(256),
  sid: z.string().min(1).max(256),
  iat: z.number().int(),
  exp: z.number().int(),
});
export type Identity = { userId: string; clientId: string };
export interface McpRepository {
  authorize(claims: unknown): Promise<Identity | 'invalid' | 'restricted'>;
  admit(identity: Identity): Promise<string | null>;
  finish(
    id: string,
    outcome: 'success' | 'error',
    resultCount: number,
    durationMs: number,
  ): Promise<void>;
  health(): Promise<void>;
}

export function createMcpRepository(
  sql: Sql,
  resource: string,
  callsPerMinute: number,
): McpRepository {
  return {
    async authorize(claims) {
      const parsed = identityClaims.safeParse(claims);
      if (!parsed.success) return 'invalid';
      const { sub, azp, sid, iat } = parsed.data;
      const [grant] = await sql`
        select u.banned, u.ban_expires at time zone 'UTC' as ban_expires
        from "user" u
        join session s on s.user_id = u.id and s.id = ${sid}
          and s.expires_at at time zone 'UTC' > now()
        join oauth_consent c on c.user_id = u.id and c.client_id = ${azp}
        join oauth_client cl on cl.client_id = c.client_id and cl.disabled is not true
        join oauth_client_resource cr on cr.client_id = cl.client_id and cr.resource_id = ${resource}
        join oauth_resource r on r.identifier = cr.resource_id and r.disabled is not true
        where u.id = ${sub} and ${MCP_SCOPE} = any(c.scopes)
          and ${resource} = any(c.resources)
          and date_trunc('second', c.created_at) <= to_timestamp(${iat}) at time zone 'UTC'
        limit 1`;
      // Better Auth's timestamp columns store UTC without a timezone. Compare
      // consent in SQL and return a timezone-bearing ban expiry to JS.
      if (!grant) return 'invalid';
      if (hasActiveAccountRestriction({ banned: grant.banned, banExpires: grant.ban_expires }))
        return 'restricted';
      return { userId: sub, clientId: azp };
    },
    async admit(identity) {
      return sql.begin(async transaction => {
        // Serialize only this user's admissions, including across replicas.
        await transaction`select pg_advisory_xact_lock(hashtextextended(${identity.userId}, 0))`;
        const [usage] = await transaction`select count(*)::integer as calls from mcp_tool_usage
          where user_id = ${identity.userId} and started_at > now() - interval '1 minute'`;
        if (usage.calls >= callsPerMinute) return null;
        const [row] = await transaction`insert into mcp_tool_usage (user_id, client_id, tool)
          values (${identity.userId}, ${identity.clientId}, 'search_cards') returning id`;
        return row.id as string;
      });
    },
    async finish(id, outcome, resultCount, durationMs) {
      await sql`update mcp_tool_usage set outcome = ${outcome}, result_count = ${resultCount},
        duration_ms = ${durationMs} where id = ${id}`;
    },
    async health() {
      await sql`select id from mcp_tool_usage limit 1`;
    },
  };
}

export function connectMcpDatabase(databaseUrl: string, resource: string, callsPerMinute: number) {
  const sql = postgres(databaseUrl, { max: 4, idle_timeout: 20, connect_timeout: 5 });
  return {
    repository: createMcpRepository(sql, resource, callsPerMinute),
    close: () => sql.end({ timeout: 5 }),
  };
}
