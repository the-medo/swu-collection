"""Private R2 sync and supervised human learning. No fabricated PPO probabilities."""
import base64
import hashlib
import json
from pathlib import Path
from datetime import datetime, timezone
import torch
from engine import Engine, ROOT
from full_model import compact
from full_train import optimize


def split(group_id):
    # Both seats and every game in a series always land in the same partition.
    return 'validation' if int(group_id[:8], 16) % 10 == 0 else 'train'


def sync(bridge, budget, directory, stopping=lambda: False):
    directory = Path(directory).resolve()
    if not directory.is_relative_to(budget.root) or directory == budget.root:
        raise ValueError('Datasets must remain within the artifact budget')
    entries = []
    now = datetime.now(timezone.utc)
    for shard in range(256):
        if stopping(): raise RuntimeError('Dataset sync stopped by resource monitor')
        index = bridge.request('index', shard=f'{shard:02x}')
        for entry in index['entries']:
            checksum = entry['checksum']
            path = directory / f"{entry['id']}.json.gz"
            if entry['state'] != 'available' or datetime.fromisoformat(entry['expiresAt'].replace('Z', '+00:00')) <= now:
                path.unlink(missing_ok=True)
                continue
            if not checksum: raise ValueError('Available dataset lacks checksum')
            if path.is_symlink(): raise ValueError('Dataset cache cannot contain symbolic links')
            if not path.exists() or path.stat().st_size > 8_000_000 or hashlib.sha256(path.read_bytes()).hexdigest() != checksum:
                response = bridge.request('download', exportId=entry['id'], checksum=checksum)
                data = base64.b64decode(response['bytes'], validate=True)
                if len(data) > 8_000_000 or hashlib.sha256(data).hexdigest() != checksum:
                    raise ValueError('Dataset integrity mismatch')
                budget.write(path, data)
            entries.append({**entry, 'path': str(path), 'split': split(entry['groupId'])})
    # Drop any cached artifact removed from the registry, not just tombstones.
    wanted = {Path(entry['path']) for entry in entries}
    for path in directory.glob('*.json.gz'):
        if path not in wanted: path.unlink()
    manifest = {'schema': 1, 'refreshedAt': datetime.now(timezone.utc).isoformat(), 'entries': entries}
    budget.json(directory / 'catalog.json', manifest)
    return manifest


def learn(bridge, policy, optimizer, catalog, *, leader=None, stopping=lambda: False):
    result = {'games': 0, 'decisions': 0, 'updates': 0, 'datasets': [], 'validationGames': 0,
              'validationDecisions': 0, 'validationCorrect': 0, 'skipped': [], 'componentTraining': {}}
    def update(rows):
        import numpy as np
        if hasattr(policy, 'learning_counts'):
            counts = policy.learning_counts(torch.from_numpy(np.stack([r['context'] for r in rows])))
            for key, count in counts.items():
                item = result['componentTraining'].setdefault(key, {'decisions': 0, 'updates': 0})
                item['decisions'] += count; item['updates'] += int(count > 0)
        optimize(policy, optimizer, rows, imitation=True)
        result['decisions'] += len(rows); result['updates'] += 1

    for entry in catalog['entries']:
        if stopping(): raise RuntimeError('Human learning stopped by resource monitor')
        # Refresh consent for this game immediately before consuming cached data.
        live = bridge.request('index', shard=entry['id'][:2])
        current = next((e for e in live['entries'] if e['id'] == entry['id']), None)
        if not current or current['state'] != 'available' or current['checksum'] != entry['checksum'] or datetime.fromisoformat(current['expiresAt'].replace('Z','+00:00')) <= datetime.now(timezone.utc):
            Path(entry['path']).unlink(missing_ok=True)
            continue
        # Preflight the entire game before learning; unsupported adapter choices
        # quarantine a game without partially teaching it.
        opened = bridge.request('open', path=entry['path'], checksum=entry['checksum'])
        if not opened['ready']:
            result['skipped'].append({'id': entry['id'], 'reason': opened['reason']})
            continue
        rows, trained = [], False
        while True:
            if stopping(): raise RuntimeError('Human learning stopped by resource monitor')
            response = bridge.request('next')
            if response['done']: break
            raw = response['row']
            row = {**raw, **compact(raw, bridge.contract), 'value': 0.0}
            if leader:
                route = int(policy.routes(torch.from_numpy(row['context']).unsqueeze(0))[0])
                if policy.leader_keys[route] != leader: continue
            if entry['split'] == 'validation':
                from full_model import act
                action, _, _ = act(policy, row, greedy=True)
                result['validationDecisions'] += 1
                result['validationCorrect'] += int(action == row['action'])
            else:
                rows.append(row)
                if len(rows) >= 128:
                    update(rows)
                    rows = []; trained = True
        if rows:
            update(rows); trained = True
        if entry['split'] == 'validation': result['validationGames'] += 1
        elif trained:
            result['games'] += 1; result['datasets'].append(entry['checksum'])
    return result


def data_bridge(roster=None):
    return Engine(bridge='play/ai/datasets/bridge.ts', bridge_args=('--roster', str(roster)) if roster else (), max_response=32_000_000)
