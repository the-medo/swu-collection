import type { LeaderDefinition } from '../definition.ts';

// Unit and upgrade roles have independent abilities. Printed text and official
// clarifications are pinned in the meta-pilot-leaders fixture.
export const darthVaderVictorSquadronLeader = {
  cardId: 'darth-vader--victor-squadron-leader',
  name: 'Darth Vader, Victor Squadron Leader',
  kind: 'leader',
  aspects: ['Command', 'Villainy'],
  traits: ['Force', 'Imperial', 'Sith', 'Pilot'],
  unique: true,
  printedCost: 6,
  faces: {
    leader: {
      actions: [
        {
          id: 'vehicle-squadron',
          costs: [
            {
              kind: 'exhaust-self',
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'if',
              condition: {
                kind: 'attacked-with-trait',
                trait: 'Vehicle',
                nonToken: true,
              },
              effects: [
                {
                  kind: 'create-unit',
                  cardId: 'tie-fighter',
                  count: 1,
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
      power: 5,
      hp: 6,
      arena: 'ground',
    },
    upgrade: {
      modifiers: {
        power: 5,
        hp: 5,
      },
      attachTo: 'friendly-vehicle-without-pilot',
      hostIsLeader: true,
      triggers: [
        {
          id: 'deployed-squadron',
          timing: 'deployed',
          effects: [
            {
              kind: 'create-unit',
              cardId: 'tie-fighter',
              count: 2,
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
