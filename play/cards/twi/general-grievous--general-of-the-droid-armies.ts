import type { LeaderDefinition } from '../definition.ts';

// Both printed faces are pinned in leader-foundations.json.
export const generalGrievousGeneralOfTheDroidArmies = {
  cardId: 'general-grievous--general-of-the-droid-armies',
  name: 'General Grievous, General of the Droid Armies',
  kind: 'leader',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Separatist', 'Official'],
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
                trait: 'Droid',
              },
              bind: 'chosen',
              optional: false,
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
                      keywords: ['Sentinel'],
                    },
                  },
                },
              ],
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
      hp: 8,
      arena: 'ground',
      triggers: [
        {
          id: 'attack',
          timing: 'attack',
          effects: [
            {
              kind: 'select-unit',
              filter: {
                trait: 'Droid',
              },
              bind: 'chosen',
              optional: true,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'modify',
                    power: 1,
                    hp: 0,
                    duration: 'phase',
                    abilities: {
                      keywords: ['Sentinel'],
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
