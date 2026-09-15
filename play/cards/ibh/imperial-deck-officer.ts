import type { UnitDefinition } from '../definition.ts';

// Official identity and printed text are pinned in testing/fixtures/ibh.json.
export const imperialDeckOfficer = {
  cardId: 'imperial-deck-officer',
  name: 'Imperial Deck Officer',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Imperial'],
  cost: 2,
  power: 1,
  hp: 4,
  arena: 'ground',
  actions: [
    {
      id: 'action',
      costs: [
        {
          kind: 'exhaust-self',
        },
      ],
      limit: null,
      effects: [
        {
          kind: 'select-unit',
          filter: {
            anyAspect: ['Villainy'],
          },
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'heal',
                amount: 2,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
