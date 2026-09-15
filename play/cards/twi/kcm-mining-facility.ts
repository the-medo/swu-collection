import type { BaseDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-base-foundations.json.
export const kcmMiningFacility = {
  cardId: 'kcm-mining-facility',
  kind: 'base',
  name: 'KCM Mining Facility',
  aspects: ['Aggression'],
  traits: [],
  hp: 30,
} as const satisfies BaseDefinition;
