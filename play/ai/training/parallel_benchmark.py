"""Compare CPU/worker limits on identical complete games with bounded resources."""
from resource_budget import MAX_CPUS, requested_cpu_limit, restrict_resources
CPUS = restrict_resources(requested_cpu_limit())

import argparse
import hashlib
import json
import os
import time
from pathlib import Path

import torch
from engine import ROOT
from full_model import load_frozen
from parallel import Collector
from resource_budget import ArtifactBudget


def benchmark(run, output, games=12, configurations=None, compare=None):
    root = (ROOT / ".swubase/crossfire-ai").resolve()
    if not run.is_relative_to(root) or not output.is_relative_to(root) or output.exists():
        raise ValueError("Use an existing local run and a new local report path")
    configurations = configurations or [(len(CPUS), n) for n in (1, 2, 3)]
    if not 1 <= len(configurations) <= 6 or any(not 1 <= c <= len(CPUS) or not 1 <= w <= MAX_CPUS
                                               for c, w in configurations):
        raise ValueError("Benchmark configurations must fit the configured CPU/worker budget")
    budget = ArtifactBudget(root)
    try:
        status = json.loads((run / "status.json").read_text())
        if status["status"] not in ("finished", "stopped"):
            raise ValueError("Stop training before measuring isolated throughput")
        manifest = json.loads((run / "latest.json").read_text())
        if manifest["file"] not in ("checkpoint-0.pt", "checkpoint-1.pt"):
            raise ValueError("Invalid checkpoint filename")
        path = run / manifest["file"]
        if hashlib.sha256(path.read_bytes()).hexdigest() != manifest["sha256"]:
            raise ValueError("Checkpoint checksum mismatch")
        report = {"cpus": CPUS, "checkpoint": {"run": str(run), **manifest},
                  "schedule": "throughput-only; fixed greedy games, not strength qualification", "runs": []}
        signatures = None
        if compare:
            baseline = json.loads(compare.read_text())
            if baseline["checkpoint"]["sha256"] != manifest["sha256"]:
                raise ValueError("Compare the same checkpoint")
            signatures = baseline["trajectories"]
            report["comparedWith"] = str(compare)
        # Reverse the second pass to expose simple warm-cache/order effects.
        for cpu_count, workers in [*configurations, *reversed(configurations)]:
            selected_cpus = CPUS[:cpu_count]
            # PyTorch is already imported. Update every existing thread as well
            # as the main thread before creating the next isolated worker pool.
            for thread in Path("/proc/self/task").iterdir():
                try:
                    os.sched_setaffinity(int(thread.name), selected_cpus)
                except ProcessLookupError:
                    pass
            with Collector(workers) as collector:
                policy = load_frozen(path, collector.contract)
                # Exclude startup and first-inference overhead for each process.
                warm = [{"seed": 2_500_000, "orientation": 0, "learner": 0,
                         "mode": "reference", "limit": 1}]
                collector.collect(policy, warm, greedy=True)
                started = time.monotonic()
                jobs = [{"seed": 2_000_000 + n // 4, "orientation": n % 2,
                         "learner": n // 2 % 2, "mode": "reference", "replay": n == 0}
                        for n in range(games)]
                results = [r for _, r in collector.collect(policy, jobs, greedy=True)]
                elapsed = time.monotonic() - started
                current = [{k: r[k] for k in ("seed", "orientation", "learner", "winner", "outcome", "commands", "microsteps")}
                           for r in results]
                if signatures is not None and current != signatures:
                    raise RuntimeError("Parallel and sequential benchmark trajectories disagree")
                signatures = current
                record = {"cpus": selected_cpus, "cpuLimit": cpu_count,
                          "workers": workers, "games": len(results), "elapsedSeconds": elapsed,
                          "gamesPerMinute": len(results) * 60 / elapsed,
                          "secondsPerCompletedGame": elapsed / len(results),
                          "meanGameLatencySeconds": sum(r["simulationSeconds"] for r in results) / len(results),
                          "collection": collector.last_metrics,
                          "terminal": sum(r["outcome"] == "terminal" for r in results)}
                report["runs"].append(record)
                print(json.dumps(record), flush=True)
                budget.json(output, report)
        report["trajectories"] = signatures
        budget.json(output, report)
    finally:
        budget.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, allow_abbrev=False)
    parser.add_argument("--run", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--games", type=int, default=12)
    parser.add_argument("--cpus", type=int, choices=range(1, MAX_CPUS + 1), default=3)
    parser.add_argument("--configs", nargs="+", help="CPU:worker pairs, e.g. 3:3 9:6 9:9")
    parser.add_argument("--compare", type=Path, help="Require matching trajectories from an earlier report")
    args = parser.parse_args()
    if not 3 <= args.games <= 36:
        parser.error("Choose 3–36 games per configuration")
    try:
        configurations = [tuple(map(int, value.split(":"))) for value in args.configs] if args.configs else None
        if configurations and any(len(pair) != 2 for pair in configurations):
            raise ValueError()
    except ValueError:
        parser.error("Configurations must be CPU:worker pairs")
    torch.set_num_threads(1)
    torch.set_num_interop_threads(1)
    benchmark(args.run.resolve(), args.output.resolve(), args.games, configurations,
              args.compare.resolve() if args.compare else None)
