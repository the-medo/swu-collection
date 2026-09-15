import type { LeaderDefinition } from '../definition.ts';

// Both printed faces and official clarifications are pinned in leader-plays.json.
export const asajjVentressAmbitiousApprentice = {
  cardId: 'asajj-ventress--ambitious-apprentice',
  name: 'Asajj Ventress, Ambitious Apprentice',
  kind: 'leader',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Force', 'Separatist', 'Sith'],
  unique: true,
  printedCost: 5,
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
                token: true,
              },
              bind: 'attacker',
              optional: false,
              effects: [
                {
                  kind: 'attack-bound',
                  target: 'attacker',
                  optional: false,
                  powerBonus: 1,
                  abilities: {},
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
              as: 'unit',
            },
          ],
        },
      ],
    },
    unit: {
      power: 3,
      hp: 5,
      arena: 'ground',
      keywords: ['Hidden'],
      constant: [
        {
          condition: {
            kind: 'unit-history-at-least',
            event: 'attacked',
            player: 'self',
            amount: 1,
            token: true,
          },
          power: 2,
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
