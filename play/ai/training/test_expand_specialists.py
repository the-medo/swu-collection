import copy
import json
import subprocess
import tempfile
from pathlib import Path
import unittest
import numpy as np
import torch
from engine import Engine, ROOT
from full_model import make_policy, compact, pack, act, load_frozen
from full_train import optimize
from specialist_model import ARCHITECTURE, EXPANDABLE_ARCHITECTURE
from expand_specialists import expand_policy, feature_columns
from parallel import Collector
from league_schedule import matchups, new_batch
from league_artifacts import publish, checked_bytes
from resource_budget import ArtifactBudget


class ExpansionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        torch.set_num_threads(1)
        cls.fixtures = json.loads(subprocess.check_output(['bun', 'play/testing/ai/roster-fixtures.ts'], cwd=ROOT))
        cls.temp = tempfile.TemporaryDirectory(dir=ROOT / '.swubase/crossfire-ai', prefix='expand-tests-')
        cls.root = Path(cls.temp.name)
        for name in ('seven', 'eight'):
            (cls.root / f'{name}.json').write_text(json.dumps(cls.fixtures[name]))
        with Engine(bridge='play/ai/full-game/bridge.ts', bridge_args=('--league',)) as engine:
            cls.old_contract = engine.contract
        with Engine(bridge='play/ai/full-game/bridge.ts', bridge_args=('--roster', str(cls.root / 'seven.json'))) as engine:
            cls.seven = engine.contract
        with Engine(bridge='play/ai/full-game/bridge.ts', bridge_args=('--roster', str(cls.root / 'eight.json'))) as engine:
            cls.eight = engine.contract

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def test_transfer_preserves_real_old_predictions_and_anchor_with_added_vocabulary(self):
        for architecture in (ARCHITECTURE, 'context-candidate-ppo-v1'):
            source = make_policy(self.old_contract, architecture)
            with Engine(bridge='play/ai/full-game/bridge.ts', bridge_args=('--league',)) as old, \
                 Engine(bridge='play/ai/full-game/bridge.ts', bridge_args=('--roster', str(self.root / 'eight.json'))) as new:
                # Non-default learned weights, not just an unchanged initialization.
                first = compact(old.request('reset', seed=5, decks=[0, 5], limit=50)['observation'], self.old_contract)
                a, log, value = act(source, first)
                optimize(source, torch.optim.Adam(source.parameters(), lr=.003), [
                    {**first, 'action': a, 'log_prob': log, 'value': value, 'return': 1.0}], imitation=True)
                old.request('truncate', generation=1)
                expanded = expand_policy(source, self.old_contract, self.eight)
                self.assertGreater(expanded.context_size, source.context_size)
                for pair in ([0, 5], [1, 2], [3, 4]):
                    old_obs = old.request('reset', seed=51, decks=pair, limit=50, autoForced=True)
                    new_obs = new.request('reset', seed=51, decks=pair, limit=50, autoForced=True)
                    old_generation, new_generation = old_obs['generation'], new_obs['generation']
                    for _ in range(8):
                        if old_obs['observation']['done']: break
                        a = compact(old_obs['observation'], self.old_contract)
                        b = compact(new_obs['observation'], self.eight)
                        with torch.inference_mode():
                            sa, va = source(*pack([a])); sb, vb = expanded(*pack([b]))
                        torch.testing.assert_close(sa[0], sb[0], rtol=1e-5, atol=1e-6)
                        torch.testing.assert_close(va, vb, rtol=1e-5, atol=1e-6)
                        choice = int(sa[0].argmax())
                        old_obs = old.request('step', generation=old_generation, ticket=old_obs['observation']['ticket'], action=choice)
                        new_obs = new.request('step', generation=new_generation, ticket=new_obs['observation']['ticket'], action=choice)
                    old.request('truncate', generation=old_generation)
                    new.request('truncate', generation=new_generation)

    def test_same_leader_different_lists_route_to_user_assigned_archetypes(self):
        model = make_policy(self.eight, EXPANDABLE_ARCHITECTURE)
        contexts = torch.zeros((2, model.context_size))
        contexts[:, model.leader_columns[0]] = 1
        contexts[0, model.own_deck_start] = 1
        contexts[1, model.own_deck_start + 7] = 1
        self.assertEqual(model.routes(contexts).tolist(), [0, 0])
        self.assertEqual(model.list_routes(contexts).tolist(), [0, 7])
        weights = model.strategy_weights(model.context_net(contexts), model.routes(contexts), contexts)
        self.assertEqual(weights[0].tolist(), [1, 0, 0, 0, 0])
        self.assertEqual(weights[1].tolist(), [0, 0, 1, 0, 0])
        self.assertEqual(model.learning_counts(contexts)['leader:greef'], 2)
        self.assertEqual(model.learning_counts(contexts)['strategy:control'], 1)

    def test_repeat_expansion_retains_learned_own_list_columns_and_rejects_relabeling(self):
        source = make_policy(self.seven, EXPANDABLE_ARCHITECTURE)
        target = expand_policy(source, self.seven, self.eight)
        columns = feature_columns(self.seven['encoding'], self.eight['encoding'])
        torch.testing.assert_close(target.context_net[0].weight[:, columns['context_net.0.weight']], source.context_net[0].weight)
        bad = copy.deepcopy(self.eight)
        bad['specialists']['decks'][0]['strategies'] = ['control']
        with self.assertRaisesRegex(ValueError, 'archetypes'):
            expand_policy(source, self.seven, bad)
        bad = copy.deepcopy(self.eight)
        bad['decks'][0]['hash'] = 'changed'
        with self.assertRaisesRegex(ValueError, 'snapshots'):
            expand_policy(source, self.seven, bad)

    def test_dynamic_games_learn_new_leader_export_and_replay(self):
        with Collector(2, roster=self.root / 'eight.json') as collector:
            policy = make_policy(collector.contract, EXPANDABLE_ARCHITECTURE)
            results = collector.collect(policy, [
                {'seed': 35+i, 'decks': pair, 'learner': 0, 'mode': 'self', 'replay': True, 'limit': 1000}
                for i, pair in enumerate(([6, 0], [0, 6], [7, 5]))])
            self.assertTrue(all(r['replayChecked'] and r['outcome'] == 'terminal' for _, r in results))
            rows = [row for episode, _ in results for row in episode]
            before = copy.deepcopy(policy.leaders['dooku'].state_dict())
            optimize(policy, torch.optim.Adam(policy.parameters(), lr=.001), rows)
            self.assertTrue(any(not torch.equal(before[k], v) for k, v in policy.leaders['dooku'].state_dict().items()))
            budget = ArtifactBudget(self.root)
            try:
                model = publish(budget, self.root / 'exports', self.eight, policy, {'games': 3, 'updates': 1, 'initialization': {'kind': 'expanded-specialists'}})
                checked_bytes(self.root / 'exports', model)
                frozen = load_frozen(self.root / 'exports' / model['file'], self.eight)
                self.assertEqual(act(frozen, rows[0], greedy=True), act(policy, rows[0], greedy=True))
            finally: budget.close()

    def test_round_robin_covers_every_new_pair_and_mirror(self):
        for count in (2, 6, 7, 8, 11, 32):
            pairs = matchups(count)
            self.assertEqual(len(pairs), count * (count + 1) // 2)
            self.assertEqual(set(pairs), {(a, b) for a in range(count) for b in range(a, count)})
            batch = new_batch(len(pairs) * 1000, [str(i) for i in range(count)], 0)
            self.assertEqual(batch['cycle'], 2)


if __name__ == '__main__':
    unittest.main()
