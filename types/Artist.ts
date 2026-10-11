import { z } from 'zod';
import { getArtistKey } from '../shared/lib/artists.ts';

export const artistParamsSchema = z.object({
  artistKey: z.string().trim().min(1).max(255).transform(getArtistKey),
});

export type ArtistIdentity = {
  key: string;
  name: string;
  creditKeys: string[];
};

export type ArtistShowcase = ArtistIdentity & {
  biography: string | null;
  links: { id: string; label: string; url: string }[];
};
