import { Hono } from 'hono';
import { z } from 'zod';
import type { AuthExtension } from '../../../../../../auth/auth.ts';
import { auth } from '../../../../../../auth/auth.ts';
import { resolveDeckReference } from '../../../../../../lib/decks/resolveDeckReference.ts';
import { canReadDeck, getDeckPermissions } from '../../../../../../lib/decks/getDeckPermissions.ts';
import { getDeckVersionDiff } from '../../../../../../lib/decks/getDeckVersionDiff.ts';

export const deckIdVersionDiffGetRoute = new Hono<AuthExtension>().get('/', async c => {
  const referenceId = z.guid().parse(c.req.param('id'));
  const versionId = z.guid().parse(c.req.param('versionId'));
  const resolved = await resolveDeckReference(referenceId);
  if (!resolved) return c.json({ message: "Deck doesn't exist" }, 404);

  const user = c.get('user');
  const isAdmin = user
    ? (
        await auth.api.userHasPermission({
          body: { userId: user.id, permission: { admin: ['access'] } },
        })
      ).success
    : false;
  const permissions = await getDeckPermissions(
    resolved.deck,
    user?.id ?? null,
    isAdmin,
    resolved.reference.kind,
  );
  if (!canReadDeck(resolved.deck, permissions)) {
    return c.json({ message: "Deck doesn't exist or you don't have access to it" }, 404);
  }

  try {
    return c.json({ data: await getDeckVersionDiff(resolved.deck.id, versionId) });
  } catch {
    return c.json({ message: 'Deck version does not exist' }, 404);
  }
});
