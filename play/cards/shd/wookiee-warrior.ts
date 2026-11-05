import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetWookieeWarrior = {
  cardId: 'wookiee-warrior',
  name: 'Wookiee Warrior',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Wookiee'],
  cost: 4,
  power: 2,
  hp: 5,
  arena: 'ground',
  keywords: ['Grit'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'units-at-least',
            filter: {
              controller: 'friendly',
              trait: 'Wookiee',
              otherThan: 'source',
            },
            amount: 1,
          },
          effects: [{ kind: 'draw-cards', amount: 1 }],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
