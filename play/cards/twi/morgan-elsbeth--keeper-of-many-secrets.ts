import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteMorganElsbethKeeperOfManySecrets = {
  cardId: 'morgan-elsbeth--keeper-of-many-secrets',
  name: 'Morgan Elsbeth, Keeper of Many Secrets',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Force', 'Imperial', 'Official'],
  cost: 4,
  unique: true,
  power: 3,
  hp: 6,
  arena: 'ground',
  restore: 1,
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            otherThan: 'source',
          },
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'defeat',
              },
              ifYouDo: [
                {
                  kind: 'draw-cards',
                  amount: 1,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
