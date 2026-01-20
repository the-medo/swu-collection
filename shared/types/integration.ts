export enum IntegrationType {
  Karabast = 'karabast',
}

export function isIntegrationType(s: string): s is IntegrationType {
  return Object.values(IntegrationType).includes(s as IntegrationType);
}
