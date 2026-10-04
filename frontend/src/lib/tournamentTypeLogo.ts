const tournamentTypeLogos: Partial<Record<string, string>> = {
  sq: 'https://images.swubase.com/logos/organized-play/sector-qualifier.png',
  rq: 'https://images.swubase.com/logos/organized-play/regional-championship.png',
  gc: 'https://images.swubase.com/logos/organized-play/galactic-championship.png',
};

export function getTournamentTypeLogo(type: string | null | undefined) {
  return type ? tournamentTypeLogos[type] : undefined;
}
