import { z } from 'zod';

export const uuidSchema = z.string().uuid();

export const isUuid = (value?: string | null): value is string => {
  return typeof value === 'string' && uuidSchema.safeParse(value).success;
};
