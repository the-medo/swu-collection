import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { patreonConnection } from '../../db/schema/patreon.ts';
import { patreonConfig, PatreonError } from './config.ts';
import { memberSnapshot, type InvalidMemberSnapshot, type MemberSnapshot } from './model.ts';

type Fetcher = (input: string | URL, init?: RequestInit) => Promise<Response>;
const tokenSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  expires_in: z
    .number()
    .int()
    .positive()
    .max(365 * 86400),
});
const paginationSchema = z.object({
  data: z.array(z.unknown()),
  meta: z
    .object({
      pagination: z
        .object({
          cursors: z.object({ next: z.string().nullish() }).optional(),
        })
        .optional(),
    })
    .optional(),
});
const campaignSchema = z.object({
  data: z.array(
    z.object({ id: z.string().min(1), attributes: z.object({ currency: z.string() }) }),
  ),
});
const memberFields =
  'email,full_name,campaign_lifetime_support_cents,patron_status,last_charge_date,last_charge_status';

// Use authenticated encryption with a domain-separated key, independent of the
// legacy Karabast token format. Never return stored credentials from admin APIs.
export function tokenCodec(secret: string) {
  if (secret.length < 32)
    throw new PatreonError('TOKEN_ENCRYPTION_KEY must contain at least 32 characters.');
  const key = createHash('sha256').update('swubase:patreon:v1:').update(secret).digest();
  return {
    encrypt(value: string) {
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      const body = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
      return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64');
    },
    decrypt(value: string) {
      try {
        const bytes = Buffer.from(value, 'base64');
        const decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12));
        decipher.setAuthTag(bytes.subarray(12, 28));
        return Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString(
          'utf8',
        );
      } catch {
        throw new PatreonError(
          'Stored Patreon credentials could not be decrypted. Check the token encryption key.',
        );
      }
    },
  };
}

export function createPatreonClient({
  database = db,
  fetcher = fetch as Fetcher,
  config = patreonConfig,
} = {}) {
  async function send(url: URL, init: RequestInit) {
    try {
      return await fetcher(url, {
        ...init,
        redirect: 'error',
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new PatreonError('Patreon could not be reached. Please retry.');
    }
  }

  async function json(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      throw new PatreonError('Patreon returned an invalid response.', 502);
    }
  }

  async function accessToken(rejectedToken?: string) {
    const settings = config();
    const codec = tokenCodec(settings.encryptionKey);
    // Serialize refresh across API processes and manual syncs. The environment
    // only seeds a new connection; a restart must use the persisted token pair.
    return database.transaction(async tx => {
      await tx
        .insert(patreonConnection)
        .values({
          clientId: settings.clientId,
          accessTokenEnc: codec.encrypt(settings.accessToken),
          refreshTokenEnc: codec.encrypt(settings.refreshToken),
        })
        .onConflictDoNothing();
      const [row] = await tx
        .select()
        .from(patreonConnection)
        .where(eq(patreonConnection.clientId, settings.clientId))
        .for('update');
      const current = codec.decrypt(row.accessTokenEnc);
      if (rejectedToken && rejectedToken !== current) return current;
      if (!rejectedToken && (!row.expiresAt || row.expiresAt.getTime() > Date.now() + 60_000))
        return current;
      const response = await send(new URL('https://www.patreon.com/api/oauth2/token'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: settings.clientId,
          client_secret: settings.clientSecret,
          refresh_token: codec.decrypt(row.refreshTokenEnc),
        }),
      });
      if (!response.ok)
        throw new PatreonError('Patreon token renewal failed. Check the creator credentials.');
      const parsed = tokenSchema.safeParse(await json(response));
      if (!parsed.success)
        throw new PatreonError('Patreon returned invalid renewed credentials.', 502);
      await tx
        .update(patreonConnection)
        .set({
          accessTokenEnc: codec.encrypt(parsed.data.access_token),
          refreshTokenEnc: codec.encrypt(parsed.data.refresh_token),
          expiresAt: new Date(Date.now() + parsed.data.expires_in * 1000),
          updatedAt: new Date(),
        })
        .where(eq(patreonConnection.clientId, settings.clientId));
      return parsed.data.access_token;
    });
  }

  async function request(path: string, params: Record<string, string> = {}, allowMissing = false) {
    const url = new URL(`https://www.patreon.com/api/oauth2/v2/${path}`);
    url.search = new URLSearchParams(params).toString();
    let token = await accessToken();
    const run = () =>
      send(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
    let response = await run();
    if (response.status === 401) {
      token = await accessToken(token);
      response = await run();
    }
    if (allowMissing && response.status === 404) return null;
    if (!response.ok) {
      throw new PatreonError(
        response.status === 429
          ? 'Patreon rate limit reached. Retry later.'
          : `Patreon request failed (HTTP ${response.status}).`,
      );
    }
    return json(response);
  }

  return {
    async campaign() {
      // Check currency on every synchronization, including webhook deliveries.
      const parsed = campaignSchema.safeParse(
        await request('campaigns', { 'fields[campaign]': 'currency' }),
      );
      if (!parsed.success || parsed.data.data.length !== 1)
        throw new PatreonError('The Patreon client must have exactly one creator campaign.');
      const campaign = parsed.data.data[0];
      if (campaign.attributes.currency !== 'USD')
        throw new PatreonError('Patreon credits currently require a USD campaign.');
      const [stored] = await database
        .select()
        .from(patreonConnection)
        .where(eq(patreonConnection.clientId, config().clientId));
      if (stored.campaignId && stored.campaignId !== campaign.id)
        throw new PatreonError(
          'The Patreon campaign changed. Review the connection before syncing.',
          409,
        );
      await database
        .update(patreonConnection)
        .set({ campaignId: campaign.id, currency: 'USD' })
        .where(eq(patreonConnection.clientId, config().clientId));
      return campaign.id;
    },
    async *members(campaignId: string): AsyncGenerator<MemberSnapshot | InvalidMemberSnapshot> {
      let cursor: string | undefined;
      const seen = new Set<string>();
      do {
        const observedAt = new Date();
        const parsed = paginationSchema.safeParse(
          await request(`campaigns/${encodeURIComponent(campaignId)}/members`, {
            include: 'campaign',
            'fields[member]': memberFields,
            'page[count]': '100',
            ...(cursor ? { 'page[cursor]': cursor } : {}),
          }),
        );
        if (!parsed.success)
          throw new PatreonError('Patreon returned an invalid member page.', 502);
        for (const item of parsed.data.data) {
          try {
            yield memberSnapshot(item, campaignId, observedAt);
          } catch (error) {
            if (!(error instanceof PatreonError)) throw error;
            const identity = z.object({ id: z.string().min(1).max(200) }).safeParse(item);
            yield {
              invalid: true,
              campaignId,
              memberId: identity.success ? identity.data.id : null,
              observedAt,
            };
          }
        }
        cursor = parsed.data.meta?.pagination?.cursors?.next ?? undefined;
        if (cursor && seen.has(cursor))
          throw new PatreonError('Patreon returned a repeated page cursor.', 502);
        if (cursor) seen.add(cursor);
      } while (cursor);
    },
    async member(
      campaignId: string,
      memberId: string,
    ): Promise<{ member: MemberSnapshot | null; observedAt: Date; invalid?: boolean }> {
      const observedAt = new Date();
      const result = await request(
        `members/${encodeURIComponent(memberId)}`,
        {
          include: 'campaign',
          'fields[member]': memberFields,
        },
        true,
      );
      if (result === null) return { member: null, observedAt };
      const parsed = z.object({ data: z.unknown() }).safeParse(result);
      try {
        if (!parsed.success) throw new PatreonError('Patreon returned an invalid member.', 502);
        const member = memberSnapshot(parsed.data.data, campaignId, observedAt);
        if (member.memberId !== memberId)
          throw new PatreonError('Patreon returned a different member.', 502);
        return { member, observedAt };
      } catch (error) {
        if (!(error instanceof PatreonError)) throw error;
        return { member: null, observedAt, invalid: true };
      }
    },
  };
}

export const patreonClient = createPatreonClient();
