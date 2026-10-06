import { z } from 'zod';

export const MAX_TEAM_BOOKMARKS = 20;

export const zTeamBookmarkRequest = z.strictObject({
  label: z.string().trim().min(1, 'Enter a label').max(100),
  url: z
    .string()
    .trim()
    .max(2048)
    .pipe(
      z.url({
        protocol: /^https?$/,
        error: 'Enter a valid http:// or https:// URL',
      }),
    ),
});

export type ZTeamBookmarkRequest = z.infer<typeof zTeamBookmarkRequest>;

export type TeamBookmark = ZTeamBookmarkRequest & {
  id: string;
  teamId: string;
  createdAt: string;
};
