// These positions are built and validated in Bun. Only Projector output is sent
// to the browser; no scenario-loading route is added to the application.
import { scenario, type ScenarioInput } from '../testing/scenario.ts';
import { advance } from '../engine/advance.ts';
import { choose } from '../testing/helpers.ts';
import type { GameState, Intent } from '../engine/model.ts';

export function galleryBoard(gameId: string): ScenarioInput {
  return {
    gameId,
    round: 5,
    activePlayer: 'p1',
    initiative: { holder: 'p1' },
    players: [
      {
        id: 'p1',
        base: { card: 'energy-conversion-lab', damage: 7, ref: 'own-base' },
        leader: {
          card: 'sabine-wren--galvanized-revolutionary',
          ref: 'own-leader',
          abilityUses: { deploy: 1 },
          exhausted: true,
        },
        force: true,
        credits: ['credit-1', 'credit-2'],
        hand: [
          'battlefield-marine',
          'red-squadron-x-wing',
          'open-fire',
          'academy-training',
          'garindan--information-broker',
          'lawbringer--shadow-over-lothal',
        ].map((card, i) => ({ card, ref: `hand-${i}` })),
        deck: Array.from({ length: 20 }, () => ({ card: 'battlefield-marine' })),
        resources: [
          'battlefield-marine',
          'open-fire',
          'red-squadron-x-wing',
          'academy-training',
          'death-star-stormtrooper',
          'swoop-racer',
          'battlefield-marine',
          'open-fire',
          'red-squadron-x-wing',
          'academy-training',
          'swoop-racer',
          'open-fire',
        ].map((card, i) => ({ card, exhausted: i < 3 })),
        ground: [
          { card: 'battlefield-marine', ref: 'marine', damage: 1 },
          { card: 'garindan--information-broker', ref: 'garindan', exhausted: true },
          { card: 'clone-trooper', ref: 'clone' },
        ],
        space: [{ card: 'red-squadron-x-wing', ref: 'x-wing' }],
        discard: [{ card: 'open-fire' }, { card: 'swoop-racer' }],
      },
      {
        id: 'p2',
        base: { card: 'command-center', damage: 12, ref: 'enemy-base' },
        leader: { card: 'sabine-wren--galvanized-revolutionary', ref: 'enemy-leader' },
        force: true,
        hand: [
          'consular-security-force',
          'open-fire',
          'battlefield-marine',
          'red-squadron-x-wing',
          'swoop-racer',
        ].map(card => ({ card })),
        deck: Array.from({ length: 23 }, () => ({ card: 'consular-security-force' })),
        resources: Array.from({ length: 8 }, (_, i) => ({
          card: 'consular-security-force',
          exhausted: i < 4,
        })),
        ground: [
          { card: 'consular-security-force', ref: 'consular', damage: 2 },
          { card: 'death-star-stormtrooper', ref: 'trooper', exhausted: true },
          { card: 'battle-droid', ref: 'droid' },
        ],
        space: [{ card: 'tie-ln-fighter', ref: 'fighter' }],
        discard: [{ card: 'battlefield-marine' }],
      },
    ],
    attachments: [
      { card: 'shield', unit: 'marine', ref: 'shield' },
      { card: 'shield', unit: 'marine', ref: 'shield-2' },
      { card: 'experience', unit: 'marine', ref: 'xp' },
      { card: 'experience', unit: 'marine', ref: 'xp-2' },
      { card: 'academy-training', unit: 'marine', ref: 'own-training' },
      { card: 'advantage', unit: 'x-wing', ref: 'advantage' },
      { card: 'academy-training', unit: 'consular', ref: 'training' },
    ],
  };
}
export function galleryStep(state: GameState, kind: Intent['kind'] | ((i: Intent) => boolean)) {
  return advance(state, choose(state, kind)).state;
}
export function galleryPlay(gameId: string, card: string) {
  const input = galleryBoard(gameId);
  input.players[0].credits = [];
  input.players[0].resources!.forEach(c => {
    c.exhausted = false;
  });
  input.players[0].hand = [{ card, ref: 'played' }];
  input.players[0].ground = input.players[0].ground!.filter(c => c.card !== card);
  const { state, refs } = scenario(input);
  return galleryStep(state, i => i.kind === 'play' && i.card === refs.played);
}
