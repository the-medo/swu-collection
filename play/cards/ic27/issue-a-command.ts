import { ic27Event } from './define.ts';

export const ic27IssueACommand = ic27Event('issue-a-command', [
  {
    kind: 'reveal-top',
    player: 'self',
    bind: 'top',
    effects: [
      {
        kind: 'if',
        condition: {
          kind: 'card-matches',
          target: 'top',
          filter: {
            kind: 'unit',
          },
        },
        effects: [
          {
            kind: 'draw-card',
            target: 'top',
          },
        ],
      },
    ],
  },
  {
    kind: 'select-unit',
    filter: {
      controller: 'friendly',
    },
    bind: 'chosen',
    optional: false,
    effects: [
      {
        kind: 'on-unit',
        target: 'chosen',
        operation: {
          kind: 'give-token',
          token: 'experience',
          count: 1,
        },
      },
    ],
  },
  {
    kind: 'self-resource',
    optional: false,
    ready: false,
  },
]);
