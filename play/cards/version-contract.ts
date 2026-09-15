import { z } from 'zod';
export const bundleVersionsSchema = z.strictObject({
  state: z.number().int().positive(),
  engine: z.string().min(1).max(100),
  cards: z.string().min(1).max(100),
  rules: z.string().min(1).max(100),
  format: z.string().min(1).max(100),
});
export type BundleVersions = z.infer<typeof bundleVersionsSchema>;
