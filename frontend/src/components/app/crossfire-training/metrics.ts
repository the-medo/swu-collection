import type {
  TrainingBatch,
  TrainingDeck,
  TrainingMeasure,
} from '../../../../../shared/types/crossfire-training.ts';

export function matchupSeries(
  batches: TrainingBatch[],
  deck: TrainingDeck,
  opponent: TrainingDeck,
) {
  if (deck === opponent) return [];
  return batches
    .filter(
      b =>
        !b.mirror &&
        b.decks.includes(deck) &&
        b.decks.includes(opponent) &&
        (!b.learner || b.learner === deck),
    )
    .sort((a, b) => a.block - b.block);
}

export function matchupScore(
  batch: TrainingBatch | undefined,
  deck: TrainingDeck,
  measure: TrainingMeasure,
) {
  if (
    !batch ||
    batch.mirror ||
    !batch.decks.includes(deck) ||
    (batch.learner && batch.learner !== deck)
  )
    return null;
  if (measure === 'evaluation') {
    const s = batch.evaluation[deck];
    return s?.completed
      ? {
          wins: s.wins,
          losses: s.losses,
          draws: s.draws,
          cutoffs: s.cutoffs,
          games: s.completed,
          rate: s.wins / s.completed,
        }
      : null;
  }
  const s = batch.counts;
  const a = batch.decks[0] === deck;
  return s.completed
    ? {
        wins: a ? s.winsA : s.winsB,
        losses: a ? s.winsB : s.winsA,
        draws: s.draws,
        cutoffs: s.cutoffs,
        games: s.completed,
        rate: (a ? s.winsA : s.winsB) / s.completed,
      }
    : null;
}

export function selectBatch(series: TrainingBatch[], cycle?: number) {
  return cycle === undefined ? series[series.length - 1] : series.find(b => b.cycle === cycle);
}

export function mergeBatches(pages: { batches: TrainingBatch[] }[]) {
  const map = new Map<number, TrainingBatch>();
  // The newest page wins if a live refresh overlaps an older cursor page.
  for (const page of [...pages].reverse())
    for (const batch of page.batches) map.set(batch.block, batch);
  return [...map.values()].sort((a, b) => a.block - b.block);
}
