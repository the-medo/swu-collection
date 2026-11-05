import { expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import postgres from 'postgres';

test.skipIf(process.env.INTEGRATION_APPS_DB_TEST !== '1')(
  'contributor sanitizer removes all app credentials and accepts older schemas',
  async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
      throw new Error('Use an isolated worktree database.');
    const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
    const rollback = new Error('Rollback-only app sanitization test');
    try {
      for (const olderSchema of [false, true]) {
        try {
          await sql.begin(async tx => {
            if (olderSchema) {
              await tx.unsafe(
                'DROP TABLE integration_app_refresh_use, integration_app_code, integration_app_connection, integration_app',
              );
            } else {
              await tx`insert into integration_app (client_id, owner_id, name, secret_hash, redirect_uris, scopes) values ('fixture-app', 'swubase', 'Private app', 'secret-hash', array['https://private.example/callback'], array['profile:read'])`;
              await tx`insert into integration_app_code (code_hash, client_id, user_id, scopes, redirect_uri, expires_at) values ('code-hash', 'fixture-app', 'swubase', array['profile:read'], 'https://private.example/callback', now() + interval '5 minutes')`;
              await tx`insert into integration_app_connection (client_id, user_id, scopes, access_token_hash, refresh_token_hash, access_expires_at, refresh_expires_at) values ('fixture-app', 'swubase', array['profile:read'], 'access-hash', 'refresh-hash', now() + interval '1 hour', now() + interval '30 days')`;
              await tx`insert into integration_app_refresh_use (token_hash, connection_id, expires_at) select 'used-token-hash', id, now() + interval '30 days' from integration_app_connection where client_id = 'fixture-app'`;
            }
            for (const file of [
              '000-crossfire.sql',
              '001-core-data.sql',
              '002-teams-and-matches.sql',
            ]) {
              const source = await readFile(
                new URL(`../../../scripts/remote-dev/sql/${file}`, import.meta.url),
                'utf8',
              );
              await tx.unsafe(source.replace(/^(?:BEGIN|COMMIT);\s*$/gm, '')).simple();
            }
            if (!olderSchema) {
              for (const table of [
                'integration_app_refresh_use',
                'integration_app',
                'integration_app_code',
                'integration_app_connection',
              ]) {
                const [row] = await tx`select count(*)::integer as count from ${tx(table)}`;
                expect(row!.count).toBe(0);
              }
            }
            throw rollback;
          });
        } catch (error) {
          if (error !== rollback) throw error;
        }
      }
    } finally {
      await sql.end();
    }
  },
  120_000,
);
