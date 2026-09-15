import type { EventDefinition } from '../definition.ts';
// SEC 195. The base guards the unit; delayed rescue tracks this incarnation.
export const arrest = {
  cardId: 'arrest',
  name: 'Arrest',
  kind: 'event',
  cost: 2,
  aspects: ['Cunning', 'Villainy'],
  traits: ['Law'],
  effects: [
    {
      kind: 'select-unit',
      filter: { controller: 'enemy', nonLeader: true },
      optional: false,
      bind: 'prisoner',
      effects: [
        { kind: 'capture-unit', guard: 'own-base', target: 'prisoner', rescueAtRegroup: true },
      ],
    },
  ],
} as const satisfies EventDefinition;
