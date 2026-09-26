"""Shared features, routed leader/strategy experts and a learned action scorer.

Routing uses only the encoder's own-deck identity slice. Opponent adaptation uses
the existing seat-visible context, never the simulator's opposing deck index.
Archetype tags describe each pinned list; they are not inferred labels for unseen
deck variants. Initial specialists start fresh; explicit roster expansion carries
compatible specialist weights forward without importing retired league weights.
"""
import copy
import json
from pathlib import Path

import torch
from torch import nn

ARCHITECTURE = 'crossfire-specialists-v1'
EXPANDABLE_ARCHITECTURE = 'crossfire-specialists-v2'
ROSTER = json.loads((Path(__file__).resolve().parents[1] / 'specialists/roster.json').read_text())


def expert(size=160):
    return nn.Sequential(nn.Linear(size, 32), nn.Tanh(), nn.Linear(32, 16), nn.Tanh())


class SpecialistPolicy(nn.Module):
    architecture = ARCHITECTURE

    def __init__(self, contract):
        super().__init__()
        encoding = contract['encoding']
        vocabulary = encoding.get('vocabulary', [])
        width = len(vocabulary) + 1
        self.dynamic = contract.get('scope') == 'roster-full-game-v2'
        self.roster = copy.deepcopy(contract['specialists'] if self.dynamic else ROSTER)
        self.decks = self.roster['decks'] if self.dynamic else [
            {**d, 'leaderKey': d['key']} for d in self.roster['leaders']]
        deck_keys = [d['key'] for d in self.decks]
        self.own_deck_start = 76 + width * 15 + 192
        if (contract.get('scope') not in ('six-deck-full-game-v1', 'roster-full-game-v2')
                or encoding.get('version') != (2 if self.dynamic else 1)
                or encoding['contextSize'] != self.own_deck_start + (len(self.decks) if self.dynamic else 0)
                or encoding['candidateSize'] != 16 + (40 + width) * 2 + 64
                or [d['key'] for d in contract['decks']] != deck_keys
                or (self.dynamic and encoding.get('ownDeckKeys') != deck_keys)):
            raise ValueError('Specialists require their pinned visible encoding and roster')
        self.architecture = EXPANDABLE_ARCHITECTURE if self.dynamic else ARCHITECTURE
        self.spec = {'version': 2 if self.dynamic else 1, 'roster': copy.deepcopy(self.roster),
                     'routing': 'own-list-strategies-v2' if self.dynamic else 'own-deck-leader-and-list-strategies-v1',
                     'matchup': 'explicit-visible-opponent-v1', 'initialization': 'fresh'}
        self.context_size, self.candidate_size = encoding['contextSize'], encoding['candidateSize']
        try:
            columns = [76 + vocabulary.index(d['cardId']) + 1 for d in self.roster['leaders']]
        except ValueError:
            raise ValueError('Specialist leader missing from vocabulary') from None
        if len(set(columns)) != len(columns):
            raise ValueError('Duplicate specialist leader identities')
        self.register_buffer('leader_columns', torch.tensor(columns), persistent=False)
        self.leader_keys = [d['key'] for d in self.roster['leaders']] + ['fallback']
        self.strategy_keys = [d['key'] for d in self.roster['strategies']]
        if (len(set(self.leader_keys)) != len(self.leader_keys)
                or len(set(self.strategy_keys)) != len(self.strategy_keys)
                or len(set(deck_keys)) != len(deck_keys)
                or any(d['leaderKey'] not in self.leader_keys[:-1] or not d['strategies']
                       or not set(d['strategies']).issubset(self.strategy_keys) for d in self.decks)):
            raise ValueError('Invalid specialist routing roster')
        self.opponent_start, self.opponent_end = 76 + width * 8, 76 + width * 15
        masks = [[s in d['strategies'] for s in self.strategy_keys] for d in self.decks]
        self.register_buffer('strategy_masks', torch.tensor(masks + [[True] * len(self.strategy_keys)]), persistent=False)
        self.context_net = nn.Sequential(nn.Linear(self.context_size, 96), nn.Tanh())
        self.candidate_net = nn.Sequential(nn.Linear(self.candidate_size, 64), nn.Tanh())
        self.leaders = nn.ModuleDict({key: expert() for key in self.leader_keys})
        self.strategies = nn.ModuleDict({key: expert() for key in self.strategy_keys})
        self.router = nn.Linear(96, len(self.strategy_keys))
        # Opponent public aggregates and visible card identities bypass the shared
        # bottleneck. Hidden hand/deck identities are absent from this encoding.
        self.matchup = expert(96 + 29 + width * 7)
        self.scorer = nn.Sequential(nn.Linear(208, 64), nn.Tanh(), nn.Linear(64, 1))
        self.critic = nn.Sequential(nn.Linear(96, 64), nn.Tanh(), nn.Linear(64, 1))
        self.leader_values = nn.ModuleDict({key: nn.Linear(96, 1) for key in self.leader_keys})

    def routes(self, contexts):
        known = contexts[:, self.leader_columns]
        maximum, route = known.max(dim=1)
        # Unknown own leaders use a general fallback. Never route by absolute seat.
        return torch.where(maximum > 0, route, len(self.leader_keys) - 1)

    def list_routes(self, contexts):
        if not self.dynamic:
            return self.routes(contexts)
        maximum, routes = contexts[:, self.own_deck_start:].max(dim=1)
        return torch.where(maximum > 0, routes, len(self.decks))

    def strategy_weights(self, shared, routes, contexts=None):
        selected = self.list_routes(contexts) if self.dynamic else routes
        return self.router(shared).masked_fill(~self.strategy_masks[selected], -torch.inf).softmax(-1)

    def _value(self, shared, routes):
        value = self.critic(shared).squeeze(-1)
        for i, key in enumerate(self.leader_keys):
            rows = (routes == i).nonzero(as_tuple=True)[0]
            if len(rows):
                value = value.index_add(0, rows, self.leader_values[key](shared[rows]).squeeze(-1))
        return value

    def forward(self, contexts, candidates, lengths):
        shared = self.context_net(contexts)
        routes = self.routes(contexts)
        repeated_routes = torch.repeat_interleave(routes, lengths)
        combined = torch.cat((torch.repeat_interleave(shared, lengths, dim=0),
                              self.candidate_net(candidates)), dim=-1)
        leader_features = combined.new_zeros((len(candidates), 16))
        for i, key in enumerate(self.leader_keys):
            rows = (repeated_routes == i).nonzero(as_tuple=True)[0]
            if len(rows):
                leader_features = leader_features.index_add(0, rows, self.leaders[key](combined[rows]))
        weights = torch.repeat_interleave(self.strategy_weights(shared, routes, contexts), lengths, dim=0)
        strategy_features = combined.new_zeros((len(candidates), 16))
        for i, key in enumerate(self.strategy_keys):
            rows = (weights[:, i] > 0).nonzero(as_tuple=True)[0]
            if len(rows):
                strategy_features = strategy_features.index_add(
                    0, rows, self.strategies[key](combined[rows]) * weights[rows, i:i + 1])
        opponent = torch.cat((contexts[:, 47:76], contexts[:, self.opponent_start:self.opponent_end]), -1)
        matchup_features = torch.repeat_interleave(self.matchup(torch.cat((shared, opponent), -1)), lengths, dim=0)
        scores = self.scorer(torch.cat((combined, leader_features, strategy_features, matchup_features), -1)).squeeze(-1)
        return list(scores.split(lengths.tolist())), self._value(shared, routes)

    def value(self, contexts):
        return self._value(self.context_net(contexts), self.routes(contexts))

    def learning_counts(self, contexts):
        """Count routed leader rows and strategy eligibility, not contribution or skill."""
        routes = self.routes(contexts)
        n = len(contexts)
        result = {key: n for key in ('shared', 'router', 'matchup', 'scorer', 'value')}
        result.update({f'leader:{key}': int((routes == i).sum()) for i, key in enumerate(self.leader_keys)})
        result.update({f'strategy:{key}': int(self.strategy_masks[self.list_routes(contexts), i].sum())
                       for i, key in enumerate(self.strategy_keys)})
        return result

    def dashboard(self, state):
        def component(key, kind, label, modules):
            counts = state.get('componentTraining', {}).get(key, {})
            return {'id': key, 'kind': kind, 'label': label,
                    'parameters': sum(p.numel() for m in modules for p in m.parameters()),
                    'decisions': counts.get('decisions', 0), 'updates': counts.get('updates', 0)}
        components = [component('shared', 'shared', 'Shared encoder', [self.context_net, self.candidate_net]),
                      component('router', 'router', 'Strategy router', [self.router]),
                      component('matchup', 'matchup', 'Visible matchup adapter', [self.matchup]),
                      component('scorer', 'scorer', 'Learned action scorer', [self.scorer]),
                      component('value', 'value', 'Shared value estimator', [self.critic])]
        for leader in self.roster['leaders'] + [{'key': 'fallback', 'label': 'Unknown leader fallback'}]:
            key = leader['key']
            components.append(component(f'leader:{key}', 'leader', leader['label'],
                                        [self.leaders[key], self.leader_values[key]]))
        for strategy in self.roster['strategies']:
            components.append(component(f'strategy:{strategy["key"]}', 'strategy', strategy['label'],
                                        [self.strategies[strategy['key']]]))
        expanded = state.get('initialization', {}).get('kind') == 'expanded-specialists'
        leaders = [{**leader, 'strategies': list(dict.fromkeys(s for d in self.decks
                    if d['leaderKey'] == leader['key'] for s in d['strategies']))}
                   for leader in self.roster['leaders']]
        return {'architecture': self.architecture, 'initialization': 'expanded' if expanded else 'fresh',
                'qualification': 'unqualified', 'components': components,
                'leaders': leaders,
                **({'decks': copy.deepcopy(self.decks), 'inheritedGames': state['initialization'].get('games', 0),
                    'inheritedUpdates': state['initialization'].get('updates', 0)} if self.dynamic else {}),
                'humanReplayLearning': 'available', 'baselineWeightsImported': False,
                'matchupInputs': 'seat-visible state only',
                'evaluationReference': 'retired league model' }
