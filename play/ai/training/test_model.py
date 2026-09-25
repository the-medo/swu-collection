import json
from pathlib import Path
import tempfile
import unittest

import torch

from engine import Engine
from model import Policy, load_model, save_model, tensors


class ModelTests(unittest.TestCase):
    def test_mask_and_action_permutation(self):
        torch.manual_seed(1)
        policy = Policy(3, 8)
        observations = [{"features": [[1, 0, 0], [0, 1, 0]]}, {"features": [[0, 0, 1]]}]
        inputs, mask = tensors(observations, 3)
        logits = policy(inputs, mask)
        self.assertEqual(logits.softmax(-1)[1, 1].item(), 0)
        torch.testing.assert_close(policy(inputs.flip(1), mask.flip(1)), logits.flip(1))
        with self.assertRaises(ValueError):
            tensors([{"features": [[float("nan"), 0, 1]]}], 3)

    def test_reload_is_frozen_and_rejects_corrupt_or_incompatible_models(self):
        contract = {"protocol": 1, "features": ["one", "two", "three"]}
        policy = Policy(3, 8)
        inputs, mask = tensors([{"features": [[1, 2, 3], [3, 2, 1]]}], 3)
        with tempfile.TemporaryDirectory() as root:
            directory = Path(root) / "model"
            save_model(directory, policy, contract, {})
            frozen, _ = load_model(directory, contract)
            torch.testing.assert_close(frozen(inputs, mask), policy(inputs, mask), rtol=0, atol=0)
            self.assertTrue(all(not value.requires_grad for value in frozen.parameters()))
            with self.assertRaises(ValueError):
                load_model(directory, {**contract, "protocol": 2})
            with self.assertRaises(FileExistsError):
                save_model(directory, policy, contract, {})
            weights = directory / "weights.pt"
            weights.write_bytes(weights.read_bytes() + b"corrupt")
            with self.assertRaisesRegex(ValueError, "checksum"):
                load_model(directory, contract)

    def test_real_engine_bridge_returns_only_policy_inputs_and_results(self):
        with Engine() as engine:
            batch = engine.request("reset", split="validation", start=0, batch=4)
            observation = batch["observations"][0]
            self.assertEqual(set(observation), {"features", "fingerprint", "descriptions"})
            policy = Policy(len(engine.contract["features"]))
            inputs, mask = tensors(batch["observations"], policy.features)
            actions = policy(inputs, mask).argmax(-1).tolist()
            result = engine.request("step", generation=batch["generation"], actions=actions)
            self.assertEqual(len(result["results"]), 4)
            self.assertNotIn('"state"', json.dumps(result))
            self.assertNotIn('"inputs"', json.dumps(result))
            with self.assertRaisesRegex(RuntimeError, "Stale"):
                engine.request("step", generation=batch["generation"], actions=actions)


if __name__ == "__main__":
    torch.set_num_threads(2)
    unittest.main()
