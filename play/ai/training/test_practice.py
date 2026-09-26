import unittest
import random
import torch
from full_model import make_policy
from engine import Engine
from practice_training import load_practice, warmup, evaluate_practice, benchmark_jobs

class PracticeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        torch.set_num_threads(1)
        with Engine(bridge='play/ai/practice/bridge.ts') as bridge:
            cls.contract = bridge.contract
        cls.manifest, cls.cases = load_practice(cls.contract)

    def test_approved_splits_skip_scaffolding_and_forbidden_reward_labels(self):
        train = [c for c in self.cases if c['split'] == 'train']
        heldout = [c for c in self.cases if c['split'] == 'heldout']
        self.assertEqual({c['family'] for c in heldout}, {'galen-credit', 'too-late-to-sacrifice'})
        self.assertFalse({c['family'] for c in train} & {c['family'] for c in heldout})
        for case in self.cases:
            for row in case['rows']:
                self.assertNotIn('return', row)
                self.assertNotIn('value', row)
                self.assertNotIn('Regroup', row['label'])
                self.assertNotEqual(row['label'], 'pass')
                self.assertIn(row['action'], row['acceptable'])

    def test_actor_learning_changes_choices_without_regressing_unfinished_value_targets(self):
        torch.manual_seed(42); random.seed(42)
        policy = make_policy(self.contract, 'crossfire-specialists-v1')
        critic = {k:v.clone() for k,v in policy.critic.state_dict().items()}
        vader = {k:v.clone() for k,v in policy.leaders['vader'].state_dict().items()}
        report = warmup(policy, torch.optim.Adam(policy.parameters(),lr=.001), self.cases, epochs=40)
        self.assertGreater(report['after']['train']['correct'], report['before']['train']['correct'])
        self.assertNotIn('value', report['componentTraining'])
        for k,v in critic.items(): self.assertTrue(torch.equal(v,policy.critic.state_dict()[k]))
        for k,v in vader.items(): self.assertTrue(torch.equal(v,policy.leaders['vader'].state_dict()[k]))

    def test_benchmark_has_100_games_per_opponent_with_balanced_seats_and_fixed_seeds(self):
        jobs = benchmark_jobs(self.contract, 'frozen')
        self.assertEqual(len(jobs),600)
        own = next(i for i,d in enumerate(self.contract['decks']) if d['key']=='krennic')
        for other in range(6):
            pair = [j for j in jobs if j['decks'][1-j['learner']]==other]
            self.assertEqual(len(pair),100)
            self.assertEqual(sum(j['learner']==0 for j in pair),50)
            self.assertTrue(all(j['decks'][j['learner']]==own and j['opponent']=='frozen' for j in pair))
            self.assertEqual(len({j['seed'] for j in pair}),50)
        self.assertEqual(jobs,benchmark_jobs(self.contract,'frozen'))

    def test_final_benchmark_resumes_without_more_games_or_duplicate_results(self):
        import json
        import tempfile
        from pathlib import Path
        from argparse import Namespace
        from unittest.mock import patch
        import league_train
        from full_model import frozen_copy
        from league_artifacts import publish, save_checkpoint
        from league_schedule import SCHEDULE_VERSION
        from resource_budget import ArtifactBudget
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            output = root / '.swubase/crossfire-ai/run'
            policy = make_policy(self.contract, 'crossfire-specialists-v1')
            keys = [d['key'] for d in self.contract['decks']]
            own = keys.index('krennic')
            batch = league_train.focused_batch(9000, keys, 1, [own])
            batch.update(completed=1000, winsA=1000, seatCounts=[500,500])
            state = {'schedule': SCHEDULE_VERSION, 'seed': 51, 'games': 10000, 'attempts':10000,
                     'updates':1, 'decisions':0, 'cutoffs':0, 'elapsedSeconds':0,
                     'history':[], 'recentResults':[], 'initialization': {'kind':'test'},
                     'focusLeader':'krennic', 'focusStartedAtGames':0, 'experimentGames':10000,
                     'experimentStartedAtGames':0, 'batch':batch, 'lastCompletedBatch':None}
            with_budget = ArtifactBudget(output.parent)
            try:
                model = publish(with_budget, output, self.contract, policy, state)
                state.update(latestModel=model, anchor=model)
                state['curriculum'] = {'version':self.manifest['version'], 'hash':self.manifest['hash'],
                    'phase':'self-play', 'passed':True, 'epochs':1, 'baseline':model,
                    'history':[{'kind':'before-warmup'}, {'kind':'after-warmup'}]}
                save_checkpoint(with_budget, output, self.contract, policy,
                    torch.optim.Adam(policy.parameters(),lr=.0003), [frozen_copy(policy)],
                    state, self.cases[0]['rows'][0])
            finally:
                with_budget.close()
            args = Namespace(seed=51,output=str(output),specialists=True,resume=True,
                initialize_from=None,baseline_run=None,prepare_only=False,workers=1,
                leader='krennic',curriculum=True,practice_only=False,experiment_games=10000)
            evaluation = {'complete':True,'byDeckIndex':{str(own):{'wins':20,'losses':0,'draws':0,
                'cutoffs':0,'completed':20,'winRate':1.,'scoreRate':1.}}}
            with patch.object(league_train,'ROOT',root), patch.object(torch,'set_num_interop_threads'), \
                 patch.object(league_train.signal,'signal'), \
                 patch('practice_training.load_practice',return_value=(self.manifest,self.cases)), \
                 patch.object(league_train,'evaluate',return_value=evaluation), \
                 patch('practice_training.benchmark',side_effect=[{'complete':False},{'complete':True}]) as benchmark:
                league_train.run(args)
                first = json.loads((output/'status.json').read_text())
                self.assertEqual(first['games'],10000)
                self.assertEqual(first['curriculum']['phase'],'benchmarking')
                self.assertEqual(first['batch']['completed'],1000)
                league_train.run(args)
                final = json.loads((output/'status.json').read_text())
                self.assertEqual(final['games'],10000)
                self.assertEqual(final['curriculum']['phase'],'complete')
                self.assertEqual(final['batch']['completed'],0)
                self.assertEqual(len(final['recentResults']),1)
                self.assertNotIn('changeSincePrevious',final['recentResults'][0])
                self.assertEqual(benchmark.call_count,2)

if __name__=='__main__':unittest.main()
