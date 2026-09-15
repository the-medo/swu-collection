import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-effects.json.
export const attackRun = {
  cardId: 'attack-run',
  name: 'Attack Run',
  kind: 'event',
  aspects: [],
  traits: ['Tactic'],
  cost: 1,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
        arena: 'space',
      },
      bind: 'first-attacker',
      optional: false,
      effects: [
        {
          kind: 'attack-bound',
          target: 'first-attacker',
          optional: false,
          powerBonus: 0,
          after: [
            {
              kind: 'select-unit',
              filter: {
                controller: 'friendly',
                arena: 'space',
                otherThan: 'first-attacker',
              },
              bind: 'second-attacker',
              optional: false,
              effects: [
                {
                  kind: 'attack-bound',
                  target: 'second-attacker',
                  optional: false,
                  powerBonus: 0,
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
