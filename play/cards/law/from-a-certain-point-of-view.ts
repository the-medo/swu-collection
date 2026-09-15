import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const fromACertainPointOfView = {
  cardId: 'from-a-certain-point-of-view',
  name: 'From a Certain Point of View',
  kind: 'event',
  aspects: [],
  traits: ['Learned'],
  cost: 1,
  effects: [
    {
      kind: 'play-card',
      from: 'hand',
      filter: {},
      ignoreAspectPenalties: true,
      optional: false,
    },
  ],
} as const satisfies EventDefinition;
