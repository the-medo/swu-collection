import { z } from 'zod';

export const eventHighlightInput = z
  .object({
    date: z.iso.date(),
    imageUrl: z
      .string()
      .trim()
      .max(2048)
      .url()
      .refine(value => {
        let url: URL;
        try {
          url = new URL(value);
        } catch {
          return false;
        }
        return (
          url.protocol === 'https:' &&
          url.hostname === 'images.swubase.com' &&
          !url.port &&
          !url.username &&
          !url.password
        );
      }, 'Use an HTTPS image URL from images.swubase.com.'),
    description: z.string().trim().min(1, 'Enter a description.').max(2000),
  })
  .strict();

export type EventHighlightInput = z.infer<typeof eventHighlightInput>;
export interface EventHighlight extends EventHighlightInput {
  id: string;
  updatedAt: string;
}
