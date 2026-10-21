import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { articleCatalog } from './catalog.ts';
import {
  getArticleTemplateMeta,
  type TemplateMetaInput,
} from '../../server/lib/creators/articleTemplateData.ts';
import { createTournamentReportService } from '../../server/lib/melee/tournamentReportCore.ts';
import { createMeleeTournamentService } from '../../server/lib/melee/tournamentsCore.ts';
import { CreatorError } from '../../server/lib/creators/errors.ts';
import { createArticleTemplate, type ArticleTemplateId } from '../../shared/posts/templates.ts';
import {
  createDeckGuide,
  createLimitedGuide,
  createMetaReport,
  finishGuidedTemplate,
} from '../../shared/posts/guidedTemplates.ts';
import type { GuidedArticleTemplate } from '../../shared/types/ArticleTemplates.ts';
import { setInfo } from '../../lib/swu-resources/set-info.ts';
import { MCP_MELEE_SCOPE } from '../../shared/mcp/config.ts';
import type { ArticleActor } from './receipts.ts';
import type { createArticleAssets } from './assets.ts';
import { mcpLockUser } from './userLock.ts';

export type TemplateInput = {
  template: ArticleTemplateId;
  blank: boolean;
  deckId?: string;
  tournamentId?: string;
  set?: string;
  limitedFormat: 'Draft' | 'Sealed';
  leaderIds: string[];
  keyCardIds: string[];
  meta?: TemplateMetaInput;
  archetypeKeys: string[];
  deckKeys: string[];
  sections?: string[];
};
export function createArticleTemplates(
  database: PostgresJsDatabase,
  assets: ReturnType<typeof createArticleAssets>,
) {
  const history = createMeleeTournamentService(database, undefined, undefined, mcpLockUser);
  return {
    async tournaments(actor: ArticleActor, refresh: boolean, offset: number, limit: number) {
      const data = refresh ? await history.refresh(actor.userId) : await history.get(actor.userId);
      return {
        ...data,
        tournaments: data.tournaments.slice(offset, offset + limit),
        total: data.tournaments.length,
        hasMore: offset + limit < data.tournaments.length,
        settingsPath: '/settings',
      };
    },
    async prepare(actor: ArticleActor, input: TemplateInput) {
      let template: GuidedArticleTemplate;
      const warnings: string[] = [];
      if (input.blank) {
        const body = createArticleTemplate(input.template);
        template = {
          title: '',
          references: [],
          sections: body.blocks.map((block, index) => ({
            id: `section-${index + 1}`,
            title: `Section ${index + 1}`,
            description: '',
            blocks: [block],
          })),
        };
      } else if (input.template === 'tournament-report') {
        if (!actor.scopes.includes(MCP_MELEE_SCOPE))
          throw new CreatorError(
            'Approve melee:read to prepare a report from your connected account.',
            403,
          );
        if (!input.tournamentId)
          throw new CreatorError(
            'Select a tournament from list_article_tournaments, or choose blank: true.',
          );
        const report = await createTournamentReportService(database).get(
          actor.userId,
          input.tournamentId,
        );
        if (report.roundsWarning) warnings.push(report.roundsWarning);
        const body = createArticleTemplate(input.template, report);
        template = {
          title: `${report.tournament.name} — tournament report`,
          references: [{ type: 'tournament', id: report.tournament.id, startSeconds: null }],
          sections: body.blocks.map((block, index) => ({
            id: `section-${index + 1}`,
            title:
              block.type === 'heading'
                ? block.content.map(value => (value.type === 'text' ? value.text : '')).join('')
                : `Section ${index + 1}`,
            description: '',
            blocks: [block],
          })),
        };
      } else {
        const cards = await assets.cards();
        if (input.template === 'deck-guide') {
          if (!input.deckId) throw new CreatorError('Choose a deckId or blank: true.');
          const deck = await assets.templateDeck(actor, input.deckId);
          template = createDeckGuide(
            deck,
            cards,
            await getArticleTemplateMeta(
              input.meta ?? { scope: 'current', format: deck.format },
              database,
            ),
          );
        } else if (input.template === 'limited-guide') {
          const set = Object.values(setInfo).find(set => set.code === input.set);
          if (!set) throw new CreatorError('Choose a known set code or blank: true.');
          const catalog = await articleCatalog(database)();
          const setCards = cards.filter(card => catalog[card.cardId]?.set === set.code);
          if (
            input.leaderIds.some(
              id => !setCards.some(card => card.cardId === id && card.type === 'Leader'),
            ) ||
            input.keyCardIds.some(id => !setCards.some(card => card.cardId === id))
          )
            throw new CreatorError('Selected leaders and cards must belong to the chosen set.');
          template = createLimitedGuide({
            set: set.code,
            setName: set.name,
            format: input.limitedFormat,
            cards: setCards,
            leaderIds: input.leaderIds,
            keyCardIds: input.keyCardIds,
            exampleDeck: input.deckId ? await assets.templateDeck(actor, input.deckId) : undefined,
          });
        } else {
          if (!input.meta)
            throw new CreatorError(
              'Choose a current-meta format, tournament or group, or blank: true.',
            );
          const meta = await getArticleTemplateMeta(input.meta, database);
          if (
            input.archetypeKeys.some(key => !meta.archetypes.some(item => item.key === key)) ||
            input.deckKeys.some(
              key => !meta.decklists.some(item => `${item.tournamentId}:${item.id}` === key),
            )
          )
            throw new CreatorError(
              'Selections are no longer available in this meta. Read the current template data again.',
              409,
            );
          template = createMetaReport(meta, cards, input.archetypeKeys, input.deckKeys);
        }
      }
      if (input.sections?.some(id => !template.sections.some(section => section.id === id)))
        throw new CreatorError('Unknown template section.');
      const selected = input.sections ?? template.sections.map(section => section.id);
      if (!selected.length) throw new CreatorError('Choose at least one template section.');
      return {
        ...finishGuidedTemplate(template, selected),
        sections: template.sections.map(({ blocks, ...section }) => ({
          ...section,
          selected: selected.includes(section.id),
        })),
        warnings,
        instructions:
          'Preview only. Pass body into create_article or update_article. Use edit_article_blocks insert to append selected sections; replace body only when requested. Apply suggested title/references only if appropriate.',
      };
    },
    async meta(input: TemplateMetaInput) {
      return getArticleTemplateMeta(input, database);
    },
  };
}
