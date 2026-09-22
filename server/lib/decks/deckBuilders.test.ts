import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test';
import type { CardList } from '../../../lib/swu-resources/types.ts';
import { getDeckBuilderForLink, parseImportedDeck } from './deckBuilders.ts';
import { fetchDecklistView } from '../imports/tournamentImportLib.ts';
import { parseTextToSwubase } from './deckConverterService.tsx';

const cardList = {
  'maz-kanata--eclectic-pirate-queen': {
    cardId: 'maz-kanata--eclectic-pirate-queen',
    title: 'Maz Kanata',
    subtitle: 'Eclectic Pirate Queen',
    name: 'Maz Kanata, Eclectic Pirate Queen',
    type: 'Leader',
    variants: {
      'maz-kanata--eclectic-pirate-queen-2-homeworlds': {
        variantId: 'maz-kanata--eclectic-pirate-queen-2-homeworlds',
        set: 'hmw',
        cardNo: 2,
        baseSet: true,
        variantName: 'Standard',
      },
    },
  },
  'echo-base': {
    cardId: 'echo-base',
    title: 'Echo Base',
    name: 'Echo Base',
    type: 'Base',
    variants: {
      'echo-base-19-law': {
        variantId: 'echo-base-19-law',
        set: 'law',
        cardNo: 19,
        baseSet: true,
        variantName: 'Standard',
      },
    },
  },
  'rebel-assault': {
    cardId: 'rebel-assault',
    title: 'Rebel Assault',
    name: 'Rebel Assault',
    type: 'Event',
    variants: {
      'rebel-assault-208-homeworlds': {
        variantId: 'rebel-assault-208-homeworlds',
        set: 'hmw',
        cardNo: 208,
        baseSet: true,
        variantName: 'Standard',
      },
    },
  },
} as unknown as CardList;

afterEach(() => mock.restore());

describe('deck builders', () => {
  test.each([
    ['https://swudb.com/deck/abc123', 'swudb', 'abc123'],
    ['https://swuforge.com/decks/abc123', 'swuforge', 'abc123'],
    ['https://melee.gg/Decklist/View/abc123?tab=main', 'melee', 'abc123'],
    ['https://holoscan.net/decks/abc123', 'holoscan', 'abc123'],
    ['https://protectthepod.com/pool/abc_123/deck/play', 'protect-the-pod', 'abc_123'],
  ])('recognizes %s links', (link, source, deckId) => {
    const builder = getDeckBuilderForLink(link);
    expect(builder.source).toBe(source);
    expect(builder.getDeckId(link)).toBe(deckId);
  });

  test('normalizes provider card numbers and combines duplicate entries per board', () => {
    const parsed = parseImportedDeck(
      {
        metadata: { name: 'Test deck', author: 'Luke' },
        leader: { id: 'HMW_002', count: 1 },
        base: { id: 'LAW_019', count: 1 },
        deck: [
          { id: 'HMW_208', count: 2 },
          { id: 'hmw-208', count: 1 },
          { id: 'HMW_208', count: 1 },
          { id: 'UNKNOWN_001', count: 3 },
        ],
        sideboard: [{ id: 'HMW_208', count: 1 }],
      },
      cardList,
    );

    expect(parsed.name).toBe('Test deck by Luke');
    expect(parsed.leaderCardId1).toBe('maz-kanata--eclectic-pirate-queen');
    expect(parsed.baseCardId).toBe('echo-base');
    expect(parsed.cards).toEqual([
      { cardId: 'rebel-assault', board: 1, note: '', quantity: 4 },
      { cardId: 'rebel-assault', board: 2, note: '', quantity: 1 },
    ]);
    expect(parsed.errors).toEqual(['Unknown main-deck card: UNKNOWN_001.']);
  });

  test('preserves second leaders without inferring a format', () => {
    const parsed = parseImportedDeck(
      {
        metadata: { name: 'Twin Suns', author: '' },
        leader: { id: 'HMW_002', count: 1 },
        secondleader: { id: 'HMW_002', count: 1 },
        base: { id: 'LAW_019', count: 1 },
        deck: [],
        sideboard: [],
      },
      cardList,
    );

    expect(parsed.leaderCardId2).toBe('maz-kanata--eclectic-pirate-queen');
    expect(parsed).not.toHaveProperty('format');
  });

  test.each([
    'https://swudb.com/deck/example',
    'https://swuforge.com/decks/example',
    'https://holoscan.net/decks/example',
    'https://protectthepod.com/pool/example/deck/play',
  ])('ignores provider formats and performs only the deck fetch: %s', async link => {
    const fetchDeck = spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        metadata: { name: 'External deck', author: '' },
        leader: { id: 'HMW_002', count: 1 },
        base: { id: 'LAW_019', count: 1 },
        deck: [],
        sideboard: [],
        format: { providerSpecific: 'eternal' },
        deckFormat: 'Draft',
      }),
    );
    const builder = getDeckBuilderForLink(link);
    const fetched = await builder.fetchDeck(builder.getDeckId(link));

    expect(fetchDeck).toHaveBeenCalledTimes(1);
    expect(fetched).not.toHaveProperty('format');
    expect(parseImportedDeck(fetched, cardList)).not.toHaveProperty('format');
  });
});

const meleeLink = 'https://melee.gg/Decklist/View/example-deck';
const meleeHtml = `<!doctype html><html><body>
  <div class="decklist-title">Maz &amp; Friends</div>
  <pre id="decklist-swu-text">
Leader
1 &#124; Maz Kanata &#124; Eclectic Pirate Queen
Base
1 | Echo Base
MainDeck
2 | Rebel Assault
1 | Rebel Assault
Sideboard
1 | Rebel Assault
2 | Unknown Card
  </pre>
</body></html>`;

describe('Melee deck imports', () => {
  test('uses the same embedded export and card conversion as tournament imports', async () => {
    spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(meleeHtml));
    const builder = getDeckBuilderForLink(meleeLink);
    const imported = parseImportedDeck(
      await builder.fetchDeck(builder.getDeckId(meleeLink)),
      cardList,
    );
    const tournamentText = await fetchDecklistView('example-deck');
    const tournamentDeck = parseTextToSwubase(tournamentText, cardList, 'tournament-deck');

    expect(imported.name).toBe('Maz & Friends');
    expect(imported.leaderCardId1).toBe(tournamentDeck.leader1);
    expect(imported.leaderCardId2).toBe(tournamentDeck.leader2);
    expect(imported.baseCardId).toBe(tournamentDeck.base);
    expect(imported.leaderCardId1).toBe('maz-kanata--eclectic-pirate-queen');
    expect(imported.baseCardId).toBe('echo-base');
    expect(imported.cards).toEqual([
      { cardId: 'rebel-assault', board: 1, note: '', quantity: 3 },
      { cardId: 'rebel-assault', board: 2, note: '', quantity: 1 },
    ]);
    expect(tournamentDeck.deckCards.map(card => card.quantity)).toEqual([2, 1, 1]);
    expect(imported.errors).toEqual(['Unknown card: 2x Unknown Card.']);
    expect(imported.errors).toEqual(tournamentDeck.errors);
  });

  test('preserves the second leader from the embedded text export', async () => {
    const twinSunsHtml = meleeHtml.replace(
      '\nBase\n',
      '\n1 | Leia Organa | Alliance General\nBase\n',
    );
    const twinSunsCards = {
      ...cardList,
      'leia-organa--alliance-general': {
        ...cardList['maz-kanata--eclectic-pirate-queen']!,
        cardId: 'leia-organa--alliance-general',
        name: 'Leia Organa, Alliance General',
      },
    };
    spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(twinSunsHtml));
    const builder = getDeckBuilderForLink(meleeLink);
    const imported = parseImportedDeck(await builder.fetchDeck('example-deck'), twinSunsCards);

    expect(imported.leaderCardId2).toBe('leia-organa--alliance-general');
    expect(imported).not.toHaveProperty('format');
  });

  test.each([
    '<html><body>Private deck</body></html>',
    '<pre id="decklist-swu-text">  </pre>',
    '<div class="decklist-category"><div class="decklist-record">Not the SWU export</div></div>',
  ])('rejects pages without a usable embedded SWU export: %s', async html => {
    spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(html));
    const builder = getDeckBuilderForLink(meleeLink);

    await expect(builder.fetchDeck('example-deck')).rejects.toMatchObject({ status: 502 });
  });

  test('rejects an export without a leader and base before it can replace deck contents', async () => {
    spyOn(globalThis, 'fetch').mockImplementation(
      async () => new Response('<pre id="decklist-swu-text">MainDeck\n3 | Rebel Assault</pre>'),
    );
    const builder = getDeckBuilderForLink(meleeLink);
    const sourceDeck = await builder.fetchDeck('example-deck');

    expect(() => parseImportedDeck(sourceDeck, cardList)).toThrow('parseable leader and base');
  });

  test('preserves not-found errors from Melee', async () => {
    spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('', { status: 404 }));
    const builder = getDeckBuilderForLink(meleeLink);

    await expect(builder.fetchDeck('example-deck')).rejects.toMatchObject({ status: 404 });
  });
});
