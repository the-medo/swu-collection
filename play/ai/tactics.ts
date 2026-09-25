import { createHash } from 'node:crypto';
import { advance } from '../engine/advance.ts';
import type { EngineInput, GameState } from '../engine/model.ts';
import { Projector } from '../projection/projector.ts';
import { scenario } from '../testing/scenario.ts';
import type { ScenarioInput } from '../testing/scenario.ts';
import type { GameView, VisibleCard } from '../view/types.ts';
import { cardDefinition } from '../cards/registry.ts';
import { commandFor } from './arena.ts';
import { randomSource, shuffle } from './random.ts';

export const FEATURE_VERSION = 1;
export const GENERATOR_VERSION = 1;
export const FEATURES = [
  'self-base-hp',
  'enemy-base-hp',
  'self-ready-max-power',
  'enemy-ready-max-power',
  'attack',
  'pass',
  'take-initiative',
  'source-power',
  'source-hp',
  'source-ground',
  'source-space',
  'target-base',
  'target-unit',
  'target-power',
  'target-hp',
  'target-ready',
  'target-ground',
  'target-space',
] as const;
export type Split = 'train' | 'validation' | 'test';
export type PuzzleKind = 'win-now' | 'stop-lethal';
type Option = NonNullable<GameView['decision']>['options'][number];

const hp = (card: VisibleCard | undefined) => (card?.face?.hp ?? 0) - (card?.damage ?? 0);
const power = (card: VisibleCard | undefined) => card?.face?.power ?? 0;
const readyUnit = (card: VisibleCard) =>
  card.face?.kind === 'unit' && !card.exhausted && ['ground', 'space'].includes(card.zone);

// Pure encoder: only accepts a player projection, never authoritative GameState.
// No IDs, split/seed, puzzle kind, oracle outcomes, or hidden card identities.
export function encodeChoices(
  view: GameView,
  playerId: string,
  options?: readonly Option[],
): number[][] {
  const decision = view.decision;
  if (!decision || decision.kind !== 'action' || decision.selection)
    throw new Error('Tactical model supports simple action decisions only');
  const cards = new Map(view.cards.map(card => [card.id, card]));
  const own = view.cards.filter(card => card.controller === playerId);
  const enemy = view.cards.filter(card => card.controller !== playerId);
  const common = [
    hp(own.find(card => card.face?.kind === 'base')) / 30,
    hp(enemy.find(card => card.face?.kind === 'base')) / 30,
    Math.max(0, ...own.filter(readyUnit).map(power)) / 10,
    Math.max(0, ...enemy.filter(readyUnit).map(power)) / 10,
  ];
  return (options ?? decision.options).map(option => {
    if (!['attack', 'pass', 'take-initiative'].includes(option.kind))
      throw new Error(`Unsupported tactical action: ${option.kind}`);
    const source = cards.get(option.cards[0]!);
    const target = cards.get(option.cards[1]!);
    return [
      ...common,
      Number(option.kind === 'attack'),
      Number(option.kind === 'pass'),
      Number(option.kind === 'take-initiative'),
      power(source) / 10,
      hp(source) / 10,
      Number(source?.zone === 'ground'),
      Number(source?.zone === 'space'),
      Number(target?.face?.kind === 'base'),
      Number(target?.face?.kind === 'unit'),
      power(target) / 10,
      hp(target) / 30,
      Number(!!target && !target.exhausted),
      Number(target?.zone === 'ground'),
      Number(target?.zone === 'space'),
    ];
  });
}

export function describeChoice(view: GameView, option: Option): string {
  const names = option.cards.map(
    id => view.cards.find(card => card.id === id)?.face?.name ?? 'Hidden card',
  );
  return option.kind === 'attack' ? `${names[0]} → ${names[1]}` : option.kind;
}

export function featureFingerprint(features: number[][]): string {
  // Canonicalize candidate order so a reshuffle cannot put the same model input
  // in both training and evaluation. Identical choices retain multiplicity.
  return createHash('sha256')
    .update(JSON.stringify(features.map(row => JSON.stringify(row)).sort()))
    .digest('hex');
}

function belongsTo(fingerprint: string, split: Split): boolean {
  const bucket = Number.parseInt(fingerprint.slice(0, 8), 16) % 10;
  return split === 'train' ? bucket < 8 : split === 'validation' ? bucket === 8 : bucket === 9;
}

const GROUND = [
  'battlefield-marine',
  'death-star-stormtrooper',
  'swoop-racer',
  'consular-security-force',
];
function stats(id: string) {
  const card = cardDefinition(id);
  if (card.kind !== 'unit') throw new Error('Expected fixture unit');
  return card;
}

export class TacticalPuzzle {
  readonly initial: GameState;
  readonly playerId: string;
  readonly kind: PuzzleKind;
  readonly view: GameView;
  readonly options: Option[];
  readonly features: number[][];
  readonly fingerprint: string;
  readonly #projector: Projector;
  #consumed = false;

  constructor(seed: number) {
    const random = randomSource(seed);
    this.kind = random(2) === 0 ? 'win-now' : 'stop-lethal';
    this.playerId = random(2) === 0 ? 'alice' : 'bob';
    const other = this.playerId === 'alice' ? 'bob' : 'alice';
    const attacker = stats(GROUND[random(GROUND.length)]!);
    const threat = stats(GROUND[random(GROUND.length)]!);
    const threatHp = 1 + random(Math.min(threat.hp, attacker.power));
    const ownHp = 1 + random(threat.power);
    const enemyHp =
      this.kind === 'win-now' ? 1 + random(attacker.power) : attacker.power + 1 + random(10);
    const placements = (controller: string): ScenarioInput['players'][number] => ({
      id: controller,
      base: {
        card: 'command-center',
        damage: 30 - (controller === this.playerId ? ownHp : enemyHp),
      },
      leader: {
        card: 'sabine-wren--galvanized-revolutionary',
        exhausted: true,
        abilityUses: { deploy: 1 },
      },
      // These inaccessible identities/order never reach the encoder.
      deck: Array.from({ length: 6 }, () => ({ card: GROUND[random(GROUND.length)]! })),
      hand: [{ card: GROUND[random(GROUND.length)]! }],
    });
    const self = placements(this.playerId);
    const enemy = placements(other);
    self.ground = [{ card: attacker.cardId, damage: random(attacker.hp) }];
    self.space = [{ card: 'tie-ln-fighter', exhausted: random(2) === 0 }];
    enemy.ground = shuffle(
      [
        { card: threat.cardId, damage: threat.hp - threatHp, exhausted: false },
        ...Array.from({ length: 1 + random(3) }, () => {
          const distractor = stats(GROUND[random(GROUND.length)]!);
          return { card: distractor.cardId, damage: random(distractor.hp), exhausted: true };
        }),
      ],
      random,
    );
    const players = this.playerId === 'alice' ? [self, enemy] : [enemy, self];
    this.initial = scenario({
      gameId: `ai-puzzle-${seed}`,
      players: players as ScenarioInput['players'],
      activePlayer: this.playerId,
      initiative: { holder: random(2) === 0 ? this.playerId : other },
    }).state;
    this.#projector = new Projector(this.initial.gameId, {
      role: 'player',
      playerId: this.playerId,
    });
    this.view = this.#projector.project(this.initial);
    this.options = shuffle(this.view.decision!.options, random);
    this.features = encodeChoices(this.view, this.playerId, this.options);
    this.fingerprint = featureFingerprint(this.features);
  }

  observation() {
    return {
      features: this.features,
      fingerprint: this.fingerprint,
      descriptions: this.options.map(o => describeChoice(this.view, o)),
    };
  }

  step(action: number) {
    if (this.#consumed) throw new Error('Puzzle decision already consumed');
    if (!Number.isInteger(action) || !this.options[action])
      throw new Error('Invalid tactical action');
    const option = this.options[action]!;
    const index = this.view.decision!.options.findIndex(candidate => candidate.id === option.id);
    const inputs: EngineInput[] = [];
    const input = this.#projector.command(this.initial, commandFor(this.view, index));
    inputs.push(input);
    let state = advance(this.initial, input).state;
    if (!state.result) {
      const opponent = state.execution.decision?.playerId;
      if (!opponent || opponent === this.playerId || state.execution.decision?.kind !== 'action')
        throw new Error('Unexpected tactical continuation');
      const projector = new Projector(state.gameId, { role: 'player', playerId: opponent });
      const view = projector.project(state);
      const attack = view.decision!.options.findIndex(
        o =>
          o.kind === 'attack' && view.cards.find(c => c.id === o.cards[1])?.face?.kind === 'base',
      );
      if (attack >= 0) {
        const reply = projector.command(state, commandFor(view, attack));
        inputs.push(reply);
        state = advance(state, reply).state;
      }
    }
    this.#consumed = true;
    const reward = state.result
      ? state.result.winner === this.playerId
        ? 1
        : state.result.winner === null
          ? 0
          : -1
      : 0;
    return {
      reward,
      success: this.kind === 'win-now' ? reward === 1 : reward >= 0,
      kind: this.kind,
      // The exercise ends after one move + one opponent reply. Ongoing is NOT
      // a completed-game draw and must never enter full-game win statistics.
      gameOutcome: state.result
        ? reward === 1
          ? 'win'
          : reward === -1
            ? 'loss'
            : 'draw'
        : 'ongoing',
      episodeEnd: 'tactical-horizon',
      inputs,
      state,
    };
  }
}

export function puzzleFor(split: Split, index: number): TacticalPuzzle {
  if (!Number.isSafeInteger(index) || index < 0 || index >= 1_000_000)
    throw new Error('Puzzle index out of range');
  // Independent deterministic streams, plus feature-level partitioning to
  // exclude identical observable candidate sets across splits.
  const offsets = { train: 0, validation: 1_000_000, test: 2_000_000 };
  const random = randomSource(index + offsets[split]);
  for (let attempt = 0; attempt < 1000; attempt++) {
    const puzzle = new TacticalPuzzle(random(0x1_0000_0000));
    if (belongsTo(puzzle.fingerprint, split)) return puzzle;
  }
  throw new Error('Could not generate a puzzle in the requested split');
}
