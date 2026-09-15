import type { LeaderDefinition } from '../definition.ts';

// Separate costs and entry roles follow the pinned official leader-deployment fixture.
export const poeDameronICanFlyAnything = {
  cardId: 'poe-dameron--i-can-fly-anything',
  name: 'Poe Dameron, I Can Fly Anything',
  kind: 'leader',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Resistance', 'Pilot'],
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
              kind: 'attach-leader',
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
                amount: 5,
              },
            },
          ],
        },
      ],
    },
    unit: {
      power: 4,
      hp: 6,
      arena: 'ground',
    },
    upgrade: {
      modifiers: {
        power: 2,
        hp: 1,
      },
      attachTo: 'friendly-vehicle-without-pilot',
      attachFilter: {
        withoutPilot: true,
      },
      actions: [
        {
          id: 'reattach',
          costs: [
            {
              kind: 'resources',
              amount: 1,
            },
          ],
          limit: 'once-per-round',
          effects: [
            {
              kind: 'reattach-upgrade',
              target: 'source',
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
