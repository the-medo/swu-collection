import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const captainPhasmaOnMyCommand = {
  cardId: 'captain-phasma--on-my-command',
  name: 'Captain Phasma, On My Command',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['First Order', 'Trooper'],
  unique: true,
  cost: 5,
  power: 5,
  hp: 6,
  arena: 'ground',
  triggers: [
    {
      id: 'command-played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            trait: 'First Order',
            otherThan: 'source',
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: 2,
                hp: 2,
                duration: 'phase',
              },
            },
          ],
        },
      ],
    },
    {
      id: 'command-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            trait: 'First Order',
            otherThan: 'source',
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: 2,
                hp: 2,
                duration: 'phase',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
