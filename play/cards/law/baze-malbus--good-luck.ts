import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const bazeMalbusGoodLuck = {
  cardId: 'baze-malbus--good-luck',
  name: 'Baze Malbus, Good Luck',
  kind: 'unit',
  aspects: ['Vigilance', 'Aggression', 'Heroism'],
  traits: ['Rebel'],
  unique: true,
  cost: 7,
  power: 6,
  hp: 8,
  arena: 'ground',
  keywords: ['Sentinel'],
  triggers: [
    {
      id: 'healed',
      timing: 'healed',
      effects: [
        {
          kind: 'select-unit',
          filter: {},
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'damage',
                amount: {
                  kind: 'value',
                  name: 'healed-amount',
                },
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
