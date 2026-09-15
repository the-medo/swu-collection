import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const lorSanTekkaSecretKeeper = {
  cardId: 'lor-san-tekka--secret-keeper',
  name: 'Lor San Tekka, Secret Keeper',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Resistance'],
  unique: true,
  cost: 2,
  power: 3,
  hp: 2,
  arena: 'ground',
  triggers: [
    {
      id: 'when-defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            unique: true,
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'experience',
                count: 1,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
