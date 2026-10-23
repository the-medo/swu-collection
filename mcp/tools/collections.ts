import { MCP_COLLECTION_READ_SCOPE, MCP_DECK_SCOPE } from '../../shared/mcp/config.ts';
import {
  collectionListInput,
  ownershipInput,
  missingCardsInput,
  type CollectionRepository,
} from '../collections.ts';
import { defineTool, readOnly } from './definition.ts';

export function createCollectionTools(collections: CollectionRepository) {
  return [
    defineTool({
      name: 'list_my_collections',
      description:
        'List your collections, wantlists or card lists, including private lists. Default: normal collections. Returns forDecks flags and IDs for ownership checks; no card notes or prices.',
      inputSchema: collectionListInput,
      scopes: [MCP_COLLECTION_READ_SCOPE],
      annotations: readOnly,
      execute: async (input, { actor, websiteOrigin }) => {
        const result = await collections.list(actor.userId, input);
        return {
          ...result,
          collections: result.collections.map(row => ({
            ...row,
            url: websiteOrigin + '/collections/' + row.id,
          })),
        };
      },
      count: data => data.collections.length,
    }),
    defineTool({
      name: 'get_card_ownership',
      description:
        'Browse cards you own or check up to 100 logical card IDs. Positive quantities aggregate across printings and retain variant/foil/condition/language details. Default: your normal collections marked forDecks. Set forDecksOnly:false to include other normal collections. Wantlists, card lists and amount2 never count as owned. Omit cardIds to browse with pagination. An absent ID means zero ownership in the selected collections after all pages; unknown/preview IDs retain quantities without invented card text.',
      inputSchema: ownershipInput,
      scopes: [MCP_COLLECTION_READ_SCOPE],
      annotations: readOnly,
      execute: (input, { actor }) => collections.ownership(actor.userId, input),
      count: data => data.cards.length,
    }),
    defineTool({
      name: 'get_deck_missing_cards',
      description:
        'Compare an accessible normal deck with your owned cards. Defaults to main plus sideboard and leaders/base; optionally include maybeboard. Copies are summed across selected boards, all printings count, and wantlists/card lists are excluded. Default collections are marked forDecks. Returns exact required, owned and missing quantities; this does not reserve copies or validate deck legality.',
      inputSchema: missingCardsInput,
      scopes: [MCP_COLLECTION_READ_SCOPE, MCP_DECK_SCOPE],
      annotations: readOnly,
      execute: (input, { actor }) => collections.missing(actor.userId, input),
      count: data => data.cards.length,
    }),
  ] as const;
}
