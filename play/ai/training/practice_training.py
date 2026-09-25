"""Approved synthetic choice demonstrations. No terminal rewards or critic targets."""
import random
import numpy as np
import torch
from engine import Engine
from full_model import compact, pack


def load_practice(contract, bridge_path='play/ai/practice/bridge.ts'):
    cases = []
    with Engine(bridge=bridge_path, max_response=32_000_000) as bridge:
        if bridge.contract != contract:
            raise ValueError('Practice curriculum requires its exact engine/encoding/roster contract')
        manifest = bridge.request('catalogue')
        for case in manifest['cases']:
            rows = [{**row, **compact(row, contract)} for row in bridge.request('case', caseId=case['id'])]
            if not rows or any(not r['acceptable'] or any(type(i) is not int or not 0 <= i < len(r['candidates']) for i in r['acceptable']) for r in rows):
                raise ValueError('Invalid practice reference choices')
            cases.append({**case, 'rows': rows})
    train = {c['family'] for c in cases if c['split'] == 'train'}
    heldout = {c['family'] for c in cases if c['split'] == 'heldout'}
    if train & heldout or not train or not heldout:
        raise ValueError('Practice families must have disjoint training and held-out splits')
    return manifest, cases


def evaluate_practice(policy, cases):
    report = {split: {'correct': 0, 'choices': 0, 'exactLines': 0, 'lines': 0, 'families': []} for split in ('train', 'heldout')}
    families = {}
    with torch.inference_mode():
        for case in cases:
            logits, _ = policy(*pack(case['rows']))
            correct = sum(int(scores.argmax()) in row['acceptable'] for scores, row in zip(logits, case['rows']))
            values = {'correct': correct, 'choices': len(logits), 'exactLines': int(correct == len(logits)), 'lines': 1}
            key = (case['split'], case['family'])
            family = families.setdefault(key, {'id': case['family'], 'title': case['title'], **{k: 0 for k in values}})
            for k, v in values.items():
                report[case['split']][k] += v
                family[k] += v
    for (split, _), family in families.items(): report[split]['families'].append(family)
    return report


def agreement(section):
    return section['correct'] / section['choices'] if section['choices'] else 0


def warmup(policy, optimizer, cases, *, epochs=200, stopping=lambda: False, progress=lambda _: None, early_stopping=True):
    training = [c for c in cases if c['split'] == 'train']
    if not training: raise ValueError('No training cases')
    # Each scenario variant receives equal weight regardless of sequence length.
    rows = [{**row, 'weight': 1 / (len(training) * len(case['rows']))} for case in training for row in case['rows']]
    before = evaluate_practice(policy, cases)
    updates, loss_value = 0, None
    for epoch in range(epochs):
        if stopping(): break
        order = list(range(len(rows)))
        random.shuffle(order)
        optimizer.zero_grad(set_to_none=True)
        loss_value = 0.0
        for offset in range(0, len(order), 32):
            batch = [rows[i] for i in order[offset:offset + 32]]
            scores, _ = policy(*pack(batch))
            loss = sum((torch.logsumexp(logits, 0) - torch.logsumexp(logits[row['acceptable']], 0)) * row['weight']
                       for logits, row in zip(scores, batch))
            if not torch.isfinite(loss): raise RuntimeError('Non-finite practice loss')
            loss.backward()
            loss_value += loss.item()
        torch.nn.utils.clip_grad_norm_(policy.parameters(), 1, error_if_nonfinite=True)
        optimizer.step()
        updates += 1
        if updates % 10 == 0:
            # Early stopping consults training cases only. The held-out families
            # are assessed before/after, never used to pick an epoch or labels.
            train = evaluate_practice(policy, training)['train']
            progress({'epochs': updates, 'training': train, 'loss': loss_value})
            if early_stopping and updates >= 30 and agreement(train) >= .97: break
    after = evaluate_practice(policy, cases)
    passed = (not stopping() and agreement(after['train']) >= .85 and
              agreement(after['train']) >= min(.97, agreement(before['train']) + .10) and
              agreement(after['heldout']) >= agreement(before['heldout']))
    activated = policy.learning_counts(torch.from_numpy(np.stack([r['context'] for r in rows])))
    activated.pop('value', None)  # No critic regression is performed on unfinished positions.
    return {'before': before, 'after': after, 'epochs': updates, 'loss': loss_value,
            'decisions': len(rows) * updates, 'passed': passed,
            'gate': 'training agreement >=85%, improves by 10 points (capped at 97%), held-out agreement does not regress',
            'componentTraining': {k: {'decisions': count * updates, 'updates': updates if count else 0} for k, count in activated.items()},
            'reason': 'passed' if passed else 'interrupted or learning/held-out gate not met'}


def benchmark_jobs(contract, anchor, leader='krennic', pairs=50):
    own = next(i for i, deck in enumerate(contract['decks']) if deck['key'] == leader)
    # Kept far outside the sequential training seed range. Paired seats share
    # seeds; the benchmark schedule and anchor stay unchanged across checkpoints.
    return [{'seed': 3_100_000_000 + opponent * 1000 + seed,
             'decks': [own, opponent][::(-1 if seat else 1)], 'orientation': seat,
             'learner': seat, 'mode': 'past', 'opponent': anchor, 'limit': None,
             'replay': seed == 0}
            for opponent in range(len(contract['decks'])) for seed in range(pairs) for seat in (0, 1)]


def benchmark(collector, policy, anchor, *, pairs=50, stopping=lambda: False, progress=lambda _: None):
    jobs = benchmark_jobs(collector.contract, anchor, pairs=pairs)
    scores = {d['key']: {'completed': 0, 'wins': 0, 'losses': 0, 'draws': 0, 'cutoffs': 0} for d in collector.contract['decks']}
    n = 0
    for offset in range(0, len(jobs), len(collector.engines) * 2):
        if stopping(): break
        results = collector.collect(policy, jobs[offset:offset+len(collector.engines)*2], greedy=True, record_rows=False, stopping=stopping)
        for _, result in results:
            opponent = collector.contract['decks'][result['decks'][1-result['learner']]]['key']
            score = scores[opponent]
            if result['outcome'] != 'terminal': score['cutoffs'] += 1
            else:
                score['completed'] += 1
                score['draws' if result['winner'] is None else 'wins' if result['winner'] == result['learner'] else 'losses'] += 1
            n += 1
        progress({'completed': n, 'planned': len(jobs)})
    return {'complete': n == len(jobs) and all(s['cutoffs'] == 0 for s in scores.values()),
            'schedule': 'krennic-fixed-anchor-100-per-opponent-v1' if pairs == 50 else 'krennic-smoke-benchmark',
            'games': n, 'pairs': pairs, 'byOpponent': scores,
            'qualification': 'reused development benchmark; not release qualification'}
