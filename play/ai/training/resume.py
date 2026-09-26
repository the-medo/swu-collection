"""Checked recovery at a completed collection/update boundary."""
import hashlib
import io
import json
import random

import torch
from full_model import FullPolicy
from resource_budget import FILE_LIMIT


def restore(run, contract, policy, optimizer, *, seed, warmup):
    status = json.loads((run / "status.json").read_text())
    manifest = json.loads((run / "latest.json").read_text())
    if status["status"] not in ("stopped", "finished"):
        raise ValueError("Resume requires a gracefully stopped or finished run")
    if status.get("seed") != seed or status["warmupGames"] != warmup:
        raise ValueError("Resume must preserve the original seed and warm-up configuration")
    if manifest["file"] not in ("checkpoint-0.pt", "checkpoint-1.pt"):
        raise ValueError("Invalid checkpoint filename")
    path = run / manifest["file"]
    if path.stat().st_size > FILE_LIMIT:
        raise ValueError("Checkpoint exceeds the artifact size limit")
    data = path.read_bytes()
    if hashlib.sha256(data).hexdigest() != manifest["sha256"]:
        raise ValueError("Checkpoint checksum mismatch")
    saved = torch.load(io.BytesIO(data), map_location="cpu", weights_only=True)
    if saved.get("architecture") != "context-candidate-ppo-v1" or saved.get("contract") != contract:
        raise ValueError("Incompatible resume checkpoint")
    if saved.get("resumeReady", True) is not True:
        raise ValueError("Checkpoint contains an unfinished collection buffer")
    if any(saved[k] != status[k] or saved[k] != manifest[k] for k in ("games", "updates")):
        raise ValueError("Checkpoint and final status counters disagree")
    if len(saved["opponents"]) > 3:
        raise ValueError("Opponent pool exceeds its bound")
    policy.load_state_dict(saved["model"], strict=True)
    optimizer.load_state_dict(saved["optimizer"])
    opponents = []
    for weights in saved["opponents"]:
        opponent = FullPolicy(contract).eval().requires_grad_(False)
        opponent.load_state_dict(weights, strict=True)
        opponents.append(opponent)
    if any(not torch.isfinite(p).all() for model in [policy, *opponents] for p in model.parameters()):
        raise ValueError("Non-finite checkpoint weights")
    if any(not torch.isfinite(v).all() for state in optimizer.state.values()
           for v in state.values() if isinstance(v, torch.Tensor)):
        raise ValueError("Non-finite optimizer state")
    torch.set_rng_state(saved["torchRng"])
    random.setstate(saved["pythonRng"])
    return status, opponents, {"run": str(run), **manifest}
