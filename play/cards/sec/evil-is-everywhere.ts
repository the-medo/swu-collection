import type { EventDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 search/combat fixture.
export const evilIsEverywhere = {
  cardId: 'evil-is-everywhere',
  name: 'Evil is Everywhere',
  kind: 'event',
  aspects: ['Villainy'],
  traits: ['Disaster'],
  cost: 3,
  effects: [
    {
      kind: 'defeat-unit',
      filter: {
        maxCost: {
          kind: 'unit-aspect-icons',
          aspect: 'Villainy',
          filter: {
            controller: 'friendly',
          },
        },
      },
      optional: false,
    },
  ],
} as const satisfies EventDefinition;
