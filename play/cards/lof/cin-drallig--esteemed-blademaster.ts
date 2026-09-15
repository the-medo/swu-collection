import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const cinDralligEsteemedBlademaster = {
  cardId: 'cin-drallig--esteemed-blademaster',
  name: 'Cin Drallig, Esteemed Blademaster',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Force', 'Jedi', 'Republic'],
  unique: true,
  cost: 8,
  power: 5,
  hp: 6,
  arena: 'ground',
  triggers: [
    {
      id: 'when-played',
      timing: 'played',
      effects: [
        {
          kind: 'play-card',
          from: 'hand',
          filter: {
            kind: 'upgrade',
            trait: 'Lightsaber',
          },
          optional: true,
          free: true,
          attachTo: 'source',
          effects: [
            {
              kind: 'on-unit',
              target: 'source',
              operation: {
                kind: 'ready',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
