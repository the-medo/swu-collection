import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteRazorCrestReliableGunship = {
  cardId: 'razor-crest--reliable-gunship',
  name: 'Razor Crest, Reliable Gunship',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Mandalorian', 'Vehicle', 'Transport'],
  cost: 4,
  unique: true,
  power: 3,
  hp: 4,
  arena: 'space',
  restore: 2,
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'discard',
          player: 'self',
          chooser: 'owner',
          filter: {
            kind: 'upgrade',
          },
          min: 0,
          max: 1,
          bind: 'card',
          effects: [
            {
              kind: 'move-card',
              target: 'card',
              from: 'discard',
              to: 'hand',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
