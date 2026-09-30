import { z } from 'zod';

export const attachmentCategories = ['travel', 'accommodation', 'ticket', 'other'] as const;
export const attachmentCategoryLabels = {
  travel: 'Travel',
  accommodation: 'Accommodation',
  ticket: 'Ticket',
  other: 'Other',
} as const;
export const preparationStatuses = ['yes', 'no', 'not_needed'] as const;
export const preparationStatusLabels = { yes: 'Yes', no: 'No', not_needed: 'Not needed' } as const;
export const attachmentKinds = ['file', 'text', 'link'] as const;
export const maxAttachmentBytes = 10 * 1024 * 1024;
export const attachmentMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
] as const;
export const attachmentFields = {
  category: z.enum(attachmentCategories),
  title: z.string().trim().min(1, 'Enter a title.').max(160),
};
export const privateLink = z
  .string()
  .trim()
  .max(2048)
  .url()
  .refine(value => {
    try {
      const url = new URL(value);
      return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password;
    } catch {
      return false;
    }
  }, 'Use an HTTP or HTTPS link without credentials.');
export const attachmentCreateInput = z.discriminatedUnion('kind', [
  z
    .object({
      ...attachmentFields,
      kind: z.literal('text'),
      content: z.string().trim().min(1, 'Enter some text.').max(20_000),
    })
    .strict(),
  z.object({ ...attachmentFields, kind: z.literal('link'), content: privateLink }).strict(),
]);
export const attachmentUploadInput = z
  .object({
    ...attachmentFields,
    file: z.file().min(1).max(maxAttachmentBytes).mime([...attachmentMimeTypes]),
  })
  .strict();
export const attachmentUpdateInput = z
  .object({ ...attachmentFields, content: z.string().trim().min(1).max(20_000).optional() })
  .strict();
export const preparationInput = z.object({ status: z.enum(preparationStatuses) }).strict();
export type AttachmentCategory = (typeof attachmentCategories)[number];
export type PreparationStatus = (typeof preparationStatuses)[number];
export type AttachmentCreateInput = z.infer<typeof attachmentCreateInput>;
export type AttachmentUpdateInput = z.infer<typeof attachmentUpdateInput>;
export interface TournamentAttachment {
  id: string;
  tournamentId: string;
  category: AttachmentCategory;
  kind: (typeof attachmentKinds)[number];
  title: string;
  content: string | null;
  fileName: string | null;
  mimeType: string | null;
  byteSize: number | null;
  downloadUrl: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface TournamentAttachments {
  attachments: TournamentAttachment[];
  categories: Record<AttachmentCategory, PreparationStatus>;
  uploadsEnabled: boolean;
}
export const defaultPreparation = (): TournamentAttachments['categories'] => ({
  travel: 'no',
  accommodation: 'no',
  ticket: 'no',
  other: 'no',
});
