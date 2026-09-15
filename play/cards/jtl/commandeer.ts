import type { EventDefinition } from '../definition.ts';
export const commandeer = {
  cardId: 'commandeer',
  name: 'Commandeer',
  kind: 'event',
  cost: 5,
  aspects: ['Cunning'],
  traits: ['Trick'],
  effects: [
    {
      kind: 'select-unit',
      filter: { nonLeader: true, trait: 'Vehicle', maxCost: 6, withoutPilot: true },
      bind: 'chosen',
      optional: false,
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: { kind: 'take-control', player: 'self' },
          ifYouDo: [{ kind: 'on-unit', target: 'chosen', operation: { kind: 'ready' } }],
        },
        { kind: 'schedule-return', target: 'chosen' },
      ],
    },
  ],
} as const satisfies EventDefinition;
