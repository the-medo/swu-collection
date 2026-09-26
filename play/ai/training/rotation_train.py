"""Continuous per-deck specialists: 500 practice epochs, 8x1000 games, 50 epochs.

Each opponent uses its own frozen, practiced bundle. Only the selected learner
is updated. No game/time cap; the shared nine-CPU/100-GB guard remains mandatory.
"""
from resource_budget import requested_cpu_limit, restrict_resources
restrict_resources(requested_cpu_limit())  # Before torch, numpy, or Bun workers.

import argparse
import copy
import hashlib
import io
import json
import os
import random
import signal
import time
import uuid
from pathlib import Path

import numpy as np
import torch
from engine import ROOT
from parallel import Collector
from full_model import compact, frozen_copy, load_frozen, make_policy
from full_train import optimize
from league_artifacts import checked_bytes, publish, restore, save_checkpoint
from league_schedule import record_result, summary, utc
from practice_training import evaluate_practice, load_practice, warmup
from disk_monitor import DiskMonitor
from resource_budget import ArtifactBudget, DISK_LIMIT, MAX_CPUS

VERSION = 'eight-deck-specialist-rotation-v1'
INITIAL_EPOCHS, REFRESH_EPOCHS, MATCHUP_GAMES, EVAL_PAIRS = 500, 50, 1000, 50
LEARNERS = ['krennic', 'chewbacca', 'luke', 'greef', 'vader', 'mandalorian', 'dedra', 'aurra']
# Alternate faster and slower opponents rather than grouping four control/ramp blocks.
OPPONENTS = ['greef', 'mandalorian', 'vader', 'dedra', 'chewbacca', 'aurra', 'luke', 'krennic']
STOP = False


def stop(*_):
    global STOP
    STOP = True


def reference(manifest):
    return {k: manifest[k] for k in ('file', 'sha256', 'games', 'updates', 'parameters')}


def empty_score():
    return dict(completed=0, wins=0, losses=0, draws=0, cutoffs=0)


def score_result(score, result):
    if result['outcome'] != 'terminal':
        score['cutoffs'] += 1
        return False
    score['completed'] += 1
    key = 'draws' if result['winner'] is None else 'wins' if result['winner'] == result['learner'] else 'losses'
    score[key] += 1
    return True


def new_meta():
    return dict(games=0, updates=0, decisions=0, initialEpochs=0, refresherEpochs=0,
                componentTraining={}, model=None, bank=None, beforePractice=None,
                afterPractice=None, latestPractice=None)


def new_state(manifest, seed):
    return {'version': VERSION, 'initialization': {'kind': 'fresh-per-deck-specialists', 'seed': seed},
            'practiceHash': manifest['hash'], 'seed': seed, 'games': 0, 'updates': 0, 'decisions': 0,
            'cutoffs': 0, 'nextSeed': seed, 'elapsedSeconds': 0, 'turn': 0, 'phase': 'warmup',
            'activeDeck': LEARNERS[0], 'warmupIndex': 0, 'opponentIndex': 0, 'refreshDone': 0,
            'decks': {key: new_meta() for key in LEARNERS}, 'initialReferences': {},
            'turnOpponents': {}, 'batch': None, 'lastCompletedBatch': None, 'history': [],
            'evaluation': None, 'beforeRefresh': None, 'lastCollection': None}


def training_jobs(state, contract, opponent, count):
    """Exactly 500 completed games from each seat per 1,000-game block, even on resume."""
    batch = state['batch']
    seats = batch['seatCounts'].copy()
    keys = [d['key'] for d in contract['decks']]
    own, other = keys.index(state['activeDeck']), keys.index(OPPONENTS[state['opponentIndex']])
    jobs = []
    for _ in range(min(count, MATCHUP_GAMES - batch['completed'])):
        seat = 0 if seats[0] <= seats[1] else 1
        seats[seat] += 1
        seed = state['nextSeed']; state['nextSeed'] += 1
        jobs.append({'seed': seed, 'decks': [own, other][::(-1 if seat else 1)],
                     'orientation': seat, 'learner': seat, 'mode': 'past', 'opponent': opponent,
                     'limit': None, 'replay': batch['completed'] == 0 and not jobs})
    return jobs


def record_training(state, result):
    batch = state['batch']
    if record_result(batch, result):
        state['games'] += 1
        state['decks'][state['activeDeck']]['games'] += 1
    else:
        state['cutoffs'] += 1
    score_result(batch['learnerScore'], result)


def evaluation_job(contract, learner, opponent_key, index, opponent):
    keys = [d['key'] for d in contract['decks']]
    own, other = keys.index(learner), keys.index(opponent_key)
    seat = index % 2
    return {'seed': 3_500_000_000 + own * 100_000 + other * 1000 + index // 2,
            'decks': [own, other][::(-1 if seat else 1)], 'orientation': seat,
            'learner': seat, 'mode': 'past', 'opponent': opponent, 'limit': None,
            'replay': index == 0}


class Rotation:
    def __init__(self, args, budget, monitor, collector, output):
        self.args, self.budget, self.monitor, self.collector, self.output = args, budget, monitor, collector, output
        self.contract = collector.contract
        self.manifest, self.cases = load_practice(self.contract, 'play/ai/practice/rotation-bridge.ts')
        self.by_deck = {key: [c for c in self.cases if c['deck'] == key] for key in LEARNERS}
        for key, cases in self.by_deck.items():
            if len({c['family'] for c in cases}) != 12 or len({c['family'] for c in cases if c['split'] == 'train'}) != 10:
                raise ValueError(f'{key} must have ten training families and two held out')
        self.policy = make_policy(self.contract, 'crossfire-specialists-v2')
        self.optimizer = torch.optim.Adam(self.policy.parameters(), lr=3e-4)
        if args.resume:
            self.state, _, _ = restore(output, self.contract, self.policy, self.optimizer)
            if self.state.get('version') != VERSION or self.state['practiceHash'] != self.manifest['hash']:
                raise ValueError('Rotation/curriculum changed; prepare a new run instead of silently resuming')
            if self.state['seed'] != args.seed:
                raise ValueError('Resume with the original seed')
        else:
            self.state = new_state(self.manifest, args.seed)
        self.started = time.monotonic()
        self.previous_elapsed = self.state['elapsedSeconds']
        self.initial_games = self.state['games']
        self.cache = {}
        reset = collector.engines[0].request('reset', seed=0, decks=[0, 1], limit=None, autoForced=True)
        self.probe = compact(reset['observation'], self.contract)
        collector.engines[0].request('truncate', generation=reset['generation'])

    def stopping(self):
        return STOP or self.monitor.failed.is_set()

    @property
    def meta(self):
        return self.state['decks'][self.state['activeDeck']]

    def frozen(self, manifest):
        digest = manifest['sha256']
        if digest not in self.cache:
            checked_bytes(self.output, manifest)
            self.cache[digest] = load_frozen(self.output / manifest['file'], self.contract)
        return self.cache[digest]

    def checkpoint(self):
        self.state['elapsedSeconds'] = self.previous_elapsed + time.monotonic() - self.started
        # One active optimizer plus immutable references to the other seven
        # banks. Do not put eight optimizers into a file exceeding the budget.
        self.state['checkpoint'] = save_checkpoint(self.budget, self.output, self.contract,
            self.policy, self.optimizer, [frozen_copy(self.policy)], self.state, self.probe)

    def status(self, status=None):
        state = self.state
        phase = state['phase']
        rotation = {k: state[k] for k in ('version', 'activeDeck', 'turn', 'phase', 'opponentIndex', 'refreshDone')}
        rotation.update(initialEpochs=INITIAL_EPOCHS, refresherEpochs=REFRESH_EPOCHS,
            gamesPerOpponent=MATCHUP_GAMES, learnerOrder=LEARNERS, opponentOrder=OPPONENTS,
            practiceHash=self.manifest['hash'], decks=[{
                'key': key, **{k: meta[k] for k in ('games', 'updates', 'initialEpochs', 'refresherEpochs',
                    'beforePractice', 'afterPractice', 'latestPractice')},
                'modelHash': meta['model']['sha256'] if meta['model'] else None,
                'parameters': meta['model']['parameters'] if meta['model'] else None,
                'strategies': next(d['strategies'] for d in self.contract['specialists']['decks'] if d['key'] == key),
            } for key, meta in state['decks'].items()],
            history=state['history'], evaluation=state['evaluation'],
            beforeRefresh=state['beforeRefresh'],
            opponentHash=state['batch']['opponentHash'] if state['batch'] else None,
            evaluationReference='fixed post-500-epoch specialists',
            trainingOpponent='latest frozen bundle belonging to the opposing deck')
        report = {'status': status or ('evaluating' if phase.startswith('evaluate') else 'training'),
            'pid': os.getpid(), 'workerPids': [e.process.pid for e in self.collector.engines],
            'updatedAtUtc': utc(), 'games': state['games'], 'updates': state['updates'],
            'cutoffs': state['cutoffs'], 'cpus': sorted(os.sched_getaffinity(0)), 'workers': self.args.workers,
            'elapsedSeconds': self.previous_elapsed + time.monotonic() - self.started,
            'segmentGames': state['games'] - self.initial_games,
            'segmentElapsedSeconds': time.monotonic() - self.started,
            'lastCollection': state['lastCollection'], 'gameLimit': None, 'timeLimitSeconds': None,
            'commandsPerGameLimit': None, 'diskLimitBytes': DISK_LIMIT, 'diskCheckSeconds': 300,
            'lastCompletedBatch': state['lastCompletedBatch'], 'rotation': rotation}
        if state['batch']: report['batch'] = summary(state['batch'])
        self.budget.json(self.output / 'status.json', report)

    def publish(self):
        metadata = {**self.meta, 'initialization': self.state['initialization'],
                    'focusLeader': self.state['activeDeck'], 'datasets': []}
        manifest = publish(self.budget, self.output, self.contract, self.policy, metadata)
        self.state['latestModel'] = reference(manifest)
        return reference(manifest)

    def save_bank(self):
        self.meta['model'] = self.publish()
        payload = {'format': VERSION, 'architecture': self.policy.architecture,
                   'contract': self.contract, 'policySpec': self.policy.spec,
                   'deck': self.state['activeDeck'], 'model': self.policy.state_dict(),
                   'optimizer': self.optimizer.state_dict()}
        buffer = io.BytesIO(); torch.save(payload, buffer)
        data = buffer.getvalue(); digest = hashlib.sha256(data).hexdigest()
        manifest = {'file': f'banks/{digest}.pt', 'sha256': digest}
        if not (self.output / manifest['file']).exists(): self.budget.write(self.output / manifest['file'], data)
        checked_bytes(self.output, manifest)
        self.meta['bank'] = manifest

    def switch(self, key):
        meta = self.state['decks'][key]
        if meta['bank']:
            payload = torch.load(io.BytesIO(checked_bytes(self.output, meta['bank'])), map_location='cpu', weights_only=True)
            if (payload.get('format') != VERSION or payload.get('contract') != self.contract
                    or payload.get('policySpec') != self.policy.spec or payload.get('deck') != key):
                raise ValueError('Per-deck bank does not match this learner and contract')
            self.policy.load_state_dict(payload['model'], strict=True)
            self.optimizer = torch.optim.Adam(self.policy.parameters(), lr=3e-4)
            self.optimizer.load_state_dict(payload['optimizer'])
        else:
            with torch.random.fork_rng(devices=[]):
                torch.manual_seed(self.state['seed'] + LEARNERS.index(key))
                self.policy = make_policy(self.contract, 'crossfire-specialists-v2')
            self.optimizer = torch.optim.Adam(self.policy.parameters(), lr=3e-4)
        if any(not torch.isfinite(p).all() for p in self.policy.parameters()):
            raise ValueError('Non-finite deck bank')
        self.state['activeDeck'] = key
        self.cache.clear()

    def add_updates(self, updates, decisions, counts):
        self.state['updates'] += updates; self.state['decisions'] += decisions
        self.meta['updates'] += updates; self.meta['decisions'] += decisions
        for key, value in counts.items():
            item = self.meta['componentTraining'].setdefault(key, dict(updates=0, decisions=0))
            for counter in ('updates', 'decisions'): item[counter] += value[counter]

    def practice_chunk(self, initial):
        cases = self.by_deck[self.state['activeDeck']]
        if initial and self.meta['beforePractice'] is None:
            self.meta['beforePractice'] = evaluate_practice(self.policy, cases)
        completed = self.meta['initialEpochs'] if initial else self.state['refreshDone']
        target = INITIAL_EPOCHS if initial else REFRESH_EPOCHS
        report = warmup(self.policy, self.optimizer, cases, epochs=min(10, target - completed),
                        early_stopping=False, stopping=self.stopping)
        # Exactly the requested count: reference agreement never shortens this phase.
        self.add_updates(report['epochs'], report['decisions'], report['componentTraining'])
        if initial: self.meta['initialEpochs'] += report['epochs']
        else:
            self.meta['refresherEpochs'] += report['epochs']
            self.state['refreshDone'] += report['epochs']
        self.meta['latestPractice'] = report['after']
        self.checkpoint(); self.status()

    def begin_turn(self):
        state = self.state
        self.switch(LEARNERS[state['turn'] % len(LEARNERS)])
        if any(m['initialEpochs'] != INITIAL_EPOCHS or not m['model'] for m in state['decks'].values()):
            raise ValueError('Every opponent must finish 500 practice epochs before full games')
        state['turnOpponents'] = {k: copy.deepcopy(m['model']) for k, m in state['decks'].items()}
        state.update(phase='games', opponentIndex=0, refreshDone=0, beforeRefresh=None, evaluation=None)
        self.begin_batch()
        self.publish(); self.checkpoint(); self.status()

    def begin_batch(self):
        state = self.state
        own, other = state['activeDeck'], OPPONENTS[state['opponentIndex']]
        keys = [d['key'] for d in self.contract['decks']]
        state['batch'] = {'block': state['games'] // MATCHUP_GAMES,
            'cycle': state['turn'] // len(LEARNERS) + 1, 'deckKeys': [own, other],
            'decks': [keys.index(own), keys.index(other)], 'mirror': own == other,
            'startedAtUtc': utc(), 'completed': 0, 'winsA': 0, 'winsB': 0, 'draws': 0,
            'cutoffs': 0, 'seatCounts': [0, 0], 'learnerScore': empty_score(),
            'opponentHash': state['turnOpponents'][other]['sha256'], 'learner': own,
            'opponentBundle': other, 'startUpdate': self.meta['updates']}

    def games_chunk(self):
        state, batch = self.state, self.state['batch']
        other = OPPONENTS[state['opponentIndex']]
        opponent = self.frozen(state['turnOpponents'][other])
        jobs = training_jobs(state, self.contract, opponent, self.args.workers * 2)
        rows = []
        for examples, result in self.collector.collect(self.policy, jobs, stopping=self.stopping):
            record_training(state, result)
            # Only completed games teach terminal outcomes. Interrupted games
            # are retried and never counted towards a 1,000-game block.
            if result['outcome'] == 'terminal': rows.extend(examples)
        state['lastCollection'] = self.collector.last_metrics
        if rows:
            activated = self.policy.learning_counts(torch.from_numpy(np.stack([r['context'] for r in rows])))
            metrics = optimize(self.policy, self.optimizer, rows)
            self.add_updates(1, metrics['decisions'], {k: {'decisions': n, 'updates': int(n > 0)} for k, n in activated.items()})
        self.checkpoint(); self.status()

    def finish_batch(self):
        state, batch = self.state, self.state['batch']
        if batch['completed'] != MATCHUP_GAMES or batch['seatCounts'] != [500, 500]:
            raise ValueError('A matchup block requires 1,000 completed games, balanced by seat')
        report = {**summary(batch), 'finishedAtUtc': utc(), 'model': self.publish(),
                  'evaluation': None, 'totalTrainingGames': state['games'],
                  'winRateDenominator': 'completed games including draws; cutoffs excluded',
                  'policy': 'stochastic learner vs opposing deck frozen specialist', 'comparisonExcluded': batch['mirror']}
        name = f'batches/{batch["block"]:08d}.json'
        self.budget.json(self.output / name, report)
        state['lastCompletedBatch'] = {'file': name, 'block': batch['block']}
        if state['opponentIndex'] + 1 < len(OPPONENTS):
            state['opponentIndex'] += 1; self.begin_batch()
        else:
            state['phase'] = 'evaluate-before'; state['evaluation'] = None
        self.checkpoint(); self.status()

    def evaluation_chunk(self):
        state = self.state
        if state['evaluation'] is None:
            state['evaluation'] = {'completed': 0, 'planned': len(OPPONENTS) * EVAL_PAIRS * 2,
                'byOpponent': {key: empty_score() for key in OPPONENTS},
                'opponentHashes': {key: state['initialReferences'][key]['sha256'] for key in OPPONENTS},
                'modelHash': self.publish()['sha256']}
        value = state['evaluation']
        for other in OPPONENTS:
            score = value['byOpponent'][other]
            remaining = EVAL_PAIRS * 2 - score['completed']
            if not remaining: continue
            opponent = self.frozen(state['initialReferences'][other])
            jobs = [evaluation_job(self.contract, state['activeDeck'], other, i, opponent)
                    for i in range(score['completed'], score['completed'] + min(remaining, self.args.workers * 2))]
            results = self.collector.collect(self.policy, jobs, greedy=True, record_rows=False, stopping=self.stopping)
            # Commit only a contiguous prefix so resuming uses the exact same
            # paired seeds. Later finished jobs after a cutoff are replayed.
            for _, result in results:
                if result['outcome'] != 'terminal': break
                score_result(score, result); value['completed'] += 1
            self.checkpoint(); self.status()
            return False
        return True

    def complete_evaluation(self):
        state = self.state
        evaluation = state['evaluation']
        if evaluation['completed'] != evaluation['planned']:
            raise ValueError('Do not compare incomplete fixed-opponent measurements')
        snapshot = {'practice': evaluate_practice(self.policy, self.by_deck[state['activeDeck']]),
                    'benchmark': copy.deepcopy(evaluation), 'atUtc': utc()}
        if state['phase'] == 'evaluate-before':
            state['beforeRefresh'] = snapshot
            state['phase'] = 'refresh'; state['evaluation'] = None
        else:
            report = {'turn': state['turn'], 'cycle': state['turn'] // len(LEARNERS) + 1,
                'deck': state['activeDeck'], 'games': self.meta['games'], 'totalTrainingGames': state['games'],
                'epochs': REFRESH_EPOCHS, 'before': state['beforeRefresh'], 'after': snapshot,
                'reference': 'Fixed initial 500-epoch opponent bundles; reused development seeds, not release qualification'}
            self.budget.json(self.output / f'turns/{state["turn"]:08d}.json', report)
            state['history'] = (state['history'] + [report])[-16:]
            self.meta['latestPractice'] = snapshot['practice']
            self.save_bank()
            state['turn'] += 1
            # Save the phase transition before loading another learner. A crash
            # cannot repeat the 50 completed epochs or count this turn twice.
            state['phase'] = 'next-turn'
        self.checkpoint(); self.status()

    def run(self):
        state = self.state
        if not self.args.resume:
            self.switch(state['activeDeck'])
            self.publish(); self.checkpoint()
        if self.args.prepare_only:
            self.status('ready'); return
        self.status()
        while not self.stopping():
            phase = state['phase']
            if phase == 'warmup':
                if self.meta['initialEpochs'] < INITIAL_EPOCHS:
                    self.practice_chunk(True); continue
                self.meta['afterPractice'] = self.meta['latestPractice']
                self.save_bank()
                state['initialReferences'][state['activeDeck']] = copy.deepcopy(self.meta['model'])
                state['warmupIndex'] += 1
                if state['warmupIndex'] < len(LEARNERS):
                    self.switch(LEARNERS[state['warmupIndex']]); self.publish()
                    self.checkpoint(); self.status()
                else:
                    state['phase'] = 'next-turn'; self.checkpoint()
            elif phase == 'next-turn': self.begin_turn()
            elif phase == 'games':
                if state['batch']['completed'] == MATCHUP_GAMES: self.finish_batch()
                else: self.games_chunk()
            elif phase in ('evaluate-before', 'evaluate-after'):
                if self.evaluation_chunk(): self.complete_evaluation()
            elif phase == 'refresh':
                if state['refreshDone'] < REFRESH_EPOCHS: self.practice_chunk(False)
                else:
                    state['phase'] = 'evaluate-after'; state['evaluation'] = None
                    self.checkpoint(); self.status()
            else: raise ValueError(f'Unknown rotation phase {phase}')
        if self.monitor.failed.is_set(): raise RuntimeError(self.monitor.report['error'])
        self.publish(); self.checkpoint(); self.status('stopped')


def register(budget, output, fingerprint):
    file = budget.root / 'training-runs.json'
    registry = json.loads(file.read_text()) if file.exists() else {'version': 1, 'activeRun': 'specialists', 'runs': []}
    if registry.get('version') != 1: raise ValueError('Invalid training registry')
    if not any(r['id'] == output.name for r in registry['runs']):
        if len(registry['runs']) >= 32: raise ValueError('Training registry is full')
        registry['runs'].append({'id': output.name, 'label': 'Eight decks · continuous specialists', 'requestHash': fingerprint})
    registry['activeRun'] = output.name
    budget.json(file, registry)


def main():
    global STOP
    STOP = False
    parser = argparse.ArgumentParser(description=__doc__, allow_abbrev=False)
    parser.add_argument('--output', required=True)
    parser.add_argument('--resume', action='store_true')
    parser.add_argument('--prepare-only', action='store_true')
    parser.add_argument('--cpus', type=int, choices=range(1, MAX_CPUS + 1), default=3)
    parser.add_argument('--workers', type=int, choices=range(1, MAX_CPUS + 1), default=3)
    parser.add_argument('--seed', type=int, default=20260925)
    args = parser.parse_args()
    if args.workers > args.cpus: raise ValueError('Workers cannot exceed the logical CPU allocation')
    root = (ROOT / '.swubase/crossfire-ai').resolve()
    output = (ROOT / args.output).resolve()
    if output.parent != root or not output.name.startswith('specialists-'):
        raise ValueError('Use a new specialists-<uuid> directory beneath .swubase/crossfire-ai')
    uuid.UUID(output.name.removeprefix('specialists-'))
    if not args.resume and output.exists(): raise ValueError('New output must not already exist')
    if args.resume and not (output / 'checkpoints.json').is_file(): raise ValueError('No checkpoint to resume')
    torch.set_num_threads(1); torch.set_num_interop_threads(1)
    torch.manual_seed(args.seed); random.seed(args.seed)
    signal.signal(signal.SIGTERM, stop); signal.signal(signal.SIGINT, stop)
    budget = ArtifactBudget(root); monitor = None; runner = None
    try:
        output.mkdir(parents=True, exist_ok=True)
        if not args.resume:
            budget.write(output / 'roster.json', (ROOT / 'play/ai/full-game/eight-decks.json').read_bytes())
        monitor = DiskMonitor(budget, output / 'disk-usage.json', interval=300).start()
        with Collector(args.workers, roster=output / 'roster.json') as collector:
            runner = Rotation(args, budget, monitor, collector, output)
            runner.run() if args.prepare_only else None
            # Registration happens only once a recoverable run exists. For a
            # new live run, prepare it first and then enter its continuous loop.
            if not args.prepare_only:
                if not args.resume:
                    runner.switch(runner.state['activeDeck']); runner.publish(); runner.checkpoint()
                    args.resume = True
                register(budget, output, runner.manifest['hash'])
                runner.run()
            else: register(budget, output, runner.manifest['hash'])
    except BaseException as error:
        if runner is not None:
            failure = {'status': 'failed', 'pid': os.getpid(), 'atUtc': utc(),
                       'games': runner.state['games'], 'error': f'{type(error).__name__}: {error}',
                       'recovery': 'Resume the committed checksummed rotation checkpoint; no automatic restart'}
            try:
                budget.emergency_json(output / 'failure.json', failure)
                # Keep the last published rotation/deck progress intact. The
                # reader overlays this small failure marker until a newer
                # process publishes status after restoring its checkpoint.
            except Exception: pass
        raise
    finally:
        if monitor: monitor.close()
        budget.close()


if __name__ == '__main__': main()
