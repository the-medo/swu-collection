import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-effects.json.
export const allWingsReportIn = {
  cardId: 'all-wings-report-in',
  name: 'All Wings Report In',
  kind: 'event',
  aspects: ['Command'],
  traits: ['Plan'],
  cost: 1,
  effects: [
    {
      kind: 'select-units',
      filter: {
        controller: 'friendly',
        arena: 'space',
      },
      min: 0,
      max: 2,
      bind: 'selected',
      effects: [
        {
          kind: 'exhaust-group',
          group: 'selected',
          countAs: 'exhausted',
          effects: [
            {
              kind: 'create-unit',
              cardId: 'x-wing',
              count: {
                kind: 'value',
                name: 'exhausted',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
