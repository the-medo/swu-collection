import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-interactions.json.
export const anakinSkywalkerILlTrySpinning = {
  cardId: 'anakin-skywalker--i-ll-try-spinning',
  name: "Anakin Skywalker, I'll Try Spinning",
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Force', 'Fringe', 'Pilot'],
  unique: true,
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'ground',
  piloting: [
    {
      id: 'piloting',
      cost: 2,
      aspects: ['Cunning', 'Heroism'],
    },
  ],
  upgrade: {
    attachTo: 'friendly-vehicle-without-pilot',
    modifiers: {
      power: 2,
      hp: 3,
    },
    triggers: [
      {
        id: 'survived-attack',
        timing: 'host-combat-ended',
        effects: [
          {
            kind: 'select-upgrades',
            filter: {
              sameAs: 'source',
            },
            min: 0,
            max: 1,
            bind: 'chosen',
            effects: [
              {
                kind: 'move-upgrades',
                group: 'chosen',
                to: 'hand',
              },
            ],
          },
        ],
        condition: {
          kind: 'unit-matches',
          target: 'attached',
          filter: {
            sameAs: 'attacker',
          },
        },
      },
    ],
  },
} as const satisfies UnitDefinition;
