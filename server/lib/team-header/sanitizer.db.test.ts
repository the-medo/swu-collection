import { expect, test } from 'bun:test';
import postgres from 'postgres';

test.skipIf(process.env.TEAM_HEADER_DB_TEST !== '1')(
  'full team sanitizer removes header metadata and supports pre-header backups',
  async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
      throw new Error('Select isolated worktree DB');
    const connection = postgres(url.toString(), { max: 1 });
    const script = (
      await Bun.file(
        new URL('../../../scripts/remote-dev/sql/002-teams-and-matches.sql', import.meta.url),
      ).text()
    )
      .replace(/^BEGIN;\s*$/m, '')
      .replace(/^COMMIT;\s*$/m, '');
    const rollback = new Error('Intentional sanitizer rollback');
    try {
      for (const legacy of [false, true]) {
        await expect(
          connection.begin(async tx => {
            await tx`INSERT INTO "user" (id,name,email,email_verified,created_at,updated_at,display_name,currency)
            VALUES ('swubase','System fixture','swubase@invalid.local',false,now(),now(),'swubase','USD') ON CONFLICT DO NOTHING`;
            const teamId = crypto.randomUUID();
            await tx`INSERT INTO team (id,name) VALUES (${teamId},'Private header fixture')`;
            if (legacy) await tx`DROP TABLE team_header`;
            else
              await tx`INSERT INTO team_header (team_id,source,image_key,file_id,"left",top,width,height)
            VALUES (${teamId},'upload','private/team-header.webp',${crypto.randomUUID()},0,0,1600,400)`;
            await tx`CREATE TABLE development_cleanup_user (user_id text PRIMARY KEY, retain_data boolean NOT NULL, retain_match_data boolean NOT NULL)`;
            await tx`INSERT INTO development_cleanup_user SELECT id,id='swubase',false FROM "user"`;
            await tx.unsafe(script, [], { simple: true });
            expect((await tx`SELECT name FROM team`).map(row => row.name)).toEqual([
              'Swubase dev team!',
            ]);
            if (!legacy) expect(await tx`SELECT * FROM team_header`).toHaveLength(0);
            throw rollback;
          }),
        ).rejects.toBe(rollback);
        expect((await connection`SELECT to_regclass('public.team_header') AS name`)[0].name).toBe(
          'team_header',
        );
      }
    } finally {
      await connection.end();
    }
  },
);
