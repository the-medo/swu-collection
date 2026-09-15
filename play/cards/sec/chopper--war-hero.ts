import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const chopperWarHero = {
  cardId: 'chopper--war-hero',
  name: 'Chopper, War Hero',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Rebel', 'Droid', 'Spectre'],
  unique: true,
  cost: 2,
  power: 4,
  hp: 1,
  arena: 'ground',
  triggers: [
    {
      id: 'combat-base-damage-dealt',
      timing: 'combat-base-damage-dealt',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'hand',
          player: 'self',
          chooser: 'owner',
          filter: {},
          min: 1,
          max: 1,
          bind: 'chosen',
          effects: [
            {
              kind: 'move-card',
              target: 'chosen',
              from: 'hand',
              to: 'discard',
              discardBy: 'owner',
            },
          ],
        },
        {
          kind: 'inspect-zone',
          zone: 'hand',
          player: 'enemy',
          chooser: 'owner',
          filter: {},
          min: 1,
          max: 1,
          bind: 'chosen',
          effects: [
            {
              kind: 'move-card',
              target: 'chosen',
              from: 'hand',
              to: 'discard',
              discardBy: 'owner',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
