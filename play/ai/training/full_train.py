"""Bounded Greef/Dedra full-game learning: reference warm-up then terminal-return PPO.

The first full-game model has bounded visible-event memory, not a recurrent
belief state. No playing-strength qualification is implied by starting this run.
"""
from resource_budget import MAX_CPUS, requested_cpu_limit, restrict_resources
CPUS = restrict_resources(requested_cpu_limit())  # Before numerical libraries or Bun.

import argparse
from collections import Counter
import hashlib
import json
import os
from pathlib import Path
import random
import signal
import sys
import time

import numpy as np
import torch
from engine import Engine, ROOT
from full_model import FullPolicy, act, compact, frozen_copy, load_frozen, pack
from resource_budget import ArtifactBudget, DISK_LIMIT
from parallel import Collector
from resume import restore

STOP = False


def stop(*_):
    global STOP
    STOP = True


def batches(rows, size=48):
    indices = list(range(len(rows)))
    random.shuffle(indices)
    batch, count = [], 0
    for index in indices:
        n = len(rows[index]["candidates"])
        if batch and (len(batch) >= size or count + n > 8192):
            yield [rows[i] for i in batch]
            batch, count = [], 0
        batch.append(index)
        count += n
    if batch:
        yield [rows[i] for i in batch]


def optimize(policy, optimizer, rows, *, imitation=False):
    if not rows:
        return {"loss": 0.0, "decisions": 0}
    advantages = np.asarray([r["return"] - r["value"] for r in rows], dtype=np.float32)
    advantages = (advantages - advantages.mean()) / (advantages.std() + 1e-8)
    for row, advantage in zip(rows, advantages):
        row["advantage"] = float(advantage)
    losses = []
    for _ in range(2):
        for batch in batches(rows):
            logits, values = policy(*pack(batch))
            distributions = [torch.distributions.Categorical(logits=score) for score in logits]
            log_probs = torch.stack([d.log_prob(torch.tensor(r["action"])) for d, r in zip(distributions, batch)])
            entropy = torch.stack([d.entropy() for d in distributions]).mean()
            returns = torch.tensor([r["return"] for r in batch])
            if imitation:
                actor_loss = -log_probs.mean()
            else:
                old = torch.tensor([r["log_prob"] for r in batch])
                advantage = torch.tensor([r["advantage"] for r in batch])
                ratio = (log_probs - old).exp()
                actor_loss = -torch.minimum(ratio * advantage, ratio.clamp(0.8, 1.2) * advantage).mean()
            loss = actor_loss + 0.5 * (values - returns).square().mean() - 0.01 * entropy
            if not torch.isfinite(loss):
                raise RuntimeError("Non-finite full-game loss")
            optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(policy.parameters(), 1.0, error_if_nonfinite=True)
            optimizer.step()
            losses.append(loss.item())
    return {"loss": sum(losses) / len(losses), "decisions": len(rows)}


def collect(engine, policy, *, seed, orientation, learner, mode, opponent=None,
            deadline=float("inf"), greedy=False, replay=False, trace=None):
    start = engine.request("reset", seed=seed, orientation=orientation, limit=1500, autoForced=True)
    generation, observation = start["generation"], start["observation"]
    rows = []
    while not observation["done"]:
        if STOP or time.monotonic() >= deadline:
            observation = engine.request("truncate", generation=generation)["observation"]
            break
        seat = observation["seat"]
        forced = len(observation["candidates"]) == 1
        trainable = not forced and (mode in ("teacher", "self") or seat == learner)
        inputs = compact(observation, engine.contract)
        use_reference = not forced and (mode == "teacher" or (mode == "reference" and seat != learner))
        if forced:
            action, log_prob, value = 0, 0.0, 0.0
            response = engine.request("step", generation=generation, ticket=observation["ticket"], action=action)
        elif use_reference:
            response = engine.request("reference", generation=generation, ticket=observation["ticket"])
            action = response["index"]
            log_prob = 0.0
            with torch.inference_mode():
                value = policy.value(torch.from_numpy(inputs["context"]).unsqueeze(0)).item()
        else:
            acting = opponent if seat != learner and mode == "past" else policy
            action, log_prob, value = act(acting, inputs, greedy=greedy)
            response = engine.request("step", generation=generation, ticket=observation["ticket"], action=action)
        if trace is not None:
            trace.append({"ticket": observation["ticket"], "seat": seat, "action": action, "reference": use_reference})
        if trainable:
            rows.append({**inputs, "seat": seat, "action": action, "log_prob": log_prob, "value": value})
        observation = response["observation"]
    if observation["outcome"] == "terminal":
        returns = [0.0, 0.0] if observation["winner"] is None else [1.0 if seat == observation["winner"] else -1.0 for seat in range(2)]
    else:
        # A cutoff is not a draw. Bootstrap from the same seat-visible critic.
        with torch.inference_mode():
            returns = policy.value(torch.tensor(observation["bootstrap"], dtype=torch.float32)).tolist()
    for row in rows:
        row["return"] = returns[row["seat"]]
    if replay:
        engine.request("replay", generation=generation)
    summary = {key: value for key, value in observation.items() if key != "bootstrap"}
    summary.update(seed=seed, orientation=orientation, learner=learner, mode=mode, replayChecked=replay)
    return rows, summary


def validate(collector, policy, count, deadline):
    outcomes = Counter()
    games = []
    window = len(collector.engines) * 2
    for offset in range(0, count, window):
        if STOP or time.monotonic() >= deadline:
            break
        jobs = [{"seed": 1_000_000 + i // 4, "orientation": i % 2, "learner": i // 2 % 2,
                 "mode": "reference", "replay": i == 0} for i in range(offset, min(offset + window, count))]
        results = collector.collect(policy, jobs, greedy=True, record_rows=False,
                                    deadline=deadline, stopping=lambda: STOP)
        for _, result in results:
            games.append(result)
            outcome = "cutoff" if result["outcome"] != "terminal" else (
                "draw" if result["winner"] is None else "win" if result["winner"] == result["learner"] else "loss")
            outcomes[outcome] += 1
    return {"schedule": "development-v1; reused for progress, not final qualification", "outcomes": dict(outcomes), "games": games}


def run(args):
    root = ROOT / ".swubase/crossfire-ai"
    if not args.output.is_relative_to(root.resolve()) or args.output == root.resolve():
        raise ValueError("Choose a run directory beneath .swubase/crossfire-ai")
    if args.output.exists():
        raise ValueError("Choose a new run directory; existing runs are preserved")
    if args.resume and (not args.resume.is_relative_to(root.resolve()) or args.resume == root.resolve()):
        raise ValueError("Resume a run beneath .swubase/crossfire-ai")
    budget = ArtifactBudget(root)
    started = time.monotonic()
    deadline = started + args.seconds
    stats = {"status": "starting", "pid": os.getpid(), "cpus": CPUS, "cpuLimit": len(CPUS),
             "requestedCpuLimit": args.cpus,
             "seed": args.seed, "startedAtUtc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
             "diskLimitBytes": DISK_LIMIT, "games": 0, "updates": 0, "decisions": 0,
             "warmupGames": args.warmup, "requestedGames": args.games,
             "wallBudgetSeconds": args.seconds, "outcomes": {}, "history": [],
             "workers": args.workers, "inferenceThreads": torch.get_num_threads(),
             "collector": "ready-workers-v1", "collectionWindowGames": args.workers * 2,
             "autoForced": True,
             "algorithm": "reference behavioral cloning, then clipped PPO with terminal Monte Carlo returns and cutoff value bootstrap",
             "limitations": "Greef/Dedra only; approximate visible-event memory; development run, no qualified strength claim"}
    active_trace = []
    active_setup = {}
    checkpoint_slot = 0
    previous = None
    prior_elapsed = 0.0
    try:
        with Collector(args.workers) as collector:
            engine = collector.engines[0]
            stats["workerPids"] = [e.process.pid for e in collector.engines]
            if engine.contract["scope"] != "greef-dedra-full-game-v1":
                raise RuntimeError("Unexpected training contract")
            torch.manual_seed(args.seed)
            random.seed(args.seed)
            policy = FullPolicy(engine.contract)
            optimizer = torch.optim.Adam(policy.parameters(), lr=0.0003)
            opponents = []
            if args.resume:
                inherited, opponents, provenance = restore(args.resume, engine.contract, policy, optimizer,
                                                           seed=args.seed, warmup=args.warmup)
                for key in ("games", "updates", "decisions", "outcomes", "history"):
                    stats[key] = inherited[key]
                prior_elapsed = inherited["elapsedSeconds"]
                stats["resumedFrom"] = provenance
                stats["originalStartedAtUtc"] = inherited.get("originalStartedAtUtc", inherited["startedAtUtc"])
            initial_games = stats["games"]
            if initial_games >= args.games:
                raise ValueError("The requested total game limit has already been reached")
            stats["parameters"] = sum(p.numel() for p in policy.parameters())
            stats["contract"] = engine.contract
            stats["sourceFiles"] = {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
                                    for p in sorted((ROOT / "play/ai").rglob("*"))
                                    if p.is_file() and p.suffix in (".ts", ".py", ".json", ".txt")}
            initial = {"architecture": "context-candidate-ppo-v1", "contract": engine.contract,
                       "model": policy.state_dict()}
            budget.tensor(args.output / ("starting.pt" if args.resume else "untrained.pt"), initial)

            def status():
                stats["segmentElapsedSeconds"] = time.monotonic() - started
                stats["segmentGames"] = stats["games"] - initial_games
                stats["elapsedSeconds"] = prior_elapsed + stats["segmentElapsedSeconds"]
                stats["diskUsageBytes"] = budget.usage()
                budget.json(args.output / "status.json", stats)

            def checkpoint():
                nonlocal checkpoint_slot, previous
                payload = {"architecture": "context-candidate-ppo-v1", "contract": engine.contract,
                           "model": policy.state_dict(), "optimizer": optimizer.state_dict(),
                           "opponents": [op.state_dict() for op in opponents],
                           "torchRng": torch.get_rng_state(), "pythonRng": random.getstate(),
                           "games": stats["games"], "updates": stats["updates"],
                           "resumeReady": stats["status"] in ("stopped", "finished")}
                name = f"checkpoint-{checkpoint_slot}.pt"
                budget.tensor(args.output / name, payload)
                digest = hashlib.sha256((args.output / name).read_bytes()).hexdigest()
                if previous:
                    budget.json(args.output / "previous.json", previous)
                previous = {"file": name, "sha256": digest, "games": stats["games"], "updates": stats["updates"]}
                budget.json(args.output / "latest.json", previous)
                checkpoint_slot = 1 - checkpoint_slot
                # Validate the saved frozen artifact on a real development input.
                frozen = load_frozen(args.output / name, engine.contract)
                probe = engine.request("reset", seed=1_500_000, orientation=0, limit=1)
                obs = compact(probe["observation"], engine.contract)
                with torch.inference_mode():
                    a, av = policy(*pack([obs])); b, bv = frozen(*pack([obs]))
                    torch.testing.assert_close(a[0], b[0], rtol=0, atol=0)
                    torch.testing.assert_close(av, bv, rtol=0, atol=0)
                engine.request("truncate", generation=probe["generation"])
                stats["checkpoint"] = previous
                status()

            stats["status"] = "warmup" if stats["games"] < args.warmup else "training"
            status()
            totals = Counter(stats["outcomes"])
            rollout = []
            episode = stats["games"]
            while episode < args.games:
                if STOP or time.monotonic() >= deadline:
                    break
                teacher = episode < args.warmup
                # Keep a bounded queue so completed workers immediately refill.
                # Weights stay fixed until the entire window has drained.
                count = min(1 if teacher else args.workers * 2, args.games - episode)
                jobs = []
                for offset in range(count):
                    n = episode + offset
                    opponent_block = (n // 4) % 4
                    mode = "teacher" if teacher else ("self" if opponent_block == 3 else "past" if opponent_block == 2 and opponents else "reference")
                    jobs.append({"seed": args.seed + n, "orientation": n % 2, "learner": n // 2 % 2,
                                 "mode": mode, "policyUpdate": stats["updates"], "replay": n % 25 == 0,
                                 "opponent": random.choice(opponents) if mode == "past" else None})
                active_setup = [{k: v for k, v in j.items() if k != "opponent"} for j in jobs]
                active_trace = [[] for _ in jobs]
                before_games = stats["games"]
                results = collector.collect(policy, jobs, deadline=deadline, stopping=lambda: STOP, traces=active_trace)
                for rows, result in results:
                    stats["games"] += 1
                    stats["decisions"] += len(rows)
                    totals[result["outcome"]] += 1
                    if result["outcome"] == "terminal":
                        totals["draw" if result["winner"] is None else f"winner-seat-{result['winner']}"] += 1
                    stats["lastGame"] = result
                    rollout.extend(rows)
                episode += len(results)
                stats["outcomes"] = dict(totals)
                stats["lastCollection"] = collector.last_metrics
                if teacher or len(rollout) >= 1024 or episode == args.games or STOP or time.monotonic() >= deadline:
                    metrics = optimize(policy, optimizer, rollout, imitation=teacher)
                    rollout = []
                    stats["updates"] += 1
                    stats["status"] = "warmup" if teacher else "training"
                    entry = {"game": stats["games"], "update": stats["updates"], "phase": stats["status"],
                             "elapsedSeconds": prior_elapsed + time.monotonic() - started, **metrics}
                    stats["history"] = (stats["history"] + [entry])[-100:]
                    print(json.dumps(entry), flush=True)
                    status()
                if episode == args.warmup or (not teacher and before_games // 40 != stats["games"] // 40):
                    opponents = (opponents + [frozen_copy(policy)])[-3:]
                if before_games == initial_games or before_games // 20 != stats["games"] // 20:
                    checkpoint()
                if args.validation and before_games // 100 != stats["games"] // 100 and not teacher:
                    stats["validation"] = validate(collector, policy, args.validation, deadline)
                    status()
            if rollout:
                optimize(policy, optimizer, rollout)
                stats["updates"] += 1
            stats["status"] = "stopped" if STOP else "finished"
            checkpoint()
            frozen = {"architecture": "context-candidate-ppo-v1", "contract": engine.contract,
                      "model": policy.state_dict(), "games": stats["games"]}
            budget.tensor(args.output / "frozen.pt", frozen)
            status()
            print(json.dumps({"status": stats["status"], "games": stats["games"], "output": str(args.output)}), flush=True)
    except BaseException as error:
        stats["status"] = "failed"
        stats["error"] = f"{type(error).__name__}: {error}"
        stats["elapsedSeconds"] = prior_elapsed + time.monotonic() - started
        # Failure artifacts contain a bounded command-index trace, not full states.
        try:
            budget.json(args.output / "failure.json", {"setup": active_setup, "trace": active_trace, "error": stats["error"]})
            budget.json(args.output / "status.json", stats)
        except Exception as reporting_error:
            # Disk exhaustion must preserve the existing checkpoints and the
            # original failure, even when there is no budget left for a report.
            print(f"Could not persist failure report: {reporting_error}; {stats['error']}", file=sys.stderr)
        raise
    finally:
        budget.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__, allow_abbrev=False)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--games", type=int, default=5000)
    parser.add_argument("--seconds", type=int, default=7200)
    parser.add_argument("--warmup", type=int, default=24)
    parser.add_argument("--seed", type=int, default=17)
    parser.add_argument("--validation", type=int, default=8)
    parser.add_argument("--cpus", type=int, choices=range(1, MAX_CPUS + 1), default=3)
    parser.add_argument("--workers", type=int, choices=range(1, MAX_CPUS + 1), default=3)
    parser.add_argument("--resume", type=Path, help="Continue a gracefully stopped/finished run in a new output directory")
    args = parser.parse_args()
    if not (1 <= args.games <= 20_000 and 1 <= args.seconds <= 86400 and 0 <= args.warmup <= min(args.games, 100)
            and 0 <= args.seed <= 0xffff_ffff - args.games and 0 <= args.validation <= 64):
        parser.error("Training request exceeds bounded limits")
    args.output = args.output.resolve()
    args.resume = args.resume.resolve() if args.resume else None
    torch.set_num_threads(1)
    torch.set_num_interop_threads(1)
    torch.use_deterministic_algorithms(True)
    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    run(args)


if __name__ == "__main__":
    main()
