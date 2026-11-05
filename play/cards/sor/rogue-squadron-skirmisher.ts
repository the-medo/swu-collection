import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteRogueSquadronSkirmisher = {
  cardId: 'rogue-squadron-skirmisher',
  name: 'Rogue Squadron Skirmisher',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Rebel', 'Vehicle', 'Speeder'],
  cost: 6,
  power: 4,
  hp: 6,
  arena: 'ground',
  keywords: ['Ambush'],
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
            kind: 'unit',
            maxCost: 2,
          },
          min: 1,
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
