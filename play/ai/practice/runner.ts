import assert from 'node:assert/strict';
import { scenario, type ScenarioInput } from '../../testing/scenario.ts';
import { choose } from '../../testing/helpers.ts';
import { advance } from '../../engine/advance.ts';
import { encodeState, decodeState } from '../../engine/checkpoint.ts';
import type { EngineInput, GameState, Intent } from '../../engine/model.ts';
import { credits, readyResourceCount, spendableCredits } from '../../engine/credits.ts';
import { Projector } from '../../projection/projector.ts';
import { CommandBuilder } from '../full-game/choices.ts';
import { humanChoice } from '../datasets/examples.ts';
import { leagueEncoding, VisibleMemory } from '../full-game/encoding.ts';
import { leagueRoster } from '../full-game/roster.ts';

export type Step = {
  label: string;
  kind: Intent['kind'];
  actor?: string;
  source?: string;
  target?: string;
  ability?: string;
  selections?: string[] | 'credits';
  name?: string;
  teach?: boolean;
  intent?: Partial<Intent>;
};
export type PracticeChoice = {
  context: number[];
  candidates: number[][];
  action: number;
  acceptable: number[];
  stage: string;
  label: string;
};
export type PracticeOptions = {
  onChoice?: (row: PracticeChoice) => void;
  encoding?: typeof leagueEncoding;
  deckIndex?: number;
};
export type Line = {
  label: string;
  reason: string;
  steps: (Step | { nextRound: true })[];
  check: (run: PracticeRun) => void;
};
export type Exercise = {
  id: string;
  title: string;
  skill: string;
  question: string;
  assumptions: string;
  opponent: string;
  input: ScenarioInput;
  setup?: Step[];
  lines: Line[];
};
export const step = (kind: Intent['kind'], source?: string, target?: string): Step => ({
  label: [kind, source, target].filter(Boolean).join(' → '),
  kind,
  source,
  target,
});
export const play = (source: string) => step('play', source);
export const target = (source: string) => step('target', source);
export const ability = (source: string, ability: string): Step => ({
  ...step('use-ability', source),
  ability,
});
export const pay = (selections: string[] | 'credits' = []): Step => ({
  ...step('accept-effect'),
  label: `Pay: ${selections === 'credits' ? 'spend available Credits' : selections.length ? selections.join(', ') : 'keep Credits'}`,
  selections,
});
export const pass = (): Step => step('pass');
export const attack = (source: string, victim: string) => step('attack', source, victim);
export const sacrifice = (source: string): Step[] => [
  {
    ...ability('leader', 'create-credit'),
    target: source,
    label: `Sacrifice ${source} with Krennic`,
  },
];

export class PracticeRun {
  state: GameState;
  refs: Record<string, string>;
  readonly initial: string;
  readonly inputs: EngineInput[] = [];
  readonly trace: {
    label: string;
    actor: string;
    round: number;
    resources: number;
    ready: number;
    credits: number;
    damage: number;
  }[] = [];
  microchoices = 0;
  private projectors: Record<string, Projector>;
  private memories: Record<string, VisibleMemory>;
  constructor(
    input: ScenarioInput,
    private readonly options: PracticeOptions = {},
  ) {
    const created = scenario(input);
    this.state = created.state;
    this.refs = created.refs;
    this.initial = encodeState(this.state);
    this.projectors = Object.fromEntries(
      this.state.seats.map(playerId => [
        playerId,
        new Projector(
          this.state.gameId,
          { role: 'player', playerId },
          'practice-only-private-key'.repeat(3),
        ),
      ]),
    );
    this.memories = Object.fromEntries(this.state.seats.map(id => [id, new VisibleMemory()]));
  }
  card(alias: string) {
    const card = this.state.cards[this.refs[alias]!];
    assert(card, `Unknown alias ${alias}`);
    return card;
  }
  count() {
    return this.state.players.p1!.resources.length;
  }
  ready() {
    return readyResourceCount(this.state, 'p1');
  }
  credits() {
    return credits(this.state, 'p1').length;
  }
  damage() {
    return this.card('base').damage;
  }
  private matches(step: Step, intent: Intent) {
    if (intent.kind !== step.kind) return false;
    if (
      step.intent &&
      !Object.entries(step.intent).every(
        ([key, value]) => (intent as Record<string, unknown>)[key] === value,
      )
    )
      return false;
    if (intent.kind === 'play')
      return (
        intent.card === this.refs[step.source!] &&
        (!step.target || intent.target === this.refs[step.target])
      );
    if (intent.kind === 'target') return intent.card === this.refs[step.source!];
    if (intent.kind === 'use-ability')
      return (
        intent.card === this.refs[step.source!] &&
        intent.abilityId === step.ability &&
        (!step.target || intent.costTarget === this.refs[step.target])
      );
    if (intent.kind === 'trigger' && step.ability) {
      const frame = this.state.execution.frames.find(f => f.kind === 'trigger-batch');
      return (
        frame?.triggers.some(
          t =>
            t.id === intent.triggerId &&
            t.abilityId === step.ability &&
            (!step.source || t.source.instanceId === this.refs[step.source]),
        ) ?? false
      );
    }
    if (intent.kind === 'attack')
      return (
        intent.attacker === this.refs[step.source!] && intent.defender === this.refs[step.target!]
      );
    return true;
  }
  available(step: Step) {
    return this.state.execution.decision?.options.some(o => this.matches(step, o.intent)) ?? false;
  }
  private submit(input: EngineInput, label: string, teach = true) {
    assert.equal(input.type, 'decision', 'Practice scripts only make player decisions');
    if (input.type !== 'decision') return;
    for (const id of this.state.seats)
      this.memories[id]!.observe(this.projectors[id]!.project(this.state), id);
    const projector = this.projectors[input.playerId]!;
    const command = projector.projectDecision(this.state, input);
    const builder = new CommandBuilder(projector.project(this.state));
    for (let guard = 0; builder.stage !== 'done'; guard++) {
      assert(guard < 1024, 'Action adapter exceeded practice budget');
      const candidates = builder.choices(),
        index = humanChoice(builder, command, candidates);
      // Check the learner's actual encoder, not omniscient state features.
      if (input.playerId === 'p1') {
        const encoding = this.options.encoding ?? leagueEncoding;
        const context = encoding.encodeContext(
          builder.view,
          'p1',
          this.options.deckIndex ?? leagueRoster.findIndex(d => d.key === 'krennic'),
          this.memories.p1!,
          builder,
        );
        assert(context.every(Number.isFinite));
        const encoded = candidates.map(candidate =>
          encoding.encodeCandidate(builder, candidate, 'p1'),
        );
        for (const candidate of encoded) assert(candidate.every(Number.isFinite));
        if (teach && candidates.length > 1) {
          // Identical feature rows cannot be distinguished by this policy. Give
          // their shared representation probability mass, rather than arbitrary
          // physical-copy/index labels (e.g. two equivalent Credit tokens).
          const acceptable = encoded.flatMap((row, i) =>
            row.every((v, j) => v === encoded[index]![j]) ? [i] : [],
          );
          this.options.onChoice?.({
            context,
            candidates: encoded,
            action: index,
            acceptable,
            stage: builder.stage,
            label,
          });
        }
        this.microchoices++;
      }
      builder.choose(candidates[index]!);
    }
    assert.deepEqual(
      projector.command(this.state, builder.command()),
      input,
      'Visible action roundtrip',
    );
    let next = advance(this.state, input).state;
    assert.deepEqual(
      advance(decodeState(encodeState(this.state)), input).state,
      next,
      'Checkpoint recovery',
    );
    this.inputs.push(input);
    // Searches shuffle the unselected cards through the engine's random-input
    // contract. Keep fixtures deterministic and replay these inputs as well.
    for (let guard = 0; next.execution.random; guard++) {
      assert(guard < 100, 'Practice random continuation exceeded budget');
      const random: EngineInput = {
        type: 'random',
        gameId: next.gameId,
        expectedRevision: next.revision,
        requestId: next.execution.random.id,
        values: next.execution.random.bounds.map(bound => bound - 1),
      };
      const advanced = advance(next, random).state;
      assert.deepEqual(advance(decodeState(encodeState(next)), random).state, advanced);
      next = advanced;
      this.inputs.push(random);
    }
    this.state = next;
    // Stable script aliases for tokens created by an earlier real command.
    // These aliases never enter the observation or model features.
    for (const token of Object.values(next.cards))
      if (
        ['shield', 'experience', 'advantage', 'spy', 'tie-fighter'].includes(token.cardId) &&
        !Object.values(this.refs).includes(token.instanceId)
      ) {
        let n = 1;
        while (this.refs[`${token.cardId}${n}`]) n++;
        this.refs[`${token.cardId}${n}`] = token.instanceId;
      }
    for (const token of credits(next, 'p1'))
      if (!Object.values(this.refs).includes(token.instanceId)) {
        let n = 1;
        while (this.refs[`credit${n}`]) n++;
        this.refs[`credit${n}`] = token.instanceId;
      }
    this.trace.push({
      label,
      actor: input.playerId,
      round: next.round,
      resources: this.count(),
      ready: this.ready(),
      credits: this.credits(),
      damage: this.damage(),
    });
  }
  step(step: Step) {
    const d = this.state.execution.decision;
    assert(d, `No decision before ${step.label}`);
    assert.equal(d.playerId, step.actor ?? 'p1', step.label);
    const selection =
      step.selections === 'credits'
        ? spendableCredits(this.state, d.playerId)
            .slice(0, d.selection?.max ?? 0)
            .map(c => c.instanceId)
        : (step.selections ?? []).map(alias => {
            assert(this.refs[alias], `Unknown selection ${alias}`);
            return this.refs[alias]!;
          });
    try {
      const input = choose(this.state, i => this.matches(step, i), selection);
      this.submit(
        { ...input, ...(step.name ? { namedCardId: step.name } : {}) },
        step.label,
        step.teach !== false,
      );
    } catch (error) {
      throw new Error(
        `${step.label}; ${d.playerId}; legal=${JSON.stringify(d.options.map(o => o.intent))}`,
        { cause: error },
      );
    }
  }
  nextRound() {
    const before = this.state.round;
    for (let guard = 0; guard < 30 && this.state.round === before; guard++) {
      const d = this.state.execution.decision!;
      if (d.kind === 'action') this.step({ ...pass(), actor: d.playerId, teach: false });
      else if (d.kind === 'resource') {
        const card = d.selection!.cards.find(id => !Object.values(this.refs).includes(id));
        assert(card, 'Reserve an unlabelled card for normal regroup resourcing');
        this.submit(
          choose(this.state, 'resource', [card]),
          'Regroup: resource one unlabelled card',
          false,
        );
      } else throw new Error(`Unexpected regroup decision: ${d.kind}`);
    }
    assert.equal(this.state.round, before + 1);
    if (this.state.execution.decision?.playerId === 'p2')
      this.step({ ...pass(), actor: 'p2', teach: false });
    assert.equal(this.state.execution.decision?.playerId, 'p1');
  }
  replay() {
    let recovered = decodeState(this.initial);
    for (const input of this.inputs) recovered = advance(recovered, input).state;
    assert.deepEqual(recovered, this.state, 'Entire practice line replay');
  }
}

export function runLine(exercise: Exercise, line: Line, options: PracticeOptions = {}) {
  const run = new PracticeRun(exercise.input, options);
  for (const step of exercise.setup ?? []) run.step(step);
  for (const action of line.steps) 'nextRound' in action ? run.nextRound() : run.step(action);
  line.check(run);
  assert(
    run.state.result || run.state.execution.decision?.kind === 'action',
    'Resolve every nested effect before declaring the practice result',
  );
  run.replay();
  return run;
}
