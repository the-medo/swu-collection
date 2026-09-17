import { hmwUnit } from './define.ts';

export const hmwGeonosianPicador = hmwUnit('geonosian-picador', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'create-unit',
          cardId: 'beast',
          count: 1,
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
                token: 'weakness',
                count: 1,
              },
            },
          ],
        },
      ],
    },
  ],
});
