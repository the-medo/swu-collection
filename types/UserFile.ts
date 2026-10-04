import { z } from 'zod';

export const defaultUserFileQuotaBytes = 100_000_000;
export const maxUserFileBytes = 10_000_000;
export const userFilesPageSize = 12;
export const userFileMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
export const userFileUploadInput = z.object({ file: z.instanceof(File) }).strict();
export const userFilesQuery = z.object({
  page: z.coerce.number().int().min(0).max(100_000).default(0),
});

export interface UserFile {
  id: string;
  fileName: string;
  originalByteSize: number;
  byteSize: number;
  thumbnailByteSize: number;
  width: number;
  height: number;
  createdAt: string;
  url: string;
  thumbnailUrl: string;
}
export interface UserFiles {
  files: UserFile[];
  usedBytes: number;
  quotaBytes: number;
  fileCount: number;
  hasMore: boolean;
  uploadsEnabled: boolean;
}
