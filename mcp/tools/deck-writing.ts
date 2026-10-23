import { MCP_DECK_SCOPE, MCP_DECK_WRITE_SCOPE } from '../../shared/mcp/config.ts';
import {
  deckCreateInput,
  deckDuplicateInput,
  deckUpdateInput,
  deckCardsUpdateInput,
  deckExportInput,
  type DeckWritingRepository,
} from '../deck-writing.ts';
import { defineTool, readOnly, write } from './definition.ts';
const scopes = [MCP_DECK_SCOPE, MCP_DECK_WRITE_SCOPE] as const;
const link = <T extends { deckId: string }>(data: T, origin: string) => ({
  ...data,
  url: origin + '/decks/' + data.deckId,
});
export function createDeckWritingTools(decks: DeckWritingRepository) {
  return [
    defineTool({
      name: 'create_deck',
      description:
        'Create a normal deck with metadata and up to 500 card/board rows, atomically. Defaults to private. Use exact logical card IDs; official and active preview cards are supported. Empty/unfinished decks are allowed; no legality certification. Reuse requestId with identical input for retries. Never creates limited pool decks.',
      inputSchema: deckCreateInput,
      scopes,
      annotations: { ...write, destructiveHint: false },
      execute: async (input, { actor, websiteOrigin }) =>
        link(await decks.create(actor, input), websiteOrigin),
      count: () => 1,
    }),
    defineTool({
      name: 'duplicate_deck',
      description:
        'Copy an accessible normal deck into your account with a new name, private by default. Supply expectedRevision from get_deck. Preserves all three boards and saved IDs, including unavailable cards; omits private card notes, folders and import links. Reuse requestId for retries.',
      inputSchema: deckDuplicateInput,
      scopes,
      annotations: { ...write, destructiveHint: false },
      execute: async (input, { actor, websiteOrigin }) =>
        link(await decks.duplicate(actor, input), websiteOrigin),
      count: () => 1,
    }),
    defineTool({
      name: 'update_deck',
      description:
        'Patch metadata of a normal deck you own: name, description, format, leaders/base or visibility. Omitted fields remain unchanged; null clears a leader/base. Requires the exact revision from get_deck. Changing visibility can make a private deck public; do so only when requested. Reuse requestId and input for retries; after a conflict reread and use a new requestId.',
      inputSchema: deckUpdateInput,
      scopes,
      annotations: write,
      execute: async (input, { actor, websiteOrigin }) =>
        link(await decks.update(actor, input), websiteOrigin),
      count: () => 1,
    }),
    defineTool({
      name: 'update_deck_cards',
      description:
        'Atomically set absolute quantities for up to 100 unique card/board pairs on a normal deck you own. Zero removes a card; omitted rows and existing card notes are preserved. To move cards supply source/destination quantities together. Requires revision from get_deck and a requestId; stale edits fail without partial changes. Returns before/after quantities. Retrying uses the same requestId and identical input.',
      inputSchema: deckCardsUpdateInput,
      scopes,
      annotations: write,
      execute: async (input, { actor, websiteOrigin }) =>
        link(await decks.updateCards(actor, input), websiteOrigin),
      count: () => 1,
    }),
    defineTool({
      name: 'export_deck',
      description:
        'Export an accessible normal deck. Native format preserves all three boards and logical IDs; pass its metadata/cards to create_deck with a new requestId. JSON and text use the app export conventions, omit maybeboard and report unknown/preview IDs. Private card notes and folder/import metadata are excluded.',
      inputSchema: deckExportInput,
      scopes: [MCP_DECK_SCOPE],
      annotations: readOnly,
      execute: (input, { actor }) => decks.export(actor.userId, input),
      count: () => 1,
    }),
  ] as const;
}
