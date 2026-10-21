import { MCP_SCOPE, MCP_DECK_SCOPE } from '../../shared/mcp/config.ts';
import { cardLookupInput, cardSearchInput, getCards, searchCards } from '../cards.ts';
import {
  deckDetails,
  deckGetInput,
  deckListInput,
  deckSummary,
  type DeckRepository,
} from '../decks.ts';
import { defineTool, readOnly } from './definition.ts';
import { ToolFailure } from './results.ts';

export function createCatalogTools(decks: DeckRepository) {
  return [
    defineTool({
      name: 'search_cards',
      description:
        'Search official Star Wars Unlimited cards by name/ID or aspect, printed keyword, trait, type, arena, set, numeric stats and rules text. Supply a query or filters. Results include full card text and SWUBASE links. Preview cards are excluded. Pagination is bounded; this does not check deck legality.',
      inputSchema: cardSearchInput,
      scopes: [MCP_SCOPE],
      annotations: readOnly,
      execute: (input, { websiteOrigin }) => searchCards(input, websiteOrigin),
      count: data => data.cards.length,
    }),
    defineTool({
      name: 'get_cards',
      description:
        'Read full official card details for up to 25 exact logical SWUBASE card IDs. Preserve requested order, deduplicate IDs and report unavailable IDs in missingCardIds. Use this to inspect candidates or deck references; preview cards are excluded.',
      inputSchema: cardLookupInput,
      scopes: [MCP_SCOPE],
      annotations: readOnly,
      execute: (input, { websiteOrigin }) => getCards(input, websiteOrigin),
      count: data => data.cards.length,
    }),
    defineTool({
      name: 'list_my_decks',
      description:
        'Find the authenticated user’s saved decks, including private decks. Filter by name, exact leader/base card ID or format ID. Returns bounded summaries sorted by latest update, deck IDs and links. Requires decks:read consent.',
      inputSchema: deckListInput,
      scopes: [MCP_DECK_SCOPE],
      annotations: readOnly,
      execute: async (input, { actor, websiteOrigin }) => {
        const result = await decks.listDecks(actor.userId, input);
        return {
          total: result.total,
          offset: input.offset,
          limit: input.limit,
          decks: result.decks.map(row => deckSummary(row, websiteOrigin)),
        };
      },
      count: data => data.decks.length,
    }),
    defineTool({
      name: 'get_deck',
      description:
        'Read a deck by UUID from list_my_decks or a SWUBASE deck URL. Uses SWUBASE access rules: owned private decks, public/unlisted decks, and decks shared through folders. Returns leader/base, format, description and quantities in separate main, sideboard and maybeboard lists. Card-pool locations use SWUBASE’s board mapping; unknown pool IDs remain unclassified. Unknown/preview card IDs are explicitly reported; use get_cards for full official card text. Requires decks:read consent.',
      inputSchema: deckGetInput,
      scopes: [MCP_DECK_SCOPE],
      annotations: readOnly,
      execute: async (input, { actor, websiteOrigin }) => {
        const result = await decks.getDeck(actor.userId, input.deckId);
        if (!result) throw new ToolFailure('Deck not found or unavailable to your account.', 404);
        if ('tooLarge' in result)
          throw new ToolFailure('This deck exceeds the supported content limit.', 413);
        return deckDetails(result, websiteOrigin);
      },
      count: () => 1,
    }),
  ] as const;
}
