import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteSeparatistCommando = {
  cardId: 'separatist-commando',
  name: 'Separatist Commando',
  kind: 'unit',
  aspects: ['Villainy', 'Cunning'],
  traits: ['Separatist', 'Droid', 'Trooper'],
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
          trait: 'Separatist',
          otherThan: 'source',
        },
        amount: 1,
      },
      raid: 2,
    },
  ],
} as const satisfies UnitDefinition;
