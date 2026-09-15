import type { UnitDefinition } from '../definition.ts';

// Printed text and rulings are pinned in the meta-aspect-abilities fixture.
export const sabineSMasterpieceCrazyColorful = {
  cardId: 'sabine-s-masterpiece--crazy-colorful',
  name: "Sabine's Masterpiece, Crazy Colorful",
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Rebel', 'Vehicle', 'Fighter', 'Spectre'],
  cost: 3,
  power: 3,
  hp: 3,
  arena: 'space',
  unique: true,
  triggers: [
    {
      id: 'colorful-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'units-at-least',
            filter: {
              controller: 'friendly',
              anyAspect: ['Vigilance'],
            },
            amount: 1,
          },
          effects: [
            {
              kind: 'heal-base',
              amount: 2,
            },
          ],
        },
        {
          kind: 'if',
          condition: {
            kind: 'units-at-least',
            filter: {
              controller: 'friendly',
              anyAspect: ['Command'],
            },
            amount: 1,
          },
          effects: [
            {
              kind: 'select-unit',
              bind: 'chosen',
              filter: {},
              optional: false,
              allowMissing: true,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'give-token',
                    token: 'experience',
                    count: 1,
                  },
                },
              ],
            },
          ],
        },
        {
          kind: 'if',
          condition: {
            kind: 'units-at-least',
            filter: {
              controller: 'friendly',
              anyAspect: ['Aggression'],
            },
            amount: 1,
          },
          effects: [
            {
              kind: 'select-target',
              units: {},
              bases: 'any',
              bind: 'chosen',
              optional: false,
              effects: [
                {
                  kind: 'damage-target',
                  target: 'chosen',
                  amount: 1,
                },
              ],
            },
          ],
        },
        {
          kind: 'if',
          condition: {
            kind: 'units-at-least',
            filter: {
              controller: 'friendly',
              anyAspect: ['Cunning'],
            },
            amount: 1,
          },
          effects: [
            {
              kind: 'choose-mode',
              options: [
                {
                  id: 'self-ready',
                  condition: {
                    kind: 'resource-available',
                    player: 'self',
                    exhausted: true,
                  },
                  effects: [
                    {
                      kind: 'select-resources',
                      player: 'self',
                      chooser: 'self',
                      exhausted: true,
                      min: 1,
                      max: 1,
                      operation: 'ready',
                    },
                  ],
                },
                {
                  id: 'self-exhaust',
                  condition: {
                    kind: 'resource-available',
                    player: 'self',
                    exhausted: false,
                  },
                  effects: [
                    {
                      kind: 'select-resources',
                      player: 'self',
                      chooser: 'self',
                      exhausted: false,
                      min: 1,
                      max: 1,
                      operation: 'exhaust',
                    },
                  ],
                },
                {
                  id: 'enemy-ready',
                  condition: {
                    kind: 'resource-available',
                    player: 'enemy',
                    exhausted: true,
                  },
                  effects: [
                    {
                      kind: 'select-resources',
                      player: 'enemy',
                      chooser: 'self',
                      exhausted: true,
                      min: 1,
                      max: 1,
                      operation: 'ready',
                    },
                  ],
                },
                {
                  id: 'enemy-exhaust',
                  condition: {
                    kind: 'resource-available',
                    player: 'enemy',
                    exhausted: false,
                  },
                  effects: [
                    {
                      kind: 'select-resources',
                      player: 'enemy',
                      chooser: 'self',
                      exhausted: false,
                      min: 1,
                      max: 1,
                      operation: 'exhaust',
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
