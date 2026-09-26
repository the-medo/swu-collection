import json
from pathlib import Path
import random
import tempfile
import time
import unittest
import numpy as np
import torch
from disk_monitor import DiskMonitor
from engine import Engine
from expand_policy import columns, expand_state
from full_model import FullPolicy, compact, frozen_copy, load_frozen, pack
from league_artifacts import checked_bytes, publish, restore, save_checkpoint
from league_schedule import comparison_row, matchups, new_batch, position, record_result, summary
from resource_budget import ArtifactBudget, HEADROOM


class ScheduleTests(unittest.TestCase):
    def test_complete_rotation_and_boundaries(self):
        pairs = matchups()
        self.assertEqual(len(pairs), 21)
        self.assertEqual(set(pairs), {(a, b) for a in range(6) for b in range(a, 6)})
        for block in range(43):
            self.assertEqual(position(block * 1000 + 999), (block, 999, pairs[block % 21]))
            self.assertEqual(new_batch(block * 1000, list('abcdef'), 0)['cycle'], block // 21 + 1)
        with self.assertRaises(ValueError):
            new_batch(999, list('abcdef'), 0)

    def test_normalized_wins_draws_cutoffs_and_mirror_exclusion(self):
        batch = new_batch(0, list('abcdef'), 0)
        for decks, winner, outcome in [([0, 5], 0, 'terminal'), ([5, 0], 1, 'terminal'),
                                       ([5, 0], 0, 'terminal'), ([0, 5], None, 'terminal'),
                                       ([0, 5], None, 'cutoff')]:
            record_result(batch, {'decks': decks, 'winner': winner, 'outcome': outcome})
        score = summary(batch)
        self.assertEqual([score[k] for k in ('completed', 'winsA', 'winsB', 'draws', 'cutoffs')], [4, 2, 1, 1, 1])
        self.assertEqual(score['winRateA'], .5)
        self.assertEqual(score['scoreRateA'], .625)
        self.assertEqual(score['seatCounts'], [2, 2])
        mirror = new_batch(matchups().index((0, 0)) * 1000, list('abcdef'), 0)
        record_result(mirror, {'decks': [0, 0], 'winner': 0, 'outcome': 'terminal', 'orientation': 1})
        self.assertNotIn('winRateA', summary(mirror))
        self.assertEqual(mirror['seatCounts'], [0, 1])

    def test_comparisons_use_previous_same_pair_and_percentage_points(self):
        report = summary(new_batch(0, list('abcdef'), 0))
        report.update(completed=1000, winsA=600, winsB=400, winRateA=.6, winRateB=.4,
                      scoreRateA=.6, model={'sha256': 'model'},
                      evaluation={'byDeckIndex': {'0': {'winRate': .7}, '5': {'winRate': .4}}})
        first = comparison_row(report, [])
        self.assertNotIn('changeSincePrevious', first)
        report.update(block=21, cycle=2, winRateA=.65, winsA=650)
        report['evaluation'] = {'byDeckIndex': {'0': {'winRate': .8}, '5': {'winRate': .35}}}
        other = {**first, 'deckKeys': ['x', 'y']}
        change = comparison_row(report, [first, other])['changeSincePrevious']
        self.assertEqual(change['previousBlock'], 0)
        self.assertAlmostEqual(change['winRateAPoints'], 5)
        self.assertAlmostEqual(change['anchorWinRatePoints']['0'], 10)
        self.assertAlmostEqual(change['anchorWinRatePoints']['5'], -5)
        with self.assertRaises(ValueError):
            comparison_row({**report, 'mirror': True}, [])

    def test_training_jobs_balance_seats_and_both_learners(self):
        from league_train import training_jobs
        state = {'seed': 42, 'attempts': 0, 'batch': new_batch(0, list('abcdef'), 0)}
        jobs = training_jobs(state, ['opponent'], 1000)
        self.assertEqual(sum(j['decks'] == [0, 5] for j in jobs), 500)
        past = [j for j in jobs if j['mode'] == 'past']
        self.assertEqual(len(past), 250)
        self.assertEqual({j['learner'] for j in past}, {0, 1})
        self.assertTrue(all(j['limit'] is None for j in jobs))
        self.assertEqual(len({j['seed'] for j in jobs}), 1000)

    def test_result_accounting_follows_focused_rotation_and_deck_order(self):
        from league_train import focused_batch, training_jobs, record_training_result
        # Cover Krennic's first reversed pair, the previously crashing Vader
        # rotation, every other leader, mirrors, and an expanded roster.
        for count, indices in [(6, [i]) for i in range(6)] + [(7, [2, 6]), (6, None)]:
            keys = [str(i) for i in range(count)]
            pairs = count * len(indices) if indices else len(matchups(count))
            state = {'seed':42, 'attempts':0, 'games':0, 'cutoffs':0,
                     **({'focusLeader':'test'} if indices else {})}
            for block in range(pairs * 2):
                batch = focused_batch(block*1000, keys, 0, indices)
                state['batch'] = batch
                jobs = training_jobs(state, ['frozen'], 8)
                # A wins in both seat orientations, plus a draw and cutoff.
                for i, job in enumerate(jobs):
                    winner = job['decks'].index(batch['decks'][0]) if i < 6 else None
                    record_training_result(state, {**job, 'winner':winner,
                        'outcome':'terminal' if i < 7 else 'cutoff'})
                self.assertEqual(batch['completed'],7)
                self.assertEqual(batch['cutoffs'],1)
                self.assertEqual(batch['winsA'],0 if batch['mirror'] else 6)
                self.assertEqual(batch['winsB'],0)
                self.assertEqual(batch['draws'],1)
                for mode_batch in batch['byMode'].values():
                    for field in ('decks','deckKeys','mirror','block','cycle'):
                        self.assertEqual(mode_batch[field],batch[field])
                    self.assertNotIn('byMode',mode_batch)
                for field in ('completed','winsA','winsB','draws','cutoffs'):
                    self.assertEqual(sum(b[field] for b in batch['byMode'].values()),batch[field])
                self.assertEqual(state['games'],(block+1)*7)
                self.assertEqual(state['attempts'],(block+1)*8)


class ArtifactTests(unittest.TestCase):
    def test_expand_preserves_existing_real_observations_and_predictions(self):
        with Engine(bridge='play/ai/full-game/bridge.ts') as old, Engine(
                bridge='play/ai/full-game/bridge.ts', bridge_args=('--league',)) as new:
            old_policy, new_policy = FullPolicy(old.contract), FullPolicy(new.contract)
            mapping = columns(old.contract['encoding'], new.contract['encoding'])
            new_policy.load_state_dict(expand_state(old_policy.state_dict(), new_policy.state_dict(), mapping))
            for orientation in range(2):
                a = old.request('reset', seed=92, orientation=orientation, limit=100)
                b = new.request('reset', seed=92, decks=[0, 3][::(-1 if orientation else 1)], limit=100)
                for _ in range(20):
                    x, y = compact(a['observation'], old.contract), compact(b['observation'], new.contract)
                    np.testing.assert_array_equal(x['context'], y['context'][mapping['context_net.0.weight']])
                    np.testing.assert_array_equal(x['candidates'], y['candidates'][:, mapping['candidate_net.0.weight']])
                    with torch.inference_mode():
                        p, v = old_policy(*pack([x]))
                        q, w = new_policy(*pack([y]))
                    torch.testing.assert_close(p[0], q[0], rtol=1e-5, atol=1e-7)
                    torch.testing.assert_close(v, w, rtol=1e-5, atol=1e-7)
                    a = {**a, **old.request('reference', generation=a['generation'], ticket=a['observation']['ticket'])}
                    b = {**b, **new.request('reference', generation=b['generation'], ticket=b['observation']['ticket'])}

                old.request('truncate', generation=a['generation'])
                new.request('truncate', generation=b['generation'])

    def test_checkpoint_recovery_rng_optimizer_and_immutable_exports(self):
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / 'run'
            contract = {'encoding': {'contextSize': 3, 'candidateSize': 2}}
            policy = FullPolicy(contract)
            optimizer = torch.optim.Adam(policy.parameters(), lr=.003)
            probe = {'context': np.zeros(3, dtype=np.float32), 'candidates': np.zeros((2, 2), dtype=np.float32)}
            scores, value = policy(*pack([probe]))
            (scores[0].sum() + value.sum()).backward()
            optimizer.step()
            opponents = [frozen_copy(policy)]
            state = {'games': 18, 'updates': 1, 'initialization': {}}
            budget = ArtifactBudget(tmp)
            try:
                first = save_checkpoint(budget, output, contract, policy, optimizer, opponents, state, probe)
                expected_torch, expected_python = torch.rand(3), random.random()
                before = {k: v.clone() for k, v in policy.state_dict().items()}
                original_optimizer = optimizer.state_dict()
                model = publish(budget, output, contract, policy, state)
                original_bytes = checked_bytes(output, model)
                with torch.no_grad():
                    next(policy.parameters()).add_(1)
                state = {**state, 'games': 36, 'updates': 2}
                second = save_checkpoint(budget, output, contract, policy, optimizer, opponents, state, probe)
                (output / second['file']).write_bytes(b'corrupt')
                saved, restored_opponents, selected = restore(output, contract, policy, optimizer)
                self.assertEqual(selected, first)
                self.assertEqual(saved['games'], 18)
                torch.testing.assert_close(torch.rand(3), expected_torch, rtol=0, atol=0)
                self.assertEqual(random.random(), expected_python)
                for key, value in before.items():
                    torch.testing.assert_close(policy.state_dict()[key], value, rtol=0, atol=0)
                for key, item in original_optimizer['state'].items():
                    for field, value in item.items():
                        torch.testing.assert_close(optimizer.state_dict()['state'][key][field], value, rtol=0, atol=0)
                self.assertTrue(all(not p.requires_grad for p in restored_opponents[0].parameters()))
                # Recovery pointer repair protects the only good slot on the next save.
                budget.json(output / 'checkpoints.json', {'current': selected, 'previous': None})
                third = save_checkpoint(budget, output, contract, policy, optimizer, opponents, saved, probe)
                self.assertEqual(third['file'], second['file'])
                self.assertEqual(checked_bytes(output, model), original_bytes)
                frozen = load_frozen(output / model['file'], contract)
                torch.testing.assert_close(frozen(*pack([probe]))[1], policy(*pack([probe]))[1])
                (output / first['file']).write_bytes(b'bad')
                (output / third['file']).write_bytes(b'bad')
                with self.assertRaisesRegex(ValueError, 'No valid recoverable'):
                    restore(output, contract, policy, optimizer)
            finally:
                budget.close()

    def test_independent_disk_timer_stops_and_reserves_final_status(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            budget = ArtifactBudget(root)
            monitor = DiskMonitor(budget, root / 'disk.json', interval=.025).start()
            try:
                initial = json.loads((root / 'disk.json').read_text())['checkedAtUtc']
                deadline = time.monotonic() + 3
                while monitor.report['checkedAtUtc'] == initial and time.monotonic() < deadline:
                    time.sleep(.01)
                self.assertNotEqual(monitor.report['checkedAtUtc'], initial)
                budget.limit = budget.usage() + HEADROOM - 1
                self.assertTrue(monitor.failed.wait(3))
                monitor.close()
                self.assertEqual(json.loads((root / 'disk.json').read_text())['status'], 'stop-required')
                budget.emergency_json(root / 'failure.json', {'error': 'disk exhausted'})
                budget.limit = budget.usage()
                with self.assertRaises(RuntimeError):
                    budget.emergency_json(root / 'failure.json', {'error': 'cannot overwrite'})
                self.assertEqual(json.loads((root / 'failure.json').read_text())['error'], 'disk exhausted')
            finally:
                monitor.close()
                budget.close()


if __name__ == '__main__':
    torch.set_num_threads(1)
    unittest.main()
