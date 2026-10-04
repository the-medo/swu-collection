import { z } from 'zod';

export const avatarSize = 256;
export const minimumAvatarCropSize = 100;

export const avatarCropSchema = z.strictObject({
  left: z.number().int().min(0).max(8192),
  top: z.number().int().min(0).max(8192),
  size: z.number().int().min(minimumAvatarCropSize).max(8192),
});

export const userAvatarInputSchema = z.strictObject({
  cardId: z.string().min(1).max(200),
  variantId: z.string().min(1).max(200),
  side: z.enum(['front', 'back']),
  crop: avatarCropSchema,
});

export type AvatarCrop = z.infer<typeof avatarCropSchema>;
export type UserAvatarInput = z.infer<typeof userAvatarInputSchema>;
export type UserAvatarSource = Pick<UserAvatarInput, 'cardId' | 'variantId' | 'side'>;
