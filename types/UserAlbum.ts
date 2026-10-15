import { z } from 'zod';

export const userAlbumPageSize = 12;
export const albumVisibility = z.enum(['private', 'unlisted', 'public']);
export type AlbumVisibility = z.infer<typeof albumVisibility>;
export const userAlbumQuery = z.object({
  page: z.coerce.number().int().min(0).max(100_000).default(0),
  revision: z.coerce.number().int().min(0).optional(),
});
export const userAlbumListQuery = z
  .strictObject({
    beforeCreatedAt: z.iso.datetime({ offset: true }).optional(),
    beforeId: z.uuid().optional(),
  })
  .refine(value => !!value.beforeCreatedAt === !!value.beforeId, 'Provide both cursor fields.');
export interface UserAlbumCursor {
  beforeCreatedAt: string;
  beforeId: string;
}
const title = z.string().trim().min(1).max(120);
const description = z.string().trim().max(2000);
export const createUserAlbumInput = z.strictObject({
  title,
  description: description.default(''),
  visibility: albumVisibility.default('unlisted'),
  tournamentId: z.uuid().optional(),
});
export const albumRevisionInput = z.strictObject({ revision: z.number().int().min(0) });
export const updateUserAlbumInput = albumRevisionInput.extend({
  title: title.optional(),
  description: description.optional(),
  visibility: albumVisibility.optional(),
  coverFileId: z.uuid().nullable().optional(),
  tournamentId: z.uuid().nullable().optional(),
});
export const addAlbumImagesInput = albumRevisionInput.extend({
  fileIds: z.array(z.uuid()).min(1).max(100),
});
export const updateAlbumImageInput = albumRevisionInput.extend({
  caption: z.string().trim().max(500).optional(),
  altText: z.string().trim().max(300).optional(),
  move: z
    .discriminatedUnion('type', [
      z.strictObject({ type: z.literal('earlier') }),
      z.strictObject({ type: z.literal('later') }),
      z.strictObject({ type: z.literal('before'), fileId: z.uuid() }),
    ])
    .optional(),
});

export interface UserAlbumImage {
  fileId: string;
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  caption: string;
  altText: string;
  position: number;
}
export const albumTournamentSearchQuery = z.object({
  q: z.string().trim().max(200).default(''),
  page: z.coerce.number().int().min(0).max(100_000).default(0),
});
export interface AlbumTournament {
  id: string;
  name: string;
  date: string;
  location: string;
}
export interface AlbumTournamentOptions {
  tournaments: AlbumTournament[];
  hasMore: boolean;
}
export interface TournamentAlbum extends UserAlbum {
  owner: { id: string; displayName: string };
}
export interface TournamentAlbumList extends Omit<UserAlbumList, 'albums'> {
  albums: TournamentAlbum[];
}
export interface UserAlbum {
  id: string;
  userId: string;
  title: string;
  description: string;
  visibility: AlbumVisibility;
  coverFileId: string | null;
  tournamentId: string | null;
  tournament: AlbumTournament | null;
  cover: Pick<UserAlbumImage, 'fileId' | 'thumbnailUrl' | 'altText'> | null;
  imageCount: number;
  revision: number;
  createdAt: string;
  updatedAt: string;
}
export interface UserAlbumPage {
  album: UserAlbum;
  owner: { id: string; displayName: string };
  images: UserAlbumImage[];
  hasMore: boolean;
}
export interface UserAlbumList {
  albums: UserAlbum[];
  hasMore: boolean;
  nextCursor: UserAlbumCursor | null;
}
export interface AlbumMutationResult {
  id: string;
  revision: number;
}
