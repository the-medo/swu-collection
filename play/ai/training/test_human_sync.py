import base64
import hashlib
import json
import tempfile
import unittest
import uuid
from pathlib import Path
from unittest.mock import patch
from human_data import sync, split
from resource_budget import ArtifactBudget
from fork_run import fork


class HumanSyncTests(unittest.TestCase):
    def test_sync_deduplicates_and_removes_revoked_cached_games(self):
        data = b'synthetic compressed bytes'
        entry = {'id': str(uuid.uuid4()), 'checksum': hashlib.sha256(data).hexdigest(), 'groupId': '1'*64,
                 'state': 'available', 'createdAt': '2026-09-24T00:00:00Z', 'expiresAt': '2099-01-01T00:00:00Z'}
        class Bridge:
            downloads = 0
            def request(self, op, **args):
                if op == 'index': return {'entries': [entry] if args['shard'] == entry['id'][:2] else []}
                self.downloads += 1
                return {'bytes': base64.b64encode(data).decode()}
        with tempfile.TemporaryDirectory() as temporary:
            budget = ArtifactBudget(Path(temporary))
            try:
                bridge = Bridge()
                first = sync(bridge, budget, Path(temporary)/'dataset')
                second = sync(bridge, budget, Path(temporary)/'dataset')
                self.assertEqual(len(first['entries']), 1)
                self.assertEqual(second['entries'][0]['split'], split(entry['groupId']))
                self.assertEqual(bridge.downloads, 1)
                entry['state'] = 'revoked'
                self.assertFalse(sync(bridge, budget, Path(temporary)/'dataset')['entries'])
                self.assertFalse(Path(first['entries'][0]['path']).exists())
            finally: budget.close()

    def test_fork_registers_an_independent_copy_without_changing_active_run(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)/'.swubase/crossfire-ai'
            source = root/'source'; source.mkdir(parents=True)
            data = b'checked fixture'; digest = hashlib.sha256(data).hexdigest()
            manifest = {'file': f'models/{digest}.pt', 'sha256': digest}
            (source/'models').mkdir(); (source/manifest['file']).write_bytes(data)
            for name in ('latest-model.json', 'anchor-model.json'): (source/name).write_text(json.dumps(manifest))
            (source/'checkpoint-0.pt').write_bytes(data)
            (source/'checkpoints.json').write_text(json.dumps({'current': {'file':'checkpoint-0.pt','sha256':digest}, 'previous':None}))
            (source/'status.json').write_text(json.dumps({'status':'ready'}))
            output = root/f'specialists-{uuid.uuid4()}'
            with patch('fork_run.ROOT', Path(temporary)): fork(source, output, 'Krennic fixture')
            registry = json.loads((root/'training-runs.json').read_text())
            self.assertEqual(registry['activeRun'], 'specialists')
            self.assertEqual(registry['runs'][0]['id'], output.name)
            self.assertEqual((output/manifest['file']).read_bytes(), data)
            self.assertEqual(json.loads((output/'status.json').read_text())['pid'], 0)
            with patch('fork_run.ROOT', Path(temporary)), self.assertRaises(ValueError): fork(source, output)

if __name__ == '__main__': unittest.main()
