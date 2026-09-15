import { gameViewSchema } from './parse.ts';
import { PROTOCOL_VERSION } from './version.ts';

/** Versions 37–39 add optional presentation fields. Existing independent report
 * snapshots can still render; this does not permit an older engine to run. */
export function parseSavedView(raw: unknown) {
  const upgraded =
    raw &&
    typeof raw === 'object' &&
    'protocolVersion' in raw &&
    (raw.protocolVersion === 36 || raw.protocolVersion === 37 || raw.protocolVersion === 38)
      ? { ...raw, protocolVersion: PROTOCOL_VERSION }
      : raw;
  return gameViewSchema.safeParse(upgraded);
}
