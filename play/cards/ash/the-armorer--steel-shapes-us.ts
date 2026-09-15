import type { LeaderDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 Pilot foundations fixture.
export const theArmorerSteelShapesUs = {
  cardId: 'the-armorer--steel-shapes-us',
  name: 'The Armorer, Steel Shapes Us',
  kind: 'leader',
  aspects: ['Vigilance', 'Command'],
  traits: ['Mandalorian'],
  unique: true,
  printedCost: 5,
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
                amount: 5,
              },
            },
          ],
        },
        {
          id: 'forge-upgrade',
          costs: [
            {
              kind: 'exhaust-self',
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'inspect-zone',
              zone: 'resources',
              player: 'self',
              chooser: 'self',
              filter: {
                playAs: 'upgrade',
              },
              min: 1,
              max: 1,
              bind: 'upgrade',
              effects: [
                {
                  kind: 'play-card',
                  from: 'resources',
                  target: 'upgrade',
                  filter: {
                    playAs: 'upgrade',
                  },
                  attachFilter: {
                    enteredThisPhase: true,
                  },
                  optional: false,
                  effects: [{ kind: 'resource-top', optional: false }],
                },
              ],
            },
          ],
        },
      ],
    },
    unit: {
      power: 4,
      hp: 6,
      arena: 'ground',
      triggers: [
        {
          id: 'forge-upgrade',
          timing: 'attack-ended',
          effects: [
            {
              kind: 'inspect-zone',
              zone: 'resources',
              player: 'self',
              chooser: 'self',
              filter: {
                playAs: 'upgrade',
              },
              min: 1,
              max: 1,
              bind: 'upgrade',
              effects: [
                {
                  kind: 'play-card',
                  from: 'resources',
                  target: 'upgrade',
                  filter: {
                    playAs: 'upgrade',
                  },
                  attachFilter: {
                    controller: 'friendly',
                  },
                  optional: false,
                  effects: [{ kind: 'resource-top', optional: false }],
                },
              ],
            },
          ],
          optional: true,
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
