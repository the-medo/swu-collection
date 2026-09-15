import type { LeaderDefinition } from '../definition.ts';

// Both printed faces and official clarifications are pinned in leader-plays.json.
export const rioDurantWisecrackingWheelman = {
  cardId: 'rio-durant--wisecracking-wheelman',
  name: 'Rio Durant, Wisecracking Wheelman',
  kind: 'leader',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Underworld', 'Pilot'],
  unique: true,
  printedCost: 5,
  faces: {
    leader: {
      actions: [
        {
          id: 'leader-action',
          costs: [
            {
              kind: 'resources',
              amount: 1,
            },
            {
              kind: 'exhaust-self',
            },
          ],
          limit: null,
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
                  powerBonus: 1,
                  abilities: {
                    keywords: ['Saboteur'],
                  },
                },
              ],
              forAttack: {},
            },
          ],
        },
        {
          id: 'deploy',
          costs: [],
          limit: 'once-per-game',
          effects: [
            {
              kind: 'deploy',
              condition: {
                kind: 'resources-at-least',
                amount: 5,
              },
              as: 'unit-or-upgrade',
            },
          ],
        },
      ],
    },
    unit: {
      power: 3,
      hp: 5,
      arena: 'ground',
      keywords: ['Saboteur'],
    },
    upgrade: {
      modifiers: {
        power: 3,
        hp: 5,
      },
      attachTo: 'friendly-vehicle-without-pilot',
      hostIsLeader: true,
      grants: {
        keywords: ['Saboteur'],
      },
      hostModifiers: [
        {
          condition: {
            kind: 'unit-matches',
            target: 'attached',
            filter: {
              trait: 'Transport',
            },
          },
          power: 1,
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
