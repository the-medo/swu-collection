import { Hono } from 'hono';
import type { AuthExtension } from '../../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { zDeckImportSwudbRequest } from '../../../../types/ZDeck.ts';
import { parseSwudbDeck } from '../../../lib/decks/deckLib.ts';
import { db } from '../../../db';
import { deck as deckTable } from '../../../db/schema/deck.ts';
import { deckCard as deckCardTable } from '../../../db/schema/deck_card.ts';
import { updateDeckInformation } from '../../../lib/decks/updateDeckInformation.ts';

export const decksImportSwudbPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', zDeckImportSwudbRequest),
  async c => {
    const data = c.req.valid('json');
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);
    const swudbDeckId = data.swudbDeckId;
    const apiUrl = `https://swudb.com/api/deck/${swudbDeckId}`;
    const deckResponse = await fetch(apiUrl);

    console.log(deckResponse);

    if (!deckResponse.ok) {
      if (deckResponse.status === 404) {
        return c.json(
          { message: `Importing deck failed. Make sure that your deck is published!` },
          404,
        );
      }

      return c.json({ message: `Error - ${deckResponse.statusText}` }, 500);
    }

    const deck = (await deckResponse.json()) as any;
    const parsedDeck = parseSwudbDeck(deck, 'asdf');

    const deckName = `${deck.deckName} by ${deck.authorName}`;

    const description =
      parsedDeck.errors.length > 0
        ? 'There was a problem pairing these cards to our system, please try to add them manually: ' +
          parsedDeck.errors.join('; ')
        : '';

    const newDeck = (
      await db
        .insert(deckTable)
        .values({
          userId: user.id,
          format: parsedDeck.format,
          name: deckName,
          leaderCardId1: parsedDeck.leader1,
          leaderCardId2: parsedDeck.leader2,
          baseCardId: parsedDeck.base,
          public: false,
          description,
        })
        .returning()
    )[0];

    await db
      .insert(deckCardTable)
      .values(parsedDeck.cards.map(c => ({ ...c, deckId: newDeck.id })));

    await updateDeckInformation(newDeck.id);

    return c.json({ data: { deck: newDeck, errors: parsedDeck.errors } }, 201);
  },
);
