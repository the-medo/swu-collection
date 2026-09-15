import type { EventDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 conditional ability fixture.
export const transmissionJamming = {
  cardId: 'transmission-jamming',
  name: 'Transmission Jamming',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Tactic'],
  cost: 1,
  effects: [
    {
      kind: 'name-card',
      bind: 'named',
      effects: [
        {
          kind: 'restrict-named-card',
          name: 'named',
          restriction: 'prevent-play',
          appliesTo: 'each',
          duration: 'phase',
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
