import { z } from 'zod';

export const creationReportMaxLength = 1000;
export const creationReportSchema = z
  .object({
    clientReportId: z.uuid(),
    details: z.string().trim().max(creationReportMaxLength).default(''),
  })
  .strict();
export const creationReportListSchema = z.object({
  status: z.enum(['open', 'resolved']).default('open'),
  page: z.coerce.number().int().min(1).max(10000).default(1),
});
export const creationReportDecisionSchema = z
  .object({
    action: z.enum(['dismiss', 'unpublish']),
    publishedRevision: z.number().int().positive().nullable(),
  })
  .strict();
export type CreationReportDecision = z.infer<typeof creationReportDecisionSchema>;
export type CreationReportReceipt = { id: string; createdAt: string };
export type CreationReportList = {
  items: {
    id: string;
    creationId: string;
    title: string;
    sourceUrl: string;
    details: string;
    status: 'open' | 'dismissed' | 'unpublished';
    createdAt: string;
    resolvedAt: string | null;
    creatorName: string;
    publishedRevision: number | null;
  }[];
  hasMore: boolean;
};
