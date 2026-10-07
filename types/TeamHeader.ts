import { z } from 'zod';
import { headerImageInputSchemas, type HeaderCrop, type HeaderImageOption } from './UserHeader.ts';

export const teamHeaderInputSchema = z.discriminatedUnion('source', [
  z.strictObject({ source: z.literal('none') }),
  ...headerImageInputSchemas,
]);
export type TeamHeaderInput = z.infer<typeof teamHeaderInputSchema>;
export interface TeamHeader {
  source: 'upload' | 'gallery' | null;
  image: string | null;
  width: number | null;
  height: number | null;
}
export interface TeamHeaderSettings {
  header: TeamHeader;
  selection: HeaderImageOption | null;
  crop: HeaderCrop | null;
}
