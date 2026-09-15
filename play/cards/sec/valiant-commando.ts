import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const valiantCommando = {
  cardId: 'valiant-commando',
  name: 'Valiant Commando',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Rebel', 'Trooper'],
  cost: 3,
  power: 3,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'combat-base-damage-dealt',
      timing: 'combat-base-damage-dealt',
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'sacrifice',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'source',
                  operation: {
                    kind: 'defeat',
                  },
                  ifYouDo: [
                    {
                      kind: 'damage-target',
                      target: 'damaged-base',
                      amount: 3,
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
