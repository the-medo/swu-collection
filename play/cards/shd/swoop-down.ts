import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteSwoopDown = {
  cardId: 'swoop-down',
  name: 'Swoop Down',
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
      optional: false,
      bind: 'chosen',
      effects: [
        {
          kind: 'attack-bound',
          target: 'chosen',
          optional: false,
          powerBonus: {
            kind: 'conditional',
            condition: {
              kind: 'unit-matches',
              target: 'defender',
              filter: {
                arena: 'ground',
              },
            },
            then: 2,
            otherwise: 0,
          },
          abilities: {
            keywords: ['Saboteur'],
            attackBothArenas: true,
          },
          defenderPowerModifier: {
            kind: 'conditional',
            condition: {
              kind: 'unit-matches',
              target: 'defender',
              filter: {
                arena: 'ground',
              },
            },
            then: -2,
            otherwise: 0,
          },
        },
      ],
      forAttack: {
        abilities: {
          keywords: ['Saboteur'],
          attackBothArenas: true,
        },
      },
    },
  ],
} as const satisfies EventDefinition;
