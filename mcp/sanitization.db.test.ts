import { expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import postgres from 'postgres';

const enabled = process.env.SWUBASE_MCP_DB_TEST === '1';
if (enabled) {
  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_')) {
    throw new Error('Sanitization tests require an isolated worktree database.');
  }
}

test.skipIf(!enabled)(
  'the actual contributor sanitizer removes OAuth credentials, signing keys and usage regardless of opt-in',
  async () => {
    const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
    const rollback = new Error('Successful rollback-only sanitizer test');
    const id = `mcp-sanitizer-${crypto.randomUUID()}`;
    try {
      await sql.begin(async transaction => {
        // The system user's data is retained by every sanitizer run. Its auth
        // material and agent usage must still be removed. Everything rolls back.
        await transaction`insert into jwks (id, public_key, private_key, created_at) values (${id}, 'fixture-public', 'fixture-private', now())`;
        await transaction`insert into session (id, user_id, token, expires_at, created_at, updated_at) values (${id}, 'swubase', ${id}, now() + interval '1 hour', now(), now())`;
        await transaction`insert into oauth_client (id, client_id, user_id, client_secret, redirect_uris) values (${id}, ${id}, 'swubase', 'fixture-secret', array['https://client.invalid/callback'])`;
        await transaction`insert into oauth_resource (id, identifier, name) values (${id}, ${`https://${id}.invalid/mcp`}, 'fixture')`;
        await transaction`insert into oauth_client_resource (id, client_id, resource_id) values (${id}, ${id}, ${`https://${id}.invalid/mcp`})`;
        await transaction`insert into oauth_consent (id, client_id, user_id, scopes, created_at, updated_at) values (${id}, ${id}, 'swubase', array['cards:read'], now(), now())`;
        await transaction`insert into oauth_refresh_token (id, token, client_id, session_id, user_id, expires_at, created_at, scopes) values (${id}, ${id}, ${id}, ${id}, 'swubase', now() + interval '1 hour', now(), array['cards:read'])`;
        await transaction`insert into oauth_access_token (id, token, client_id, refresh_id, session_id, user_id, expires_at, created_at, scopes) values (${id}, ${id}, ${id}, ${id}, ${id}, 'swubase', now() + interval '1 hour', now(), array['cards:read'])`;
        await transaction`insert into oauth_client_assertion (id, expires_at) values (${id}, now() + interval '1 hour')`;
        await transaction`insert into mcp_tool_usage (user_id, client_id, tool) values ('swubase', ${id}, 'search_cards')`;
        for (const file of [
          '000-crossfire.sql',
          '001-core-data.sql',
          '002-teams-and-matches.sql',
        ]) {
          const source = await readFile(
            new URL(`../scripts/remote-dev/sql/${file}`, import.meta.url),
            'utf8',
          );
          // Remove only outer transaction statements; preserve the real SQL and
          // all its privacy assertions inside this rollback-only transaction.
          await transaction.unsafe(source.replace(/^(?:BEGIN|COMMIT);\s*$/gm, '')).simple();
        }
        const privateTables = [
          'jwks',
          'oauth_client',
          'oauth_resource',
          'oauth_client_resource',
          'oauth_consent',
          'oauth_refresh_token',
          'oauth_access_token',
          'oauth_client_assertion',
          'mcp_tool_usage',
        ];
        for (const table of privateTables) {
          const [row] =
            await transaction`select count(*)::integer as count from ${transaction(table)}`;
          expect(row!.count).toBe(0);
        }
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    } finally {
      await sql.end();
    }
  },
  30_000,
);
