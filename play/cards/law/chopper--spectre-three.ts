import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const chopperSpectreThree = {
  cardId: 'chopper--spectre-three',
  name: 'Chopper, Spectre Three',
  kind: 'unit',
  aspects: ['Command', 'Aggression', 'Heroism'],
  traits: ['Rebel', 'Droid', 'Spectre'],
  unique: true,
  cost: 2,
  power: 1,
  hp: 2,
  arena: 'ground',
  raid: 1,
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'give-token',
            token: 'experience',
            count: {
              kind: 'conditional',
              condition: {
                kind: 'units-at-least',
                filter: {
                  controller: 'friendly',
                  anyAspect: ['Cunning', 'Vigilance'],
                },
                amount: 1,
              },
              then: 2,
              otherwise: 1,
            },
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
