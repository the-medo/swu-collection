import type { LeaderDefinition } from '../definition.ts';

// Both printed faces and official clarifications are pinned in leader-plays.json.
export const agentKallusReconsiderYourAllegiance = {
  cardId: 'agent-kallus--reconsider-your-allegiance',
  name: 'Agent Kallus, Reconsider Your Allegiance',
  kind: 'leader',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Imperial', 'Trooper'],
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
              kind: 'play-card',
              from: 'hand',
              filter: {},
              optional: false,
              ignoreAspectPenalties: true,
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
      hp: 6,
      arena: 'ground',
      actions: [
        {
          id: 'leader-action',
          costs: [
            {
              kind: 'resources',
              amount: 1,
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'play-card',
              from: 'hand',
              filter: {},
              optional: false,
              ignoreAspectPenalties: true,
            },
          ],
        },
      ],
      triggers: [
        {
          id: 'heroism-played',
          timing: 'friendly-card-played',
          effects: [
            {
              kind: 'heal-own-base',
              amount: 2,
            },
          ],
          condition: {
            kind: 'card-matches',
            target: 'subject',
            filter: {
              aspect: 'Heroism',
            },
          },
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
