import type { UnitDefinition } from '../definition.ts';

// Printed text and rulings are pinned in the meta-attachments fixture.
export const zebOrreliosFistsWorkEveryTime = {
  cardId: 'zeb-orrelios--fists-work-every-time',
  name: 'Zeb Orrelios, Fists Work Every Time',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Rebel', 'Spectre'],
  cost: 7,
  unique: true,
  power: 5,
  hp: 7,
  arena: 'ground',
  triggers: [
    {
      id: 'give-advantages',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            otherThan: 'source',
          },
          bind: 'chosen',
          optional: false,
          allowMissing: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'advantage',
                count: 3,
              },
            },
          ],
        },
      ],
    },
    {
      id: 'upgrade-defeated-damage',
      timing: 'friendly-upgrade-defeated',
      effects: [
        {
          kind: 'damage-base',
          amount: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
