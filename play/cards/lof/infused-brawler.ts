import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-attributes.json.
export const infusedBrawler = {
  cardId: 'infused-brawler',
  name: 'Infused Brawler',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Force', 'Night'],
  cost: 2,
  power: 2,
  hp: 2,
  arena: 'ground',
  triggers: [
    {
      id: 'imbue',
      timing: 'played',
      effects: [
        {
          kind: 'pay',
          costs: [
            {
              kind: 'force',
            },
          ],
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'source',
              operation: {
                kind: 'give-token',
                token: 'experience',
                count: 2,
              },
            },
          ],
        },
      ],
    },
    {
      id: 'spent-experience',
      timing: 'attack-ended',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'value-at-least',
            name: 'survived',
            amount: 1,
          },
          effects: [
            {
              kind: 'select-upgrades',
              filter: {
                attachedTo: 'source',
                cardId: 'experience',
              },
              min: 1,
              max: 1,
              bind: 'spent',
              effects: [
                {
                  kind: 'move-upgrades',
                  group: 'spent',
                  to: 'discard',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
