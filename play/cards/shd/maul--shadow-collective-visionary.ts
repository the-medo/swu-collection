import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteMaulShadowCollectiveVisionary = {
  cardId: 'maul--shadow-collective-visionary',
  name: 'Maul, Shadow Collective Visionary',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Force', 'Underworld'],
  cost: 7,
  unique: true,
  power: 7,
  hp: 6,
  arena: 'ground',
  keywords: ['Ambush', 'Overwhelm'],
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            trait: 'Underworld',
            otherThan: 'source',
          },
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'redirect-combat-damage',
              from: 'source',
              to: 'chosen',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
