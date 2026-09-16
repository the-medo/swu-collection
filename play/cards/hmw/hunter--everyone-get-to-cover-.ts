import { hmwUnit } from './define.ts';

export const hmwHunterEveryoneGetToCover = hmwUnit('hunter--everyone-get-to-cover-', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'choose-mode',
          repeat: 2,
          options: [
            {
              id: 'shield',
              effects: [
                {
                  kind: 'select-unit',
                  filter: {},
                  bind: 'shielded',
                  optional: false,
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'shielded',
                      operation: { kind: 'give-token', token: 'shield', count: 1 },
                    },
                  ],
                },
              ],
            },
            {
              id: 'attack',
              effects: [
                {
                  kind: 'select-unit',
                  filter: { controller: 'friendly' },
                  forAttack: { evenIfExhausted: true, unitsOnly: true },
                  bind: 'attacker',
                  optional: false,
                  effects: [
                    {
                      kind: 'attack-bound',
                      target: 'attacker',
                      optional: false,
                      evenIfExhausted: true,
                      cannotAttackBases: true,
                      unitsOnly: true,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
