"""Prepare a new roster/model under the global artifact lock; never start training."""
from resource_budget import requested_cpu_limit, restrict_resources
restrict_resources(requested_cpu_limit())
import argparse
import hashlib
import json
import os
from pathlib import Path
import sys
import random
from contextlib import closing
import uuid
import torch
from engine import ROOT
from disk_monitor import DiskMonitor
from resource_budget import ArtifactBudget, DISK_LIMIT
from full_model import compact, frozen_copy, load_frozen
from expand_specialists import expand_policy
from league_artifacts import checked_bytes, publish, save_checkpoint
from league_schedule import ROSTER_SCHEDULE_VERSION, new_batch, utc
from parallel import Collector
from specialist_model import ROSTER


def initial_registry():
    return {'version': 1, 'activeRun': 'specialists', 'runs': []}


def revision(registry):
    return hashlib.sha256(json.dumps(registry, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()).hexdigest()


def read_registry(root):
    p = root / 'training-runs.json'
    registry = json.loads(p.read_text()) if p.exists() else initial_registry()
    if registry.get('version') != 1 or not isinstance(registry.get('runs'), list):
        raise ValueError('Invalid training run registry')
    return registry


def source_directory(root, registry):
    active = registry['activeRun']
    if active == 'specialists':
        return root / 'specialists-run-01'
    if not any(r['id'] == active for r in registry['runs']) or not active.startswith('specialists-'):
        raise ValueError('Invalid active run')
    uuid.UUID(active.removeprefix('specialists-'))
    source = (root / active).resolve()
    if not source.is_relative_to(root.resolve()):
        raise ValueError('Invalid source path')
    return source


def prepare(request, root=None):
    root = Path(root or ROOT / '.swubase/crossfire-ai').resolve()
    request_id = str(uuid.UUID(request['requestId']))
    run_id = f'specialists-{request_id}'
    with closing(ArtifactBudget(root)) as budget:
        registry = read_registry(root)
        existing = next((r for r in registry['runs'] if r['id'] == run_id), None)
        fingerprint = revision({k: request[k] for k in ('deckId', 'archetypes', 'contentHash', 'revision')})
        if existing:
            if existing['requestHash'] != fingerprint:
                raise ValueError('Request ID was reused for different input')
            return {'run': run_id, 'revision': revision(registry)}
        if revision(registry) != request['revision']:
            raise ValueError('Training roster changed. Refresh before adding the deck.')
        source = source_directory(root, registry)
        state = json.loads((source / 'status.json').read_text())
        if state.get('rotation'):
            raise ValueError('This rotation pins eight decks and their practice families. Prepare a new curriculum run to expand it; the single-bundle add-deck workflow cannot copy a multi-bundle rotation.')
        if state['status'] not in ('ready', 'stopped'):
            raise ValueError('Stop training before adding a deck')
        manifest = json.loads((source / 'latest-model.json').read_text())
        if any(state.get(k) != manifest.get(k) for k in ('games', 'updates')):
            raise ValueError('The stopped run has not published its latest weights. Recover it before adding a deck.')
        checked_bytes(source, manifest)
        old_contract = manifest['contract']
        policy = load_frozen(source / manifest['file'], old_contract)
        if not policy.architecture.startswith('crossfire-specialists-'):
            raise ValueError('Expand a specialist run, not the legacy archive')
        if (source / 'roster.json').exists():
            roster = json.loads((source / 'roster.json').read_text())
        else:
            decks = json.loads((ROOT / 'play/ai/full-game/league-decks.json').read_text())['decks']
            roster = {'version': 1,
                      'leaders': [{k: l[k] for k in ('key', 'label', 'cardId')} for l in ROSTER['leaders']],
                      'decks': [{**d, 'leaderKey': l['key'], 'strategies': l['strategies']}
                                for d, l in zip(decks, ROSTER['leaders'])]}
        if len(roster['decks']) >= 32:
            raise ValueError('This training roster supports up to 32 deck lists')
        snapshot = request['snapshot']
        if snapshot['sourceDeckId'] != request['deckId'] or snapshot['contentHash'] != request['contentHash']:
            raise ValueError('Deck changed. Check it again before adding it.')
        def playable(s):
            return {k: s[k] for k in ('versions', 'leader', 'base', 'mainboard')}
        if any(playable(d['snapshot']) == playable(snapshot) for d in roster['decks']):
            raise ValueError('This exact deck list is already in the training roster')
        strategies = request['archetypes']
        if not strategies or len(set(strategies)) != len(strategies) or not set(strategies).issubset(
                {s['key'] for s in ROSTER['strategies']}):
            raise ValueError('Select one or more supported archetypes')
        leader = next((l for l in roster['leaders'] if l['cardId'] == snapshot['leader']), None)
        if leader is None:
            leader = {'key': 'leader-' + hashlib.sha256(snapshot['leader'].encode()).hexdigest()[:16],
                      'cardId': snapshot['leader'], 'label': request['leaderName'][:100]}
            roster['leaders'].append(leader)
        roster['decks'].append({'key': f'deck-{request_id}', 'label': request['name'][:100],
                                'leaderKey': leader['key'], 'strategies': strategies, 'snapshot': snapshot})
        output = root / run_id
        if output.exists():
            raise ValueError('An unfinished preparation uses this request ID. Check again to retry.')
        output.mkdir()
        monitor = DiskMonitor(budget, output / 'disk-usage.json').start()
        try:
            budget.json(output / 'roster.json', roster)
            torch.set_num_threads(1)
            torch.manual_seed(state['seed'])
            random.seed(state['seed'])
            with Collector(1, roster=output / 'roster.json') as collector:
                contract = collector.contract
                expanded = expand_policy(policy, old_contract, contract)
                initialization = {'kind': 'expanded-specialists', 'run': registry['activeRun'],
                                  'sha256': manifest['sha256'], 'games': manifest['games'],
                                  'updates': manifest['updates'], 'optimizer': 'fresh Adam after expansion',
                                  'baselineWeightsImported': False}
                next_state = {'schedule': ROSTER_SCHEDULE_VERSION, 'seed': state['seed'],
                    'initialization': initialization, 'startedAtUtc': utc(), 'games': 0,
                    'attempts': 0, 'updates': 0, 'decisions': 0, 'cutoffs': 0, 'elapsedSeconds': 0,
                    'history': [], 'recentResults': [], 'lastCompletedBatch': None,
                    'componentTraining': state.get('componentTraining', {}),
                    'batch': new_batch(0, [d['key'] for d in contract['decks']], 0)}
                old_anchor = state['anchor']
                checked_bytes(source, old_anchor)
                anchor = load_frozen(source / old_anchor['file'], old_anchor['contract'])
                anchor = expand_policy(anchor, old_anchor['contract'], contract)
                next_state['anchor'] = publish(budget, output, contract, anchor, {
                    'games': old_anchor['games'], 'updates': old_anchor['updates'],
                    'initialization': {'kind': 'frozen-anchor-input-expansion'}})
                budget.json(output / 'anchor-model.json', next_state['anchor'])
                next_state['latestModel'] = publish(budget, output, contract, expanded, next_state)
                engine = collector.engines[0]
                start = engine.request('reset', seed=0, decks=[0, len(roster['decks']) - 1], limit=None, autoForced=True)
                probe = compact(start['observation'], contract)
                engine.request('truncate', generation=start['generation'])
                next_state['checkpoint'] = save_checkpoint(budget, output, contract, expanded,
                    torch.optim.Adam(expanded.parameters(), lr=.0003), [frozen_copy(expanded)], next_state, probe)
                budget.json(output / 'status.json', {**next_state, 'status': 'ready', 'pid': os.getpid(),
                    'updatedAtUtc': utc(), 'cpus': sorted(os.sched_getaffinity(0)), 'workers': 1,
                    'workerPids': [engine.process.pid], 'diskLimitBytes': DISK_LIMIT, 'diskCheckSeconds': 300,
                    'gameLimit': None, 'timeLimitSeconds': None, 'commandsPerGameLimit': None,
                    'system': expanded.dashboard(next_state)})
            registry['runs'].append({'id': run_id, 'label': f'{len(roster["decks"])} decks · {request["name"][:60]}',
                                     'requestHash': fingerprint})
            registry['activeRun'] = run_id
            budget.json(root / 'training-runs.json', registry)
            return {'run': run_id, 'revision': revision(registry)}
        finally:
            monitor.close()


def main():
    parser = argparse.ArgumentParser(allow_abbrev=False)
    parser.add_argument('--cpus', type=int, choices=range(1, 10), default=9)
    parser.parse_args()
    try:
        raw = sys.stdin.buffer.read(2_000_001)
        if len(raw) > 2_000_000:
            raise ValueError('Deck input exceeds limit')
        result = prepare(json.loads(raw))
        print(json.dumps({'ok': True, **result}))
    except (ValueError, RuntimeError) as error:
        print(json.dumps({'ok': False, 'message': str(error)}))
        sys.exit(1)


if __name__ == '__main__':
    main()
