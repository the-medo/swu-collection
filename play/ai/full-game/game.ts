import type { BundleVersions } from '../../cards/version-contract.ts';
import { isDeepStrictEqual } from 'node:util';
import { LocalGame, replay } from '../../host/session.ts';
import { Projector } from '../../projection/projector.ts';
import type { GameConfig } from '../../engine/state.ts';
import type { GameState } from '../../engine/model.ts';
import { versions } from '../../engine/model.ts';
import { randomSource } from '../random.ts';
import { roster, leagueRoster } from './roster.ts';
import { catalogFor } from '../../cards/catalog.ts';
import { CommandBuilder, makeNameChoices } from './choices.ts';
import type { Candidate } from './choices.ts';
import {
  legacyEncoding,
  leagueEncoding,
  makeEncoding,
  referenceScore,
  VisibleMemory,
} from './encoding.ts';
import { specialistRouting, type TrainingRoster } from './training-roster.ts';

export const fullGameContract = {
  protocol: 1,
  scope: 'greef-dedra-full-game-v1',
  versions,
  encoding: legacyEncoding.encodingContract,
  decks: roster.map(d => ({ key: d.key, hash: d.snapshot.contentHash })),
  commandAdapter: 1,
};
export const leagueGameContract = {
  ...fullGameContract,
  scope: 'six-deck-full-game-v1',
  encoding: leagueEncoding.encodingContract,
  decks: leagueRoster.map(d => ({ key: d.key, hash: d.snapshot.contentHash })),
};
export function rosterEnvironment(roster: TrainingRoster) {
  const encoding = makeEncoding(roster.decks, true);
  return {
    roster,
    encoding,
    contract: {
      ...fullGameContract,
      scope: 'roster-full-game-v2',
      encoding: encoding.encodingContract,
      decks: roster.decks.map(d => ({ key: d.key, label: d.label, hash: d.snapshot.contentHash })),
      specialists: specialistRouting(roster),
    },
  };
}
export class FullGame {
  readonly game: LocalGame;
  // This wrapper owns submissions. Reuse the host's defensive copy until the
  // next accepted command; never expose it to the policy or change LocalGame.
  #snapshot: GameState;
  readonly seats = ['alice', 'bob'];
  readonly deckIndices: number[];
  readonly encoding: typeof legacyEncoding;
  readonly projectors: Projector[];
  readonly names: Candidate[];
  readonly memories = [new VisibleMemory(), new VisibleMemory()];
  commands = 0;
  microsteps = 0;
  forcedChoices = 0;
  ticket = 0;
  readonly inventory = new Set<string>();
  stopped = false;
  builder!: CommandBuilder;
  candidates: Candidate[] = [];
  constructor(
    readonly seed: number,
    orientation: number,
    readonly limit: number | null = 1500,
    readonly autoForced = false,
    readonly optimizedProjection = true,
    deckPair?: readonly [number, number],
    environment?: ReturnType<typeof rosterEnvironment>,
    target: BundleVersions = versions,
  ) {
    this.deckIndices = deckPair ? [...deckPair] : orientation === 0 ? [0, 1] : [1, 0];
    const decks = environment?.roster.decks ?? (deckPair ? leagueRoster : roster);
    if (this.deckIndices.some(i => !Number.isInteger(i) || !decks[i]))
      throw new Error('Unknown training deck');
    this.encoding = environment?.encoding ?? (deckPair ? leagueEncoding : legacyEncoding);
    const config: GameConfig = {
      gameId: deckPair
        ? `ai-league-${seed}-${deckPair.join('-')}`
        : `ai-full-${seed}-${orientation}`,
      versions: target,
      players: this.deckIndices.map((index, i) => {
        const deck = decks[index]!.snapshot;
        return {
          id: this.seats[i]!,
          leader: deck.leader,
          base: deck.base,
          deck: deck.mainboard.map(c => ({ ...c })),
        };
      }) as GameConfig['players'],
    };
    this.game = new LocalGame(config, randomSource(seed));
    this.#snapshot = this.game.state;
    this.names = makeNameChoices(catalogFor(this.#snapshot).data.titles);
    this.projectors = this.seats.map(
      playerId =>
        new Projector(config.gameId, { role: 'player', playerId }, undefined, {
          training: optimizedProjection,
        }),
    );
    this.refresh();
    this.resolveForced();
  }
  get done() {
    return (
      this.stopped ||
      !!this.#snapshot.result ||
      (this.limit !== null && (this.commands >= this.limit || this.microsteps >= this.limit * 16))
    );
  }
  get seat() {
    return this.seats.indexOf(this.#snapshot.execution.decision?.playerId ?? '');
  }
  private refresh() {
    const views = this.projectors.map(p => p.project(this.#snapshot));
    for (let i = 0; i < 2; i++) this.memories[i]!.observe(views[i]!, this.seats[i]!);
    if (!this.done) {
      if (this.seat < 0) throw new Error('Engine did not settle to a seat decision');
      this.builder = new CommandBuilder(views[this.seat]!, this.names);
      const d = this.builder.view.decision!;
      this.inventory.add(
        `${d.kind}:${d.effect ?? ''}:${d.selection?.allocation ? 'allocation' : d.selection?.disclose ? 'disclose' : d.selection?.budget ? 'budget' : d.selection ? 'selection' : 'option'}`,
      );
      this.candidates = this.builder.choices();
    }
  }
  observation() {
    if (this.done) {
      const result = this.#snapshot.result;
      return {
        done: true as const,
        outcome: result ? 'terminal' : 'cutoff',
        winner: result?.winner ? this.seats.indexOf(result.winner) : null,
        reason: result?.reason ?? (this.stopped ? 'run-budget' : 'decision-limit'),
        commands: this.commands,
        microsteps: this.microsteps,
        forcedChoices: this.forcedChoices,
        round: this.#snapshot.round,
        inventory: [...this.inventory].sort(),
        bootstrap: result
          ? null
          : this.projectors.map((p, i) =>
              this.encoding.encodeContext(
                p.project(this.#snapshot),
                this.seats[i]!,
                this.deckIndices[i]!,
                this.memories[i]!,
              ),
            ),
      };
    }
    if (!this.candidates.length) throw new Error('No completable projected command');
    const self = this.seats[this.seat]!;
    const context = this.encoding.encodeContext(
      this.builder.view,
      self,
      this.deckIndices[this.seat]!,
      this.memories[this.seat]!,
      this.builder,
    );
    const candidates = this.candidates.map(c =>
      this.encoding.encodeCandidate(this.builder, c, self),
    );
    if (
      context.length !== this.encoding.encodingContract.contextSize ||
      candidates.some(c => c.length !== this.encoding.encodingContract.candidateSize)
    )
      throw new Error('Feature dimensions disagree with contract');
    return { done: false as const, seat: this.seat, ticket: this.ticket, context, candidates };
  }
  step(ticket: number, index: number) {
    if (this.done || ticket !== this.ticket) throw new Error('Stale or completed decision');
    this.choose(index);
    this.resolveForced();
    return this.observation();
  }
  private resolveForced() {
    // Bound each request so stop/deadline checks can run even across unusually
    // long forced chains. All commands still pass projection and engine checks.
    for (let i = 0; this.autoForced && i < 64 && !this.done && this.candidates.length === 1; i++) {
      this.choose(0);
      this.forcedChoices++;
    }
  }
  private choose(index: number) {
    if (!Number.isInteger(index) || !this.candidates[index])
      throw new Error('Invalid action index');
    this.builder.choose(this.candidates[index]!);
    this.microsteps++;
    this.ticket++;
    if (this.builder.stage === 'done') {
      this.#snapshot = this.game.submit(
        this.projectors[this.seat]!.command(this.#snapshot, this.builder.command()),
      );
      this.commands++;
      this.refresh();
    } else this.candidates = this.builder.choices();
  }
  reference(ticket: number) {
    const scores = this.candidates.map(c =>
      referenceScore(this.builder, c, this.seats[this.seat]!),
    );
    const index = scores.reduce((best, n, i) => (n > scores[best]! ? i : best), 0);
    return { index, observation: this.step(ticket, index) };
  }
  verifyReplay() {
    if (!isDeepStrictEqual(replay(this.game.recording), this.game.state))
      throw new Error('Full-game replay diverged');
    return { verified: true, commands: this.commands };
  }
  truncate() {
    this.stopped = true;
    return this.observation();
  }
}
