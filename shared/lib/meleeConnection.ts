import { z } from 'zod';

export const meleeUsernameSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    'Enter your Melee username (the last part of your public profile URL).',
  );

export const meleeChallengeInputSchema = z.object({ username: meleeUsernameSchema });

export const meleeProfileUrl = (username: string) =>
  `https://melee.gg/Profile/Index/${encodeURIComponent(username)}`;

export type MeleeConnectionStatus = {
  connection: {
    meleeUserId: string;
    username: string;
    displayName: string;
    linkedAt: string;
  } | null;
  challenge: {
    username: string;
    code: string;
    expiresAt: string;
  } | null;
};
