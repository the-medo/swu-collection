"""Copy a stopped run into an independent, resumable specialization run."""
from resource_budget import requested_cpu_limit, restrict_resources
restrict_resources(requested_cpu_limit())
import argparse
import json
import uuid
import hashlib
from pathlib import Path
from engine import ROOT
from league_artifacts import checked_bytes
from resource_budget import ArtifactBudget


def fork(source, output=None, label='Leader specialization'):
    root = (ROOT / '.swubase/crossfire-ai').resolve()
    source = Path(source).resolve()
    output = Path(output).resolve() if output else root / f'specialists-{uuid.uuid4()}'
    if output.parent != root or not output.name.startswith('specialists-'):
        raise ValueError('A registered fork uses .swubase/crossfire-ai/specialists-<uuid>')
    uuid.UUID(output.name.removeprefix('specialists-'))
    if not 1 <= len(label) <= 100: raise ValueError('Use a short run label')
    if not source.is_relative_to(root) or not output.is_relative_to(root) or output == root or output.exists():
        raise ValueError('Source and new output must be separate directories beneath .swubase/crossfire-ai')
    status = json.loads((source / 'status.json').read_text())
    if status['status'] not in ('ready', 'stopped'):
        raise ValueError('Stop the source run before forking it')
    budget = ArtifactBudget(root)
    try:
        # The shared artifact lock excludes concurrent trainers during the copy.
        registry_path = root / 'training-runs.json'
        registry = json.loads(registry_path.read_text()) if registry_path.exists() else {'version': 1, 'activeRun': 'specialists', 'runs': []}
        if registry.get('version') != 1 or len(registry['runs']) >= 32: raise ValueError('Invalid or full training run registry')
        references = []
        documents = {}
        for name in ('latest-model.json', 'anchor-model.json', 'checkpoints.json'):
            documents[name] = json.loads((source / name).read_text())
            refs = [documents[name].get('current'), documents[name].get('previous')] if name == 'checkpoints.json' else [documents[name]]
            references.extend(r for r in refs if r)
        for ref in references:
            budget.write(output / ref['file'], checked_bytes(source, ref, checkpoint=ref['file'].startswith('checkpoint-')))
        if (source / 'roster.json').exists(): budget.write(output / 'roster.json', (source / 'roster.json').read_bytes())
        for name, value in documents.items(): budget.json(output / name, value)
        budget.json(output / 'status.json', {**status, 'status': 'ready', 'pid': 0, 'workerPids': [], 'forkedFrom': source.name})
        fingerprint = hashlib.sha256(json.dumps({'fork': str(source), 'model': documents['latest-model.json']['sha256']}, sort_keys=True).encode()).hexdigest()
        registry['runs'].append({'id': output.name, 'label': label, 'requestHash': fingerprint})
        budget.json(registry_path, registry)
        print(json.dumps({'run': output.name, 'output': str(output), 'trainingStarted': False}))
    finally:
        budget.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__, allow_abbrev=False)
    parser.add_argument('--run', required=True)
    parser.add_argument('--output', help='Optional new specialists-<uuid> directory; automatically generated otherwise')
    parser.add_argument('--label', default='Leader specialization')
    parser.add_argument('--cpus', type=int, choices=range(1,10), default=3)
    args = parser.parse_args()
    fork(args.run, args.output, args.label)
