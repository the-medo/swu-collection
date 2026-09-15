import type { EventDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 damage replacement fixture.
export const shienFlurry = {
  cardId: 'shien-flurry',
  name: 'Shien Flurry',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Learned'],
  cost: 1,
  effects: [
    {
      kind: 'play-card',
      from: 'hand',
      filter: {
        kind: 'unit',
        trait: 'Force',
      },
      optional: false,
      phaseAbilities: {
        keywords: ['Ambush'],
      },
      phaseDamagePrevention: 2,
    },
  ],
} as const satisfies EventDefinition;
