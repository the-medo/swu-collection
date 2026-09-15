import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const flightOfTheInquisitor = {
  cardId: 'flight-of-the-inquisitor',
  name: 'Flight of the Inquisitor',
  kind: 'event',
  aspects: ['Villainy'],
  traits: ['Tactic'],
  cost: 2,
  effects: [
    {
      kind: 'inspect-zone',
      zone: 'discard',
      player: 'self',
      chooser: 'self',
      filter: {
        kind: 'unit',
        trait: 'Force',
      },
      min: 0,
      max: 1,
      bind: 'recovered',
      effects: [
        {
          kind: 'move-card',
          target: 'recovered',
          from: 'discard',
          to: 'hand',
        },
      ],
    },
    {
      kind: 'inspect-zone',
      zone: 'discard',
      player: 'self',
      chooser: 'self',
      filter: {
        kind: 'upgrade',
        trait: 'Lightsaber',
      },
      min: 0,
      max: 1,
      bind: 'recovered',
      effects: [
        {
          kind: 'move-card',
          target: 'recovered',
          from: 'discard',
          to: 'hand',
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
