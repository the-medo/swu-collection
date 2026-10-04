import { z } from 'zod';
import { PatreonError } from './config.ts';

const reference = z.object({ id: z.string().min(1).max(200), type: z.string() });
export const memberResourceSchema = z.object({
  id: z.string().min(1).max(200),
  type: z.literal('member'),
  attributes: z.object({
    email: z.string().max(320).nullish(),
    full_name: z.string().max(1000).nullish(),
    campaign_lifetime_support_cents: z.number().int().min(0).max(900719925474099).nullish(),
    patron_status: z.string().max(100).nullish(),
    last_charge_date: z.iso.datetime({ offset: true }).nullish(),
    last_charge_status: z.string().max(100).nullish(),
  }),
  relationships: z.object({ campaign: z.object({ data: reference }) }),
});

export type MemberSnapshot = {
  campaignId: string;
  memberId: string;
  email: string | null;
  name: string | null;
  lifetimeCents: number | null;
  patronStatus: string | null;
  lastChargeAt: Date | null;
  lastChargeStatus: string | null;
  observedAt: Date;
};

export type InvalidMemberSnapshot = {
  invalid: true;
  campaignId: string;
  memberId: string | null;
  observedAt: Date;
};

export function normalizedEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() || null;
}

export function memberSnapshot(
  resource: unknown,
  campaignId: string,
  observedAt: Date,
): MemberSnapshot {
  const result = memberResourceSchema.safeParse(resource);
  if (
    !result.success ||
    result.data.relationships.campaign.data.id !== campaignId ||
    result.data.relationships.campaign.data.type !== 'campaign'
  ) {
    throw new PatreonError('Patreon returned an invalid member record.', 502);
  }
  const { id, attributes: a } = result.data;
  return {
    campaignId,
    memberId: id,
    observedAt,
    email: normalizedEmail(a.email),
    name: a.full_name ?? null,
    lifetimeCents: a.campaign_lifetime_support_cents ?? null,
    patronStatus: a.patron_status ?? null,
    lastChargeAt: a.last_charge_date ? new Date(a.last_charge_date) : null,
    lastChargeStatus: a.last_charge_status ?? null,
  };
}
