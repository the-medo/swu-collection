import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-effects.json.
export const barrelRoll = {
  cardId: 'barrel-roll',
  name: 'Barrel Roll',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Tactic'],
  cost: 1,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
        arena: 'space',
      },
      bind: 'attacker',
      optional: false,
      effects: [
        {
          kind: 'attack-bound',
          target: 'attacker',
          optional: false,
          powerBonus: 0,
          after: [
            {
              kind: 'select-unit',
              filter: {
                arena: 'space',
              },
              bind: 'chosen',
              optional: true,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'exhaust',
                  },
                },
              ],
            },
          ],
          unitsOnly: false,
          evenIfExhausted: false,
        },
      ],
      forAttack: {
        unitsOnly: false,
        evenIfExhausted: false,
      },
    },
  ],
} as const satisfies EventDefinition;
