import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 observer fixture.
export const pazVizslaForABrighterFuture = {
  cardId: 'paz-vizsla--for-a-brighter-future',
  name: 'Paz Vizsla, For a Brighter Future',
  kind: 'unit',
  aspects: ['Vigilance', 'Command', 'Heroism'],
  traits: ['Mandalorian'],
  unique: true,
  cost: 5,
  power: 4,
  hp: 7,
  arena: 'ground',
  keywords: ['Sentinel'],
  triggers: [
    {
      id: 'noncombat-tokens',
      timing: 'defeated',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'not',
            condition: {
              kind: 'value-at-least',
              name: 'defeated-by-combat',
              amount: 1,
            },
          },
          effects: [
            {
              kind: 'create-unit',
              cardId: 'mandalorian',
              count: 2,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
