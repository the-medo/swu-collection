"""Atomic recoverable checkpoints and immutable inference model exports."""
import hashlib
import io
import json
import random
from pathlib import Path
import torch
from full_model import make_policy, load_frozen, pack
from resource_budget import FILE_LIMIT

ARCHITECTURE = 'context-candidate-ppo-v1'


def checked_bytes(run, manifest, *, checkpoint=False):
    name = manifest['file']
    if checkpoint and name not in ('checkpoint-0.pt', 'checkpoint-1.pt'):
        raise ValueError('Invalid checkpoint filename')
    root = Path(run).resolve()
    path = (root / name).resolve()
    if not path.is_relative_to(root) or not path.is_file() or path.stat().st_size > FILE_LIMIT:
        raise ValueError('Invalid artifact path or size')
    data = path.read_bytes()
    if hashlib.sha256(data).hexdigest() != manifest['sha256']:
        raise ValueError('Artifact checksum mismatch')
    return data


def publish(budget, output, contract, policy, state):
    payload = {'architecture': policy.architecture, 'contract': contract,
               'policySpec': getattr(policy, 'spec', None),
               'model': policy.state_dict(), 'games': state['games'], 'updates': state['updates'],
               'initialization': state['initialization'], 'datasets': state.get('datasets', [])}
    if state.get('curriculum'):
        payload['practice'] = {key: state['curriculum'][key] for key in ('version', 'hash', 'epochs', 'passed')}
    buffer = io.BytesIO()
    torch.save(payload, buffer)
    data = buffer.getvalue()
    digest = hashlib.sha256(data).hexdigest()
    name = f'models/{digest}.pt'
    path = output / name
    if not path.exists():
        budget.write(path, data)
    manifest = {'file': name, 'sha256': digest, 'architecture': policy.architecture,
                'contract': contract, 'games': state['games'], 'updates': state['updates'],
                'datasets': state.get('datasets', []),
                'focusLeader': state.get('focusLeader'),
                'parameters': sum(p.numel() for p in policy.parameters()),
                'qualification': 'development; online-play strength not yet qualified'}
    if 'practice' in payload: manifest['practice'] = payload['practice']
    if hasattr(policy, 'dashboard'):
        manifest['system'] = policy.dashboard(state)
    # Validate the immutable artifact before advancing the publication pointer.
    checked_bytes(output, manifest)
    loaded = load_frozen(path, contract)
    for key, value in policy.state_dict().items():
        torch.testing.assert_close(value, loaded.state_dict()[key], rtol=0, atol=0)
    budget.json(output / 'latest-model.json', manifest)
    return manifest


def save_checkpoint(budget, output, contract, policy, optimizer, opponents, state, probe):
    index_path = output / 'checkpoints.json'
    previous = json.loads(index_path.read_text())['current'] if index_path.exists() else None
    name = 'checkpoint-1.pt' if previous and previous['file'] == 'checkpoint-0.pt' else 'checkpoint-0.pt'
    payload = {'format': 'crossfire-league-checkpoint-v1', 'architecture': policy.architecture,
               'policySpec': getattr(policy, 'spec', None),
               'contract': contract, 'model': policy.state_dict(), 'optimizer': optimizer.state_dict(),
               'opponents': [p.state_dict() for p in opponents], 'state': state,
               'torchRng': torch.get_rng_state(), 'pythonRng': random.getstate(),
               'resumeReady': True}
    budget.tensor(output / name, payload)
    manifest = {'file': name, 'sha256': hashlib.sha256((output / name).read_bytes()).hexdigest(),
                'games': state['games'], 'updates': state['updates']}
    frozen = load_frozen(output / name, contract)
    with torch.inference_mode():
        expected, expected_value = policy(*pack([probe]))
        actual, actual_value = frozen(*pack([probe]))
        torch.testing.assert_close(actual[0], expected[0], rtol=0, atol=0)
        torch.testing.assert_close(actual_value, expected_value, rtol=0, atol=0)
    budget.json(index_path, {'current': manifest, 'previous': previous})
    return manifest


def restore(output, contract, policy, optimizer):
    index = json.loads((output / 'checkpoints.json').read_text())
    errors = []
    for manifest in (index['current'], index.get('previous')):
        if manifest is None:
            continue
        try:
            data = checked_bytes(output, manifest, checkpoint=True)
            payload = torch.load(io.BytesIO(data), map_location='cpu', weights_only=True)
            if (payload.get('format') != 'crossfire-league-checkpoint-v1'
                    or payload.get('architecture') != policy.architecture or payload.get('contract') != contract
                    or payload.get('policySpec') != getattr(policy, 'spec', None)
                    or payload.get('resumeReady') is not True):
                raise ValueError('Incompatible league checkpoint')
            if any(payload['state'][key] != manifest[key] for key in ('games', 'updates')):
                raise ValueError('Checkpoint counters disagree')
            if not 1 <= len(payload['opponents']) <= 3:
                raise ValueError('Invalid opponent pool')
            policy.load_state_dict(payload['model'], strict=True)
            optimizer.load_state_dict(payload['optimizer'])
            opponents = []
            for weights in payload['opponents']:
                model = make_policy(contract, policy.architecture).eval().requires_grad_(False)
                model.load_state_dict(weights, strict=True)
                opponents.append(model)
            if any(not torch.isfinite(p).all() for model in [policy, *opponents] for p in model.parameters()):
                raise ValueError('Non-finite model weights')
            if any(not torch.isfinite(value).all() for item in optimizer.state.values()
                   for value in item.values() if isinstance(value, torch.Tensor)):
                raise ValueError('Non-finite optimizer state')
            torch.set_rng_state(payload['torchRng'])
            random.setstate(payload['pythonRng'])
            return payload['state'], opponents, manifest
        except Exception as error:
            errors.append(str(error))
    raise ValueError('No valid recoverable checkpoint: ' + '; '.join(errors))
