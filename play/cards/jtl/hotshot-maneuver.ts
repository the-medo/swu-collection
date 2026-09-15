import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in meta-combat-order.json.
export const hotshotManeuver = {
  cardId: 'hotshot-maneuver',
  kind: 'event',
  name: 'Hotshot Maneuver',
  cost: 1,
  aspects: ['Aggression'],
  traits: ['Tactic'],
  effects: [
    {
      kind: 'select-unit',
      filter: { controller: 'friendly' },
      bind: 'attacker',
      optional: false,
      effects: [
        {
          kind: 'damage-units',
          amount: 2,
          filter: { controller: 'enemy' },
          max: { kind: 'on-attack-count', target: 'attacker' },
          mandatory: true,
        },
        { kind: 'attack-bound', target: 'attacker', optional: false },
      ],
    },
  ],
} as const satisfies EventDefinition;
