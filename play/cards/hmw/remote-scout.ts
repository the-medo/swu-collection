import { hmwUnit } from './define.ts';

export const hmwRemoteScout = hmwUnit('remote-scout', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'search-deck',
          count: 8,
          filter: 'upgrade',
          max: 1,
          reveal: true,
        },
      ],
    },
  ],
});
