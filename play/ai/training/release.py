"""Evaluate and package one frozen leader release. Publication is a separate command."""
from resource_budget import requested_cpu_limit, restrict_resources
restrict_resources(requested_cpu_limit())
import argparse
import hashlib
import io
import json
from pathlib import Path
import subprocess
import uuid
import torch
from disk_monitor import DiskMonitor
from engine import ROOT
from full_model import load_frozen
from league_artifacts import checked_bytes
from league_schedule import utc
from parallel import Collector
from resource_budget import ArtifactBudget
from serve import interface_hash, ModelCache


def evaluate(collector, policy, anchor, own_decks, seed, pairs, stopping):
    jobs = [{'seed': (seed + own * 10000 + opponent * 100 + sample) % 2**32,
             'decks': [own, opponent] if seat == 0 else [opponent, own],
             'learner': seat, 'mode': 'past', 'opponent': anchor, 'limit': 2500, 'replay': True}
            for own in own_decks for opponent in range(len(collector.contract['decks']))
            for sample in range(pairs) for seat in range(2)]
    report = {'suite': 'crossfire-ai-release-v1', 'versions': collector.contract['versions'],
              'interfaceHash': interface_hash(collector.contract), 'seed': seed,
              **{k: 0 for k in ('games', 'wins', 'losses', 'draws', 'cutoffs', 'replayChecked', 'decisions')}}
    opponents, decks = {}, {}
    window = len(collector.engines) * 2
    for offset in range(0, len(jobs), window):
        if stopping(): raise RuntimeError('Release evaluation stopped by resource monitor')
        for _, result in collector.collect(policy, jobs[offset:offset+window], greedy=True, record_rows=False, stopping=stopping):
            if result['outcome'] != 'terminal':
                raise ValueError('Evaluation game was truncated; release not certified')
            own, opponent = [collector.contract['decks'][result['decks'][i]]['key'] for i in (result['learner'], 1-result['learner'])]
            outcome = 'draws' if result['winner'] is None else 'wins' if result['winner'] == result['learner'] else 'losses'
            row = opponents.setdefault(opponent, {'deck': opponent, 'games': 0, 'wins': 0, 'losses': 0, 'draws': 0})
            row['games'] += 1
            row[outcome] += 1
            decks[own] = decks.get(own, 0) + 1
            report['games'] += 1
            report[outcome] += 1
            report['replayChecked'] += int(result['replayChecked'])
            report['decisions'] += result['microsteps']
    report['byOpponent'] = list(opponents.values())
    report['byDeck'] = [{'deck': key, 'games': count} for key, count in decks.items()]
    if any(count < 40 for count in decks.values()): raise ValueError('Need at least 40 games per released deck')
    return report


def run(args):
    torch.set_num_threads(1)
    root = ROOT / '.swubase/crossfire-ai'
    source, output = Path(args.run).resolve(), Path(args.output).resolve()
    if not source.is_relative_to(root) or not output.is_relative_to(root) or output == root or output.exists():
        raise ValueError('Use a new output directory and a source run inside .swubase/crossfire-ai')
    manifest = json.loads((source / 'latest-model.json').read_text())
    rotation = json.loads((source / 'status.json').read_text()).get('rotation') if (source / 'status.json').exists() else None
    selected_deck = getattr(args, 'deck', None)
    anchor_manifest = None
    if rotation:
        selected_deck = selected_deck or args.leader
        entry = next((d for d in rotation['decks'] if d['key'] == selected_deck), None)
        if not entry or not entry.get('modelHash'):
            raise ValueError('Selected rotation deck has no published checkpoint')
        digest = entry['modelHash']
        ref = {'file': f'models/{digest}.pt', 'sha256': digest}
        payload = torch.load(io.BytesIO(checked_bytes(source, ref)), map_location='cpu', weights_only=True)
        manifest = {**ref, **{k: payload[k] for k in ('contract', 'games', 'updates', 'architecture')},
                    'datasets': payload.get('datasets', [])}
        pointer = json.loads((source / 'checkpoints.json').read_text())['current']
        state = torch.load(io.BytesIO(checked_bytes(source, pointer, checkpoint=True)),
                           map_location='cpu', weights_only=True)['state']
        anchor_manifest = state['initialReferences'][selected_deck]
    weights = checked_bytes(source, manifest)
    if not manifest['games'] or not manifest['updates']: raise ValueError('Cannot release an untrained model')
    contract = manifest['contract']
    policy = load_frozen(source / manifest['file'], contract)
    if not policy.architecture.startswith('crossfire-specialists-'): raise ValueError('Leader releases require specialists')
    leader = next((l for l in policy.roster['leaders'] if l['key'] == args.leader), None)
    if not leader: raise ValueError('Unknown leader')
    own = [i for i, deck in enumerate(policy.decks) if deck['leaderKey'] == args.leader
           and (selected_deck is None or deck['key'] == selected_deck)]
    if not own: raise ValueError('Selected deck does not belong to this leader')
    anchor_manifest = anchor_manifest or json.loads((source / 'anchor-model.json').read_text())
    checked_bytes(source, anchor_manifest)
    anchor = load_frozen(source / anchor_manifest['file'], contract)
    # Targets are explicit pinned version objects, optionally with a local catalog.
    targets = json.loads(Path(args.targets).read_text()) if args.targets else [{'versions': contract['versions']}]
    if not 1 <= len(targets) <= 32: raise ValueError('Choose one to 32 certified targets')
    budget = ArtifactBudget(root)
    monitor = DiskMonitor(budget, output / 'disk-usage.json').start()
    try:
        reports = []
        for target in targets:
            with Collector(args.workers, league=True, roster=source / 'roster.json' if (source / 'roster.json').exists() else None,
                           target=target['versions'], catalog=target.get('catalog')) as collector:
                if interface_hash(collector.contract) != interface_hash(contract) or collector.contract['decks'] != contract['decks']:
                    raise ValueError('Target changed the model interface or roster; retrain with an explicit migration')
                report = evaluate(collector, policy, anchor, own, args.seed, args.pairs, monitor.failed.is_set)
                report.update(modelHash=manifest['sha256'], opponentHash=anchor_manifest['sha256'])
                reports.append(report)
        release = {'schema': 1, 'id': str(uuid.uuid4()), 'label': args.label, 'createdAt': utc().replace('+00:00', 'Z'),
                   'sourceCommit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
                   'leader': {key: leader[key] for key in ('key', 'cardId', 'label')},
                   'artifact': {'sha256': hashlib.sha256(weights).hexdigest(), 'bytes': len(weights)},
                   'architecture': policy.architecture, 'interfaceHash': interface_hash(contract), 'contract': contract,
                   'games': manifest['games'], 'updates': manifest['updates'],
                   'decks': [{'key': policy.decks[i]['key'], 'label': policy.decks[i].get('label', policy.decks[i]['key']),
                              'hash': contract['decks'][i]['hash'], 'archetypes': policy.decks[i]['strategies']} for i in own],
                   'evaluations': reports, 'datasets': manifest.get('datasets', [])}
        # Freeze actual admission lists with the release, not mutable database deck IDs.
        roster_path = source / 'roster.json'
        roster = json.loads(roster_path.read_text()) if roster_path.exists() else json.loads((ROOT / 'play/ai/full-game/league-decks.json').read_text())
        release['deckSnapshots'] = {d['key']: d['snapshot'] for d in roster['decks']
                                    if d['key'] in {contract['decks'][i]['key'] for i in own}}
        ModelCache().load(release, weights)
        budget.write(output / 'model.pt', weights)
        budget.json(output / 'release.json', release)
        print(json.dumps({'release': str(output / 'release.json'), 'games': sum(r['games'] for r in reports), 'published': False}))
    finally:
        monitor.close()
        budget.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__, allow_abbrev=False)
    parser.add_argument('--run', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--leader', required=True)
    parser.add_argument('--deck', help='Release only this list; defaults to the leader key for continuous rotation runs')
    parser.add_argument('--label', required=True)
    parser.add_argument('--targets', help='JSON array of {versions, catalog?}; each target gets fresh replay-verified evaluation')
    parser.add_argument('--pairs', type=int, choices=range(10, 1001), default=10)
    parser.add_argument('--seed', type=int, default=7300000)
    parser.add_argument('--cpus', type=int, choices=range(1, 10), default=3)
    parser.add_argument('--workers', type=int, choices=range(1, 10), default=3)
    run(parser.parse_args())
