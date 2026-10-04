import { z } from 'zod';

export const userReportMaxLength = 2000;
export const createUserReportSchema = z.strictObject({
  reportedUserId: z.string().trim().min(1).max(200),
  description: z
    .string()
    .trim()
    .min(1, 'Describe why you are reporting this user.')
    .max(userReportMaxLength)
    .refine(value => !value.includes('\0'), 'Remove invalid characters from your description.'),
  source: z.enum(['profile', 'conversation']),
  clientReportId: z.uuid(),
});
export type CreateUserReportInput = z.infer<typeof createUserReportSchema>;
export type UserReportReceipt = { id: string; createdAt: string };
