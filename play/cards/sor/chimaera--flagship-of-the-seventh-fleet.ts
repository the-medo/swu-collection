import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteChimaeraFlagshipOfTheSeventhFleet = {
  cardId: 'chimaera--flagship-of-the-seventh-fleet',
  name: 'Chimaera, Flagship of the Seventh Fleet',
  kind: 'unit',
  aspects: ['Villainy', 'Cunning'],
  traits: ['Imperial', 'Vehicle', 'Capital Ship'],
  cost: 8,
  unique: true,
  power: 8,
  hp: 7,
  arena: 'space',
  keywords: ['Shielded'],
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'name-card',
          bind: 'named',
          effects: [
            {
              kind: 'reveal-hand',
              player: 'enemy',
              effects: [
                {
                  kind: 'inspect-zone',
                  zone: 'hand',
                  player: 'enemy',
                  chooser: 'owner',
                  filter: {
                    named: 'named',
                  },
                  min: 1,
                  max: 1,
                  bind: 'card',
                  effects: [
                    {
                      kind: 'move-card',
                      from: 'hand',
                      to: 'discard',
                      target: 'card',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
