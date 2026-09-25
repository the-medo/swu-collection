import copy
import json
from pathlib import Path
import random
import tempfile
import unittest
from argparse import Namespace
from unittest.mock import patch

import numpy as np
import torch
from engine import Engine, ROOT
from full_model import act, compact, frozen_copy, load_frozen, make_policy, pack
from full_train import optimize
from league_artifacts import checked_bytes, publish, restore, save_checkpoint
from parallel import Collector
from resource_budget import ArtifactBudget
from specialist_model import ARCHITECTURE, ROSTER, SpecialistPolicy


class SpecialistTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        torch.set_num_threads(1)
        with Engine(bridge='play/ai/full-game/bridge.ts', bridge_args=('--league',)) as engine:
            cls.contract = engine.contract

    def observation(self, leader, candidates=3):
        context = np.zeros(self.contract['encoding']['contextSize'], dtype=np.float32)
        if leader is not None:
            identity = self.contract['encoding']['vocabulary'].index(ROSTER['leaders'][leader]['cardId']) + 1
            context[76 + identity] = 1
        return {'context': context, 'candidates': np.random.default_rng(51).normal(
            size=(candidates, self.contract['encoding']['candidateSize'])).astype(np.float32)}

    def test_routes_match_pinned_leaders_and_only_own_deck(self):
        decks = json.loads((ROOT / 'play/ai/full-game/league-decks.json').read_text())['decks']
        self.assertEqual([d['snapshot']['leader'] for d in decks], [d['cardId'] for d in ROSTER['leaders']])
        model = SpecialistPolicy(self.contract)
        inputs = [self.observation(i) for i in range(6)] + [self.observation(None)]
        context, _, _ = pack(inputs)
        self.assertEqual(model.routes(context).tolist(), list(range(7)))
        context[:, 76 + len(self.contract['encoding']['vocabulary']) + 1:] = torch.randn_like(
            context[:, 76 + len(self.contract['encoding']['vocabulary']) + 1:])
        self.assertEqual(model.routes(context).tolist(), list(range(7)))
        weights = model.strategy_weights(model.context_net(context), model.routes(context))
        torch.testing.assert_close(weights.sum(-1), torch.ones(7))
        self.assertEqual(weights[5, 0].item(), 0)  # Krennic cannot silently become the aggro expert.
        self.assertGreater(weights[5, 2].item(), 0)
        self.assertGreater(weights[5, 4].item(), 0)

    def test_batch_and_candidate_order_invariance_and_value_parity(self):
        model = SpecialistPolicy(self.contract).eval()
        observations = [self.observation(5), self.observation(1, 5), self.observation(0)]
        with torch.inference_mode():
            scores, values = model(*pack(observations))
            torch.testing.assert_close(values, model.value(pack(observations)[0]))
            for i, observation in enumerate(observations):
                reversed_observation = {**observation, 'candidates': observation['candidates'][::-1].copy()}
                actual, value = model(*pack([reversed_observation]))
                torch.testing.assert_close(actual[0].flip(0), scores[i], atol=1e-6, rtol=1e-5)
                torch.testing.assert_close(value[0], values[i], atol=1e-6, rtol=1e-5)

    def test_matchup_receives_explicit_visible_opponent_features(self):
        model = SpecialistPolicy(self.contract)
        contexts, candidates, lengths = pack([self.observation(5)])
        width = len(self.contract['encoding']['vocabulary']) + 1
        contexts[:, 47:76] = torch.arange(29) / 29
        contexts[:, 76 + width * 8:76 + width * 15] = torch.arange(width * 7) / (width * 7)
        received = []
        handle = model.matchup.register_forward_pre_hook(lambda _, args: received.append(args[0].detach().clone()))
        try:
            model(contexts, candidates, lengths)
            expected = torch.cat((contexts[:, 47:76], contexts[:, 76 + width * 8:76 + width * 15]), -1)
            torch.testing.assert_close(received[0][:, 96:], expected)
            # Own hand/board and semantic memory must not be mistaken for the
            # explicit opponent slice; they still inform the shared encoder.
            contexts[:, 76 + width:76 + width * 8] = 2
            contexts[:, 76 + width * 15:] = 3
            model(contexts, candidates, lengths)
            torch.testing.assert_close(received[1][:, 96:], expected)
            self.assertEqual(model.routes(contexts).tolist(), [5])
        finally:
            handle.remove()

    def test_duplicate_leader_identities_rejected(self):
        roster = copy.deepcopy(ROSTER)
        roster['leaders'][1]['cardId'] = roster['leaders'][0]['cardId']
        with patch('specialist_model.ROSTER', roster), self.assertRaisesRegex(ValueError, 'Duplicate'):
            SpecialistPolicy(self.contract)

    def test_wrong_resume_architecture_preserves_archive_before_opening_workers(self):
        import league_train
        for specialists, actual in [(True, 'context-candidate-ppo-v1'), (False, ARCHITECTURE)]:
            with self.subTest(specialists=specialists), tempfile.TemporaryDirectory() as temp:
                root = Path(temp)
                output = root / '.swubase/crossfire-ai/run'
                output.mkdir(parents=True)
                (output / 'status.json').write_text('{"status":"stopped","games":1200000}')
                (output / 'latest-model.json').write_text(json.dumps({'architecture': actual}))
                before = {p.name: p.read_bytes() for p in output.iterdir()}
                args = Namespace(seed=51, output=str(output), specialists=specialists, resume=True,
                                 initialize_from=None, baseline_run=None, prepare_only=False, workers=1)
                with patch.object(league_train, 'ROOT', root), patch.object(league_train, 'Collector') as collector, \
                        patch.object(torch, 'set_num_interop_threads'), patch.object(league_train.signal, 'signal'):
                    with self.assertRaisesRegex(ValueError, 'matching --specialists'):
                        league_train.run(args)
                    collector.assert_not_called()
                self.assertEqual(before, {p.name: p.read_bytes() for p in output.iterdir()})

    def test_invalid_resume_seed_preserves_status_and_checkpoint_manifest(self):
        import league_train
        from league_schedule import SCHEDULE_VERSION
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            output = root / '.swubase/crossfire-ai/run'
            output.mkdir(parents=True)
            (output / 'status.json').write_text('{"status":"ready","games":0}')
            (output / 'checkpoints.json').write_text('{"current":"existing"}')
            before = {p.name: p.read_bytes() for p in output.iterdir()}
            args = Namespace(seed=51, output=str(output), specialists=True, resume=True,
                             initialize_from=None, baseline_run=None, prepare_only=False, workers=1)
            with patch.object(league_train, 'ROOT', root), patch.object(league_train, 'Collector') as collector, \
                    patch.object(torch, 'set_num_interop_threads'), patch.object(league_train.signal, 'signal'), \
                    patch.object(league_train, 'restore', return_value=({'seed': 52, 'schedule': SCHEDULE_VERSION}, [], {})):
                collector.return_value.__enter__.return_value.contract = self.contract
                with self.assertRaisesRegex(ValueError, 'seed mismatch'):
                    league_train.run(args)
            self.assertEqual(before, {name: (output / name).read_bytes() for name in before})
            self.assertFalse((output / 'failure.json').exists())

    def test_learning_updates_active_specialists_scorer_and_router_not_inactive_momentum(self):
        torch.manual_seed(8)
        model = SpecialistPolicy(self.contract)
        optimizer = torch.optim.Adam(model.parameters(), lr=.003)
        def learn(leader):
            observation = self.observation(leader)
            action, log_prob, value = act(model, observation)
            row = {**observation, 'action': action, 'log_prob': log_prob, 'value': value, 'return': 1.0}
            # Demonstration objective also checks the future replay-learning seam.
            optimize(model, optimizer, [row], imitation=True)
        learn(0)  # Establish momentum for Greef/aggro before switching to Krennic.
        before = {key: value.clone() for key, value in model.state_dict().items()}
        learn(5)
        changed = [key for key, value in model.state_dict().items() if not torch.equal(before[key], value)]
        for prefix in ('context_net.', 'leaders.krennic.', 'strategies.ramp.', 'strategies.control.',
                       'router.', 'matchup.', 'scorer.', 'leader_values.krennic.'):
            self.assertTrue(any(k.startswith(prefix) for k in changed), prefix)
        for prefix in ('leaders.greef.', 'leader_values.greef.', 'strategies.aggro.', 'strategies.space-aggro.'):
            self.assertFalse(any(k.startswith(prefix) for k in changed), prefix)
        self.assertEqual(model.learning_counts(pack([self.observation(5)])[0])['leader:krennic'], 1)
        self.assertEqual(model.learning_counts(pack([self.observation(5)])[0])['strategy:aggro'], 0)

    def test_frozen_exports_contract_rejection_and_checkpoint_recovery(self):
        with tempfile.TemporaryDirectory() as temp:
            run = Path(temp) / 'run'
            budget = ArtifactBudget(temp)
            try:
                model = make_policy(self.contract, ARCHITECTURE)
                optimizer = torch.optim.Adam(model.parameters(), lr=.001)
                probe = self.observation(5)
                state = {'games': 0, 'updates': 0, 'initialization': {'kind': 'fresh-specialists'}}
                first = save_checkpoint(budget, run, self.contract, model, optimizer, [frozen_copy(model)], state, probe)
                expected_random = torch.rand(2)
                expected_python = random.random()
                exported = publish(budget, run, self.contract, model, state)
                original = checked_bytes(run, exported)
                loaded = load_frozen(run / exported['file'], self.contract)
                self.assertEqual(loaded.architecture, ARCHITECTURE)
                self.assertFalse(any(p.requires_grad for p in loaded.parameters()))
                self.assertEqual(act(model, probe, greedy=True), act(loaded, probe, greedy=True))
                info = exported['system']
                self.assertFalse(info['baselineWeightsImported'])
                self.assertEqual(sum(c['parameters'] for c in info['components']), exported['parameters'])
                second = save_checkpoint(budget, run, self.contract, model, optimizer, [frozen_copy(model)],
                                         {**state, 'games': 2}, probe)
                (run / second['file']).write_bytes(b'broken')
                restored, opponents, recovered = restore(run, self.contract, model, optimizer)
                self.assertEqual(recovered, first)
                self.assertEqual(restored['games'], 0)
                self.assertEqual(opponents[0].architecture, ARCHITECTURE)
                torch.testing.assert_close(torch.rand(2), expected_random, rtol=0, atol=0)
                self.assertEqual(random.random(), expected_python)
                self.assertEqual(checked_bytes(run, exported), original)
                bad = torch.load(run / exported['file'], weights_only=True)
                bad['policySpec']['roster']['leaders'][5]['strategies'] = ['aggro']
                torch.save(bad, run / 'bad.pt')
                with self.assertRaisesRegex(ValueError, 'routing contract'):
                    load_frozen(run / 'bad.pt', self.contract)
                legacy = make_policy(self.contract)
                with self.assertRaisesRegex(ValueError, 'No valid recoverable'):
                    restore(run, self.contract, legacy, torch.optim.Adam(legacy.parameters()))
            finally:
                budget.close()

    def test_real_six_deck_games_updates_and_legacy_opponent(self):
        with Collector(3, league=True) as collector:
            model = SpecialistPolicy(collector.contract)
            baseline = frozen_copy(make_policy(collector.contract))
            jobs = [{'seed': 69000 + i, 'decks': [i, (i + 1) % 6], 'orientation': 0,
                     'learner': 0, 'mode': 'self', 'replay': True, 'limit': 1500} for i in range(6)]
            jobs += [{'seed': 69100 + i, 'decks': [5, 1][::(-1 if i else 1)],
                      'orientation': i, 'learner': i, 'mode': 'past', 'opponent': baseline,
                      'replay': True, 'limit': 1500} for i in range(2)]
            results = collector.collect(model, jobs)
            self.assertTrue(all(result['outcome'] == 'terminal' and result['replayChecked'] for _, result in results))
            rows = [row for game_rows, _ in results for row in game_rows]
            counts = model.learning_counts(pack(rows)[0])
            self.assertTrue(all(counts[f'leader:{d["key"]}'] > 0 for d in ROSTER['leaders']))
            before = copy.deepcopy(model.state_dict())
            metrics = optimize(model, torch.optim.Adam(model.parameters(), lr=.0003), rows)
            self.assertEqual(metrics['decisions'], len(rows))
            self.assertTrue(any(not torch.equal(before[k], v) for k, v in model.state_dict().items()))
            self.assertTrue(all(torch.isfinite(p).all() for p in model.parameters()))


if __name__ == '__main__':
    unittest.main()
