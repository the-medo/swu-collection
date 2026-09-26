"""Rotation invariants independent of thousands of stochastic full games."""
import copy
import tempfile
import unittest
from unittest.mock import Mock
from pathlib import Path
from types import SimpleNamespace
import numpy as np
import torch
from engine import Engine
from full_model import make_policy
from practice_training import warmup
from resource_budget import ArtifactBudget
from rotation_train import (LEARNERS, OPPONENTS, Rotation, evaluation_job, new_meta,
                            new_state, record_training, training_jobs)


class TinyPolicy(torch.nn.Module):
    def __init__(self):
        super().__init__(); self.weight = torch.nn.Parameter(torch.tensor(0.0))
        self.critic = torch.nn.Parameter(torch.tensor(3.0))
    def forward(self, contexts, candidates, lengths):
        return list((candidates[:, 0] * self.weight).split(lengths.tolist())), self.critic.expand(len(contexts))
    def learning_counts(self, contexts):
        return {'scorer': len(contexts), 'value': len(contexts)}


class RotationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        torch.set_num_threads(1)
        with Engine(bridge='play/ai/practice/rotation-bridge.ts') as engine:
            cls.contract = engine.contract

    def state(self):
        state = new_state({'hash': 'a' * 64}, 17)
        obj = Rotation.__new__(Rotation); obj.state = state; obj.contract = self.contract
        state['turnOpponents'] = {key: {'sha256': str(i) * 64} for i, key in enumerate(LEARNERS)}
        obj.begin_batch()
        return state

    def result(self, job, outcome='terminal', winner=None):
        return {k: job[k] for k in ('decks', 'learner', 'orientation')} | {'outcome': outcome, 'winner': winner}

    def test_all_eight_opponents_use_the_supplied_frozen_bundle_and_both_seats(self):
        state = self.state()
        for opponent_index in range(8):
            state['opponentIndex'] = opponent_index
            obj = Rotation.__new__(Rotation); obj.state = state; obj.contract = self.contract; obj.begin_batch()
            opponent = object()
            while state['batch']['completed'] < 1000:
                jobs = training_jobs(state, self.contract, opponent, 18)
                for job in jobs:
                    self.assertIs(job['opponent'], opponent)
                    self.assertEqual(job['mode'], 'past')
                    self.assertIsNone(job['limit'])
                    own, other = (self.contract['decks'][i]['key'] for i in job['decks'][::(-1 if job['learner'] else 1)])
                    self.assertEqual((own, other), ('krennic', OPPONENTS[opponent_index]))
                    record_training(state, self.result(job, winner=job['learner']))
            self.assertEqual(state['batch']['seatCounts'], [500, 500])
            self.assertEqual(state['batch']['learnerScore']['wins'], 1000)
        self.assertEqual(state['games'], 8000)
        self.assertEqual(state['decks']['krennic']['games'], 8000)
        self.assertTrue(all(meta['games'] == 0 for key, meta in state['decks'].items() if key != 'krennic'))

    def test_interrupted_windows_resume_without_counting_cutoffs_or_losing_seat_balance(self):
        state = self.state()
        jobs = training_jobs(state, self.contract, object(), 4)
        record_training(state, self.result(jobs[0], outcome='cutoff'))
        record_training(state, self.result(jobs[1], winner=jobs[1]['learner']))
        restored = copy.deepcopy(state)
        self.assertEqual(restored['games'], 1); self.assertEqual(restored['cutoffs'], 1)
        next_jobs = training_jobs(restored, self.contract, object(), 3)
        self.assertEqual([j['learner'] for j in next_jobs], [0, 0, 1])
        self.assertGreater(next_jobs[0]['seed'], jobs[-1]['seed'])

    def test_evaluations_keep_the_same_seed_in_both_seats_and_across_checkpoints(self):
        a = evaluation_job(self.contract, 'krennic', 'vader', 0, object())
        b = evaluation_job(self.contract, 'krennic', 'vader', 1, object())
        self.assertEqual(a['seed'], b['seed']); self.assertEqual(a['decks'], list(reversed(b['decks'])))
        self.assertNotEqual(a['learner'], b['learner'])
        self.assertEqual(a['seed'], evaluation_job(self.contract, 'krennic', 'vader', 0, object())['seed'])

    def test_exact_practice_epochs_ignore_early_agreement_and_never_optimize_heldout(self):
        policy = TinyPolicy(); optimizer = torch.optim.SGD(policy.parameters(), lr=.5)
        row = {'context': np.array([0], dtype=np.float32), 'candidates': np.array([[0], [1]], dtype=np.float32), 'acceptable': [1]}
        cases = [{'family': 'train', 'title': 'train', 'split': 'train', 'rows': [row]},
                 {'family': 'heldout', 'title': 'heldout', 'split': 'heldout', 'rows': [{**row, 'acceptable': [0]}]}]
        initial = warmup(policy, optimizer, cases, epochs=500, early_stopping=False)
        refresh = warmup(policy, optimizer, cases, epochs=50, early_stopping=False)
        self.assertEqual(initial['epochs'], 500); self.assertEqual(refresh['epochs'], 50)
        self.assertEqual(initial['after']['train']['correct'], 1)
        self.assertEqual(initial['after']['heldout']['correct'], 0)
        self.assertEqual(policy.critic.item(), 3.0)
        self.assertNotIn('value', initial['componentTraining'])

    def test_switching_decks_restores_their_own_weights_and_optimizer(self):
        with tempfile.TemporaryDirectory(prefix='rotation-test-') as temp:
            root = Path(temp); budget = ArtifactBudget(root)
            try:
                obj = Rotation.__new__(Rotation)
                obj.budget = budget; obj.output = root / 'run'; obj.contract = self.contract
                obj.state = new_state({'hash': 'a' * 64}, 17); obj.cache = {}
                obj.policy = make_policy(self.contract, 'crossfire-specialists-v2')
                obj.optimizer = torch.optim.Adam(obj.policy.parameters(), lr=.0003)
                p = next(obj.policy.parameters())
                p.square().mean().backward(); obj.optimizer.step()
                original = {k: v.clone() for k, v in obj.policy.state_dict().items()}
                obj.meta['initialEpochs'] = 500
                obj.save_bank()
                obj.switch('vader')
                with torch.no_grad(): next(obj.policy.parameters()).fill_(42)
                obj.save_bank()
                obj.switch('krennic')
                for key, value in original.items(): torch.testing.assert_close(obj.policy.state_dict()[key], value, rtol=0, atol=0)
                self.assertTrue(obj.optimizer.state)
                self.assertEqual(obj.meta['initialEpochs'], 500)
                self.assertNotEqual(obj.state['decks']['krennic']['model']['sha256'], obj.state['decks']['vader']['model']['sha256'])
            finally: budget.close()

    def test_completed_8000_game_turn_evaluates_rehearses_exactly_50_and_advances(self):
        """Exercise the real phase loop with an in-memory completed-game evaluator."""
        obj = Rotation.__new__(Rotation)
        obj.state = self.state(); obj.contract = self.contract
        obj.state.update(games=8000, opponentIndex=7, phase='games')
        obj.meta['games'] = 8000
        for key, meta in obj.state['decks'].items():
            meta['initialEpochs'] = 500
            obj.state['initialReferences'][key] = {'sha256': str(LEARNERS.index(key)) * 64}
        obj.begin_batch()
        obj.state['batch'].update(block=7, completed=1000, seatCounts=[500, 500])
        obj.state['batch']['learnerScore'].update(completed=1000, wins=500, losses=500)
        obj.policy = TinyPolicy(); obj.optimizer = torch.optim.SGD(obj.policy.parameters(), lr=.5)
        row = {'context': np.array([0], dtype=np.float32), 'candidates': np.array([[0], [1]], dtype=np.float32), 'acceptable': [1]}
        obj.by_deck = {'krennic': [{'family': 'practice', 'title': 'Practice', 'split': 'train', 'rows': [row]},
                                 {'family': 'unseen', 'title': 'Held out', 'split': 'heldout', 'rows': [row]}]}
        obj.args = SimpleNamespace(resume=True, prepare_only=False, workers=9)
        obj.output = Path('/unused-test-output'); obj.budget = Mock()
        obj.checkpoint = Mock(); obj.status = Mock(); obj.save_bank = Mock()
        obj.publish = Mock(return_value={'file': 'models/test.pt', 'sha256': 'a' * 64, 'games': 8000, 'updates': 1, 'parameters': 2})
        obj.frozen = lambda manifest: manifest['sha256']
        obj.stopping = lambda: obj.state['turn'] == 1
        obj.monitor = SimpleNamespace(failed=SimpleNamespace(is_set=lambda: False))
        evaluated = []
        def collect(policy, jobs, **options):
            self.assertTrue(options['greedy']); self.assertFalse(options['record_rows'])
            evaluated.extend(copy.deepcopy(jobs))
            return [([], self.result(job, winner=job['learner'])) for job in jobs]
        obj.collector = SimpleNamespace(collect=collect)
        obj.run()
        self.assertEqual(obj.state['turn'], 1)
        self.assertEqual(obj.state['phase'], 'next-turn')
        self.assertEqual(obj.state['games'], 8000)  # Evaluations do not count as training.
        self.assertEqual(obj.state['refreshDone'], 50)
        self.assertEqual(obj.meta['refresherEpochs'], 50)
        self.assertEqual(len(evaluated), 1600)
        self.assertEqual(evaluated[:800], evaluated[800:])  # Identical seeds, seats, opponents.
        self.assertEqual(len(obj.state['history']), 1)
        self.assertEqual(obj.state['history'][0]['before']['benchmark']['completed'], 800)
        self.assertEqual(obj.state['history'][0]['after']['benchmark']['completed'], 800)
        obj.save_bank.assert_called_once()


if __name__ == '__main__': unittest.main()
