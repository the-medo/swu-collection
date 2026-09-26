"""Bounded asynchronous simulators with one owner of inference and sampling.

A collection window keeps model weights fixed. Ready workers advance without
waiting for the slowest game, and completed workers take the next queued job.
"""
from concurrent.futures import FIRST_COMPLETED, ThreadPoolExecutor, wait
from contextlib import ExitStack
import time
import json

import torch
from engine import Engine
from full_model import compact, pack
from resource_budget import MAX_CPUS


class Collector:
    def __init__(self, workers=2, *, auto_forced=True, league=False, roster=None, target=None, catalog=None):
        if type(workers) is not int or not 1 <= workers <= MAX_CPUS:
            raise ValueError("Choose one to nine simulation workers")
        self.auto_forced = auto_forced
        self.stack = ExitStack()
        bridge_args = list(("--roster", str(roster)) if roster else ("--league",) if league else ())
        if target: bridge_args += ['--versions', json.dumps(target)]
        if catalog: bridge_args += ['--catalog', str(catalog)]
        try:
            self.engines = [self.stack.enter_context(Engine(bridge="play/ai/full-game/bridge.ts",
                                                          bridge_args=bridge_args))
                            for _ in range(workers)]
            self.contract = self.engines[0].contract
            if any(e.contract != self.contract for e in self.engines):
                raise ValueError("Simulation worker contracts disagree")
            # Join pending IPC before closing the engines.
            self.pool = self.stack.enter_context(ThreadPoolExecutor(max_workers=workers))
        except BaseException:
            self.stack.close()
            raise

    def collect(self, policy, jobs, *, deadline=float("inf"), stopping=lambda: False,
                greedy=False, traces=None, record_rows=True):
        if not 1 <= len(jobs) <= MAX_CPUS * 4:
            raise ValueError("A collection window must contain one to 36 games")
        if any(j["mode"] not in ("teacher", "self", "reference", "past") for j in jobs):
            raise ValueError("Unknown opponent mode")
        if any(j["mode"] == "past" and j.get("opponent") is None for j in jobs):
            raise ValueError("Past-policy games require a frozen opponent")
        traces = traces if traces is not None else [[] for _ in jobs]
        if len(traces) != len(jobs):
            raise ValueError("Trace slots must match games")
        started = time.monotonic()
        pending, ready, results = {}, [], {}
        next_job = 0
        requests = 0

        def should_stop():
            return stopping() or time.monotonic() >= deadline

        def submit(slot, operation, **arguments):
            nonlocal requests
            pending[self.pool.submit(slot["engine"].request, operation, **arguments)] = (slot, operation)
            requests += 1

        def launch(engine):
            nonlocal next_job
            index = next_job
            next_job += 1
            # Independent game streams keep sampling independent of response
            # arrival order. Admission order alone consumes the saved global RNG.
            rng = None if greedy else torch.Generator().manual_seed(int(torch.randint(0, 2**63 - 1, ()).item()))
            slot = {"engine": engine, "job": jobs[index], "index": index, "rng": rng,
                    "rows": [], "trace": traces[index], "started": time.monotonic()}
            job = slot["job"]
            setup = {"decks": job["decks"]} if "decks" in job else {}
            submit(slot, "reset", seed=job["seed"], orientation=job.get("orientation", 0),
                   limit=job.get("limit", 1500), autoForced=self.auto_forced, **setup)

        def finish(slot):
            results[slot["index"]] = (slot["rows"], slot["result"])
            if next_job < len(jobs) and not should_stop():
                launch(slot["engine"])

        def observe(slot, observation):
            slot["observation"] = observation
            if not observation["done"]:
                ready.append(slot)
                return
            ended = time.monotonic()
            if not slot["rows"]:
                returns = []
            elif observation["outcome"] == "terminal":
                returns = [0.0, 0.0] if observation["winner"] is None else [
                    1.0 if s == observation["winner"] else -1.0 for s in range(2)]
            else:
                with torch.inference_mode():
                    returns = policy.value(torch.tensor(observation["bootstrap"], dtype=torch.float32)).tolist()
            for row in slot["rows"]:
                row["return"] = returns[row["seat"]]
            job = slot["job"]
            result = {k: v for k, v in observation.items() if k != "bootstrap"}
            result.update({k: v for k, v in job.items() if k not in ("opponent", "replay")})
            result.update(replayChecked=job.get("replay", False), simulationSeconds=ended - slot["started"])
            slot["result"] = result
            if job.get("replay", False):
                submit(slot, "replay", generation=slot["generation"])
            else:
                finish(slot)

        for engine in self.engines[:len(jobs)]:
            launch(engine)
        while pending or ready:
            if ready:
                active, ready = sorted(ready, key=lambda s: s["index"]), []
                if should_stop():
                    for slot in active:
                        submit(slot, "truncate", generation=slot["generation"])
                else:
                    groups, references = {}, []
                    for slot in active:
                        observation, job = slot["observation"], slot["job"]
                        forced = len(observation["candidates"]) == 1
                        slot["trainable"] = record_rows and not forced and (job["mode"] in ("teacher", "self") or observation["seat"] == job["learner"])
                        slot["reference"] = not forced and (job["mode"] == "teacher" or (job["mode"] == "reference" and observation["seat"] != job["learner"]))
                        slot.update(action=0 if forced else None, log_prob=0.0, value=0.0)
                        # A bounded forced chain can return a singleton. Continue
                        # it without a neural call or an uninformative PPO row.
                        if forced:
                            continue
                        if slot["trainable"] or not slot["reference"]:
                            slot["inputs"] = compact(observation, self.contract)
                        if slot["reference"]:
                            if slot["trainable"]:
                                references.append(slot)
                        else:
                            acting = job["opponent"] if job["mode"] == "past" and observation["seat"] != job["learner"] else policy
                            groups.setdefault(acting, []).append(slot)
                    with torch.inference_mode():
                        if references:
                            values = policy.value(torch.stack([torch.from_numpy(s["inputs"]["context"]) for s in references]))
                            for slot, value in zip(references, values):
                                slot["value"] = value.item()
                        for acting, group in groups.items():
                            logits, values = acting(*pack([s["inputs"] for s in group]))
                            for slot, scores, value in zip(group, logits, values):
                                distribution = torch.distributions.Categorical(logits=scores) if not greedy or slot["trainable"] else None
                                action = scores.argmax() if greedy else torch.multinomial(
                                    distribution.probs, 1, generator=slot["rng"]).squeeze(0)
                                slot.update(action=action.item(),
                                            log_prob=distribution.log_prob(action).item() if slot["trainable"] else 0.0,
                                            value=value.item() if slot["trainable"] else 0.0)
                    for slot in active:
                        observation = slot["observation"]
                        slot["trace"].append({"ticket": observation["ticket"], "seat": observation["seat"],
                                              "action": slot["action"], "reference": slot["reference"], "accepted": False})
                        arguments = {"generation": slot["generation"], "ticket": observation["ticket"]}
                        if not slot["reference"]:
                            arguments["action"] = slot["action"]
                        submit(slot, "reference" if slot["reference"] else "step", **arguments)
            if not pending:
                continue
            completed, _ = wait(pending, return_when=FIRST_COMPLETED)
            for future in sorted(completed, key=lambda f: pending[f][0]["index"]):
                slot, operation = pending.pop(future)
                try:
                    response = future.result()
                except Exception as error:
                    job = slot['job']
                    ticket = slot.get('observation', {}).get('ticket')
                    raise RuntimeError(f"Simulation {operation} failed: seed={job['seed']}, "
                        f"decks={job.get('decks')}, orientation={job.get('orientation', 0)}, "
                        f"ticket={ticket}: {error}") from error
                if operation == "replay":
                    finish(slot)
                    continue
                if operation == "reset":
                    slot["generation"] = response["generation"]
                elif operation in ("reference", "step"):
                    action = response["index"] if slot["reference"] else slot["action"]
                    slot["trace"][-1].update(action=action, accepted=True)
                    if slot["trainable"]:
                        slot["rows"].append({**slot["inputs"], "seat": slot["observation"]["seat"],
                                             "action": action, "log_prob": slot["log_prob"], "value": slot["value"]})
                observe(slot, response["observation"])
        ordered = [results[i] for i in range(next_job)]
        self.last_metrics = {"seconds": time.monotonic() - started, "games": len(ordered), "requests": requests,
                             "queuedGames": len(jobs),
                             "forcedChoices": sum(r.get("forcedChoices", 0) for _, r in ordered),
                             "meanGameSeconds": sum(r["simulationSeconds"] for _, r in ordered) / len(ordered)}
        return ordered

    def close(self):
        self.stack.close()

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()
