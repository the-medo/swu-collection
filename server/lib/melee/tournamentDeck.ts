type Candidate = {
  id: string;
  name: string;
  username: string | null;
  placement: number | null;
  visibility: number;
};

export function findTournamentDeck(
  candidates: Candidate[],
  username: string,
  placement: number | null,
) {
  const named = candidates.filter(
    candidate => candidate.username?.toLowerCase() === username.toLowerCase(),
  );
  const placed =
    placement !== null && placement > 0
      ? candidates.filter(candidate => candidate.placement === placement)
      : [];
  // Imported historical rows sometimes contain display names instead of usernames.
  // Include private candidates in the uniqueness check, but never expose their deck.
  const matching = named.length ? named : placed;
  const candidate = matching.length === 1 ? matching[0] : undefined;
  return candidate && candidate.visibility >= 1 ? { id: candidate.id, name: candidate.name } : null;
}
