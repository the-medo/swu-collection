import { createAccountTools } from './account.ts';
import type { AccountRepository } from '../account.ts';
import { createCardPoolTools } from './card-pools.ts';
import type { CardPoolRepository } from '../card-pools.ts';
import { createDeckWritingTools } from './deck-writing.ts';
import type { DeckWritingRepository } from '../deck-writing.ts';
import { createCollectionTools } from './collections.ts';
import type { CollectionRepository } from '../collections.ts';
import { createArticleTools, type ArticleServices } from '../articles/tools.ts';
import { createCatalogTools } from './catalog.ts';
import type { DeckRepository } from '../decks.ts';

export type McpTool =
  | ReturnType<typeof createArticleTools>[number]
  | ReturnType<typeof createCatalogTools>[number]
  | ReturnType<typeof createAccountTools>[number]
  | ReturnType<typeof createCardPoolTools>[number]
  | ReturnType<typeof createCollectionTools>[number]
  | ReturnType<typeof createDeckWritingTools>[number];
export type McpToolName = McpTool['name'];
export function createToolRegistry(
  services: DeckRepository & {
    articleServices?: ArticleServices;
    collections?: CollectionRepository;
    cardPools?: CardPoolRepository;
    account?: AccountRepository;
    deckWriting?: DeckWritingRepository;
  },
) {
  const tools = [
    ...createCatalogTools(services),
    ...(services.account ? createAccountTools(services.account) : []),
    ...(services.cardPools ? createCardPoolTools(services.cardPools) : []),
    ...(services.deckWriting ? createDeckWritingTools(services.deckWriting) : []),
    ...(services.collections ? createCollectionTools(services.collections) : []),
    ...(services.articleServices ? createArticleTools(services.articleServices) : []),
  ];
  const byName = new Map<string, McpTool>();
  for (const tool of tools) {
    if (byName.has(tool.name)) throw new Error('Duplicate MCP tool registration.');
    byName.set(tool.name, tool);
  }
  return {
    tools,
    get: (name: unknown) => (typeof name === 'string' ? byName.get(name) : undefined),
  };
}
