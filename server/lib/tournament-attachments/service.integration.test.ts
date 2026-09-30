import { expect, test } from 'bun:test';
import { randomBytes } from 'node:crypto';
import { Hono } from 'hono';
import { eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { tournament } from '../../db/schema/tournament.ts';
import {
  userTournamentAttachment,
  userTournamentPreparation,
} from '../../db/schema/user_tournament_attachment.ts';
import { createAttachmentService } from './service.ts';
import { AttachmentError, encryptAttachment, decryptAttachment } from './storage.ts';
import { createTournamentAttachmentsRoute } from '../../routes/user-tournament-attachments.ts';
import type { AuthExtension } from '../../auth/auth.ts';

test.skipIf(process.env.TOURNAMENT_ATTACHMENT_DB_TEST !== '1')(
  'private attachment lifecycle, permissions, encryption, quotas and sanitization',
  async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
      throw new Error('Select an isolated worktree database.');
    const users = ['a', 'b'].map(suffix => `attachment-test-${crypto.randomUUID()}-${suffix}`);
    const ids = [crypto.randomUUID(), crypto.randomUUID()];
    const key = randomBytes(32),
      objects = new Map<string, Uint8Array>();
    let reads = 0,
      failDelete = false,
      failUpload = false;
    const service = createAttachmentService({
      available: () => true,
      async put(path, bytes) {
        if (failUpload) throw new AttachmentError('Upload unavailable.', 502);
        objects.set(path, encryptAttachment(bytes, path, key));
      },
      async get(path) {
        reads++;
        return decryptAttachment(objects.get(path)!, path, key);
      },
      async remove(path) {
        if (failDelete) throw new AttachmentError('Delete unavailable.', 502);
        objects.delete(path);
      },
    });
    let account: string | null = users[0];
    let failDatabase = false;
    let observedError: Error | undefined;
    const app = new Hono<AuthExtension>()
      .use('*', async (c, next) => {
        if (account)
          c.set('user', {
            id: account,
            role: account === users[1] ? 'admin' : 'user',
          } as NonNullable<AuthExtension['Variables']['user']>);
        await next();
        observedError = c.error;
      })
      .route('/attachments', createTournamentAttachmentsRoute({
        ...service,
        async list(userId, tournamentId) {
          if (failDatabase) throw new Error('SQL parameters: PRIVATE RESERVATION CODE');
          return service.list(userId, tournamentId);
        },
      }));
    const request = (path: string, method = 'GET', body?: unknown) =>
      app.request(`/attachments/${path}`, {
        method,
        headers: {
          'X-Requested-With': 'swubase',
          ...(body !== undefined
            ? {
                'Content-Type': 'application/json',
                'Content-Length': String(Buffer.byteLength(JSON.stringify(body))),
              }
            : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    const upload = async (
      bytes: Uint8Array = Buffer.from('%PDF-1.7 PRIVATE BOOKING'),
      type = 'application/pdf',
    ) => {
      const form = new FormData();
      form.set('title', 'Ticket');
      form.set('category', 'ticket');
      form.set('file', new File([bytes], 'ticket.pdf', { type }));
      const request = new Request(`http://localhost/attachments/${ids[0]}/files`, {
        method: 'POST',
        headers: { 'X-Requested-With': 'swubase' },
        body: form,
      });
      const payload = await request.arrayBuffer();
      request.headers.set('Content-Length', String(payload.byteLength));
      return app.request(request.url, { method: 'POST', headers: request.headers, body: payload });
    };
    try {
      await db
        .insert(user)
        .values(
          users.map(id => ({
            id,
            name: 'Attachments fixture',
            displayName: id,
            email: `${id}@invalid.local`,
            emailVerified: false,
            currency: 'USD',
            createdAt: new Date(),
            updatedAt: new Date(),
          })),
        );
      await db
        .insert(tournament)
        .values(
          ids.map(id => ({
            id,
            userId: users[0],
            name: 'Attachments fixture',
            type: 'pq',
            location: 'FR',
            continent: 'Europe',
            attendance: 0,
            format: 1,
            meta: null,
            days: 1,
            date: new Date('2026-10-31'),
          })),
        );
      const list = await request(ids[0]);
      expect(list.headers.get('Cache-Control')).toBe('private, no-store');
      expect((await list.json()).data).toMatchObject({
        attachments: [],
        categories: { travel: 'no', accommodation: 'no', ticket: 'no', other: 'no' },
      });
      expect((await request(`${ids[0]}/categories/travel`, 'PUT', { status: 'yes' })).status).toBe(
        200,
      );
      expect(
        (await request(`${ids[0]}/categories/accommodation`, 'PUT', { status: 'not_needed' }))
          .status,
      ).toBe(200);
      expect(
        (await request(`${ids[0]}/categories/travel`, 'PUT', { status: 'unknown' })).status,
      ).toBe(400);
      expect(
        (
          await app.request(`/attachments/${ids[0]}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{}',
          })
        ).status,
      ).toBe(403);
      expect((await request('bad-id')).status).toBe(400);
      expect((await request(crypto.randomUUID())).status).toBe(404);
      failDatabase = true;
      const internalError = await request(ids[0]);
      expect(internalError.status).toBe(500);
      expect(await internalError.text()).not.toContain('PRIVATE RESERVATION CODE');
      expect(observedError?.message).toBe('Could not process this private tournament attachment.');
      failDatabase = false;
      const text = (
        await (
          await request(ids[0], 'POST', {
            title: 'Booking',
            category: 'accommodation',
            kind: 'text',
            content: 'Private reservation <script>safe text</script>',
          })
        ).json()
      ).data;
      const link = (
        await (
          await request(ids[0], 'POST', {
            title: 'Train',
            category: 'travel',
            kind: 'link',
            content: 'https://example.com/booking',
          })
        ).json()
      ).data;
      expect(text.downloadUrl).toBeNull();
      expect(link.content).toBe('https://example.com/booking');
      for (const content of ['not a URL', 'javascript:alert(1)', 'https://u:p@example.com'])
        expect(
          (
            await request(ids[0], 'POST', {
              title: 'Bad link',
              category: 'other',
              kind: 'link',
              content,
            })
          ).status,
        ).toBe(400);
      expect(
        (
          await request(ids[0], 'POST', {
            title: 'Impersonation',
            category: 'other',
            kind: 'text',
            content: 'No',
            userId: users[1],
          })
        ).status,
      ).toBe(400);
      const response = await upload();
      expect(response.status).toBe(201);
      const file = (await response.json()).data;
      expect(file).not.toHaveProperty('userId');
      expect(file).not.toHaveProperty('objectKey');
      expect(file.fileName).toBe('ticket.pdf');
      const path = Array.from(objects.keys())[0];
      expect(path).toBe(`user-data/${users[0]}/tournament/${ids[0]}/${file.id}.pdf`);
      expect(Buffer.from(objects.get(path)!).includes(Buffer.from('PRIVATE BOOKING'))).toBe(false);
      const download = await request(`${ids[0]}/${file.id}/file`);
      expect(download.status).toBe(200);
      expect(download.headers.get('Cache-Control')).toBe('private, no-store');
      expect(download.headers.get('Content-Disposition')).toContain('attachment;');
      expect(download.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(await download.text()).toBe('%PDF-1.7 PRIVATE BOOKING');
      const priorReads = reads;
      account = users[1];
      expect((await (await request(ids[0])).json()).data.attachments).toEqual([]);
      expect((await (await request(ids[0])).json()).data.categories.travel).toBe('no');
      for (const [method, suffix, body] of [
        ['GET', '/file', undefined],
        ['DELETE', '', undefined],
        ['PATCH', '', { title: 'Steal', category: 'other' }],
      ] as const)
        expect((await request(`${ids[0]}/${file.id}${suffix}`, method, body)).status).toBe(404);
      expect(reads).toBe(priorReads);
      account = null;
      for (const [method, path] of [
        ['GET', ids[0]],
        ['GET', `${ids[0]}/${file.id}/file`],
        ['POST', ids[0]],
        ['DELETE', `${ids[0]}/${file.id}`],
        ['PUT', `${ids[0]}/categories/travel`],
      ] as const)
        expect(
          (await request(path, method, method === 'POST' || method === 'PUT' ? {} : undefined))
            .status,
        ).toBe(401);
      expect((await upload()).status).toBe(401);
      expect(reads).toBe(priorReads);
      account = users[0];
      expect((await request(`${ids[1]}/${file.id}/file`)).status).toBe(404);
      expect(
        (
          await request(`${ids[0]}/${text.id}`, 'PATCH', {
            category: 'other',
            title: 'Updated',
            content: 'Edited note',
          })
        ).status,
      ).toBe(200);
      expect(
        (
          await request(`${ids[0]}/${link.id}`, 'PATCH', {
            category: 'travel',
            title: 'Unsafe',
            content: 'javascript:alert(1)',
          })
        ).status,
      ).toBe(400);
      expect(
        (
          await request(`${ids[0]}/${file.id}`, 'PATCH', {
            category: 'ticket',
            title: 'Bad',
            content: 'No text on file',
          })
        ).status,
      ).toBe(400);
      expect(
        (await upload(Buffer.from('HTML pretending to be an image'), 'image/png')).status,
      ).toBe(400);
      expect((await upload(new Uint8Array(11 * 1024 * 1024))).status).toBe(413);
      expect(
        (await request(ids[0], 'POST', { content: 'x'.repeat(110_000) })).status,
      ).toBe(413);
      expect(
        (
          await app.request(`/attachments/${ids[0]}`, {
            method: 'POST',
            headers: { 'X-Requested-With': 'swubase', 'Content-Type': 'application/json' },
            body: 'invalid json',
          })
        ).status,
      ).toBe(400);
      failUpload = true;
      expect((await upload()).status).toBe(502);
      failUpload = false;
      expect((await service.list(users[0], ids[0])).attachments).toHaveLength(3);
      failDelete = true;
      expect((await request(`${ids[0]}/${file.id}`, 'DELETE')).status).toBe(502);
      expect((await service.list(users[0], ids[0])).attachments).toHaveLength(3);
      failDelete = false;
      const original = objects.get(path)!;
      const corrupt = new Uint8Array(original);
      corrupt[corrupt.length - 1] ^= 1;
      objects.set(path, corrupt);
      expect((await request(`${ids[0]}/${file.id}/file`)).status).toBe(502);
      objects.set(path, original);
      expect((await request(`${ids[0]}/${file.id}`, 'DELETE')).status).toBe(200);
      expect(objects.size).toBe(0);
      expect((await request(`${ids[0]}/${file.id}/file`)).status).toBe(404);
      await db
        .insert(userTournamentAttachment)
        .values(
          Array.from({ length: 98 }, (_, i) => ({
            userId: users[0],
            tournamentId: ids[0],
            category: 'other' as const,
            kind: 'text' as const,
            title: `Quota fixture ${i}`,
            content: 'test',
          })),
        );
      expect(
        (
          await request(ids[0], 'POST', {
            title: 'Over limit',
            category: 'other',
            kind: 'text',
            content: 'No',
          })
        ).status,
      ).toBe(409);
      const sanitizer = await Bun.file(
        new URL('../../../scripts/remote-dev/sql/001-core-data.sql', import.meta.url),
      ).text();
      const cleanup = sanitizer.match(
        /TRUNCATE TABLE user_tournament_attachment, user_tournament_preparation;/,
      )![0];
      const assertion = sanitizer.match(
        /IF EXISTS \(SELECT 1 FROM user_tournament_attachment\)[\s\S]*?END IF;/,
      )![0];
      await db.transaction(async tx => {
        await tx.execute(
          sql`CREATE TEMP TABLE user_tournament_attachment (secret text) ON COMMIT DROP`,
        );
        await tx.execute(
          sql`CREATE TEMP TABLE user_tournament_preparation (secret text) ON COMMIT DROP`,
        );
        await tx.execute(
          sql`INSERT INTO user_tournament_attachment VALUES ('private file'), ('private note')`,
        );
        await tx.execute(sql`INSERT INTO user_tournament_preparation VALUES ('private plans')`);
        await tx.execute(sql.raw(cleanup));
        await tx.execute(sql.raw(`DO $$ BEGIN ${assertion} END $$;`));
      });
      await db.delete(tournament).where(eq(tournament.id, ids[0]));
      expect(
        await db
          .select()
          .from(userTournamentAttachment)
          .where(eq(userTournamentAttachment.tournamentId, ids[0])),
      ).toHaveLength(0);
      expect(
        await db
          .select()
          .from(userTournamentPreparation)
          .where(eq(userTournamentPreparation.tournamentId, ids[0])),
      ).toHaveLength(0);
    } finally {
      await db.delete(tournament).where(inArray(tournament.id, ids));
      await db.delete(user).where(inArray(user.id, users));
    }
  },
  30_000,
);
