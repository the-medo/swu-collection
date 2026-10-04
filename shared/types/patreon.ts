import { z } from 'zod';

export const patreonListQuery = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
});

export type PatreonMemberView = {
  memberId: string;
  email: string | null;
  name: string | null;
  userId: string | null;
  displayName: string | null;
  patronStatus: string | null;
  lastChargeAt: string | null;
  lastChargeStatus: string | null;
  lifetimeCents: number | null;
  creditedCents: number;
  balance: number | null;
  reviewReason: string | null;
  reviewedAt: string | null;
  observedAt: string;
};

export type PatreonOverview = {
  configured: boolean;
  webhookConfigured: boolean;
  campaignId: string | null;
  currency: string | null;
  lastSyncAt: string | null;
  lastSyncSkipped: number;
  lastWebhookAt: string | null;
  total: number;
  page: number;
  pageSize: number;
  members: PatreonMemberView[];
};

export type PatreonSyncResult = {
  members: number;
  skipped: number;
  awards: number;
  credits: number;
};
