export const crossfireKeys = {
  session: (sessionId: string) => ['crossfire', sessionId] as const,
  lobby: (sessionId: string, lobbyId: string) =>
    [...crossfireKeys.session(sessionId), 'lobby', lobbyId] as const,
  readiness: (sessionId: string, deckId: string | undefined) =>
    [...crossfireKeys.session(sessionId), 'readiness', deckId] as const,
};
