import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const mirajScintelTheWeakDeserveToKneel = {
  cardId: 'miraj-scintel--the-weak-deserve-to-kneel',
  name: 'Miraj Scintel, The Weak Deserve to Kneel',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Separatist', 'Official'],
  unique: true,
  cost: 5,
  power: 3,
  hp: 7,
  arena: 'ground',
  auras: [
    {
      id: 'crush-the-weak',
      filter: {
        controller: 'friendly',
        attackingAgainst: {
          damaged: true,
        },
      },
      abilities: {
        keywords: ['Overwhelm'],
      },
    },
  ],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            damaged: false,
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'damage',
                amount: 3,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
