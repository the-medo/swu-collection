// This identifies runtime behavior, independently of hot-loaded card releases.
export const ENGINE_VERSION = '1.0.0';
export function parseVersion(value: string): [number, number, number] {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value))
    throw new Error('Invalid Crossfire version');
  const parts = value.split('.').map(Number);
  if (parts.some(n => !Number.isSafeInteger(n))) throw new Error('Invalid Crossfire version');
  return parts as [number, number, number];
}
export function supportsEngine(required: string, runtime = ENGINE_VERSION): boolean {
  try {
    const [major, minor, patch] = parseVersion(required),
      [a, b, c] = parseVersion(runtime);
    return major === a && (minor < b || (minor === b && patch <= c));
  } catch {
    return false;
  }
}
