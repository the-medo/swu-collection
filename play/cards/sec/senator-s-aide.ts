import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-foundations.json.
export const senatorSAide = {
  cardId: 'senator-s-aide',
  name: "Senator's Aide",
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Republic', 'Official'],
  cost: 1,
  power: 0,
  hp: 3,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'initiative',
      },
      power: 2,
    },
  ],
} as const satisfies UnitDefinition;
