import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const sithTrooper = {
  cardId: 'sith-trooper',
  name: 'Sith Trooper',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['First Order', 'Sith', 'Trooper'],
  cost: 3,
  power: 3,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'damaged-foes',
      timing: 'attack',
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'modify',
            power: {
              kind: 'unit-count',
              filter: {
                controller: 'enemy',
                damaged: true,
              },
            },
            hp: 0,
            duration: 'attack',
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
