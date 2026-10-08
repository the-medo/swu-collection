import { expect, test } from 'bun:test';
import { sql } from 'drizzle-orm';
import { db } from '../../db';

const enabled = process.env.SWUBASE_CREDITS_DB_TEST === '1';
if (enabled) {
  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
    throw new Error('Currency migrations require an isolated worktree database.');
}

test.skipIf(!enabled)(
  'the consolidated migration preserves profiles, backfills both currencies and maintains totals',
  async () => {
    const statements = (await Bun.file('drizzle/0077_user_currencies.sql').text()).split(
      '--> statement-breakpoint',
    );
    const rollback = new Error('Rollback isolated migration fixture');
    try {
      await db.transaction(async tx => {
        const schema = 'currency_migration_' + crypto.randomUUID().replaceAll('-', '');
        await tx.execute(sql.raw(`CREATE SCHEMA ${schema}`));
        await tx.execute(sql.raw(`SET LOCAL search_path TO ${schema}, public`));
        // Minimal predecessor tables include the real FK/cascade and defaults used by the migration.
        await tx.execute(sql`CREATE TABLE "user" (id text PRIMARY KEY)`);
        await tx.execute(sql`CREATE TABLE user_profile (
        user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
        favorite_card_id text, battlefield_limit integer NOT NULL DEFAULT 1,
        achievement_limit integer NOT NULL DEFAULT 1
      )`);
        await tx.execute(sql`CREATE TABLE user_credits (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        amount bigint NOT NULL, source text NOT NULL, source_key text NOT NULL UNIQUE,
        created_at timestamptz NOT NULL DEFAULT now()
      )`);
        await tx.execute(sql`CREATE TABLE patreon_member (
        campaign_id text, member_id text, user_id text REFERENCES "user"(id) ON DELETE SET NULL,
        lifetime_cents bigint, credited_cents bigint NOT NULL DEFAULT 0
      )`);
        await tx.execute(
          sql`INSERT INTO "user" VALUES ('paid'), ('empty'), ('seeded'), ('former')`,
        );
        await tx.execute(sql`INSERT INTO user_profile(user_id,favorite_card_id,battlefield_limit,achievement_limit)
        VALUES ('paid','kept',3,4)`);
        await tx.execute(sql`INSERT INTO user_credits(user_id,amount,source,source_key) VALUES
        ('paid',2500,'patreon','payment'), ('former',1000,'patreon','former-payment'),
        ('seeded',10000,'starting','starting:seeded')`);
        await tx.execute(sql`INSERT INTO patreon_member VALUES
        ('campaign','paid','paid',500,250), ('campaign','former','former',100,100),
        ('campaign','unmatched',NULL,200,0), ('campaign','removed',NULL,500,500)`);
        for (const statement of statements) await tx.execute(sql.raw(statement));
        expect(
          await tx.execute(sql`SELECT user_id,credit_balance::integer AS credits,beskar_balance_cents::integer AS beskar
        FROM user_profile ORDER BY user_id`),
        ).toEqual([
          { user_id: 'empty', credits: 10000, beskar: 0 },
          { user_id: 'former', credits: 11000, beskar: 100 },
          { user_id: 'paid', credits: 12500, beskar: 250 },
          { user_id: 'seeded', credits: 10000, beskar: 0 },
        ]);
        expect(
          (
            await tx.execute(sql`SELECT favorite_card_id,battlefield_limit,achievement_limit
        FROM user_profile WHERE user_id='paid'`)
          )[0],
        ).toEqual({ favorite_card_id: 'kept', battlefield_limit: 3, achievement_limit: 4 });
        // Repeating data backfills after the trigger exists still awards nothing twice.
        for (const statement of statements.filter(part =>
          part.includes('INSERT INTO "user_credits"'),
        ))
          await tx.execute(sql.raw(statement));
        expect(
          (
            await tx.execute(
              sql`SELECT count(*)::integer AS count FROM user_credits WHERE source='starting'`,
            )
          )[0].count,
        ).toBe(4);
        expect(
          (
            await tx.execute(
              sql`SELECT count(*)::integer AS count FROM user_credits WHERE currency='beskar'`,
            )
          )[0].count,
        ).toBe(2);
        await tx.execute(sql`UPDATE user_credits SET amount=3000 WHERE source_key='payment'`);
        await tx.execute(sql`INSERT INTO user_credits(user_id,currency,amount,source,source_key)
        VALUES ('paid','beskar',-200,'shop','spent')`);
        // Correct a historical award after spending; only its net change may be applied.
        await tx.execute(
          sql`UPDATE user_credits SET amount=260 WHERE source_key='patreon-beskar:campaign:paid:250'`,
        );
        expect(
          (
            await tx.execute(sql`SELECT credit_balance::integer AS credits,beskar_balance_cents::integer AS beskar
        FROM user_profile WHERE user_id='paid'`)
          )[0],
        ).toEqual({ credits: 13000, beskar: 60 });
        await tx.execute(sql`DELETE FROM user_credits WHERE source_key='spent'`);
        expect(
          (
            await tx.execute(
              sql`SELECT beskar_balance_cents::integer AS beskar FROM user_profile WHERE user_id='paid'`,
            )
          )[0].beskar,
        ).toBe(260);
        await tx.execute(sql`INSERT INTO "user" VALUES ('late')`);
        await tx.execute(
          sql`INSERT INTO user_credits(user_id,amount,source,source_key) VALUES ('late',99,'other-provider','future-provider')`,
        );
        expect(
          (
            await tx.execute(
              sql`SELECT credit_balance::integer AS credits FROM user_profile WHERE user_id='late'`,
            )
          )[0].credits,
        ).toBe(99);
        await tx.execute(sql`DELETE FROM "user" WHERE id='paid'`);
        expect(await tx.execute(sql`SELECT * FROM user_profile WHERE user_id='paid'`)).toHaveLength(
          0,
        );
        expect(await tx.execute(sql`SELECT * FROM user_credits WHERE user_id='paid'`)).toHaveLength(
          0,
        );
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    }
  },
);
