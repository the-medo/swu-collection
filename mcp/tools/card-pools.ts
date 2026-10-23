import { MCP_CARD_POOL_READ_SCOPE } from '../../shared/mcp/config.ts';
import { cardPoolGetInput, cardPoolListInput, type CardPoolRepository } from '../card-pools.ts';
import { defineTool, readOnly } from './definition.ts';

export function createCardPoolTools(pools: CardPoolRepository) {
  return [
    defineTool({
      name: 'list_my_card_pools',
      description:
        'List your sealed, prerelease and draft pools, including private pools. Filter by literal name, set code, type, status or visibility. Archived pools are excluded unless includeArchived is true. Returns paginated metadata and links, newest first. Requires card-pools:read consent.',
      inputSchema: cardPoolListInput,
      scopes: [MCP_CARD_POOL_READ_SCOPE],
      annotations: readOnly,
      execute: async (input, { actor, websiteOrigin }) => {
        const result = await pools.list(actor.userId, input);
        return {
          ...result,
          pools: result.pools.map(pool => ({
            ...pool,
            url: websiteOrigin + '/limited/pool/' + pool.poolId + '/detail',
          })),
        };
      },
      count: data => data.pools.length,
    }),
    defineTool({
      name: 'get_card_pool',
      description:
        'Read an owned or public/unlisted pool to propose sealed builds. Returns all physical copy numbers grouped by logical card ID, quantities, full official/active-preview card text and separate set-specific basic base options. Unknown IDs are retained without invented text. Each physical number can be used only once per build. All stored cards are returned, including leaders/bases; this is not a deck board. In-progress pools may be incomplete. Fails above 1,000 physical cards. Requires card-pools:read consent; does not save a deck.',
      inputSchema: cardPoolGetInput,
      scopes: [MCP_CARD_POOL_READ_SCOPE],
      annotations: readOnly,
      execute: (input, { actor, websiteOrigin }) => pools.get(actor.userId, input, websiteOrigin),
      count: data => data.totalPhysicalCards,
    }),
  ] as const;
}
