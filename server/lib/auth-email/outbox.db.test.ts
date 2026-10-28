import { expect, test } from 'bun:test';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../../db';
import { authEmailOutbox } from '../../db/schema/auth-email.ts';
import {
  AuthEmailDeliveryError,
  deliverAuthEmail,
  enqueueAuthEmail,
  processAuthEmails,
} from './outbox.ts';
import { openEmail, recipientHash } from './crypto.ts';

const enabled = process.env.SWUBASE_EMAIL_AUTH_DB_TEST === '1';
if (enabled) {
  const url = new URL(process.env.DATABASE_URL!);
  if (
    url.hostname !== '127.0.0.1' ||
    !url.pathname.startsWith('/swubase_') ||
    process.env.AUTH_EMAIL_MODE !== 'capture'
  )
    throw new Error('Outbox tests require isolated local capture mode.');
}

test.skipIf(!enabled)(
  'outbox throttles concurrently, retries consistently, locks across workers and scrubs terminal payloads',
  async () => {
    // Never consume someone else's pending local preview with a test transport.
    if (
      (await db.select().from(authEmailOutbox).where(eq(authEmailOutbox.status, 'pending'))).length
    )
      throw new Error('Drain local capture emails before running outbox tests.');
    const recipients = Array.from(
      { length: 4 },
      () => `outbox-${crypto.randomUUID()}@invalid.local`,
    );
    const hashes = recipients.map(recipientHash);
    const mail = (index: number) => ({
      to: recipients[index],
      kind: 'verification' as const,
      url: `${process.env.BETTER_AUTH_URL}/api/auth/verify-email?token=fixture-only`,
    });
    try {
      const ids = (
        await Promise.all(Array.from({ length: 5 }, () => enqueueAuthEmail(mail(0))))
      ).filter(Boolean);
      expect(ids).toHaveLength(1);
      const notice = await enqueueAuthEmail({ ...mail(0), kind: 'existing-account' });
      expect(notice).toBeTruthy();
      expect(await enqueueAuthEmail({ ...mail(0), kind: 'existing-account' })).toBeUndefined();
      const reset = await enqueueAuthEmail({ ...mail(0), kind: 'password-reset' });
      expect(reset).toBeTruthy();
      await db.delete(authEmailOutbox).where(inArray(authEmailOutbox.id, [notice!, reset!]));
      const id = ids[0]!;
      const row = async () =>
        (await db.select().from(authEmailOutbox).where(eq(authEmailOutbox.id, id)))[0];
      const original = (await row()).payload;
      const failure = await processAuthEmails({
        deliver: async () => {
          throw new AuthEmailDeliveryError('http_429');
        },
      });
      expect(failure.retrying).toBe(1);
      expect((await row()).attempts).toBe(1);
      expect((await row()).payload).toBe(original);
      expect(
        (
          await processAuthEmails({
            deliver: async () => {
              throw new Error('too soon');
            },
          })
        ).retrying,
      ).toBe(0);
      await db
        .update(authEmailOutbox)
        .set({ nextAttemptAt: new Date(0) })
        .where(eq(authEmailOutbox.id, id));
      let deliveries = 0;
      const deliver = async (key: string, payload: Parameters<typeof deliverAuthEmail>[1]) => {
        expect(key).toBe(id);
        expect(payload).toEqual(openEmail(original!));
        deliveries++;
        await Bun.sleep(30);
      };
      await Promise.all([processAuthEmails({ deliver }), processAuthEmails({ deliver })]);
      expect(deliveries).toBe(1);
      expect((await row()).payload).toBeNull();
      expect((await row()).status).toBe('sent');
      const failed = (await enqueueAuthEmail(mail(1)))!;
      await processAuthEmails({
        deliver: async () => {
          throw new AuthEmailDeliveryError('http_422', true);
        },
      });
      const [permanent] = await db
        .select()
        .from(authEmailOutbox)
        .where(eq(authEmailOutbox.id, failed));
      expect(permanent.status).toBe('failed');
      expect(permanent.payload).toBeNull();
      const expired = (await enqueueAuthEmail(mail(2)))!;
      await db
        .update(authEmailOutbox)
        .set({ expiresAt: new Date(0) })
        .where(eq(authEmailOutbox.id, expired));
      expect(
        (
          await processAuthEmails({
            deliver: async () => {
              throw new Error('expired email was sent');
            },
          })
        ).expired,
      ).toBe(1);
      expect(
        (await db.select().from(authEmailOutbox).where(eq(authEmailOutbox.id, expired)))[0].payload,
      ).toBeNull();
      const mismatch = (await enqueueAuthEmail(mail(3)))!;
      const [queued] = await db
        .select()
        .from(authEmailOutbox)
        .where(eq(authEmailOutbox.id, mismatch));
      const payload = openEmail(queued.payload!) as Parameters<typeof deliverAuthEmail>[1];
      await expect(deliverAuthEmail(mismatch, { ...payload, mode: 'resend' })).rejects.toThrow(
        'configuration_changed',
      );
    } finally {
      await db.delete(authEmailOutbox).where(inArray(authEmailOutbox.recipientHash, hashes));
    }
  },
);
