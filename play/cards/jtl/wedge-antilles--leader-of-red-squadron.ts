import type { LeaderDefinition } from '../definition.ts';

// Both printed faces and official clarifications are pinned in leader-plays.json.
export const wedgeAntillesLeaderOfRedSquadron = {
  cardId: 'wedge-antilles--leader-of-red-squadron',
  name: 'Wedge Antilles, Leader of Red Squadron',
  kind: 'leader',
  aspects: ['Command', 'Heroism'],
  traits: ['Rebel', 'Pilot'],
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
              kind: 'play-card',
              from: 'hand',
              filter: {
                playAs: 'pilot',
              },
              optional: false,
              discount: 1,
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
      hp: 6,
      arena: 'ground',
    },
    upgrade: {
      modifiers: {
        power: 3,
        hp: 4,
      },
      attachTo: 'friendly-vehicle-without-pilot',
      hostIsLeader: true,
      grants: {
        triggers: [
          {
            id: 'attack',
            timing: 'attack',
            effects: [
              {
                kind: 'next-play',
                filter: {
                  trait: 'Pilot',
                },
                discount: 1,
              },
            ],
          },
        ],
      },
    },
  },
} as const satisfies LeaderDefinition;
