import type { EntityReference } from '../creators/contracts.ts';
import type { PostBlock } from '../posts/content.ts';
import type { CardReference } from '../posts/widgets.ts';

export type TemplateMetaEvent = {
  id: string;
  name: string;
  date: string;
  attendance: number;
  imported: boolean;
};
export type TemplateArchetype = {
  key: string;
  leaderId: string;
  baseId: string;
  count: number;
};
export type TemplateMetaDeck = {
  id: string;
  name: string;
  leaderId: string | null;
  baseId: string | null;
  tournamentId: string;
  tournamentName: string;
  placement: number;
};
export type TemplateMeta = {
  source: { scope: 'current' | 'tournament' | 'group'; id: string; name: string };
  asOf: string;
  events: TemplateMetaEvent[];
  deckCount: number;
  archetypes: TemplateArchetype[];
  decklists: TemplateMetaDeck[];
};
export type TemplateDeck = {
  deckId: string;
  name: string;
  format: number;
  leaderIds: string[];
  baseId: string | null;
  cards: { cardId: string; quantity: number; board: number }[];
};
export type TemplateCard = CardReference & {
  type: string;
  cost: number | null;
  rarity: string;
};
export type ArticleTemplateSection = {
  id: string;
  title: string;
  description: string;
  blocks: PostBlock[];
};
export type GuidedArticleTemplate = {
  title: string;
  references: EntityReference[];
  sections: ArticleTemplateSection[];
};
