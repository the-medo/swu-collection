import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-history.json.
export const benSoloFacingTheLight = {
  cardId: 'ben-solo--facing-the-light',
  name: 'Ben Solo, Facing the Light',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Force'],
  unique: true,
  cost: 9,
  power: 8,
  hp: 8,
  arena: 'ground',
  keywords: ['Hidden'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            otherThan: 'source',
          },
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'ready',
              },
            },
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: 0,
                hp: 0,
                duration: 'phase',
                cannotBeAttacked: true,
              },
            },
          ],
        },
      ],
    },
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            otherThan: 'source',
          },
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'ready',
              },
            },
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: 0,
                hp: 0,
                duration: 'phase',
                cannotBeAttacked: true,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
