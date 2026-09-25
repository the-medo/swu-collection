"""Explicit weight migration into a larger pinned roster; source artifacts are read-only."""
import copy
import torch
from full_model import make_policy
from specialist_model import EXPANDABLE_ARCHITECTURE


def feature_columns(old, new):
    if old['memory'] != new['memory'] or old['version'] not in (1, 2) or new['version'] != 2:
        raise ValueError('Unsupported encoder migration')
    ow, nw = len(old['vocabulary']) + 1, len(new['vocabulary']) + 1
    indices = {card: i + 1 for i, card in enumerate(new['vocabulary'])}
    if len(indices) != nw - 1:
        raise ValueError('Duplicate vocabulary')
    try:
        identity = [0, *[indices[c] for c in old['vocabulary']]]
        own = [new['ownDeckKeys'].index(k) for k in old.get('ownDeckKeys', [])]
    except (KeyError, ValueError):
        raise ValueError('Migration cannot remove existing cards or decks') from None
    context = list(range(76))
    for group in range(15):
        context.extend(76 + group * nw + i for i in identity)
    context.extend(range(76 + nw * 15, 76 + nw * 15 + 192))
    context.extend(76 + nw * 15 + 192 + i for i in own)
    candidate = list(range(16))
    for card in range(2):
        start = 16 + card * (40 + nw)
        candidate.extend(range(start, start + 24))
        candidate.extend(start + 24 + i for i in identity)
        candidate.extend(range(start + 24 + nw, start + 40 + nw))
    candidate.extend(range(16 + 2 * (40 + nw), 16 + 2 * (40 + nw) + 64))
    matchup = list(range(96 + 29))
    for group in range(7):
        matchup.extend(96 + 29 + group * nw + i for i in identity)
    if len(context) != old['contextSize'] or len(candidate) != old['candidateSize']:
        raise ValueError('Unexpected old feature dimensions')
    return {'context_net.0.weight': context, 'candidate_net.0.weight': candidate,
            'matchup.0.weight': matchup}


def expand_policy(source, old_contract, new_contract):
    for key in ('versions', 'protocol', 'commandAdapter'):
        if old_contract[key] != new_contract[key]:
            raise ValueError('Engine or command semantics changed; migration is unsafe')
    new_decks = {d['key']: d['hash'] for d in new_contract['decks']}
    if any(new_decks.get(d['key']) != d['hash'] for d in old_contract['decks']):
        raise ValueError('Existing deck snapshots must remain unchanged')
    specialist = source.architecture.startswith('crossfire-specialists-')
    target = make_policy(new_contract, EXPANDABLE_ARCHITECTURE if specialist else source.architecture)
    if specialist:
        old = source.roster
        new = target.roster
        if old['strategies'] != new['strategies']:
            raise ValueError('Existing strategy definitions must remain unchanged')
        for leader in old['leaders']:
            if not any(l['key'] == leader['key'] and l['cardId'] == leader['cardId'] for l in new['leaders']):
                raise ValueError('Existing leader routes must remain unchanged')
        for deck in source.decks:
            if not any(d['key'] == deck['key'] and d['leaderKey'] == deck['leaderKey']
                       and d['strategies'] == deck['strategies'] for d in target.decks):
                raise ValueError('Existing deck archetypes must remain unchanged')
    mapping = feature_columns(old_contract['encoding'], new_contract['encoding'])
    weights = copy.deepcopy(target.state_dict())
    for name, value in source.state_dict().items():
        if name not in weights:
            raise ValueError(f'Migration would discard learned tensor {name}')
        if name in mapping:
            if value.shape != (weights[name].shape[0], len(mapping[name])):
                raise ValueError('Unexpected tensor dimensions')
            weights[name].zero_()
            weights[name][:, mapping[name]] = value
        else:
            if value.shape != weights[name].shape:
                raise ValueError('Unsupported network shape change')
            weights[name] = value.clone()
    target.load_state_dict(weights, strict=True)
    return target
