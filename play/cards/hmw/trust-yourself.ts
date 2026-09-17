import { hmwEvent } from './define.ts';

export const hmwTrustYourself = hmwEvent('trust-yourself', [
  {
    kind: 'select-unit',
    filter: {},
    bind: 'chosen',
    optional: false,
    effects: [
      {
        kind: 'on-unit',
        target: 'chosen',
        operation: {
          kind: 'give-token',
          token: 'shield',
          count: 1,
        },
      },
    ],
  },
  {
    kind: 'search-deck',
    count: 3,
    filter: 'any',
    max: 1,
  },
]);
