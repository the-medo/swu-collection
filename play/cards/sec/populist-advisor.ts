import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-history.json.
export const populistAdvisor = {
  cardId: 'populist-advisor',
  name: 'Populist Advisor',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['New Republic', 'Official'],
  cost: 1,
  power: 1,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'own-base-damaged',
      timing: 'own-base-damaged',
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'modify',
            power: 0,
            hp: 0,
            duration: 'phase',
            abilities: {
              keywords: ['Sentinel'],
            },
          },
        },
      ],
      condition: {
        kind: 'value-at-least',
        name: 'enemy-combat-damage',
        amount: 1,
      },
    },
  ],
} as const satisfies UnitDefinition;
