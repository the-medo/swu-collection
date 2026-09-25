"""Deterministic 1,000-completed-match blocks, including every mirror."""
from datetime import datetime, timezone

BLOCK_SIZE = 1000
SCHEDULE_VERSION = 'six-deck-round-robin-v1'
ROSTER_SCHEDULE_VERSION = 'roster-round-robin-v2'


def utc():
    return datetime.now(timezone.utc).isoformat()


def matchups(count=6):
    if not 2 <= count <= 32:
        raise ValueError('Choose two to 32 training decks')
    if count != 6:
        # One visit to every unordered pair, including mirrors. Seats remain
        # balanced by training_jobs. Six decks retain the historical order.
        return [(a, b) for a in range(count) for b in range(a, count)]
    rotation = list(range(6))
    pairs = []
    for round_index in range(5):
        pairs.extend(tuple(sorted((rotation[i], rotation[-1 - i]))) for i in range(3))
        pairs.append((round_index, round_index))
        rotation = [rotation[0], rotation[-1], *rotation[1:-1]]
    pairs.append((5, 5))
    return pairs


def position(games, count=6):
    block, completed = divmod(games, BLOCK_SIZE)
    pairs = matchups(count)
    return block, completed, pairs[block % len(pairs)]


def new_batch(games, keys, update):
    block, completed, pair = position(games, len(keys))
    if completed:
        raise ValueError('A new batch must start at its boundary')
    return {'block': block, 'cycle': block // len(matchups(len(keys))) + 1,
            'decks': list(pair), 'deckKeys': [keys[i] for i in pair], 'mirror': pair[0] == pair[1],
            'startedAtUtc': utc(), 'startUpdate': update,
            'completed': 0, 'winsA': 0, 'winsB': 0, 'draws': 0, 'cutoffs': 0,
            'seatCounts': [0, 0]}


def record_result(batch, result):
    if sorted(result['decks']) != sorted(batch['decks']):
        raise ValueError('Result belongs to another matchup')
    if result['outcome'] != 'terminal':
        batch['cutoffs'] += 1
        return False
    batch['completed'] += 1
    batch['seatCounts'][result.get('orientation', int(result['decks'][0] != batch['decks'][0]))] += 1
    if result['winner'] is None:
        batch['draws'] += 1
    elif batch['mirror']:
        # Mirrors contribute training data, but never a deck-vs-itself win rate.
        pass
    else:
        winner = result['decks'][result['winner']]
        batch['winsA' if winner == batch['decks'][0] else 'winsB'] += 1
    return True


def summary(batch):
    result = dict(batch)
    n = batch['completed']
    if not batch['mirror'] and n:
        result.update(winRateA=batch['winsA'] / n, winRateB=batch['winsB'] / n,
                      drawRate=batch['draws'] / n,
                      scoreRateA=(batch['winsA'] + .5 * batch['draws']) / n)
    return result


def comparison_row(report, recent):
    if report['mirror']:
        raise ValueError('Mirrors have no deck win-rate comparison')
    row = {key: report[key] for key in ('block', 'cycle', 'deckKeys', 'completed',
           'winsA', 'winsB', 'draws', 'cutoffs', 'winRateA', 'winRateB', 'scoreRateA')}
    row.update(file=f'batches/{report["block"]:08d}.json', modelSha256=report['model']['sha256'],
               anchorByDeck=report['evaluation']['byDeckIndex'])
    previous = next((entry for entry in reversed(recent)
                     if entry['deckKeys'] == report['deckKeys']), None)
    if previous:
        row['changeSincePrevious'] = {
            'previousBlock': previous['block'],
            'winRateAPoints': 100 * (row['winRateA'] - previous['winRateA']),
            'anchorWinRatePoints': {
                deck: 100 * (score['winRate'] - previous['anchorByDeck'][deck]['winRate'])
                for deck, score in row['anchorByDeck'].items()}}
    return row
