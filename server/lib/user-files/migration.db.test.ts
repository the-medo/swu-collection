import { expect, test } from 'bun:test';
import { sql } from 'drizzle-orm';
import { db } from '../../db';

test.skipIf(process.env.USER_FILES_DB_TEST !== '1')(
  'combined migration creates upload storage and preserves existing card avatars',
  async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
      throw new Error('Select an isolated worktree database.');
    const migration = await Bun.file(
      new URL('../../../drizzle/0069_user_files.sql', import.meta.url),
    ).text();
    const schemaName = `user_files_migration_${crypto.randomUUID().replaceAll('-', '')}`;
    const schema = sql.identifier(schemaName);
    const userId = `migration-test-${crypto.randomUUID()}`;
    const fileId = crypto.randomUUID();
    await db.transaction(async tx => {
      // Run the exact migration against the pre-feature avatar schema. The unique
      // schema and fixture user are rolled back on failure and removed on success.
      await tx.execute(sql`CREATE SCHEMA ${schema}`);
      await tx.execute(sql`SET LOCAL search_path TO ${schema}, public`);
      await tx.execute(sql`
        INSERT INTO public."user" (id, name, display_name, email, email_verified, currency, created_at, updated_at)
        VALUES (${userId}, ${userId}, ${userId}, ${`${userId}@invalid.local`}, false, 'USD', now(), now())
      `);
      await tx.execute(sql`
        CREATE TABLE user_avatar (
          user_id text PRIMARY KEY REFERENCES public."user"(id) ON DELETE CASCADE,
          card_id text NOT NULL, variant_id text NOT NULL, side text NOT NULL,
          image text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT user_avatar_side_check CHECK (side IN ('front', 'back'))
        )
      `);
      await tx.execute(sql`
        INSERT INTO user_avatar (user_id, card_id, variant_id, side, image)
        VALUES (${userId}, 'card', 'variant', 'front', 'existing-avatar')
      `);
      for (const statement of migration.split('--> statement-breakpoint'))
        await tx.execute(sql.raw(statement));
      expect((await tx.execute(sql`SELECT * FROM user_avatar`))[0]).toMatchObject({
        user_id: userId,
        card_id: 'card',
        variant_id: 'variant',
        side: 'front',
        image: 'existing-avatar',
        file_id: null,
      });
      await tx.execute(sql`
        INSERT INTO user_file (id, user_id, file_name, image_key, thumbnail_key,
          original_byte_size, byte_size, thumbnail_byte_size, width, height)
        VALUES (${fileId}, ${userId}, 'image.png', ${`user-files/${userId}/${fileId}.webp`},
          ${`user-files/${userId}/${fileId}-thumb.webp`}, 100, 80, 20, 100, 100)
      `);
      await tx.execute(sql`INSERT INTO user_file_storage (user_id) VALUES (${userId})`);
      expect(
        Number((await tx.execute(sql`SELECT quota_bytes FROM user_file_storage`))[0].quota_bytes),
      ).toBe(100_000_000);
      await tx.execute(sql`
        UPDATE user_avatar SET card_id = NULL, variant_id = NULL, side = NULL, file_id = ${fileId}
        WHERE user_id = ${userId}
      `);
      expect((await tx.execute(sql`SELECT file_id FROM user_avatar`))[0].file_id).toBe(fileId);
      const columns = await tx.execute(sql`
        SELECT column_name, is_nullable FROM information_schema.columns
        WHERE table_schema = ${schemaName} AND table_name = 'user_file'
        AND column_name IN ('image_key', 'thumbnail_key')
      `);
      expect(columns).toHaveLength(2);
      expect(columns.every(column => column.is_nullable === 'NO')).toBe(true);
      await tx.execute(sql`SET LOCAL search_path TO public`);
      await tx.execute(sql`DROP SCHEMA ${schema} CASCADE`);
      await tx.execute(sql`DELETE FROM public."user" WHERE id = ${userId}`);
    });
  },
);
