"""Small shared action scorer. File weights are separate from game state."""

import hashlib
import json
from pathlib import Path

import torch
from torch import nn


class Policy(nn.Module):
    def __init__(self, features, width=64):
        super().__init__()
        self.features = features
        self.width = width
        self.network = nn.Sequential(
            nn.Linear(features, width), nn.Tanh(),
            nn.Linear(width, width), nn.Tanh(), nn.Linear(width, 1),
        )

    def forward(self, inputs, mask):
        return self.network(inputs).squeeze(-1).masked_fill(~mask, -torch.inf)


def tensors(observations, features):
    if not observations or any(not item["features"] for item in observations):
        raise ValueError("Expected observations with at least one action")
    count = max(len(item["features"]) for item in observations)
    inputs = torch.zeros(len(observations), count, features)
    mask = torch.zeros(len(observations), count, dtype=torch.bool)
    for index, observation in enumerate(observations):
        values = torch.tensor(observation["features"], dtype=torch.float32)
        if values.ndim != 2 or values.shape[1] != features or not torch.isfinite(values).all():
            raise ValueError("Invalid observation feature shape or values")
        inputs[index, :len(values)] = values
        mask[index, :len(values)] = True
    return inputs, mask


def save_model(directory, policy, contract, training):
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=False)
    weights = directory / "weights.pt"
    torch.save(policy.state_dict(), weights)
    manifest = {
        "format": 1,
        "architecture": "candidate-mlp-tanh-v1",
        "width": policy.width,
        "parameters": sum(value.numel() for value in policy.parameters()),
        "weightsBytes": weights.stat().st_size,
        "sha256": hashlib.sha256(weights.read_bytes()).hexdigest(),
        "contract": contract,
        "training": training,
        "scope": "One-move vanilla tactics only; not a full-game or live bot",
    }
    (directory / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    return manifest


def load_model(directory, contract):
    directory = Path(directory)
    manifest = json.loads((directory / "manifest.json").read_text())
    if (manifest.get("format") != 1
            or manifest.get("architecture") != "candidate-mlp-tanh-v1"
            or manifest.get("contract") != contract
            or type(manifest.get("width")) is not int
            or not 1 <= manifest["width"] <= 1024):
        raise ValueError("Model is incompatible with this engine/feature contract")
    weights = directory / "weights.pt"
    if hashlib.sha256(weights.read_bytes()).hexdigest() != manifest["sha256"]:
        raise ValueError("Model checksum mismatch")
    policy = Policy(len(contract["features"]), manifest["width"])
    policy.load_state_dict(torch.load(weights, map_location="cpu", weights_only=True))
    if any(not torch.isfinite(value).all() for value in policy.parameters()):
        raise ValueError("Model contains non-finite weights")
    policy.eval()
    policy.requires_grad_(False)
    return policy, manifest
