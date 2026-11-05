import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteFrontlineShuttle = {
  cardId: 'frontline-shuttle',
  name: 'Frontline Shuttle',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Vehicle', 'Transport'],
  cost: 2,
  power: 1,
  hp: 3,
  arena: 'space',
  actions: [
    {
      id: 'action',
      costs: [
        {
          kind: 'defeat-self',
        },
      ],
      limit: null,
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
          },
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'attack-bound',
              target: 'chosen',
              optional: false,
              evenIfExhausted: true,
              unitsOnly: true,
            },
          ],
          forAttack: {
            unitsOnly: true,
            evenIfExhausted: true,
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
