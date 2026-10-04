import { z } from 'zod';

export const reportListSchema = z.object({
  status: z.enum(['open', 'resolved', 'all']).default('open'),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  userId: z.string().min(1).max(200).optional(),
  direction: z.enum(['sent', 'received', 'all']).default('all'),
});
export type ReportListInput = z.infer<typeof reportListSchema>;
export const moderationActionSchema = z
  .strictObject({
    clientActionId: z.uuid(),
    revision: z.number().int().min(0),
    action: z.enum(['dismiss', 'suspend', 'ban', 'restore', 'reopen']),
    target: z.enum(['reported', 'reporter']).default('reported'),
    reason: z
      .string()
      .trim()
      .min(1, 'Explain this decision.')
      .max(2000)
      .refine(value => !value.includes('\0'), 'Remove invalid characters.'),
    durationDays: z.number().int().min(1).max(365).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.action === 'suspend' && value.durationDays === undefined)
      ctx.addIssue({
        code: 'custom',
        path: ['durationDays'],
        message: 'Choose a suspension duration.',
      });
    if (value.action !== 'suspend' && value.durationDays !== undefined)
      ctx.addIssue({
        code: 'custom',
        path: ['durationDays'],
        message: 'Only suspensions have a duration.',
      });
  });
export type ModerationActionInput = z.infer<typeof moderationActionSchema>;
export const moderationActionLabels = {
  dismiss: 'Close without action',
  suspend: 'Suspend account',
  ban: 'Ban account',
  restore: 'Restore account access',
  reopen: 'Reopen report',
} as const;
export type ReportHistoryCounts = { sent: number; received: number; openReceived: number };
export type ModerationUser = {
  id: string;
  displayName: string;
  exists: boolean;
  protected: boolean;
  restriction: 'none' | 'suspended' | 'banned';
  expiresAt: string | null;
  counts: ReportHistoryCounts;
};
export type AdminUserReport = {
  id: string;
  reporterUserId: string | null;
  reportedUserId: string | null;
  reporterIdAtSubmission: string | null;
  reportedIdAtSubmission: string | null;
  reporterDisplayName: string | null;
  reportedDisplayName: string | null;
  description: string;
  source: 'profile' | 'conversation';
  createdAt: string;
  status: 'open' | 'resolved';
  resolvedAt: string | null;
  revision: number;
};
export type ModerationAction = {
  id: string;
  reportId: string;
  actorIdAtAction: string;
  actorDisplayName: string;
  targetIdAtAction: string | null;
  targetDisplayName: string | null;
  action: ModerationActionInput['action'];
  reason: string;
  expiresAt: string | null;
  createdAt: string;
};
export type ReportPage = {
  reports: AdminUserReport[];
  total: number;
  page: number;
  pageSize: number;
};
export type ReportDetail = {
  report: AdminUserReport;
  reporter: ModerationUser | null;
  reported: ModerationUser | null;
  actions: ModerationAction[];
};
export type ModerationActionPage = {
  actions: ModerationAction[];
  total: number;
  page: number;
  pageSize: number;
};
