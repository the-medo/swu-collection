import copy
import hashlib
import io
import json
import subprocess
import tempfile
import threading
import unittest
import urllib.request
import urllib.error
import uuid
from pathlib import Path
import torch
from engine import Engine, ROOT
from full_model import make_policy, compact, act
from serve import ModelCache, ModelUnavailable, interface_hash, serve
from league_train import training_jobs, focused_batch
from resource_budget import ArtifactBudget
from human_data import data_bridge, split


class ReleasesTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        torch.set_num_threads(1)
        with Engine(bridge='play/ai/full-game/bridge.ts', bridge_args=('--league',)) as engine:
            cls.contract = engine.contract
            cls.observation = engine.request('reset', seed=700, decks=[5,5], limit=1)['observation']
        cls.policy = make_policy(cls.contract, 'crossfire-specialists-v1').eval()
        buffer = io.BytesIO()
        torch.save({'architecture': cls.policy.architecture, 'contract': cls.contract,
                    'policySpec': cls.policy.spec, 'model': cls.policy.state_dict(), 'games': 10, 'updates': 1}, buffer)
        cls.weights = buffer.getvalue()
        cls.release = {'games': 10, 'updates': 1, 'id': str(uuid.uuid4()), 'architecture': cls.policy.architecture,
                       'artifact': {'sha256': hashlib.sha256(cls.weights).hexdigest(), 'bytes': len(cls.weights)},
                       'contract': cls.contract, 'interfaceHash': interface_hash(cls.contract),
                       'leader': cls.policy.roster['leaders'][5],
                       'decks': [{'key': 'krennic', 'archetypes': cls.policy.decks[5]['strategies'], 'hash': cls.contract['decks'][5]['hash']}],
                       'evaluations': [{'versions': cls.contract['versions']}]}

    def request(self):
        return {'releaseId': self.release['id'], 'deckKey': 'krennic', 'versions': self.contract['versions'], 'observation': self.observation}

    def test_frozen_service_matches_training_and_rejects_tampering_wrong_deck_and_uncertified_target(self):
        cache = ModelCache(1)
        cache.load(self.release, self.weights)
        self.assertEqual(cache.choose(self.request())['action'], act(self.policy, compact(self.observation, self.contract), greedy=True)[0])
        with self.assertRaises(ValueError): cache.load(self.release, self.weights + b'bad')
        request = self.request(); request['deckKey'] = 'vader'
        with self.assertRaises(ValueError): cache.choose(request)
        request = self.request(); request['versions'] = {**self.contract['versions'], 'engine': '99.0.0'}
        with self.assertRaises(ValueError): cache.choose(request)
        renamed = {**self.release, 'id': str(uuid.uuid4())}; cache.load(renamed, self.weights)
        with self.assertRaises(ModelUnavailable): cache.choose(self.request())

    def test_same_frozen_weights_run_replay_verified_games_on_two_retained_engine_targets(self):
        from parallel import Collector
        baseline = subprocess.check_output(['bun', '-e', "import {DEVELOPMENT_BASELINE_PIN} from './play/cards/catalog.ts'; console.log(DEVELOPMENT_BASELINE_PIN)"], cwd=ROOT, text=True).strip()
        targets = [self.contract['versions'], {**self.contract['versions'], 'engine': '1.0.0', 'cards': baseline}]
        for target in targets:
            with Collector(1, league=True, target=target) as collector:
                self.assertEqual(interface_hash(collector.contract), interface_hash(self.contract))
                result = collector.collect(self.policy, [{'seed': 811, 'decks': [5,1], 'learner': 0,
                    'mode': 'reference', 'limit': 2500, 'replay': True}], greedy=True, record_rows=False)[0][1]
                self.assertEqual(result['outcome'], 'terminal')
                self.assertTrue(result['replayChecked'])

    def test_private_http_service_requires_authentication(self):
        server = serve('127.0.0.1', 0, 'private-token-' * 4)
        thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
        try:
            request = urllib.request.Request(f'http://127.0.0.1:{server.server_port}/choose', data=b'{}', method='POST')
            with self.assertRaises(urllib.error.HTTPError) as error: urllib.request.urlopen(request)
            self.assertEqual(error.exception.code, 403)
        finally:
            server.shutdown(); server.server_close(); thread.join()

    def test_resident_loads_and_choices_continue_during_a_cold_load_and_cold_loads_deduplicate(self):
        import base64
        import concurrent.futures
        from unittest.mock import patch
        cache = ModelCache()
        cache.load(self.release, self.weights)
        entered, unblock = threading.Event(), threading.Event()
        original = torch.load
        def slow_load(*args, **kwargs):
            entered.set()
            if not unblock.wait(5): raise RuntimeError('Test load gate timed out')
            return original(*args, **kwargs)
        token = 'private-token-' * 4
        server = serve('127.0.0.1', 0, token, cache)
        serving = threading.Thread(target=server.serve_forever, daemon=True); serving.start()
        def post(path, body):
            req = urllib.request.Request(f'http://127.0.0.1:{server.server_port}/{path}', data=json.dumps(body).encode(),
                headers={'Authorization': 'Bearer '+token}, method='POST')
            with urllib.request.urlopen(req, timeout=3) as response: return json.load(response)
        resident = {'release': self.release, 'weights': base64.b64encode(self.weights).decode()}
        cold = {**resident, 'release': {**self.release, 'id': str(uuid.uuid4())}}
        try:
            with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool, patch('serve.torch.load', side_effect=slow_load) as loading:
                first = pool.submit(post, 'load', cold)
                self.assertTrue(entered.wait(2))
                try:
                    # Fast-path loads do not join the cold-model queue.
                    warm = [pool.submit(post, 'load', resident) for _ in range(2)]
                    self.assertTrue(all(f.result(timeout=2)['parameters'] > 0 for f in warm))
                    self.assertEqual(post('choose', self.request())['releaseId'], self.release['id'])
                    with self.assertRaises(urllib.error.HTTPError) as error: post('choose', {'releaseId': self.release['id']})
                    self.assertEqual(error.exception.code, 422)
                    second = pool.submit(post, 'load', cold)
                finally:
                    unblock.set()
                self.assertEqual(first.result(timeout=3), second.result(timeout=3))
                self.assertEqual(loading.call_count, 1)
        finally:
            unblock.set(); server.shutdown(); server.server_close(); serving.join()

    def test_focused_schedule_only_learns_selected_leader_and_balances_both_seats(self):
        keys = [d['key'] for d in self.contract['decks']]
        pairs = []
        for block in range(len(keys)):
            batch = focused_batch(block*1000, keys, 0, [5]); pairs.append(tuple(batch['decks']))
            jobs = training_jobs({'batch': batch, 'focusLeader': 'krennic', 'attempts': 0, 'seed': 50}, [self.policy], 18)
            self.assertEqual(sum(j['learner'] == 0 for j in jobs), 9)
            self.assertTrue(all(j['mode'] == 'past' and j['decks'][j['learner']] == 5 for j in jobs))
        self.assertEqual(set(pairs), {(5,i) for i in range(6)})

    def test_real_export_converts_both_human_seats_and_can_update_the_frozen_policy_copy(self):
        script = """
          import { humanFixture } from './play/testing/ai/human-fixture.ts';
          import { encodeTrajectory } from './play/ai/datasets/trajectory.ts';
          const f=humanFixture();
          process.stdout.write(encodeTrajectory(f.fixture.history,f.metadata,f.decks,'test-secret'.repeat(8)));
        """
        data = subprocess.check_output(['bun', '-e', script], cwd=ROOT)
        root = ROOT / '.swubase/crossfire-ai'
        with tempfile.TemporaryDirectory(dir=root, prefix='human-unit-') as directory:
            path = Path(directory) / 'game.json.gz'
            # Keep the fixture's lock separate from the real continuous trainer.
            budget = ArtifactBudget(directory)
            try: budget.write(path, data)
            finally: budget.close()
            with data_bridge() as bridge:
                self.assertTrue(bridge.request('open', path=str(path), checksum=hashlib.sha256(data).hexdigest())['ready'])
                rows = []
                while True:
                    response = bridge.request('next')
                    if response['done']: break
                    row = response['row']; rows.append({**row, **compact(row, self.contract), 'value': 0.0})
            self.assertEqual({r['seat'] for r in rows}, {0,1})
            from full_train import optimize
            model = copy.deepcopy(self.policy).train().requires_grad_(True)
            before = model.scorer[0].weight.detach().clone()
            optimize(model, torch.optim.Adam(model.parameters()), rows, imitation=True)
            self.assertFalse(torch.equal(before, model.scorer[0].weight))
            self.assertEqual(split('a'*64), split('a'*64))

if __name__ == '__main__': unittest.main()
