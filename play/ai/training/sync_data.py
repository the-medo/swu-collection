"""Refresh private consented datasets without starting training."""
from resource_budget import requested_cpu_limit, restrict_resources
restrict_resources(requested_cpu_limit())
import argparse
import json
from engine import ROOT
from resource_budget import ArtifactBudget
from disk_monitor import DiskMonitor
from human_data import data_bridge, sync

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__, allow_abbrev=False)
    parser.add_argument('--output', required=True)
    parser.add_argument('--cpus', type=int, choices=range(1,10), default=3)
    args = parser.parse_args()
    budget = ArtifactBudget(ROOT / '.swubase/crossfire-ai')
    monitor = DiskMonitor(budget, ROOT / '.swubase/crossfire-ai/dataset-disk-usage.json').start()
    try:
        with data_bridge() as bridge:
            result = sync(bridge, budget, ROOT / args.output, monitor.failed.is_set)
            print(json.dumps({'games': len(result['entries']), 'trainingStarted': False}))
    finally:
        monitor.close(); budget.close()
