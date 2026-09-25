/** Development training dashboard. Never includes engine state or checkpoint tensors. */
export const trainingDecks = [
  { key: 'greef', name: 'Greef Aggression', short: 'Greef', color: '#f97316' },
  { key: 'vader', name: 'Vader Cunning', short: 'Vader', color: '#eab308' },
  { key: 'mandalorian', name: 'Mandalorian Colossus', short: 'Mando', color: '#06b6d4' },
  { key: 'dedra', name: 'Dedra Colossus', short: 'Dedra', color: '#8b5cf6' },
  { key: 'aurra', name: 'Aurra Data Vault', short: 'Aurra', color: '#ec4899' },
  { key: 'krennic', name: 'Krennic Ramp', short: 'Krennic', color: '#22c55e' },
] as const;
export type TrainingDeck = string;
export interface TrainingDeckOption {
  key: string;
  name: string;
  short: string;
  color: string;
}
export type TrainingMeasure = 'training' | 'evaluation';
export type TrainingRun = string;
export const trainingStrategies = [
  { key: 'aggro', label: 'Aggro' },
  { key: 'space-aggro', label: 'Space aggro' },
  { key: 'control', label: 'Control' },
  { key: 'midrange', label: 'Midrange' },
  { key: 'ramp', label: 'Ramp' },
] as const;
export type TrainingStrategy = (typeof trainingStrategies)[number]['key'];
export interface SpecialistComponent {
  id: string;
  kind: 'shared' | 'leader' | 'strategy' | 'router' | 'matchup' | 'scorer' | 'value';
  label: string;
  parameters: number;
  decisions: number;
  updates: number;
}
export interface SpecialistSystem {
  architecture: 'crossfire-specialists-v1' | 'crossfire-specialists-v2';
  initialization: 'fresh' | 'expanded';
  qualification: 'unqualified';
  baselineWeightsImported: false;
  humanReplayLearning: 'planned' | 'available';
  matchupInputs: 'seat-visible state only';
  evaluationReference: 'retired league model';
  components: SpecialistComponent[];
  leaders: { key: TrainingDeck; label: string; cardId: string; strategies: TrainingStrategy[] }[];
  decks?: { key: string; label: string; leaderKey: string; strategies: TrainingStrategy[] }[];
  inheritedGames?: number;
  inheritedUpdates?: number;
}
export interface TrainingCounts {
  completed: number;
  winsA: number;
  winsB: number;
  draws: number;
  cutoffs: number;
}
export interface EvaluationCounts {
  completed: number;
  wins: number;
  losses: number;
  draws: number;
  cutoffs: number;
}
export interface TrainingBatch {
  learner?: string;
  opponentModelHash?: string;
  learnerScore?: EvaluationCounts;
  block: number;
  cycle: number;
  decks: [TrainingDeck, TrainingDeck];
  mirror: boolean;
  startedAt: string;
  finishedAt: string | null;
  counts: TrainingCounts;
  byMode: Partial<Record<'self' | 'past', TrainingCounts>>;
  evaluation: Partial<Record<TrainingDeck, EvaluationCounts>>;
}
export interface TrainingStatus {
  rotation?: import('./crossfire-rotation.ts').RotationProgress | null;
  practice?: import('./crossfire-practice.ts').PracticeProgress | null;
  focusLeader?: string | null;
  humanLearning?: {
    games: number;
    decisions: number;
    updates: number;
    validationGames: number;
    skippedGames: number;
  } | null;
  run: string;
  fetchedAt: string;
  state: 'ready' | 'training' | 'evaluating' | 'stopped' | 'failed' | 'unavailable';
  processAlive: boolean | null;
  updatedAt: string | null;
  games: number | null;
  updates: number | null;
  cutoffs: number | null;
  elapsedSeconds: number | null;
  cpus: number[];
  workers: number | null;
  decks?: TrainingDeckOption[];
  currentBatch: TrainingBatch | null;
  lastCompletedBlock: number | null;
  disk: {
    bytes: number | null;
    limit: number;
    checkedAt: string;
    intervalSeconds: number;
    ok: boolean;
  } | null;
  model: { games: number; updates: number; parameters: number; sha256: string } | null;
  system?: SpecialistSystem | null;
  baseline?: { games: number; updates: number; sha256: string } | null;
}
export interface TrainingHistoryPage {
  batches: TrainingBatch[];
  nextBefore: number | null;
}
