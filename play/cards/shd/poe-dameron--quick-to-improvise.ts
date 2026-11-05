import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompletePoeDameronQuickToImprovise = {
  cardId: 'poe-dameron--quick-to-improvise',
  name: 'Poe Dameron, Quick to Improvise',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Resistance'],
  cost: 5,
  unique: true,
  power: 6,
  hp: 6,
  arena: 'ground',
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'hand',
          player: 'self',
          chooser: 'owner',
          filter: {},
          min: 0,
          max: 3,
          bind: 'card',
          effects: [
            {
              kind: 'move-cards',
              group: 'poe-discards',
              from: 'hand',
              to: 'discard',
              discardBy: 'owner',
            },
            {
              kind: 'if',
              condition: {
                kind: 'numeric-at-least',
                value: {
                  kind: 'group-size',
                  group: 'poe-discards',
                },
                amount: 1,
              },
              effects: [
                {
                  kind: 'choose-mode',
                  options: [
                    {
                      id: 'damage',
                      effects: [
                        {
                          kind: 'select-target',
                          units: {},
                          bases: 'any',
                          bind: 'damage-target',
                          optional: false,
                          effects: [
                            {
                              kind: 'if',
                              condition: {
                                kind: 'numeric-at-least',
                                value: {
                                  kind: 'group-size',
                                  group: 'poe-discards',
                                },
                                amount: 2,
                              },
                              effects: [
                                {
                                  kind: 'choose-mode',
                                  options: [
                                    {
                                      id: 'upgrade',
                                      effects: [
                                        {
                                          kind: 'select-upgrades',
                                          filter: {},
                                          min: 1,
                                          max: 1,
                                          bind: 'chosen-upgrade',
                                          effects: [
                                            {
                                              kind: 'if',
                                              condition: {
                                                kind: 'numeric-at-least',
                                                value: {
                                                  kind: 'group-size',
                                                  group: 'poe-discards',
                                                },
                                                amount: 3,
                                              },
                                              effects: [
                                                {
                                                  kind: 'choose-mode',
                                                  options: [
                                                    {
                                                      id: 'discard',
                                                      effects: [
                                                        {
                                                          kind: 'inspect-zone',
                                                          zone: 'hand',
                                                          player: 'enemy',
                                                          chooser: 'owner',
                                                          filter: {},
                                                          min: 1,
                                                          max: 1,
                                                          bind: 'card',
                                                          effects: [
                                                            {
                                                              kind: 'simultaneous-choices',
                                                              damage: {
                                                                target: 'damage-target',
                                                                amount: 2,
                                                              },
                                                              defeatUpgrades: 'chosen-upgrade',
                                                              discardHand: 'enemy-discard',
                                                            },
                                                          ],
                                                          group: 'enemy-discard',
                                                          otherwise: [
                                                            {
                                                              kind: 'simultaneous-choices',
                                                              damage: {
                                                                target: 'damage-target',
                                                                amount: 2,
                                                              },
                                                              defeatUpgrades: 'chosen-upgrade',
                                                              discardHand: 'enemy-discard',
                                                            },
                                                          ],
                                                        },
                                                      ],
                                                    },
                                                  ],
                                                },
                                              ],
                                              otherwise: [
                                                {
                                                  kind: 'simultaneous-choices',
                                                  damage: {
                                                    target: 'damage-target',
                                                    amount: 2,
                                                  },
                                                  defeatUpgrades: 'chosen-upgrade',
                                                  discardHand: 'enemy-discard',
                                                },
                                              ],
                                            },
                                          ],
                                        },
                                      ],
                                    },
                                    {
                                      id: 'discard',
                                      effects: [
                                        {
                                          kind: 'inspect-zone',
                                          zone: 'hand',
                                          player: 'enemy',
                                          chooser: 'owner',
                                          filter: {},
                                          min: 1,
                                          max: 1,
                                          bind: 'card',
                                          effects: [
                                            {
                                              kind: 'if',
                                              condition: {
                                                kind: 'numeric-at-least',
                                                value: {
                                                  kind: 'group-size',
                                                  group: 'poe-discards',
                                                },
                                                amount: 3,
                                              },
                                              effects: [
                                                {
                                                  kind: 'choose-mode',
                                                  options: [
                                                    {
                                                      id: 'upgrade',
                                                      effects: [
                                                        {
                                                          kind: 'select-upgrades',
                                                          filter: {},
                                                          min: 1,
                                                          max: 1,
                                                          bind: 'chosen-upgrade',
                                                          effects: [
                                                            {
                                                              kind: 'simultaneous-choices',
                                                              damage: {
                                                                target: 'damage-target',
                                                                amount: 2,
                                                              },
                                                              defeatUpgrades: 'chosen-upgrade',
                                                              discardHand: 'enemy-discard',
                                                            },
                                                          ],
                                                        },
                                                      ],
                                                    },
                                                  ],
                                                },
                                              ],
                                              otherwise: [
                                                {
                                                  kind: 'simultaneous-choices',
                                                  damage: {
                                                    target: 'damage-target',
                                                    amount: 2,
                                                  },
                                                  defeatUpgrades: 'chosen-upgrade',
                                                  discardHand: 'enemy-discard',
                                                },
                                              ],
                                            },
                                          ],
                                          group: 'enemy-discard',
                                          otherwise: [
                                            {
                                              kind: 'if',
                                              condition: {
                                                kind: 'numeric-at-least',
                                                value: {
                                                  kind: 'group-size',
                                                  group: 'poe-discards',
                                                },
                                                amount: 3,
                                              },
                                              effects: [
                                                {
                                                  kind: 'choose-mode',
                                                  options: [
                                                    {
                                                      id: 'upgrade',
                                                      effects: [
                                                        {
                                                          kind: 'select-upgrades',
                                                          filter: {},
                                                          min: 1,
                                                          max: 1,
                                                          bind: 'chosen-upgrade',
                                                          effects: [
                                                            {
                                                              kind: 'simultaneous-choices',
                                                              damage: {
                                                                target: 'damage-target',
                                                                amount: 2,
                                                              },
                                                              defeatUpgrades: 'chosen-upgrade',
                                                              discardHand: 'enemy-discard',
                                                            },
                                                          ],
                                                        },
                                                      ],
                                                    },
                                                  ],
                                                },
                                              ],
                                              otherwise: [
                                                {
                                                  kind: 'simultaneous-choices',
                                                  damage: {
                                                    target: 'damage-target',
                                                    amount: 2,
                                                  },
                                                  defeatUpgrades: 'chosen-upgrade',
                                                  discardHand: 'enemy-discard',
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
                              otherwise: [
                                {
                                  kind: 'simultaneous-choices',
                                  damage: {
                                    target: 'damage-target',
                                    amount: 2,
                                  },
                                  defeatUpgrades: 'chosen-upgrade',
                                  discardHand: 'enemy-discard',
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                    {
                      id: 'upgrade',
                      effects: [
                        {
                          kind: 'select-upgrades',
                          filter: {},
                          min: 1,
                          max: 1,
                          bind: 'chosen-upgrade',
                          effects: [
                            {
                              kind: 'if',
                              condition: {
                                kind: 'numeric-at-least',
                                value: {
                                  kind: 'group-size',
                                  group: 'poe-discards',
                                },
                                amount: 2,
                              },
                              effects: [
                                {
                                  kind: 'choose-mode',
                                  options: [
                                    {
                                      id: 'damage',
                                      effects: [
                                        {
                                          kind: 'select-target',
                                          units: {},
                                          bases: 'any',
                                          bind: 'damage-target',
                                          optional: false,
                                          effects: [
                                            {
                                              kind: 'if',
                                              condition: {
                                                kind: 'numeric-at-least',
                                                value: {
                                                  kind: 'group-size',
                                                  group: 'poe-discards',
                                                },
                                                amount: 3,
                                              },
                                              effects: [
                                                {
                                                  kind: 'choose-mode',
                                                  options: [
                                                    {
                                                      id: 'discard',
                                                      effects: [
                                                        {
                                                          kind: 'inspect-zone',
                                                          zone: 'hand',
                                                          player: 'enemy',
                                                          chooser: 'owner',
                                                          filter: {},
                                                          min: 1,
                                                          max: 1,
                                                          bind: 'card',
                                                          effects: [
                                                            {
                                                              kind: 'simultaneous-choices',
                                                              damage: {
                                                                target: 'damage-target',
                                                                amount: 2,
                                                              },
                                                              defeatUpgrades: 'chosen-upgrade',
                                                              discardHand: 'enemy-discard',
                                                            },
                                                          ],
                                                          group: 'enemy-discard',
                                                          otherwise: [
                                                            {
                                                              kind: 'simultaneous-choices',
                                                              damage: {
                                                                target: 'damage-target',
                                                                amount: 2,
                                                              },
                                                              defeatUpgrades: 'chosen-upgrade',
                                                              discardHand: 'enemy-discard',
                                                            },
                                                          ],
                                                        },
                                                      ],
                                                    },
                                                  ],
                                                },
                                              ],
                                              otherwise: [
                                                {
                                                  kind: 'simultaneous-choices',
                                                  damage: {
                                                    target: 'damage-target',
                                                    amount: 2,
                                                  },
                                                  defeatUpgrades: 'chosen-upgrade',
                                                  discardHand: 'enemy-discard',
                                                },
                                              ],
                                            },
                                          ],
                                        },
                                      ],
                                    },
                                    {
                                      id: 'discard',
                                      effects: [
                                        {
                                          kind: 'inspect-zone',
                                          zone: 'hand',
                                          player: 'enemy',
                                          chooser: 'owner',
                                          filter: {},
                                          min: 1,
                                          max: 1,
                                          bind: 'card',
                                          effects: [
                                            {
                                              kind: 'if',
                                              condition: {
                                                kind: 'numeric-at-least',
                                                value: {
                                                  kind: 'group-size',
                                                  group: 'poe-discards',
                                                },
                                                amount: 3,
                                              },
                                              effects: [
                                                {
                                                  kind: 'choose-mode',
                                                  options: [
                                                    {
                                                      id: 'damage',
                                                      effects: [
                                                        {
                                                          kind: 'select-target',
                                                          units: {},
                                                          bases: 'any',
                                                          bind: 'damage-target',
                                                          optional: false,
                                                          effects: [
                                                            {
                                                              kind: 'simultaneous-choices',
                                                              damage: {
                                                                target: 'damage-target',
                                                                amount: 2,
                                                              },
                                                              defeatUpgrades: 'chosen-upgrade',
                                                              discardHand: 'enemy-discard',
                                                            },
                                                          ],
                                                        },
                                                      ],
                                                    },
                                                  ],
                                                },
                                              ],
                                              otherwise: [
                                                {
                                                  kind: 'simultaneous-choices',
                                                  damage: {
                                                    target: 'damage-target',
                                                    amount: 2,
                                                  },
                                                  defeatUpgrades: 'chosen-upgrade',
                                                  discardHand: 'enemy-discard',
                                                },
                                              ],
                                            },
                                          ],
                                          group: 'enemy-discard',
                                          otherwise: [
                                            {
                                              kind: 'if',
                                              condition: {
                                                kind: 'numeric-at-least',
                                                value: {
                                                  kind: 'group-size',
                                                  group: 'poe-discards',
                                                },
                                                amount: 3,
                                              },
                                              effects: [
                                                {
                                                  kind: 'choose-mode',
                                                  options: [
                                                    {
                                                      id: 'damage',
                                                      effects: [
                                                        {
                                                          kind: 'select-target',
                                                          units: {},
                                                          bases: 'any',
                                                          bind: 'damage-target',
                                                          optional: false,
                                                          effects: [
                                                            {
                                                              kind: 'simultaneous-choices',
                                                              damage: {
                                                                target: 'damage-target',
                                                                amount: 2,
                                                              },
                                                              defeatUpgrades: 'chosen-upgrade',
                                                              discardHand: 'enemy-discard',
                                                            },
                                                          ],
                                                        },
                                                      ],
                                                    },
                                                  ],
                                                },
                                              ],
                                              otherwise: [
                                                {
                                                  kind: 'simultaneous-choices',
                                                  damage: {
                                                    target: 'damage-target',
                                                    amount: 2,
                                                  },
                                                  defeatUpgrades: 'chosen-upgrade',
                                                  discardHand: 'enemy-discard',
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
                              otherwise: [
                                {
                                  kind: 'simultaneous-choices',
                                  damage: {
                                    target: 'damage-target',
                                    amount: 2,
                                  },
                                  defeatUpgrades: 'chosen-upgrade',
                                  discardHand: 'enemy-discard',
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                    {
                      id: 'discard',
                      effects: [
                        {
                          kind: 'inspect-zone',
                          zone: 'hand',
                          player: 'enemy',
                          chooser: 'owner',
                          filter: {},
                          min: 1,
                          max: 1,
                          bind: 'card',
                          effects: [
                            {
                              kind: 'if',
                              condition: {
                                kind: 'numeric-at-least',
                                value: {
                                  kind: 'group-size',
                                  group: 'poe-discards',
                                },
                                amount: 2,
                              },
                              effects: [
                                {
                                  kind: 'choose-mode',
                                  options: [
                                    {
                                      id: 'damage',
                                      effects: [
                                        {
                                          kind: 'select-target',
                                          units: {},
                                          bases: 'any',
                                          bind: 'damage-target',
                                          optional: false,
                                          effects: [
                                            {
                                              kind: 'if',
                                              condition: {
                                                kind: 'numeric-at-least',
                                                value: {
                                                  kind: 'group-size',
                                                  group: 'poe-discards',
                                                },
                                                amount: 3,
                                              },
                                              effects: [
                                                {
                                                  kind: 'choose-mode',
                                                  options: [
                                                    {
                                                      id: 'upgrade',
                                                      effects: [
                                                        {
                                                          kind: 'select-upgrades',
                                                          filter: {},
                                                          min: 1,
                                                          max: 1,
                                                          bind: 'chosen-upgrade',
                                                          effects: [
                                                            {
                                                              kind: 'simultaneous-choices',
                                                              damage: {
                                                                target: 'damage-target',
                                                                amount: 2,
                                                              },
                                                              defeatUpgrades: 'chosen-upgrade',
                                                              discardHand: 'enemy-discard',
                                                            },
                                                          ],
                                                        },
                                                      ],
                                                    },
                                                  ],
                                                },
                                              ],
                                              otherwise: [
                                                {
                                                  kind: 'simultaneous-choices',
                                                  damage: {
                                                    target: 'damage-target',
                                                    amount: 2,
                                                  },
                                                  defeatUpgrades: 'chosen-upgrade',
                                                  discardHand: 'enemy-discard',
                                                },
                                              ],
                                            },
                                          ],
                                        },
                                      ],
                                    },
                                    {
                                      id: 'upgrade',
                                      effects: [
                                        {
                                          kind: 'select-upgrades',
                                          filter: {},
                                          min: 1,
                                          max: 1,
                                          bind: 'chosen-upgrade',
                                          effects: [
                                            {
                                              kind: 'if',
                                              condition: {
                                                kind: 'numeric-at-least',
                                                value: {
                                                  kind: 'group-size',
                                                  group: 'poe-discards',
                                                },
                                                amount: 3,
                                              },
                                              effects: [
                                                {
                                                  kind: 'choose-mode',
                                                  options: [
                                                    {
                                                      id: 'damage',
                                                      effects: [
                                                        {
                                                          kind: 'select-target',
                                                          units: {},
                                                          bases: 'any',
                                                          bind: 'damage-target',
                                                          optional: false,
                                                          effects: [
                                                            {
                                                              kind: 'simultaneous-choices',
                                                              damage: {
                                                                target: 'damage-target',
                                                                amount: 2,
                                                              },
                                                              defeatUpgrades: 'chosen-upgrade',
                                                              discardHand: 'enemy-discard',
                                                            },
                                                          ],
                                                        },
                                                      ],
                                                    },
                                                  ],
                                                },
                                              ],
                                              otherwise: [
                                                {
                                                  kind: 'simultaneous-choices',
                                                  damage: {
                                                    target: 'damage-target',
                                                    amount: 2,
                                                  },
                                                  defeatUpgrades: 'chosen-upgrade',
                                                  discardHand: 'enemy-discard',
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
                              otherwise: [
                                {
                                  kind: 'simultaneous-choices',
                                  damage: {
                                    target: 'damage-target',
                                    amount: 2,
                                  },
                                  defeatUpgrades: 'chosen-upgrade',
                                  discardHand: 'enemy-discard',
                                },
                              ],
                            },
                          ],
                          group: 'enemy-discard',
                          otherwise: [
                            {
                              kind: 'if',
                              condition: {
                                kind: 'numeric-at-least',
                                value: {
                                  kind: 'group-size',
                                  group: 'poe-discards',
                                },
                                amount: 2,
                              },
                              effects: [
                                {
                                  kind: 'choose-mode',
                                  options: [
                                    {
                                      id: 'damage',
                                      effects: [
                                        {
                                          kind: 'select-target',
                                          units: {},
                                          bases: 'any',
                                          bind: 'damage-target',
                                          optional: false,
                                          effects: [
                                            {
                                              kind: 'if',
                                              condition: {
                                                kind: 'numeric-at-least',
                                                value: {
                                                  kind: 'group-size',
                                                  group: 'poe-discards',
                                                },
                                                amount: 3,
                                              },
                                              effects: [
                                                {
                                                  kind: 'choose-mode',
                                                  options: [
                                                    {
                                                      id: 'upgrade',
                                                      effects: [
                                                        {
                                                          kind: 'select-upgrades',
                                                          filter: {},
                                                          min: 1,
                                                          max: 1,
                                                          bind: 'chosen-upgrade',
                                                          effects: [
                                                            {
                                                              kind: 'simultaneous-choices',
                                                              damage: {
                                                                target: 'damage-target',
                                                                amount: 2,
                                                              },
                                                              defeatUpgrades: 'chosen-upgrade',
                                                              discardHand: 'enemy-discard',
                                                            },
                                                          ],
                                                        },
                                                      ],
                                                    },
                                                  ],
                                                },
                                              ],
                                              otherwise: [
                                                {
                                                  kind: 'simultaneous-choices',
                                                  damage: {
                                                    target: 'damage-target',
                                                    amount: 2,
                                                  },
                                                  defeatUpgrades: 'chosen-upgrade',
                                                  discardHand: 'enemy-discard',
                                                },
                                              ],
                                            },
                                          ],
                                        },
                                      ],
                                    },
                                    {
                                      id: 'upgrade',
                                      effects: [
                                        {
                                          kind: 'select-upgrades',
                                          filter: {},
                                          min: 1,
                                          max: 1,
                                          bind: 'chosen-upgrade',
                                          effects: [
                                            {
                                              kind: 'if',
                                              condition: {
                                                kind: 'numeric-at-least',
                                                value: {
                                                  kind: 'group-size',
                                                  group: 'poe-discards',
                                                },
                                                amount: 3,
                                              },
                                              effects: [
                                                {
                                                  kind: 'choose-mode',
                                                  options: [
                                                    {
                                                      id: 'damage',
                                                      effects: [
                                                        {
                                                          kind: 'select-target',
                                                          units: {},
                                                          bases: 'any',
                                                          bind: 'damage-target',
                                                          optional: false,
                                                          effects: [
                                                            {
                                                              kind: 'simultaneous-choices',
                                                              damage: {
                                                                target: 'damage-target',
                                                                amount: 2,
                                                              },
                                                              defeatUpgrades: 'chosen-upgrade',
                                                              discardHand: 'enemy-discard',
                                                            },
                                                          ],
                                                        },
                                                      ],
                                                    },
                                                  ],
                                                },
                                              ],
                                              otherwise: [
                                                {
                                                  kind: 'simultaneous-choices',
                                                  damage: {
                                                    target: 'damage-target',
                                                    amount: 2,
                                                  },
                                                  defeatUpgrades: 'chosen-upgrade',
                                                  discardHand: 'enemy-discard',
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
                              otherwise: [
                                {
                                  kind: 'simultaneous-choices',
                                  damage: {
                                    target: 'damage-target',
                                    amount: 2,
                                  },
                                  defeatUpgrades: 'chosen-upgrade',
                                  discardHand: 'enemy-discard',
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
              otherwise: [
                {
                  kind: 'simultaneous-choices',
                  damage: {
                    target: 'damage-target',
                    amount: 2,
                  },
                  defeatUpgrades: 'chosen-upgrade',
                  discardHand: 'enemy-discard',
                },
              ],
            },
          ],
          group: 'poe-discards',
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
