import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-history.json.
export const aerieCloudRiderDropship = {
  cardId: 'aerie--cloud-rider-dropship',
  name: 'Aerie, Cloud-Rider Dropship',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Underworld', 'Vehicle', 'Transport'],
  unique: true,
  cost: 6,
  power: 3,
  hp: 7,
  arena: 'space',
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
            arena: 'ground',
          },
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'damage',
                amount: 2,
              },
            },
          ],
        },
        {
          kind: 'damage-base',
          amount: 2,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
