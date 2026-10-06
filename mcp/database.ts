import postgres from 'postgres';
import { and, arrayContains, count, eq, gt, isNull, or, sql } from 'drizzle-orm';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { z } from 'zod';
import { hasActiveAccountRestriction } from '../server/auth/accountRestriction.ts';
import { MCP_RESOURCE_SCOPES, MCP_SCOPE } from '../shared/mcp/config.ts';
import { createDeckRepository, type DeckRepository } from './decks.ts';
import {
  oauthClient,
  oauthClientResource,
  oauthConsent,
  oauthResource,
  session,
  user,
} from '../server/db/schema/auth-schema.ts';
import { mcpToolUsage } from '../server/db/schema/mcp-usage.ts';

const identityClaims = z.object({
  sub: z.string().min(1).max(256),
  azp: z.string().min(1).max(256),
  sid: z.string().min(1).max(256),
  iat: z.number().int(),
  exp: z.number().int(),
  scope: z.string().max(1000),
});
export type Identity = { userId: string; clientId: string; scopes: string[] };
export type McpToolName = 'search_cards' | 'get_cards' | 'list_my_decks' | 'get_deck';
export interface McpRepository extends DeckRepository {
  authorize(claims: unknown): Promise<Identity | 'invalid' | 'restricted'>;
  admit(identity: Pick<Identity, 'userId' | 'clientId'>, tool: McpToolName): Promise<string | null>;
  finish(
    id: string,
    outcome: 'success' | 'error',
    resultCount: number,
    durationMs: number,
  ): Promise<void>;
  health(): Promise<void>;
}

export function createMcpRepository(
  database: PostgresJsDatabase,
  resource: string,
  callsPerMinute: number,
): McpRepository {
  return {
    ...createDeckRepository(database),
    async authorize(claims) {
      const parsed = identityClaims.safeParse(claims);
      if (!parsed.success) return 'invalid';
      const { sub, azp, sid, iat } = parsed.data;
      const [grant] = await database
        .select({
          banned: user.banned,
          scopes: oauthConsent.scopes,
          banExpires: sql`${user.banExpires} at time zone 'UTC'`.mapWith((value: string | null) =>
            value === null ? null : new Date(value),
          ),
        })
        .from(user)
        .innerJoin(
          session,
          and(
            eq(session.userId, user.id),
            eq(session.id, sid),
            sql`${session.expiresAt} at time zone 'UTC' > now()`,
          ),
        )
        .innerJoin(
          oauthConsent,
          and(eq(oauthConsent.userId, user.id), eq(oauthConsent.clientId, azp)),
        )
        .innerJoin(
          oauthClient,
          and(
            eq(oauthClient.clientId, oauthConsent.clientId),
            or(eq(oauthClient.disabled, false), isNull(oauthClient.disabled)),
          ),
        )
        .innerJoin(
          oauthClientResource,
          and(
            eq(oauthClientResource.clientId, oauthClient.clientId),
            eq(oauthClientResource.resourceId, resource),
          ),
        )
        .innerJoin(
          oauthResource,
          and(
            eq(oauthResource.identifier, oauthClientResource.resourceId),
            or(eq(oauthResource.disabled, false), isNull(oauthResource.disabled)),
          ),
        )
        .where(
          and(
            eq(user.id, sub),
            arrayContains(oauthConsent.scopes, [MCP_SCOPE]),
            arrayContains(oauthConsent.resources, [resource]),
            sql`date_trunc('second', ${oauthConsent.createdAt}) <= to_timestamp(${iat}) at time zone 'UTC'`,
          ),
        )
        .limit(1);
      // Better Auth's timestamp columns store UTC without a timezone. Compare
      // consent in SQL and return a timezone-bearing ban expiry to JS.
      if (!grant) return 'invalid';
      if (hasActiveAccountRestriction(grant)) return 'restricted';
      const tokenScopes = new Set(parsed.data.scope.split(/\s+/).filter(Boolean));
      const scopes = MCP_RESOURCE_SCOPES.filter(
        scope => tokenScopes.has(scope) && grant.scopes.includes(scope),
      );
      if (!scopes.includes(MCP_SCOPE)) return 'invalid';
      return { userId: sub, clientId: azp, scopes };
    },
    async admit(identity, tool) {
      return database.transaction(async transaction => {
        // Serialize only this user's admissions, including across replicas.
        await transaction.execute(
          sql`select pg_advisory_xact_lock(hashtextextended(${identity.userId}, 0))`,
        );
        const [usage] = await transaction
          .select({ calls: count() })
          .from(mcpToolUsage)
          .where(
            and(
              eq(mcpToolUsage.userId, identity.userId),
              gt(mcpToolUsage.startedAt, sql`now() - interval '1 minute'`),
            ),
          );
        if (usage!.calls >= callsPerMinute) return null;
        const [row] = await transaction
          .insert(mcpToolUsage)
          .values({ userId: identity.userId, clientId: identity.clientId, tool })
          .returning({ id: mcpToolUsage.id });
        return row!.id;
      });
    },
    async finish(id, outcome, resultCount, durationMs) {
      await database
        .update(mcpToolUsage)
        .set({ outcome, resultCount, durationMs })
        .where(eq(mcpToolUsage.id, id));
    },
    async health() {
      await database.select({ id: mcpToolUsage.id }).from(mcpToolUsage).limit(1);
    },
  };
}

export function connectMcpDatabase(databaseUrl: string, resource: string, callsPerMinute: number) {
  const queryClient = postgres(databaseUrl, { max: 4, idle_timeout: 20, connect_timeout: 5 });
  const database = drizzle({ client: queryClient });
  return {
    repository: createMcpRepository(database, resource, callsPerMinute),
    close: () => queryClient.end({ timeout: 5 }),
  };
}
