import { z } from 'zod';

export const recommendedHeaderImageWidth = 1500;
export const imageGalleryPageSize = 12;
export const imageGalleryQuery = z.object({
  page: z.coerce.number().int().min(0).max(100_000).default(0),
});
export const imageGalleryUploadInput = z.strictObject({
  title: z.string().trim().min(1).max(120),
  file: z.instanceof(File),
});

export interface GalleryImage {
  id: string;
  title: string;
  width: number;
  height: number;
  createdAt: string;
  url: string;
  thumbnailUrl: string;
}

export interface ImageGallery {
  images: GalleryImage[];
  hasMore: boolean;
  uploadsEnabled: boolean;
}
