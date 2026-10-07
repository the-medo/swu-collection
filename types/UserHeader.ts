import { z } from 'zod';

export const idealHeaderImageWidth = 1600;
export const minimumHeaderAspectRatio = 4;
export const minimumHeaderCropWidth = minimumHeaderAspectRatio;
export const maximumHeaderImageWidth = 8192;

export function getMaximumHeaderCropHeight(width: number) {
  return Math.floor(width / minimumHeaderAspectRatio);
}
export const maximumHeaderImageHeight = getMaximumHeaderCropHeight(maximumHeaderImageWidth);

export const headerCropSchema = z
  .strictObject({
    left: z.number().int().min(0).max(8192),
    // Large portrait sources can retain 1500 pixels of width during optimization.
    top: z.number().int().min(0).max(26_666),
    width: z.number().int().min(minimumHeaderCropWidth).max(maximumHeaderImageWidth),
    height: z.number().int().min(1).max(maximumHeaderImageHeight),
  })
  .refine(crop => crop.width >= minimumHeaderAspectRatio * crop.height, {
    path: ['height'],
    message: 'Height cannot exceed one quarter of the width (minimum 4:1 ratio).',
  });
export const headerImageInputSchemas = [
  z.strictObject({ source: z.literal('upload'), fileId: z.uuid(), crop: headerCropSchema }),
  z.strictObject({
    source: z.literal('gallery'),
    galleryImageId: z.uuid(),
    crop: headerCropSchema,
  }),
] as const;
export const userHeaderInputSchema = z.discriminatedUnion('source', [
  z.strictObject({ source: z.literal('battlefield') }),
  ...headerImageInputSchemas,
]);
export type HeaderCrop = z.infer<typeof headerCropSchema>;
export type UserHeaderInput = z.infer<typeof userHeaderInputSchema>;
export type HeaderSourceKind = UserHeaderInput['source'];
export type HeaderImageSource =
  | { source: 'upload'; fileId: string }
  | { source: 'gallery'; galleryImageId: string };

export interface UserHeader {
  source: HeaderSourceKind;
  image: string | null;
  width: number | null;
  height: number | null;
}
export interface HeaderImageOption {
  source: HeaderImageSource;
  name: string;
  url: string;
  width: number;
  height: number;
}
export interface UserHeaderSettings {
  header: UserHeader;
  selection: HeaderImageOption | null;
  crop: HeaderCrop | null;
}
