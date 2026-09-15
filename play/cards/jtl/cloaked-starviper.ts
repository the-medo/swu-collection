import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const cloakedStarviper = {
  cardId: 'cloaked-starviper',
  name: 'Cloaked StarViper',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Underworld', 'Vehicle', 'Fighter'],
  cost: 4,
  power: 3,
  hp: 2,
  arena: 'space',
  triggers: [
    {
      id: 'double-shield',
      timing: 'played',
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'give-token',
            token: 'shield',
            count: 2,
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
