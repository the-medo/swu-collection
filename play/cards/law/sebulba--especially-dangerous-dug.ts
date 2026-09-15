import type { LeaderDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 ability costs fixture.
export const sebulbaEspeciallyDangerousDug = {
  cardId: 'sebulba--especially-dangerous-dug',
  name: 'Sebulba, Especially Dangerous Dug',
  kind: 'leader',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Fringe'],
  unique: true,
  printedCost: 4,
  faces: {
    leader: {
      actions: [
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
                amount: 4,
              },
            },
          ],
        },
        {
          id: 'reckless-raid',
          costs: [
            {
              kind: 'exhaust-self',
            },
            {
              kind: 'discard-deck',
              count: 1,
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
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'modify',
                    power: 0,
                    hp: 0,
                    duration: 'phase',
                    abilities: {
                      raid: 1,
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    unit: {
      power: 2,
      hp: 5,
      arena: 'ground',
      raid: 1,
      triggers: [
        {
          id: 'attack-mill',
          timing: 'attack',
          effects: [
            {
              kind: 'mill',
              count: 1,
              bind: 'discarded',
              effects: [],
              player: 'self',
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
