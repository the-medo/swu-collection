"""Warm-start the larger vocabulary without changing existing card features."""
import hashlib
import json
import torch
from full_model import load_frozen
from resource_budget import FILE_LIMIT


def columns(old, new):
    for key in ('version', 'memory'):
        if old[key] != new[key]:
            raise ValueError('Encoding semantics changed')
    old_width, new_width = len(old['vocabulary']) + 1, len(new['vocabulary']) + 1
    if len(set(new['vocabulary'])) != len(new['vocabulary']):
        raise ValueError('Duplicate card identities')
    indices = {card: i + 1 for i, card in enumerate(new['vocabulary'])}
    try:
        identity = [0, *[indices[card] for card in old['vocabulary']]]
    except KeyError:
        raise ValueError('Old identities are missing') from None
    context = list(range(76))
    for group in range(15):
        context.extend(76 + group * new_width + i for i in identity)
    context.extend(range(76 + 15 * new_width, 76 + 15 * new_width + 192))
    candidate = list(range(16))
    for card in range(2):
        start = 16 + card * (40 + new_width)
        candidate.extend(range(start, start + 24))
        candidate.extend(start + 24 + i for i in identity)
        candidate.extend(range(start + 24 + new_width, start + 40 + new_width))
    candidate.extend(range(16 + 2 * (40 + new_width), new['candidateSize']))
    if (len(context) != old['contextSize'] or len(candidate) != old['candidateSize']
            or new['contextSize'] != 76 + 15 * new_width + 192
            or new['candidateSize'] != 16 + 2 * (40 + new_width) + 64
            or old['contextSize'] != 76 + 15 * old_width + 192):
        raise ValueError('Unexpected feature layout')
    return {'context_net.0.weight': context, 'candidate_net.0.weight': candidate}


def expand_state(weights, template, mapping):
    if set(weights) != set(template):
        raise ValueError('Network architecture changed')
    result = {}
    for name, source in weights.items():
        if name in mapping:
            target = torch.zeros_like(template[name])
            if source.shape != (target.shape[0], len(mapping[name])):
                raise ValueError('Unexpected weight shape')
            target[:, mapping[name]] = source
            result[name] = target
        else:
            if source.shape != template[name].shape:
                raise ValueError('Network architecture changed')
            result[name] = source.clone()
    return result


def warm_start(run, contract, policy):
    status = json.loads((run / 'status.json').read_text())
    manifest = json.loads((run / 'latest.json').read_text())
    if status['status'] not in ('finished', 'stopped'):
        raise ValueError('Warm-start requires a completed checkpoint')
    if manifest['file'] not in ('checkpoint-0.pt', 'checkpoint-1.pt'):
        raise ValueError('Invalid source checkpoint')
    path = run / manifest['file']
    if path.stat().st_size > FILE_LIMIT or hashlib.sha256(path.read_bytes()).hexdigest() != manifest['sha256']:
        raise ValueError('Source checksum mismatch')
    saved = torch.load(path, map_location='cpu', weights_only=True)
    old = saved['contract']
    if any(old[k] != contract[k] for k in ('versions', 'protocol', 'commandAdapter')):
        raise ValueError('Engine or command semantics changed')
    hashes = {deck['key']: deck['hash'] for deck in contract['decks']}
    if any(hashes.get(deck['key']) != deck['hash'] for deck in old['decks']):
        raise ValueError('Previously trained deck changed')
    source = load_frozen(path, old)
    mapping = columns(old['encoding'], contract['encoding'])
    policy.load_state_dict(expand_state(source.state_dict(), policy.state_dict(), mapping))
    # The representation grows; preserve learned parameters while beginning a
    # documented fresh optimizer. Continuous-run resumes restore Adam exactly.
    return {'kind': 'expanded-vocabulary', 'run': str(run), **manifest,
            'optimizer': 'fresh Adam after vocabulary expansion',
            'oldVocabulary': len(old['encoding']['vocabulary']),
            'newVocabulary': len(contract['encoding']['vocabulary'])}
