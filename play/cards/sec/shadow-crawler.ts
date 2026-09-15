import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-foundations.json.
export const shadowCrawler = {
  cardId: 'shadow-crawler',
  name: 'Shadow Crawler',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Fringe', 'Vehicle', 'Walker'],
  cost: 7,
  power: 6,
  hp: 7,
  arena: 'ground',
  keywords: ['Ambush'],
} as const satisfies UnitDefinition;
