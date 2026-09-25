from pathlib import Path
import tempfile
import unittest

import torch
from engine import Engine
from full_model import FullPolicy, act, compact, load_frozen, pack
from resource_budget import ArtifactBudget, FILE_LIMIT, HEADROOM


class FullTrainingTests(unittest.TestCase):
    def test_bridge_flushes_complete_frame_at_pipe_buffer_boundary(self):
        # This real position's response occupies 4096 bytes before its newline
        # with a four-digit request ID. Separate console writes stranded that
        # final newline, leaving both peers waiting for input indefinitely.
        with Engine(timeout=5, bridge="play/ai/full-game/bridge.ts") as engine:
            response = engine.request("reset", seed=33, orientation=0)
            generation = response["generation"]
            for ticket in range(43):
                engine.request("reference", generation=generation, ticket=ticket)
            engine.sequence = 999
            response = engine.request("reference", generation=generation, ticket=43)
            self.assertEqual(response["observation"]["ticket"], 44)

    def test_frozen_model_and_candidate_permutation(self):
        with Engine(bridge="play/ai/full-game/bridge.ts") as engine, tempfile.TemporaryDirectory() as tmp:
            model = FullPolicy(engine.contract)
            batch = engine.request("reset", seed=90, orientation=0, limit=1)
            inputs = compact(batch["observation"], engine.contract)
            with torch.inference_mode():
                scores, values = model(*pack([inputs]))
                reversed_input = {**inputs, "candidates": inputs["candidates"][::-1].copy()}
                reversed_scores, _ = model(*pack([reversed_input]))
                torch.testing.assert_close(scores[0], reversed_scores[0].flip(0))
            path = Path(tmp) / "model.pt"
            torch.save({"architecture": "context-candidate-ppo-v1", "contract": engine.contract, "model": model.state_dict()}, path)
            frozen = load_frozen(path, engine.contract)
            self.assertTrue(all(not p.requires_grad for p in frozen.parameters()))
            self.assertEqual(act(model, inputs, greedy=True), act(frozen, inputs, greedy=True))
            bad = {**engine.contract, "scope": "other"}
            with self.assertRaises(ValueError):
                load_frozen(path, bad)
            broken = {**batch["observation"], "context": [float("nan")] * len(inputs["context"])}
            with self.assertRaises(ValueError):
                compact(broken, engine.contract)

    def test_real_terminal_perspectives_and_learning_update(self):
        from full_train import collect, optimize
        torch.set_num_threads(2)
        with Engine(bridge="play/ai/full-game/bridge.ts") as engine:
            policy = FullPolicy(engine.contract)
            rows, result = collect(engine, policy, seed=103, orientation=1,
                                   learner=0, mode="teacher", replay=True)
            self.assertEqual(result["outcome"], "terminal")
            self.assertEqual({r["seat"] for r in rows}, {0, 1})
            self.assertIsNotNone(result["winner"])
            for row in rows:
                self.assertEqual(row["return"], 1.0 if row["seat"] == result["winner"] else -1.0)
            before = {name: p.detach().clone() for name, p in policy.named_parameters()}
            metrics = optimize(policy, torch.optim.Adam(policy.parameters(), lr=0.0003), rows, imitation=True)
            self.assertEqual(metrics["decisions"], len(rows))
            self.assertTrue(all(torch.isfinite(p).all() for p in policy.parameters()))
            self.assertTrue(any(not torch.equal(before[name], p) for name, p in policy.named_parameters()))

    def test_budget_refuses_overflow_before_mutation_and_excludes_concurrent_writer(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            budget = ArtifactBudget(root, limit=HEADROOM + 100_000)
            try:
                budget.write(root / "saved", b"original")
                with self.assertRaises(RuntimeError):
                    ArtifactBudget(root)
                with self.assertRaises(RuntimeError):
                    budget.write(root / "saved", b"x" * 100_000)
                self.assertEqual((root / "saved").read_bytes(), b"original")
                self.assertFalse((root / "saved.tmp").exists())
                with self.assertRaises(ValueError):
                    budget.write(root.parent / "outside", b"no")
                with self.assertRaises(RuntimeError):
                    budget.check(FILE_LIMIT + 1)
            finally:
                budget.close()


if __name__ == "__main__":
    torch.set_num_threads(2)
    unittest.main()
