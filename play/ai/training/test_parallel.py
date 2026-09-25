import hashlib
import json
from pathlib import Path
import random
import tempfile
import threading
import unittest
from unittest.mock import patch

import numpy as np
import torch
from full_model import FullPolicy, frozen_copy
from full_train import collect, validate
from parallel import Collector
from resume import restore


class ParallelTrainingTests(unittest.TestCase):
    def test_worker_failure_reports_the_reproducible_game_and_ticket(self):
        class FailedEngine:
            contract = {"encoding": {"contextSize": 4, "candidateSize": 3}}
            def __init__(self, **_): pass
            def __enter__(self): return self
            def __exit__(self, *_): pass
            def request(self, operation, **arguments):
                if operation == 'reset':
                    return {'generation': 1, 'observation': {
                        'done': False, 'seat': 0, 'ticket': 121,
                        'context': [0.] * 4, 'candidates': [[0.] * 3]}}
                raise RuntimeError('Maximum call stack size exceeded.')
        with patch('parallel.Engine', FailedEngine), Collector(1) as collector:
            job = {'seed': 20277449, 'decks': [7, 0], 'orientation': 0, 'learner': 0, 'mode': 'self'}
            with self.assertRaisesRegex(RuntimeError,
                r'Simulation step failed: seed=20277449, decks=\[7, 0\], orientation=0, ticket=121: Maximum call stack'):
                collector.collect(FullPolicy(collector.contract), [job])

    def test_parallel_evaluation_matches_serial_without_training_rows_or_rng_changes(self):
        torch.set_num_threads(1)
        with Collector(3) as collector:
            policy = FullPolicy(collector.contract)
            weights = {k: v.clone() for k, v in policy.state_dict().items()}
            torch_rng, python_rng = torch.get_rng_state(), random.getstate()
            expected = [collect(collector.engines[0], policy, seed=1_000_000 + i // 4,
                                orientation=i % 2, learner=i // 2 % 2, mode="reference",
                                greedy=True, replay=i == 0)[1] for i in range(4)]
            original_collect = collector.collect
            captured_rows = []

            def capture(*args, **kwargs):
                results = original_collect(*args, **kwargs)
                captured_rows.extend(rows for rows, _ in results)
                return results

            with patch.object(collector, "collect", side_effect=capture):
                actual = validate(collector, policy, 4, float("inf"))
            self.assertEqual(captured_rows, [[], [], [], []])
            self.assertEqual([{k: v for k, v in r.items() if k != "simulationSeconds"}
                              for r in actual["games"]], expected)
            self.assertEqual(sum(actual["outcomes"].values()), 4)
            self.assertTrue(torch.equal(torch.get_rng_state(), torch_rng))
            self.assertEqual(random.getstate(), python_rng)
            for key, value in policy.state_dict().items():
                torch.testing.assert_close(value, weights[key], rtol=0, atol=0)
            self.assertEqual(validate(collector, policy, 8, 0)["games"], [])
            with patch("full_train.STOP", True):
                self.assertEqual(validate(collector, policy, 8, float("inf"))["games"], [])

    def test_evaluation_windows_keep_the_complete_fixed_schedule(self):
        class FakeCollector:
            engines = [None] * 9

            def collect(self, policy, jobs, **kwargs):
                self_windows.append(len(jobs))
                return [([], {**job, "outcome": "terminal", "winner": job["learner"]}) for job in jobs]

        self_windows = []
        actual = validate(FakeCollector(), None, 64, float("inf"))
        self.assertEqual(self_windows, [18, 18, 18, 10])
        self.assertEqual(actual["outcomes"], {"win": 64})
        self.assertEqual([(r["seed"], r["orientation"], r["learner"]) for r in actual["games"]],
                         [(1_000_000 + i // 4, i % 2, i // 2 % 2) for i in range(64)])

    def test_ready_worker_advances_and_refills_while_another_request_is_blocked(self):
        refilled = threading.Event()
        admitted = []

        class FakeEngine:
            contract = {"encoding": {"contextSize": 4, "candidateSize": 3}}

            def __init__(self, **_):
                pass

            def __enter__(self):
                self.generation = 0
                return self

            def __exit__(self, *_):
                pass

            def request(self, operation, **arguments):
                if operation == "reset":
                    self.seed = arguments["seed"]
                    admitted.append(self.seed)
                    self.generation += 1
                    if self.seed == 3:
                        refilled.set()
                    return {"generation": self.generation, "observation": {
                        "done": False, "seat": 1, "ticket": 0,
                        "context": [0.] * 4, "candidates": [[0.] * 3, [1.] * 3]}}
                if operation == "reference":
                    if self.seed == 1 and not refilled.wait(5):
                        raise TimeoutError("Fast worker did not refill while the slow worker was busy")
                    return {"index": 0, "observation": {"done": True, "outcome": "terminal",
                            "winner": 1, "commands": 1, "microsteps": 1}}
                raise AssertionError(operation)

        with patch("parallel.Engine", FakeEngine), Collector(2) as collector:
            policy = FullPolicy(collector.contract)
            jobs = [{"seed": n, "orientation": 0, "learner": 0, "mode": "reference"} for n in (1, 2, 3)]
            results = collector.collect(policy, jobs)
            self.assertEqual([r["seed"] for _, r in results], [1, 2, 3])
            self.assertEqual(sorted(admitted), [1, 2, 3])
            self.assertTrue(refilled.is_set())

    def test_parallel_reference_games_match_serial_trajectories(self):
        torch.set_num_threads(1)
        jobs = [{"seed": 30 + n, "orientation": n % 2, "learner": n % 2,
                 "mode": "teacher", "replay": True} for n in range(3)]
        with Collector(1) as serial:
            policy = FullPolicy(serial.contract)
            expected = [serial.collect(policy, [j], greedy=True)[0] for j in jobs]
        with Collector(3) as parallel:
            actual = parallel.collect(policy, jobs, greedy=True)
            self.assertEqual(len({e.process.pid for e in parallel.engines}), 3)
        for (rows, result), (other_rows, other_result) in zip(actual, expected):
            for key in ("outcome", "winner", "commands", "microsteps", "seed", "orientation"):
                self.assertEqual(result[key], other_result[key])
            self.assertEqual(result["outcome"], "terminal")
            self.assertEqual(len(rows), len(other_rows))
            for row, other in zip(rows, other_rows):
                for key in ("seat", "action", "return"):
                    self.assertEqual(row[key], other[key])
                np.testing.assert_array_equal(row["context"], other["context"])
                np.testing.assert_array_equal(row["candidates"], other["candidates"])
                self.assertAlmostEqual(row["value"], other["value"], places=5)

    def test_mixed_opponents_keep_only_learner_actions_and_stop_every_game(self):
        torch.set_num_threads(1)
        with Collector(3) as collector:
            policy = FullPolicy(collector.contract)
            before = {k: v.clone() for k, v in policy.state_dict().items()}
            jobs = [{"seed": 110 + n, "orientation": n % 2, "learner": n % 2,
                     "mode": mode, "opponent": frozen_copy(policy) if mode == "past" else None,
                     "limit": 12, "replay": True} for n, mode in enumerate(("reference", "self", "past"))]
            traces = [[], [], []]
            results = collector.collect(policy, jobs, greedy=True, traces=traces)
            for (rows, result), job, trace in zip(results, jobs, traces):
                self.assertTrue(trace and all(r["accepted"] for r in trace))
                if job["mode"] != "self":
                    self.assertTrue(rows)
                    self.assertEqual({row["seat"] for row in rows}, {job["learner"]})
                self.assertTrue(all(np.isfinite(row["return"]) and np.isfinite(row["log_prob"]) for row in rows))
                self.assertEqual(result["outcome"], "cutoff")
                self.assertIsNone(result["winner"])
            for key, value in policy.state_dict().items():
                torch.testing.assert_close(value, before[key], rtol=0, atol=0)
            results = collector.collect(policy, jobs * 2, deadline=0)
            self.assertEqual(len(results), 3)  # Never start the queued games after the deadline.
            self.assertTrue(all(not rows and r["outcome"] == "cutoff" and r["reason"] == "run-budget"
                                for rows, r in results))

    def test_sampled_games_do_not_depend_on_worker_arrival_order(self):
        torch.set_num_threads(1)
        jobs = [{"seed": 170 + n, "orientation": n % 2, "learner": n % 2,
                 "mode": "self", "limit": 20, "replay": True} for n in range(5)]
        with Collector(1) as serial:
            policy = FullPolicy(serial.contract)
            torch.manual_seed(901)
            expected = serial.collect(policy, jobs)
        with Collector(3) as parallel:
            torch.manual_seed(901)
            actual = parallel.collect(policy, jobs)
        for (rows, result), (other_rows, other_result) in zip(actual, expected):
            for key in ("outcome", "winner", "commands", "microsteps", "forcedChoices", "seed"):
                self.assertEqual(result[key], other_result[key])
            self.assertEqual(len(rows), len(other_rows))
            for row, other in zip(rows, other_rows):
                self.assertGreater(len(row["candidates"]), 1)
                for key in ("seat", "action"):
                    self.assertEqual(row[key], other[key])
                for key in ("return", "log_prob", "value"):
                    self.assertAlmostEqual(row[key], other[key], places=5)
                np.testing.assert_array_equal(row["context"], other["context"])
                np.testing.assert_array_equal(row["candidates"], other["candidates"])

    def test_resume_preserves_optimizer_opponents_and_rng_and_rejects_bad_artifacts(self):
        contract = {"encoding": {"contextSize": 4, "candidateSize": 3}}
        original = FullPolicy(contract)
        optimizer = torch.optim.Adam(original.parameters(), lr=0.0003)
        logits, value = original(torch.randn(1, 4), torch.randn(2, 3), torch.tensor([2]))
        (logits[0].square().sum() + value.square().sum()).backward()
        optimizer.step()
        with tempfile.TemporaryDirectory() as tmp:
            run = Path(tmp)
            status = {"status": "stopped", "seed": 17, "warmupGames": 24, "games": 100, "updates": 30}
            saved = {"architecture": "context-candidate-ppo-v1", "contract": contract,
                     "model": original.state_dict(), "optimizer": optimizer.state_dict(),
                     "opponents": [original.state_dict()], "games": 100, "updates": 30,
                     "resumeReady": True, "torchRng": torch.get_rng_state(), "pythonRng": random.getstate()}
            path = run / "checkpoint-0.pt"
            torch.save(saved, path)
            manifest = {"file": path.name, "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "games": 100, "updates": 30}
            (run / "latest.json").write_text(json.dumps(manifest))
            (run / "status.json").write_text(json.dumps(status))
            restored = FullPolicy(contract)
            restored_optimizer = torch.optim.Adam(restored.parameters(), lr=0.0003)
            inherited, opponents, provenance = restore(run, contract, restored, restored_optimizer, seed=17, warmup=24)
            self.assertEqual(inherited, status)
            self.assertEqual(provenance["sha256"], manifest["sha256"])
            for name, weights in original.state_dict().items():
                torch.testing.assert_close(weights, restored.state_dict()[name], rtol=0, atol=0)
                torch.testing.assert_close(weights, opponents[0].state_dict()[name], rtol=0, atol=0)
            self.assertTrue(all(not p.requires_grad for p in opponents[0].parameters()))
            self.assertTrue(torch.equal(torch.get_rng_state(), saved["torchRng"]))
            self.assertEqual(random.getstate(), saved["pythonRng"])
            for index, state in optimizer.state_dict()["state"].items():
                for key, value in state.items():
                    torch.testing.assert_close(value, restored_optimizer.state_dict()["state"][index][key], rtol=0, atol=0)
            status["status"] = "training"
            (run / "status.json").write_text(json.dumps(status))
            with self.assertRaisesRegex(ValueError, "gracefully"):
                restore(run, contract, restored, restored_optimizer, seed=17, warmup=24)
            status["status"] = "stopped"
            (run / "status.json").write_text(json.dumps(status))
            path.write_bytes(path.read_bytes() + b"corrupted")
            with self.assertRaisesRegex(ValueError, "checksum"):
                restore(run, contract, restored, restored_optimizer, seed=17, warmup=24)


if __name__ == "__main__":
    unittest.main()
