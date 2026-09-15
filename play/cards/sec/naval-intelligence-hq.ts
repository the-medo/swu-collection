import type { BaseDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 foundation fixture.
export const navalIntelligenceHq = {
  cardId: 'naval-intelligence-hq',
  name: 'Naval Intelligence HQ',
  kind: 'base',
  aspects: ['Aggression'],
  traits: [],
  hp: 30,
} as const satisfies BaseDefinition;
