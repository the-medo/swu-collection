import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
import uuid
import torch
from add_deck import prepare, read_registry, revision
from engine import Engine, ROOT
from full_model import make_policy
from league_artifacts import publish, restore
from resource_budget import ArtifactBudget
from specialist_model import ARCHITECTURE, EXPANDABLE_ARCHITECTURE


class AddDeckTests(unittest.TestCase):
    def test_prepare_new_leader_then_same_leader_preserves_sources_and_can_resume(self):
        torch.set_num_threads(1)
        fixtures = json.loads(subprocess.check_output(['bun', 'play/testing/ai/roster-fixtures.ts'], cwd=ROOT))
        with tempfile.TemporaryDirectory(dir=ROOT / '.swubase/crossfire-ai', prefix='add-deck-tests-') as temp:
            root = Path(temp)
            with Engine(bridge='play/ai/full-game/bridge.ts', bridge_args=('--league',)) as engine:
                contract = engine.contract
            budget = ArtifactBudget(root)
            source = root / 'specialists-run-01'
            try:
                state = {'status': 'stopped', 'seed': 20260921, 'games': 12, 'updates': 1,
                         'initialization': {'kind': 'fresh-specialists'},
                         'componentTraining': {'leader:greef': {'decisions': 44, 'updates': 1}}}
                state['anchor'] = publish(budget, source, contract, make_policy(contract), state)
                state['latestModel'] = publish(budget, source, contract, make_policy(contract, ARCHITECTURE), state)
                budget.json(source / 'status.json', state)
            finally: budget.close()
            before = {str(p.relative_to(source)): hashlib.sha256(p.read_bytes()).hexdigest() for p in source.rglob('*') if p.is_file()}
            snapshots = [fixtures['seven']['decks'][-1]['snapshot'], fixtures['eight']['decks'][-1]['snapshot']]
            for i, snapshot in enumerate(snapshots):
                registry = read_registry(root)
                request = {'requestId': str(uuid.uuid4()), 'revision': revision(registry),
                           'deckId': snapshot['sourceDeckId'], 'contentHash': snapshot['contentHash'],
                           'snapshot': snapshot, 'name': f'Test deck {i}', 'leaderName': 'Test leader', 'archetypes': ['control']}
                held = ArtifactBudget(root)
                try:
                    with self.assertRaisesRegex(RuntimeError, 'Another training process'):
                        prepare(request, root)
                finally: held.close()
                result = prepare(request, root)
                self.assertEqual(prepare(request, root), result)  # Lost response/retry is idempotent.
                output = root / result['run']
                status = json.loads((output / 'status.json').read_text())
                self.assertEqual((status['status'], status['games'], status['updates']), ('ready', 0, 0))
                self.assertEqual(status['system']['initialization'], 'expanded')
                self.assertEqual(len(status['system']['leaders']), 7)
                self.assertEqual(len(status['system']['decks']), 7 + i)
                self.assertEqual(status['componentTraining']['leader:greef']['decisions'], 44)
                self.assertTrue(all(not Path(f'/proc/{pid}').exists() for pid in status['workerPids']))
                model = status['latestModel']
                policy = make_policy(model['contract'], EXPANDABLE_ARCHITECTURE)
                recovered, _, _ = restore(output, model['contract'], policy, torch.optim.Adam(policy.parameters()))
                self.assertEqual(recovered['games'], 0)
                self.assertEqual(recovered['initialization']['optimizer'], 'fresh Adam after expansion')
                changed = {**request, 'requestId': str(uuid.uuid4())}
                with self.assertRaisesRegex(ValueError, 'roster changed'):
                    prepare(changed, root)
                with self.assertRaisesRegex(ValueError, 'already'):
                    prepare({**changed, 'revision': revision(read_registry(root))}, root)
            after = {str(p.relative_to(source)): hashlib.sha256(p.read_bytes()).hexdigest() for p in source.rglob('*') if p.is_file()}
            self.assertEqual(before, after)


if __name__ == '__main__':
    unittest.main()
