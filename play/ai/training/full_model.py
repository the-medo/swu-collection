"""Shared context/candidate network; no deck-specific policy files or rules."""
import numpy as np
import torch
from torch import nn


class FullPolicy(nn.Module):
    architecture = 'context-candidate-ppo-v1'

    def __init__(self, contract):
        super().__init__()
        encoding = contract["encoding"]
        self.context_size = encoding["contextSize"]
        self.candidate_size = encoding["candidateSize"]
        self.context_net = nn.Sequential(nn.Linear(self.context_size, 96), nn.Tanh())
        self.candidate_net = nn.Sequential(nn.Linear(self.candidate_size, 64), nn.Tanh())
        self.actor = nn.Sequential(nn.Linear(160, 64), nn.Tanh(), nn.Linear(64, 1))
        self.critic = nn.Sequential(nn.Linear(96, 64), nn.Tanh(), nn.Linear(64, 1))

    def forward(self, contexts, candidates, lengths):
        shared = self.context_net(contexts)
        features = torch.cat((torch.repeat_interleave(shared, lengths, dim=0), self.candidate_net(candidates)), dim=-1)
        scores = self.actor(features).squeeze(-1)
        return list(scores.split(lengths.tolist())), self.critic(shared).squeeze(-1)

    def value(self, contexts):
        return self.critic(self.context_net(contexts)).squeeze(-1)


def pack(observations):
    contexts = torch.from_numpy(np.stack([o["context"] for o in observations]))
    candidates = torch.from_numpy(np.concatenate([o["candidates"] for o in observations]))
    lengths = torch.tensor([len(o["candidates"]) for o in observations])
    return contexts, candidates, lengths


def compact(observation, contract):
    context = np.asarray(observation["context"], dtype=np.float32)
    candidates = np.asarray(observation["candidates"], dtype=np.float32)
    encoding = contract["encoding"]
    if (context.shape != (encoding["contextSize"],) or candidates.ndim != 2
            or candidates.shape[1] != encoding["candidateSize"] or len(candidates) < 1
            or not np.isfinite(context).all() or not np.isfinite(candidates).all()):
        raise ValueError("Invalid full-game observation")
    return {"context": context, "candidates": candidates}


def act(policy, observation, *, greedy=False):
    with torch.inference_mode():
        logits, values = policy(*pack([observation]))
        distribution = torch.distributions.Categorical(logits=logits[0])
        action = logits[0].argmax() if greedy else distribution.sample()
        return action.item(), distribution.log_prob(action).item(), values[0].item()


def frozen_copy(policy):
    import copy
    result = copy.deepcopy(policy).eval()
    result.requires_grad_(False)
    return result


def make_policy(contract, architecture='context-candidate-ppo-v1'):
    if architecture == FullPolicy.architecture:
        return FullPolicy(contract)
    from specialist_model import ARCHITECTURE, EXPANDABLE_ARCHITECTURE, SpecialistPolicy
    if architecture in (ARCHITECTURE, EXPANDABLE_ARCHITECTURE):
        model = SpecialistPolicy(contract)
        if model.architecture != architecture:
            raise ValueError('Policy architecture does not match roster contract')
        return model
    raise ValueError('Unknown policy architecture')


def load_frozen(path, contract):
    payload = torch.load(path, map_location="cpu", weights_only=True)
    if payload.get("contract") != contract:
        raise ValueError("Incompatible full-game checkpoint")
    # Loading an opponent/checkpoint must not advance the learner's RNG stream.
    with torch.random.fork_rng(devices=[]):
        model = make_policy(contract, payload.get('architecture'))
    if payload.get('policySpec') != getattr(model, 'spec', None):
        raise ValueError('Incompatible specialist routing contract')
    model.load_state_dict(payload["model"], strict=True)
    if any(not torch.isfinite(p).all() for p in model.parameters()):
        raise ValueError("Non-finite model weights")
    model.eval().requires_grad_(False)
    return model
