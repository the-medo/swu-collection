import type { LeaderDefinition } from '../definition.ts';

// Unit and upgrade roles have independent abilities. Printed text and official
// clarifications are pinned in the meta-pilot-leaders fixture.
export const bobaFettAnyMethodsNecessary = {
  cardId: 'boba-fett--any-methods-necessary',
  name: 'Boba Fett, Any Methods Necessary',
  kind: 'leader',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Underworld', 'Bounty Hunter', 'Pilot'],
  unique: true,
  printedCost: 6,
  faces: {
    leader: {
      triggers: [
        {
          id: 'non-combat-indirect',
          timing: 'non-combat-damage',
          effects: [
            {
              kind: 'pay',
              costs: [
                {
                  kind: 'exhaust-self',
                },
              ],
              optional: true,
              effects: [
                {
                  kind: 'indirect-damage',
                  amount: 1,
                  recipient: 'chosen',
                },
              ],
            },
          ],
        },
      ],
      actions: [
        {
          id: 'deploy',
          costs: [],
          limit: 'once-per-game',
          effects: [
            {
              kind: 'deploy',
              as: 'unit-or-upgrade',
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
    },
    upgrade: {
      modifiers: {
        power: 4,
        hp: 4,
      },
      attachTo: 'friendly-vehicle-without-pilot',
      hostIsLeader: true,
      triggers: [
        {
          id: 'deployed-division',
          timing: 'deployed',
          effects: [
            {
              kind: 'divide-damage',
              amount: 4,
              filter: {},
              optional: false,
              upTo: true,
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
