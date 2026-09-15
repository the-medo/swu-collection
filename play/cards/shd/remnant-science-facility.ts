import type { BaseDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-base-foundations.json.
export const remnantScienceFacility = {
  cardId: 'remnant-science-facility',
  kind: 'base',
  name: 'Remnant Science Facility',
  aspects: ['Vigilance'],
  traits: [],
  hp: 30,
} as const satisfies BaseDefinition;
