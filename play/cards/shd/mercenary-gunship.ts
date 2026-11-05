import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteMercenaryGunship = {
  cardId: 'mercenary-gunship',
  name: 'Mercenary Gunship',
  kind: 'unit',
  aspects: [],
  traits: ['Underworld', 'Vehicle', 'Fighter'],
  cost: 2,
  power: 3,
  hp: 2,
  arena: 'space',
  actions: [
    {
      id: 'action',
      costs: [
        {
          kind: 'resources',
          amount: 4,
        },
      ],
      limit: null,
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'take-control',
            player: 'self',
          },
        },
      ],
      anyPlayer: true,
    },
  ],
} as const satisfies UnitDefinition;
