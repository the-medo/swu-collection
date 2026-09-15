import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const fightFireWithFire = {
  cardId: 'fight-fire-with-fire',
  name: 'Fight Fire With Fire',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Gambit'],
  cost: 1,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
      },
      bind: 'friendly',
      optional: false,
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
            sameArenaAs: 'friendly',
          },
          bind: 'enemy',
          optional: false,
          effects: [
            {
              kind: 'damage-bound',
              targets: ['friendly', 'enemy'],
              amount: 3,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
