import type { EventDefinition } from '../definition.ts';
export const tearThisShipApart = {
  cardId: 'tear-this-ship-apart',
  name: 'Tear This Ship Apart',
  kind: 'event',
  cost: 7,
  aspects: ['Command', 'Cunning', 'Villainy'],
  traits: ['Tactic'],
  effects: [
    {
      kind: 'inspect-zone',
      zone: 'resources',
      player: 'enemy',
      chooser: 'self',
      filter: {},
      min: 0,
      max: 1,
      bind: 'stolen',
      effects: [
        {
          kind: 'play-card',
          from: 'resources',
          target: 'stolen',
          filter: {},
          free: true,
          takeControl: true,
          optional: false,
          effects: [{ kind: 'resource-top', player: 'enemy', optional: false }],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
