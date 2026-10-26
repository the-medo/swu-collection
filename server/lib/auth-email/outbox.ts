import { and, asc, eq, gt, lt, lte, sql } from 'drizzle-orm';
import { mkdir, writeFile } from 'node:fs/promises';
import { db } from '../../db';
import { authEmailOutbox } from '../../db/schema/auth-email.ts';
import { getAuthEmailConfig } from './config.ts';
import { openEmail, recipientHash, sealEmail } from './crypto.ts';
import { authEmailSchema, renderAuthEmail, type AuthEmail } from './template.ts';
import { z } from 'zod';

const payloadSchema = z.object({
  mode: z.enum(['capture', 'resend']),
  origin: z.url(),
  email: authEmailSchema,
  message: z.object({
    from: z.string(),
    to: z.array(z.email()),
    reply_to: z.string().optional(),
    subject: z.string(),
    html: z.string(),
    text: z.string(),
    attachments: z.array(
      z.object({ filename: z.string(), content: z.string(), content_id: z.string() }),
    ),
  }),
});

let headerContent: Promise<string> | undefined;
function emailHeader() {
  return (headerContent ??= Bun.file(new URL('./assets/header.png', import.meta.url))
    .arrayBuffer()
    .then(bytes => Buffer.from(bytes).toString('base64')));
}

export async function enqueueAuthEmail(email: AuthEmail) {
  const config = getAuthEmailConfig();
  if (!config.enabled) throw new Error('Auth email is disabled');
  authEmailSchema.parse(email);
  const url = new URL(email.url);
  if (url.origin !== config.origin || !/^\/(api\/auth\/|auth\/)/.test(url.pathname)) {
    throw new Error('Invalid auth email action origin or path');
  }
  const hash = recipientHash(email.to);
  const header = await emailHeader();
  const message = {
    from: config.from,
    to: [email.to],
    ...(config.replyTo ? { reply_to: config.replyTo } : {}),
    ...renderAuthEmail(email),
    attachments: [
      {
        filename: 'swubase-header.png',
        content: header,
        content_id: 'swubase-header',
      },
    ],
  };
  // Persist the exact request, including artwork, so deployment changes cannot
  // change a retried Resend request using the same idempotency key.
  const payload = sealEmail({ mode: config.mode, origin: config.origin, email, message });
  return db.transaction(async tx => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`auth-email:${hash}`}, 0))`,
    );
    const recent = await tx
      .select({ createdAt: authEmailOutbox.createdAt })
      .from(authEmailOutbox)
      .where(
        and(
          eq(authEmailOutbox.recipientHash, hash),
          eq(authEmailOutbox.kind, email.kind),
          gt(
            authEmailOutbox.createdAt,
            new Date(Date.now() - (email.kind === 'existing-account' ? 86400_000 : 3600_000)),
          ),
        ),
      )
      .orderBy(asc(authEmailOutbox.createdAt));
    // The response stays generic; cooldowns never disclose whether an account exists.
    if (
      (email.kind === 'existing-account' && recent.length > 0) ||
      recent.length >= 10 ||
      recent.some(row => row.createdAt.getTime() > Date.now() - 60_000)
    )
      return;
    const [row] = await tx
      .insert(authEmailOutbox)
      .values({
        recipientHash: hash,
        kind: email.kind,
        payload,
        expiresAt: new Date(Date.now() + 55 * 60_000),
      })
      .returning({ id: authEmailOutbox.id });
    return row.id;
  });
}

export class AuthEmailDeliveryError extends Error {
  constructor(
    readonly code: string,
    readonly permanent = false,
  ) {
    super(code);
  }
}

type EmailPayload = z.infer<typeof payloadSchema>;
export async function deliverAuthEmail(id: string, payload: EmailPayload) {
  const config = getAuthEmailConfig();
  if (config.mode !== payload.mode || config.origin !== payload.origin) {
    throw new AuthEmailDeliveryError('configuration_changed', true);
  }
  if (config.mode === 'capture') {
    const directory = '.swubase/auth-emails';
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await writeFile(`${directory}/${id}.json`, JSON.stringify(payload, null, 2), { mode: 0o600 });
    const html = payload.message.html.replace(
      'cid:swubase-header',
      `data:image/png;base64,${payload.message.attachments[0].content}`,
    );
    await writeFile(`${directory}/${id}.html`, html, { mode: 0o600 });
    return;
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `swubase-auth/${id}`,
    },
    body: JSON.stringify(payload.message),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    // Never persist/log the provider response: it may echo a recipient or token.
    await response.body?.cancel();
    throw new AuthEmailDeliveryError(
      `http_${response.status}`,
      response.status >= 400 && response.status < 500 && ![408, 409, 429].includes(response.status),
    );
  }
  await response.body?.cancel();
}

export async function processAuthEmails({ limit = 20, deliver = deliverAuthEmail } = {}) {
  if (!getAuthEmailConfig().enabled) return { sent: 0, failed: 0, retrying: 0, expired: 0 };
  const expired = await db
    .update(authEmailOutbox)
    .set({ status: 'expired', payload: null, lastError: 'expired' })
    .where(and(eq(authEmailOutbox.status, 'pending'), lte(authEmailOutbox.expiresAt, new Date())))
    .returning({ id: authEmailOutbox.id });
  await db
    .delete(authEmailOutbox)
    .where(lt(authEmailOutbox.createdAt, new Date(Date.now() - 7 * 86400_000)));
  const result = { sent: 0, failed: 0, retrying: 0, expired: expired.length };
  const deadline = Date.now() + 45_000;
  for (let i = 0; i < limit && Date.now() < deadline; i++) {
    const status = await db.transaction(async tx => {
      const [row] = await tx
        .select()
        .from(authEmailOutbox)
        .where(
          and(
            eq(authEmailOutbox.status, 'pending'),
            lte(authEmailOutbox.nextAttemptAt, new Date()),
            gt(authEmailOutbox.expiresAt, new Date()),
          ),
        )
        .orderBy(asc(authEmailOutbox.createdAt))
        .limit(1)
        .for('update', { skipLocked: true });
      if (!row) return null;
      try {
        const payload = payloadSchema.parse(openEmail(row.payload!));
        await deliver(row.id, payload);
        await tx
          .update(authEmailOutbox)
          .set({ status: 'sent', payload: null, attempts: row.attempts + 1, lastError: null })
          .where(eq(authEmailOutbox.id, row.id));
        return 'sent' as const;
      } catch (error) {
        const attempts = row.attempts + 1;
        const terminal =
          attempts >= 5 || (error instanceof AuthEmailDeliveryError && error.permanent);
        await tx
          .update(authEmailOutbox)
          .set({
            attempts,
            status: terminal ? 'failed' : 'pending',
            ...(terminal ? { payload: null } : {}),
            nextAttemptAt: new Date(Date.now() + 60_000 * 2 ** (attempts - 1)),
            lastError: error instanceof AuthEmailDeliveryError ? error.code : 'delivery_failed',
          })
          .where(eq(authEmailOutbox.id, row.id));
        return terminal ? ('failed' as const) : ('retrying' as const);
      }
    });
    if (!status) break;
    result[status]++;
  }
  return result;
}
