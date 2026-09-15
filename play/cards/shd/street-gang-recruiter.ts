import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const streetGangRecruiter = {
  cardId: 'street-gang-recruiter',
  name: 'Street Gang Recruiter',
  kind: 'unit',
  aspects: [],
  traits: ['Underworld'],
  cost: 5,
  power: 4,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'discard',
          player: 'self',
          chooser: 'owner',
          filter: {
            trait: 'Underworld',
          },
          min: 0,
          max: 1,
          bind: 'chosen',
          effects: [
            {
              kind: 'move-card',
              target: 'chosen',
              from: 'discard',
              to: 'hand',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
