import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '../../auth/auth.ts';
import { db } from '../../db/index.ts';
import { deck } from '../../db/schema/deck.ts';
import { getMergedCardList } from '../cards/cardListProvider.ts';
import { readDeckInput } from '../crossfire/readDeckInput.ts';
import { prepareDeckSnapshot } from '../../../play/admission/decks.ts';
import { versions } from '../../../play/engine/model.ts';

/** CLI used only by the private development dashboard. The browser cannot
 * choose a user ID; Better Auth validates its cookie before deck admission. */
export async function inspectDeck(raw: unknown) {
  const request = z.strictObject({ deckId: z.uuid(), cookie: z.string().max(16384) }).parse(raw);
  const session = request.cookie
    ? await auth.api.getSession({ headers: new Headers({ cookie: request.cookie }) })
    : null;
  const catalog = await getMergedCardList();
  const input = await readDeckInput(db, session?.user.id ?? null, request.deckId, catalog);
  if (!input)
    return {
      ok: false as const,
      message: 'Deck unavailable. Use a shared deck or sign in as its owner.',
    };
  const [row] = await db.select({ name: deck.name }).from(deck).where(eq(deck.id, request.deckId));
  const result = prepareDeckSnapshot(input, catalog, versions.format);
  const inspection = {
    deckId: request.deckId,
    name: (row?.name || 'Untitled deck').slice(0, 100),
    leader: input.leader,
    leaderName: (input.leader && catalog[input.leader]?.name) || 'Unknown leader',
    baseName: (input.base && catalog[input.base]?.name) || 'Unknown base',
    cards: input.mainboard.reduce((n, c) => n + c.quantity, 0),
    ready: result.ok,
    issues: result.ok ? [] : result.issues,
    ...(result.ok ? { contentHash: result.snapshot.contentHash } : {}),
  };
  return { ok: true as const, inspection, ...(result.ok ? { snapshot: result.snapshot } : {}) };
}

if (import.meta.main) {
  try {
    const input = await Bun.stdin.text();
    if (Buffer.byteLength(input) > 20000) throw new Error('Oversized request');
    process.stdout.write(JSON.stringify(await inspectDeck(JSON.parse(input))) + '\n');
    process.exit(0);
  } catch {
    process.stdout.write(
      JSON.stringify({
        ok: false,
        message: 'Could not validate the deck. Check the local backend database and try again.',
      }) + '\n',
    );
    process.exit(1);
  }
}
