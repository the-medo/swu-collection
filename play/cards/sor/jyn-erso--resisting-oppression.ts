import type { LeaderDefinition } from '../definition.ts';

// Printed roles and official clarifications are pinned in leader-combat.json.
export const jynErsoResistingOppression = {
  cardId: 'jyn-erso--resisting-oppression',
  name: 'Jyn Erso, Resisting Oppression',
  kind: 'leader',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Rebel'],
  unique: true,
  printedCost: 6,
  faces: {
    leader: {
      actions: [
        {
          id: 'leader-action',
          costs: [
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
              },
              effects: [
                {
                  kind: 'attack-bound',
                  target: 'chosen',
                  optional: false,
                  defenderPowerModifier: -1,
                },
              ],
              optional: false,
              bind: 'chosen',
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
              as: 'unit',
              condition: {
                kind: 'resources-at-least',
                amount: 6,
              },
            },
          ],
        },
      ],
    },
    unit: {
      power: 4,
      hp: 7,
      arena: 'ground',
      auras: [
        {
          id: 'weaken-defender',
          filter: {
            controller: 'enemy',
            defendingAgainst: {
              controller: 'friendly',
            },
          },
          power: -1,
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
