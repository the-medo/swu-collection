import { createArticleTools, type ArticleServices } from '../articles/tools.ts';
import { createCatalogTools } from './catalog.ts';
import type { DeckRepository } from '../decks.ts';

export type McpTool =
  | ReturnType<typeof createArticleTools>[number]
  | ReturnType<typeof createCatalogTools>[number];
export type McpToolName = McpTool['name'];
export function createToolRegistry(
  services: DeckRepository & { articleServices?: ArticleServices },
) {
  const tools = [
    ...createCatalogTools(services),
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
