import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { asc, eq, inArray } from 'drizzle-orm';
import type { AuthExtension } from '../auth/auth.ts';
import { db } from '../db';
import { artist, artistAlias, artistLink } from '../db/schema/artist.ts';
import { getMergedCardList } from '../lib/cards/cardListProvider.ts';
import { getArtistPrintings, isArtistLinkUrl } from '../../shared/lib/artists.ts';
import {
  artistParamsSchema,
  type ArtistIdentity,
  type ArtistShowcase,
} from '../../types/Artist.ts';

export const artistsRoute = new Hono<AuthExtension>()
  .get('/', async c => {
    const profiles = await db.select({ key: artist.key, name: artist.name }).from(artist);
    const aliases = await db.select().from(artistAlias);
    const aliasKeys = new Set(aliases.map(alias => alias.key));
    const data: ArtistIdentity[] = profiles
      .filter(profile => !aliasKeys.has(profile.key))
      .map(profile => ({
        ...profile,
        creditKeys: [
          profile.key,
          ...aliases
            .filter(alias => alias.canonicalKey === profile.key)
            .map(alias => alias.key)
            .sort(),
        ],
      }));
    return c.json({ data });
  })
  .get('/:artistKey', zValidator('param', artistParamsSchema), async c => {
    const { artistKey } = c.req.valid('param');
    const [alias] = await db.select().from(artistAlias).where(eq(artistAlias.key, artistKey));
    const key = alias?.canonicalKey ?? artistKey;
    const aliases = await db.select().from(artistAlias).where(eq(artistAlias.canonicalKey, key));
    const creditKeys = [key, ...aliases.map(alias => alias.key).sort()];
    const profiles = await db
      .select()
      .from(artist)
      .where(inArray(artist.key, creditKeys))
      .orderBy(asc(artist.key));
    const profile = profiles.find(profile => profile.key === key);
    // Hidden duplicate treatments still establish an artist's catalog identity.
    const printings = getArtistPrintings(await getMergedCardList(), key, {
      includeDuplicates: true,
      creditKeys,
    });
    if (!profile && !printings.length) return c.json({ message: 'Artist not found' }, 404);

    const links = profiles.length
      ? await db
          .select({
            id: artistLink.id,
            artistId: artistLink.artistId,
            label: artistLink.label,
            url: artistLink.url,
          })
          .from(artistLink)
          .where(
            inArray(
              artistLink.artistId,
              profiles.map(profile => profile.id),
            ),
          )
          .orderBy(asc(artistLink.position), asc(artistLink.id))
      : [];

    const seenUrls = new Set<string>();
    const publicLinks = links
      .sort((a, b) => Number(b.artistId === profile?.id) - Number(a.artistId === profile?.id))
      .filter(link => {
        if (!isArtistLinkUrl(link.url) || seenUrls.has(link.url)) return false;
        seenUrls.add(link.url);
        return true;
      })
      .map(({ id, label, url }) => ({ id, label, url }));
    const data: ArtistShowcase = {
      key,
      creditKeys,
      name: profile?.name ?? printings[0].variant.artist.trim(),
      biography:
        profile?.biography || profiles.find(profile => profile.biography)?.biography || null,
      links: publicLinks,
    };
    return c.json({ data });
  });
