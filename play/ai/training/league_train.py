"""Continuous self-play, with optional explicit leader curriculum experiments."""
from resource_budget import MAX_CPUS, requested_cpu_limit, restrict_resources
CPUS = restrict_resources(requested_cpu_limit())

import argparse
import json
import os
import random
import signal
import time
import numpy as np
import torch
from disk_monitor import DiskMonitor
from engine import ROOT
from expand_policy import warm_start
from full_model import compact, frozen_copy, load_frozen, make_policy
from full_train import optimize
from league_artifacts import checked_bytes, publish, restore, save_checkpoint
from league_schedule import BLOCK_SIZE, SCHEDULE_VERSION, ROSTER_SCHEDULE_VERSION, comparison_row, new_batch, record_result, summary, utc
from parallel import Collector
from resource_budget import ArtifactBudget, DISK_LIMIT

STOP = False


def stop(*_):
    global STOP
    STOP = True


def focused_batch(games, keys, update, indices):
    batch = new_batch(games, keys, update)
    if indices:
        pairs = [(own, opponent) for own in indices for opponent in range(len(keys))]
        pair = pairs[batch['block'] % len(pairs)]
        batch.update(decks=list(pair), deckKeys=[keys[i] for i in pair], mirror=pair[0] == pair[1],
                     cycle=batch['block'] // len(pairs) + 1)
    return batch


def training_jobs(state, opponents, count):
    batch = state['batch']
    seats = list(batch['seatCounts'])
    jobs = []
    for offset in range(count):
        attempt = state['attempts'] + offset
        orientation = int(seats[1] < seats[0]) if not batch['mirror'] else attempt % 2
        seats[orientation] += 1
        pair = batch['decks'][::(-1 if orientation else 1)]
        mode = 'past' if state.get('focusLeader') or attempt % 8 >= 6 else 'self'
        jobs.append({'seed': (state['seed'] + attempt) % 2**32,
                     'decks': pair, 'orientation': orientation, 'limit': None,
                     'learner': orientation if state.get('focusLeader') else attempt // 8 % 2, 'mode': mode,
                     **({'opponent': opponents[(attempt // 8) % len(opponents)]} if mode == 'past' else {})})
    return jobs


def record_training_result(state, result):
    batch = state['batch']
    by_mode = batch.setdefault('byMode', {})
    if result['mode'] not in by_mode:
        # Statistics subdivide the actual batch; they must not independently
        # select a pair from the ordinary league schedule during leader focus.
        by_mode[result['mode']] = {
            **{key: batch[key] for key in ('block', 'cycle', 'mirror', 'startedAtUtc', 'startUpdate')},
            'decks': list(batch['decks']), 'deckKeys': list(batch['deckKeys']),
            'completed': 0, 'winsA': 0, 'winsB': 0, 'draws': 0, 'cutoffs': 0,
            'seatCounts': [0, 0]}
    record_result(by_mode[result['mode']], result)
    state['attempts'] += 1
    terminal = record_result(batch, result)
    state['games'] += int(terminal)
    state['cutoffs'] += int(not terminal)


def evaluate(collector, policy, anchor, batch, stopping, focused=False):
    pair = batch['decks']
    results = []
    # Same seeds, seats and frozen opponent on every visit to this matchup.
    jobs = [{'seed': 2_000_000 + (pair[0] * len(collector.contract['decks']) + pair[1]) * 100 + seed,
             'decks': pair[::(-1 if orientation else 1)], 'orientation': orientation,
             'learner': learner, 'mode': 'past', 'opponent': anchor, 'limit': None}
            for seed in range(10) for orientation in range(2) for learner in range(2) if not focused or learner == orientation]
    window = len(collector.engines) * 2
    for offset in range(0, len(jobs), window):
        if stopping():
            break
        results.extend(result for _, result in collector.collect(
            policy, jobs[offset:offset + window], greedy=True, record_rows=False, stopping=stopping))
    by_deck = {}
    for result in results:
        deck = str(result['decks'][result['learner']])
        score = by_deck.setdefault(deck, {'wins': 0, 'losses': 0, 'draws': 0, 'cutoffs': 0})
        outcome = 'cutoffs' if result['outcome'] != 'terminal' else (
            'draws' if result['winner'] is None else 'wins' if result['winner'] == result['learner'] else 'losses')
        score[outcome] += 1
    for score in by_deck.values():
        n = score['wins'] + score['losses'] + score['draws']
        score.update(completed=n, winRate=score['wins'] / n if n else None,
                     scoreRate=(score['wins'] + .5 * score['draws']) / n if n else None)
    return {'schedule': 'focused-anchor-20-v1' if focused else 'fixed-anchor-40-v1', 'qualification': 'development progress; small reused sample',
            'complete': len(results) == len(jobs) and all(r['outcome'] == 'terminal' for r in results),
            'byDeckIndex': by_deck, 'games': results}


def run(args):
    global STOP
    STOP = False
    torch.set_num_threads(1)
    torch.set_num_interop_threads(1)
    torch.manual_seed(args.seed)
    random.seed(args.seed)
    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    root = ROOT / '.swubase/crossfire-ai'
    output = (ROOT / args.output).resolve()
    if not output.is_relative_to(root.resolve()) or output == root.resolve():
        raise ValueError('Output must be a run directory beneath .swubase/crossfire-ai')
    specialists = getattr(args, 'specialists', False)
    baseline_run = getattr(args, 'baseline_run', None)
    prepare_only = getattr(args, 'prepare_only', False)
    curriculum = getattr(args, 'curriculum', False)
    practice_only = getattr(args, 'practice_only', False)
    experiment_games = getattr(args, 'experiment_games', None)
    if (curriculum and (not specialists or getattr(args, 'leader', None) != 'krennic')) or (practice_only and not curriculum):
        raise ValueError('The approved curriculum requires --specialists --leader krennic --curriculum')
    if experiment_games is not None and (not curriculum or experiment_games <= 0 or experiment_games % BLOCK_SIZE):
        raise ValueError('A curriculum experiment uses a positive multiple of 1000 completed games')
    if specialists:
        if args.initialize_from or args.resume == bool(baseline_run):
            raise ValueError('Specialists require either --resume or --baseline-run; legacy weights cannot initialize them')
    elif baseline_run or prepare_only or args.resume == bool(args.initialize_from):
        raise ValueError('Choose either --resume or --initialize-from; preparation requires --specialists')
    if prepare_only and args.resume:
        raise ValueError('Preparation creates a new run; use --resume to train it')
    architecture = 'crossfire-specialists-v1' if specialists else 'context-candidate-ppo-v1'
    roster = output / 'roster.json' if (output / 'roster.json').is_file() else None
    if roster and specialists:
        architecture = 'crossfire-specialists-v2'
    if args.resume and (output / 'latest-model.json').exists():
        actual = json.loads((output / 'latest-model.json').read_text()).get('architecture')
        if actual != architecture:
            raise ValueError(f'This is a {actual} run; use its matching --specialists setting. No run files changed.')
    if not args.resume and output.exists() and any(output.iterdir()):
        raise ValueError('New run output must be empty')
    budget = ArtifactBudget(root)
    monitor = None
    state = None
    admitted = False
    started = time.monotonic()
    previous_elapsed = 0
    try:
        output.mkdir(parents=True, exist_ok=True)
        monitor = DiskMonitor(budget, output / 'disk-usage.json').start()
        with Collector(args.workers, league=True, **({'roster': roster} if roster else {})) as collector:
            contract = collector.contract
            dynamic = contract['scope'] == 'roster-full-game-v2'
            if (not dynamic and (contract['scope'] != 'six-deck-full-game-v1' or len(contract['decks']) != 6)):
                raise ValueError('Expected the pinned training roster')
            schedule = ROSTER_SCHEDULE_VERSION if dynamic else SCHEDULE_VERSION
            keys = [deck['key'] for deck in contract['decks']]
            policy = make_policy(contract, architecture)
            optimizer = torch.optim.Adam(policy.parameters(), lr=0.0003)
            if args.resume:
                state, opponents, recovered = restore(output, contract, policy, optimizer)
                if state['schedule'] != schedule or state['seed'] != args.seed:
                    raise ValueError('Resume schedule or seed mismatch')
                # When recovering the previous slot, advance from that valid slot.
                # Otherwise the next write could overwrite our only good checkpoint.
                budget.json(output / 'checkpoints.json', {'current': recovered, 'previous': None})
                checked_bytes(output, state['anchor'])
                anchor = load_frozen(output / state['anchor']['file'], contract)
                previous_elapsed = state['elapsedSeconds']
            else:
                initialization = ({'kind': 'fresh-specialists', 'seed': args.seed,
                                   'baselineWeightsImported': False} if specialists else
                                  warm_start((ROOT / args.initialize_from).resolve(), contract, policy))
                opponents = [frozen_copy(policy)]
                state = {'schedule': SCHEDULE_VERSION, 'seed': args.seed, 'initialization': initialization,
                         'startedAtUtc': utc(), 'games': 0, 'attempts': 0, 'updates': 0,
                         'decisions': 0, 'cutoffs': 0, 'elapsedSeconds': 0, 'history': [], 'recentResults': [],
                         'batch': new_batch(0, keys, 0), 'lastCompletedBatch': None}
                state['latestModel'] = publish(budget, output, contract, policy, state)
                if specialists:
                    source = (ROOT / baseline_run).resolve()
                    if not source.is_relative_to(root.resolve()) or source == output:
                        raise ValueError('Baseline must be a separate local training run')
                    manifest = json.loads((source / 'latest-model.json').read_text())
                    data = checked_bytes(source, manifest)
                    baseline = load_frozen(source / manifest['file'], contract)
                    if baseline.architecture != 'context-candidate-ppo-v1':
                        raise ValueError('Expected a retired legacy baseline')
                    # Copy the immutable opponent, never its weights into the new policy.
                    name = f'models/{manifest["sha256"]}.pt'
                    budget.write(output / name, data)
                    state['anchor'] = {**manifest, 'file': name}
                else:
                    state['anchor'] = state['latestModel']
                budget.json(output / 'anchor-model.json', state['anchor'])
                anchor = load_frozen(output / state['anchor']['file'], contract)
            focus = getattr(args, 'leader', None)
            if state.get('focusLeader') and focus != state['focusLeader']:
                raise ValueError('Resume must keep the same --leader scope')
            if focus:
                if not specialists or focus not in policy.leader_keys[:-1]:
                    raise ValueError('Choose a specialist leader from this run')
                if not state.get('focusLeader') and (state['batch']['completed'] or state['games'] % BLOCK_SIZE):
                    raise ValueError('Start leader specialization at a completed batch boundary in a forked run')
                indices = [i for i, d in enumerate(policy.decks) if d['leaderKey'] == focus]
                if not state.get('focusLeader'):
                    state['focusLeader'] = focus
                    state['focusStartedAtGames'] = state['games']
                    state['batch'] = focused_batch(state['games'], keys, state['updates'], indices)
            else:
                indices = None
            previous_target = state.get('experimentGames')
            if previous_target is not None and experiment_games != previous_target:
                raise ValueError('Resume must keep the same --experiment-games limit')
            if experiment_games is not None:
                state['experimentGames'] = experiment_games
                state.setdefault('experimentStartedAtGames', state['games'])
            target_games = state.get('experimentStartedAtGames', 0) + experiment_games if experiment_games else None
            if state.get('curriculum') and not curriculum:
                raise ValueError('Resume this run with --curriculum')
            # A real visible observation validates checkpoint export/reload.
            start = collector.engines[0].request('reset', seed=0, decks=[0, 3], limit=None, autoForced=True)
            probe = compact(start['observation'], contract)
            collector.engines[0].request('truncate', generation=start['generation'])
            rollout = []
            initial_games = state['games']

            def stopping():
                return STOP or monitor.failed.is_set()

            def status(phase):
                state['elapsedSeconds'] = previous_elapsed + time.monotonic() - started
                budget.json(output / 'status.json', {
                    'status': phase, 'pid': os.getpid(), 'updatedAtUtc': utc(),
                    'cpus': sorted(os.sched_getaffinity(0)), 'workers': args.workers,
                    'workerPids': [engine.process.pid for engine in collector.engines],
                    'segmentGames': state['games'] - initial_games,
                    'segmentElapsedSeconds': time.monotonic() - started,
                    'diskLimitBytes': DISK_LIMIT, 'diskCheckSeconds': 300,
                    'gameLimit': experiment_games, 'timeLimitSeconds': None, 'commandsPerGameLimit': None,
                    **state, 'batch': summary(state['batch']), 'disk': monitor.report,
                    **({'system': policy.dashboard(state)} if specialists else {})})

            def checkpoint():
                if rollout:
                    raise RuntimeError('Cannot checkpoint an unoptimized rollout')
                state['elapsedSeconds'] = previous_elapsed + time.monotonic() - started
                state['checkpoint'] = save_checkpoint(budget, output, contract, policy, optimizer,
                                                       opponents, state, probe)

            def update():
                nonlocal rollout, opponents
                if not rollout:
                    return
                # Component exposure needs only contexts; avoid copying all action candidates.
                activated = policy.learning_counts(torch.from_numpy(np.stack(
                    [row['context'] for row in rollout]))) if specialists else {}
                metrics = optimize(policy, optimizer, rollout)
                rollout = []
                for key, count in activated.items():
                    entry = state.setdefault('componentTraining', {}).setdefault(key, {'decisions': 0, 'updates': 0})
                    entry['decisions'] += count
                    entry['updates'] += int(count > 0)
                state['updates'] += 1
                state['decisions'] += metrics['decisions']
                state['history'] = (state['history'] + [
                    {'games': state['games'], 'update': state['updates'], 'atUtc': utc(), **metrics}])[-100:]
                if state['updates'] % 10 == 0:
                    opponents = (opponents + [frozen_copy(policy)])[-3:]
                checkpoint()

            practice_cases = None

            def practice_snapshot(kind, model, manifest):
                from practice_training import evaluate_practice, benchmark
                info = state['curriculum']
                if any(h['kind'] == kind and (kind != 'self-play' or h['games'] == state['games']) for h in info['history']):
                    return True
                info['phase'] = 'benchmarking'
                def progress(value):
                    info['benchmarkProgress'] = value
                    status('evaluating')
                result = benchmark(collector, model, anchor, stopping=stopping, progress=progress)
                if not result['complete']: return False
                info['history'].append({'kind': kind, 'games': state['games'], 'atUtc': utc(),
                    'modelHash': manifest['sha256'], 'anchorHash': state['anchor']['sha256'],
                    'practice': evaluate_practice(model, practice_cases), 'benchmark': result})
                info['history'] = ([h for h in info['history'] if h['kind'] != 'self-play'] +
                                   [h for h in info['history'] if h['kind'] == 'self-play'][-22:])
                info['benchmarkProgress'] = None
                info['phase'] = 'self-play'
                checkpoint()
                return True

            def finish_batch():
                batch = state['batch']
                if batch['completed'] != BLOCK_SIZE:
                    raise RuntimeError('Incomplete batch')
                update()
                state['latestModel'] = publish(budget, output, contract, policy, state)
                evaluation = None
                if not batch['mirror']:
                    status('evaluating')
                    evaluation = evaluate(collector, policy, anchor, batch, stopping, bool(focus))
                    if not evaluation['complete']:
                        # Resume reruns the same evaluation before admitting another pair.
                        return False
                report = {**summary(batch), 'finishedAtUtc': utc(), 'endUpdate': state['updates'],
                          'model': state['latestModel'], 'anchor': state['anchor'],
                          'evaluation': evaluation,
                          'comparisonExcluded': batch['mirror'],
                          'winRateDenominator': 'completed games including draws; cutoffs excluded',
                          'totalTrainingGames': state['games']}
                filename = f'batches/{batch["block"]:08d}.json'
                if not batch['mirror']:
                    # A stop during the larger curriculum benchmark can leave
                    # this completed batch pending. Replacing its report must
                    # not compare the batch with itself or duplicate its row.
                    previous_results = [r for r in state['recentResults'] if r['block'] != batch['block']]
                    row = comparison_row(report, previous_results)
                    report['comparison'] = row
                    state['recentResults'] = (previous_results + [row])[-100:]
                    budget.json(output / 'winrates.json', {
                        'mirrorsExcluded': True, 'rates': 'fractions; changes in percentage points',
                        'recentBatches': state['recentResults'],
                        'allBatches': 'batches/*.json'})
                budget.json(output / filename, report)
                if curriculum and (state['games'] - state.get('experimentStartedAtGames', state['focusStartedAtGames'])) % 10_000 == 0:
                    if not practice_snapshot('self-play', policy, state['latestModel']): return False
                state['lastCompletedBatch'] = {'file': filename, 'block': batch['block'],
                                               'deckKeys': batch['deckKeys'], 'mirror': batch['mirror']}
                state['batch'] = focused_batch(state['games'], keys, state['updates'], indices)
                checkpoint()
                return True

            admitted = True
            checkpoint()
            if prepare_only:
                status('ready')
                return
            if curriculum:
                from practice_training import load_practice, warmup
                manifest, practice_cases = load_practice(contract)
                existing = state.get('curriculum')
                if existing and existing['hash'] != manifest['hash']:
                    raise ValueError('Curriculum version changed; prepare a new independent run')
                if not existing:
                    baseline = publish(budget, output, contract, policy, state)
                    state['curriculum'] = {'version': manifest['version'], 'hash': manifest['hash'],
                        'phase': 'warming', 'passed': None, 'epochs': 0, 'before': None, 'after': None,
                        'history': [], 'benchmarkProgress': None, 'baseline': baseline,
                        'targetGames': experiment_games, 'startedGames': state['games']}
                    def progress(value):
                        state['curriculum']['epochs'] = value['epochs']
                        status('training')
                    report = warmup(policy, optimizer, practice_cases, stopping=stopping, progress=progress)
                    state['curriculum'].update({key: report[key] for key in ('before', 'after', 'epochs', 'passed', 'gate', 'reason')})
                    state['curriculum']['phase'] = 'ready' if report['passed'] else 'gate-failed'
                    state['updates'] += report['epochs']
                    state['decisions'] += report['decisions']
                    for key, counts in report['componentTraining'].items():
                        item = state.setdefault('componentTraining', {}).setdefault(key, {'decisions': 0, 'updates': 0})
                        for counter in ('decisions', 'updates'): item[counter] += counts[counter]
                    state['latestModel'] = publish(budget, output, contract, policy, state)
                    checkpoint()
                info = state['curriculum']
                info['targetGames'] = experiment_games
                if not info['passed'] or practice_only or stopping():
                    checkpoint()
                    status('stopped')
                    return
                checked_bytes(output, info['baseline'])
                baseline = load_frozen(output / info['baseline']['file'], contract)
                if not practice_snapshot('before-warmup', baseline, info['baseline']) or not practice_snapshot('after-warmup', policy, state['latestModel']):
                    status('stopped')
                    return
                del baseline
            human_directory = getattr(args, 'human_data', None)
            if human_directory:
                from human_data import data_bridge, sync, learn
                status('training')
                with data_bridge(roster) as bridge:
                    if bridge.contract != contract: raise ValueError('Human adapter contract mismatch')
                    corpus = sync(bridge, budget, ROOT / human_directory, stopping)
                    # Never silently repeat the same game on resume.
                    consumed = set(state.get('datasets', []))
                    corpus['entries'] = [e for e in corpus['entries'] if e['checksum'] not in consumed]
                    report = learn(bridge, policy, optimizer, corpus, leader=focus, stopping=stopping)
                    state['datasets'] = sorted(consumed | set(report['datasets']))
                    state['updates'] += report['updates']
                    state['decisions'] += report['decisions']
                    state['humanLearning'] = report
                    for key, counts in report['componentTraining'].items():
                        item = state.setdefault('componentTraining', {}).setdefault(key, {'decisions': 0, 'updates': 0})
                        for counter in ('decisions', 'updates'): item[counter] += counts[counter]
                    budget.json(output / 'human-learning.json', report)
                    checkpoint()
            status('training')
            while not stopping():
                if state['batch']['completed'] == BLOCK_SIZE:
                    if not finish_batch():
                        break
                    status('training')
                if stopping() or (target_games is not None and state['games'] >= target_games):
                    break
                count = min(args.workers * 2, BLOCK_SIZE - state['batch']['completed'],
                            target_games - state['games'] if target_games is not None else BLOCK_SIZE)
                jobs = training_jobs(state, opponents + ([anchor] if focus else []), count)
                results = collector.collect(policy, jobs, stopping=stopping)
                for rows, result in results:
                    rollout.extend(rows)
                    record_training_result(state, result)
                state['lastCollection'] = collector.last_metrics
                if len(rollout) >= 1024 or state['batch']['completed'] == BLOCK_SIZE or stopping():
                    update()
                status('training')
            update()
            if monitor.failed.is_set():
                raise RuntimeError(monitor.report['error'])
            state['latestModel'] = publish(budget, output, contract, policy, state)
            checkpoint()
            if (curriculum and target_games is not None and state['games'] >= target_games
                    and state['batch']['completed'] == 0):
                state['curriculum']['phase'] = 'complete'
                checkpoint()
            status('stopped')
    except BaseException as error:
        try:
            if state is None or not admitted:
                raise RuntimeError('Run not admitted; preserve existing run status')
            failure = {
                'status': 'failed', 'atUtc': utc(), 'pid': os.getpid(),
                'error': f'{type(error).__name__}: {error}',
                'games': state['games'] if state else None,
                'recovery': 'Resume from the checksummed checkpoints.json; uncheckpointed windows may replay.'}
            budget.emergency_json(output / 'failure.json', failure)
            budget.emergency_json(output / 'status.json', failure)
        except Exception:
            pass
        raise
    finally:
        if monitor:
            monitor.close()
        budget.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__, allow_abbrev=False)
    parser.add_argument('--output', required=True)
    parser.add_argument('--initialize-from')
    parser.add_argument('--resume', action='store_true')
    parser.add_argument('--specialists', action='store_true', help='Fresh modular policy; no legacy weight inheritance')
    parser.add_argument('--baseline-run', help='Frozen legacy opponent copied into a new specialist run')
    parser.add_argument('--prepare-only', action='store_true', help='Initialize and save specialists without starting training')
    parser.add_argument('--leader', help='Train only this leader against frozen opponents, with balanced seats and 1000-game matchup blocks')
    parser.add_argument('--curriculum', action='store_true', help='Approved Krennic practice warm-up and held-out/fixed-opponent progress checks')
    parser.add_argument('--practice-only', action='store_true', help='Save the bounded practice learning check, then stop before full games')
    parser.add_argument('--experiment-games', type=int, help='Explicit completed self-play game budget for this curriculum experiment; default remains uncapped')
    parser.add_argument('--human-data', help='Explicit private R2 dataset cache under .swubase/crossfire-ai; refresh consent and learn before self-play')
    parser.add_argument('--seed', type=int, default=20260921)
    parser.add_argument('--cpus', type=int, choices=range(1, MAX_CPUS + 1), default=3)
    parser.add_argument('--workers', type=int, choices=range(1, MAX_CPUS + 1), default=9)
    args = parser.parse_args()
    run(args)


if __name__ == '__main__':
    main()
