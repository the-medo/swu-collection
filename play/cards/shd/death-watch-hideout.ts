import type { BaseDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-base-foundations.json.
export const deathWatchHideout = {
  cardId: 'death-watch-hideout',
  kind: 'base',
  name: 'Death Watch Hideout',
  aspects: ['Aggression'],
  traits: [],
  hp: 30,
} as const satisfies BaseDefinition;
