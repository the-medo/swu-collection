import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 effects fixture.
export const leiaOrganaVigilantForDanger = {
  cardId: 'leia-organa--vigilant-for-danger',
  name: 'Leia Organa, Vigilant for Danger',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Rebel', 'Official'],
  unique: true,
  cost: 3,
  power: 3,
  hp: 4,
  arena: 'ground',
  keywords: ['Support'],
  triggers: [
    {
      id: 'vigilance',
      timing: 'attack',
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'heal',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'source',
                  operation: {
                    kind: 'damage',
                    amount: 1,
                  },
                  ifYouDo: [
                    {
                      kind: 'heal-own-base',
                      amount: 2,
                    },
                  ],
                },
              ],
            },
            {
              id: 'decline',
              effects: [],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
