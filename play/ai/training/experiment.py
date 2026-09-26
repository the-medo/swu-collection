"""Train from engine outcomes, save weights, evaluate in a fresh process.

This is a contextual-bandit / one-step policy-gradient experiment, not full-game
PPO. A horizon without a game result returns zero; it is never recorded as a draw.
"""

import argparse
from collections import Counter
import hashlib
import html
import json
from pathlib import Path
import random
import subprocess
import sys
import time

import torch

from engine import Engine, ROOT
from model import Policy, load_model, save_model, tensors


def evaluation(engine, policy, split, count, *, mode="model", start=0, examples=False):
    totals = Counter()
    kinds = {kind: Counter() for kind in ("win-now", "stop-lethal")}
    seen = set()
    samples = []
    rng = random.Random(90817)
    duplicate_count = 0
    index = start
    while totals["puzzles"] < count:
        if index >= start + 20_000:
            raise RuntimeError("Evaluation could not find enough distinct observations")
        batch = engine.request("reset", split=split, start=index, batch=min(64, count - totals["puzzles"]))
        observations = batch["observations"]
        index += len(observations)
        inputs, mask = tensors(observations, policy.features)
        with torch.inference_mode():
            probabilities = policy(inputs, mask).softmax(-1)
        if mode == "random":
            actions = [rng.randrange(len(item["features"])) for item in observations]
        elif mode == "base":
            # Fixed reference: strongest available attack against the enemy base.
            actions = [max(range(len(item["features"])), key=lambda i: (
                item["features"][i][11], item["features"][i][7]
            )) for item in observations]
        else:
            actions = probabilities.argmax(-1).tolist()
        outcomes = engine.request("step", generation=batch["generation"], actions=actions)["results"]
        for item, action, result, probs in zip(observations, actions, outcomes, probabilities):
            if item["fingerprint"] in seen:
                duplicate_count += 1
                continue
            seen.add(item["fingerprint"])
            totals["puzzles"] += 1
            totals["successes"] += int(result["success"])
            totals[result["gameOutcome"]] += 1
            kinds[result["kind"]]["puzzles"] += 1
            kinds[result["kind"]]["successes"] += int(result["success"])
            if examples and sum(sample["kind"] == result["kind"] for sample in samples) < 2:
                samples.append({
                    "kind": result["kind"], "outcome": result,
                    "selected": item["descriptions"][action], "selectedIndex": action,
                    "choices": [{"description": description, "probability": probs[i].item(),
                                 "features": item["features"][i]}
                                for i, description in enumerate(item["descriptions"])],
                })
    return {
        "policy": mode, "split": split, "puzzles": count,
        "successes": totals["successes"], "successRate": totals["successes"] / count,
        "gameOutcomes": {name: totals[name] for name in ("win", "loss", "draw", "ongoing")},
        "byKind": {kind: {**values, "successRate": values["successes"] / values["puzzles"] if values["puzzles"] else 0}
                   for kind, values in kinds.items()},
        "duplicateObservationsSkipped": duplicate_count,
        "examples": samples,
    }


def write_report(directory, report):
    directory = Path(directory)
    (directory / "report.json").write_text(json.dumps(report, indent=2) + "\n")
    rows = "".join(
        f"<tr><td>{html.escape(name)}</td><td>{result['successRate']:.1%}</td>"
        f"<td>{result['byKind']['win-now']['successRate']:.1%}</td>"
        f"<td>{result['byKind']['stop-lethal']['successRate']:.1%}</td></tr>"
        for name, result in report["evaluation"].items()
    )
    examples = ""
    for sample in report["evaluation"]["trained"]["examples"]:
        choices = "".join(
            f"<tr><td>{html.escape(choice['description'])}</td>"
            f"<td>{choice['probability']:.1%}</td>"
            f"<td>{choice['features'][7] * 10:g}</td>"
            f"<td>{choice['features'][14] * 30:g}</td>"
            f"<td>{'yes' if choice['features'][15] else 'no'}</td></tr>"
            for choice in sample["choices"]
        )
        features = sample["choices"][0]["features"]
        examples += (
            f"<section><h2>{html.escape(sample['kind'])}</h2>"
            f"<p>Your base: {features[0] * 30:g} HP. Enemy base: {features[1] * 30:g} HP.</p>"
            f"<p>Chosen: <strong>{html.escape(sample['selected'])}</strong>. "
            f"Game after the reply: {sample['outcome']['gameOutcome']}.</p>"
            "<table><tr><th>Choice</th><th>Model preference</th><th>Attacker power</th>"
            f"<th>Target HP</th><th>Target ready</th></tr>{choices}</table></section>"
        )
    page = (
        "<!doctype html><html lang='en'><meta charset='utf-8'>"
        "<meta name='viewport' content='width=device-width,initial-scale=1'>"
        "<title>Crossfire AI — first learning experiment</title>"
        "<style>body{font:16px system-ui;max-width:1000px;margin:40px auto;padding:0 20px;"
        "background:#111827;color:#e5e7eb}table{border-collapse:collapse;width:100%}"
        "td,th{text-align:left;padding:10px;border-bottom:1px solid #374151}"
        "section{margin:36px 0}h1,h2{color:#93c5fd}p{line-height:1.6}</style>"
        "<h1>Crossfire: a brain that learned two tactics</h1>"
        "<p>This frozen model was loaded in a fresh Python process. It sees only "
        "visible combat features. Crossfire's real engine resolves every action.</p>"
        f"<p>{report['manifest']['parameters']:,} learned numbers; "
        f"{report['manifest']['weightsBytes']:,} bytes of saved weights.</p>"
        "<p>Success means winning immediately in a win-now puzzle, or surviving "
        "the scripted enemy's next attack in a stop-lethal puzzle. These are "
        "tactical exercises, not full-game win rates. Preferences are not win probabilities.</p>"
        "<table><tr><th>Policy</th><th>Overall success</th><th>Win now</th>"
        f"<th>Stop lethal</th></tr>{rows}</table>{examples}</html>"
    )
    (directory / "report.html").write_text(page)


def train(args):
    if args.output.exists():
        raise ValueError("Choose a new output directory; existing experiments are never overwritten")
    torch.manual_seed(args.seed)
    random.seed(args.seed)
    started = time.monotonic()
    with Engine() as engine:
        policy = Policy(len(engine.contract["features"]))
        # Reserve the output before running and retain the initial brain for a
        # same-schedule comparison in the separate frozen-model evaluator.
        args.output.mkdir(parents=True)
        save_model(args.output / "untrained", policy, engine.contract, {"seed": args.seed, "updates": 0})
        optimizer = torch.optim.Adam(policy.parameters(), lr=0.003)
        history = []
        updates = 0
        for update in range(args.updates):
            if time.monotonic() - started > args.seconds:
                break
            batch = engine.request("reset", split="train", start=update * args.batch, batch=args.batch)
            inputs, mask = tensors(batch["observations"], policy.features)
            distribution = torch.distributions.Categorical(logits=policy(inputs, mask))
            actions = distribution.sample()
            results = engine.request("step", generation=batch["generation"], actions=actions.tolist())["results"]
            rewards = torch.tensor([result["reward"] for result in results], dtype=torch.float32)
            # REINFORCE: only the sampled action's actual engine outcome trains
            # the policy. No answer labels or alternative-action outcomes.
            advantages = rewards - rewards.mean()
            loss = -(distribution.log_prob(actions) * advantages).mean() - 0.01 * distribution.entropy().mean()
            if not torch.isfinite(loss):
                raise RuntimeError("Non-finite policy loss")
            optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(policy.parameters(), 1.0, error_if_nonfinite=True)
            optimizer.step()
            updates = update + 1
            if updates == 1 or updates % 50 == 0:
                row = {"update": updates, "puzzles": updates * args.batch,
                       "meanReward": rewards.mean().item(), "loss": loss.item(),
                       "elapsedSeconds": time.monotonic() - started}
                history.append(row)
                print(json.dumps(row), flush=True)
        if updates == 0:
            raise RuntimeError("Training budget expired without an update")
        validation = evaluation(engine, policy, "validation", 256)
        metadata = {
            "algorithm": "one-step REINFORCE with batch baseline and entropy bonus",
            "seed": args.seed, "updates": updates, "batch": args.batch,
            "puzzles": updates * args.batch, "elapsedSeconds": time.monotonic() - started,
            "requestedUpdates": args.updates, "budgetSeconds": args.seconds,
            "torch": torch.__version__, "threads": torch.get_num_threads(), "history": history,
            "validation": validation,
            "sourceRevision": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
            "sourceFiles": {
                str(path.relative_to(ROOT)): hashlib.sha256(path.read_bytes()).hexdigest()
                for path in sorted((ROOT / "play/ai").rglob("*"))
                if path.is_file() and path.suffix in (".ts", ".py", ".txt")
            },
        }
        save_model(args.output / "model", policy, engine.contract, metadata)
        # Numerical parity is checked on validation inputs, before test reporting.
        reloaded, _ = load_model(args.output / "model", engine.contract)
        probe = engine.request("reset", split="validation", start=0, batch=16)
        inputs, mask = tensors(probe["observations"], policy.features)
        with torch.inference_mode():
            torch.testing.assert_close(policy(inputs, mask), reloaded(inputs, mask), rtol=0, atol=0)
    print("Saved model. Evaluating its frozen weights in a fresh process…", flush=True)
    subprocess.run([
        sys.executable, str(Path(__file__).resolve()), "evaluate",
        "--output", str(args.output), "--count", str(args.count),
    ], check=True, timeout=300)


def evaluate(args):
    with Engine() as engine:
        trained, manifest = load_model(args.output / "model", engine.contract)
        initial, _ = load_model(args.output / "untrained", engine.contract)
        # Same fixed, distinct input set for all policies. Report the final
        # checkpoint, not the best one selected on this test schedule.
        results = {
            "random": evaluation(engine, initial, "test", args.count, mode="random"),
            "always-base": evaluation(engine, initial, "test", args.count, mode="base"),
            "untrained": evaluation(engine, initial, "test", args.count),
            "trained": evaluation(engine, trained, "test", args.count, examples=True),
        }
    passed = (results["trained"]["successRate"] >= 0.90
              and all(row["successRate"] >= 0.85 for row in results["trained"]["byKind"].values())
              and results["trained"]["successRate"] >= results["untrained"]["successRate"] + 0.15)
    report = {"manifest": manifest, "evaluation": results, "passed": passed,
              "freshProcess": True, "note": "Tactical gate only; full-game M2 gate remains pending."}
    write_report(args.output, report)
    print(json.dumps({"passed": passed, "parameters": manifest["parameters"],
                      "weightsBytes": manifest["weightsBytes"],
                      "successRates": {name: result["successRate"] for name, result in results.items()},
                      "report": str(args.output / "report.html")}, indent=2))
    if not passed:
        raise SystemExit("The tactical learning gate did not pass; see report.json")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("train", "evaluate"))
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--updates", type=int, default=1200)
    parser.add_argument("--batch", type=int, default=64)
    parser.add_argument("--seconds", type=int, default=300)
    parser.add_argument("--seed", type=int, default=17)
    parser.add_argument("--count", type=int, default=512)
    args = parser.parse_args()
    if not (1 <= args.updates <= 10000 and 2 <= args.batch <= 256
            and args.updates * args.batch <= 900000 and 1 <= args.seconds <= 3600
            and 32 <= args.count <= 2048 and 0 <= args.seed <= 0xffff_ffff):
        parser.error("Arguments exceed bounded experiment limits")
    args.output = args.output.resolve()
    torch.set_num_threads(2)
    torch.use_deterministic_algorithms(True)
    if args.command == "train":
        train(args)
    else:
        evaluate(args)


if __name__ == "__main__":
    main()
